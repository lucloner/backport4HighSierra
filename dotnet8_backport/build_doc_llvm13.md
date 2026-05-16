# .NET 8 CoreCLR Build with LLVM 13 on macOS 10.13

## 概述

使用本地编译的 LLVM 13 (Clang 13.0.1) 替代系统 Apple Clang 10 编译 .NET 8 CoreCLR 原生组件。

## 环境

| 项目 | 值 |
|------|-----|
| 系统 | macOS 10.13.6 High Sierra (Darwin 17.7.0) |
| Xcode | 10.1 (Apple Clang 10.0.0, 仅用作 SDK/sysroot) |
| LLVM 13 | 13.0.1 (本地编译, x86_64-apple-darwin17.7.0) |
| CMake | 4.1.0 |
| Ninja | 1.13.1 |
| 链接器 | 系统 ld64 (通过 `-mlinker-version=409.12` 避免 `-platform_version`) |
| dsymutil | LLVM 13 的 dsymutil (系统 dsymutil 无法处理 LLVM 13 生成的调试信息) |
| OpenSSL | 3.5.2 (Homebrew) |

## 与 Apple Clang 10 构建的差异

### 补丁变化

| 补丁 | Apple Clang 10 | LLVM 13 | 原因 |
|------|----------------|---------|------|
| 01-deployment-target | ✅ 需要 | ✅ 需要 | macOS 部署目标 10.15→10.13 |
| 02-cryptokit-openssl-fallback | ✅ 需要 | ✅ 需要 | CryptoKit 仅 10.15+ |
| 03-swift-flags | ✅ 需要 | ❌ 不需要 | 已跳过 CryptoKit 原生库 |
| 04-const-correctness | ✅ 需要 | ✅ 需要 | LLVM 13 也要求 `const char*` |
| 05-singlefilehost-openssl | ❌ 不需要 | ✅ 需要 | 替换 Apple→OpenSSL 加密库 |
| 06-remove-crypto-apple-hostpolicy | ❌ 不需要 | ✅ 需要 | 移除 CryptoApple 符号引用 |

### 编译器标志变化

| 标志 | Apple Clang 10 | LLVM 13 |
|------|----------------|---------|
| C 编译器 | `/usr/bin/clang` | `/Volumes/Data/src/llvm/build-llvm13/bin/clang` |
| C++ 编译器 | `/usr/bin/clang++` | `/Volumes/Data/src/llvm/build-llvm13/bin/clang++` |
| 链接器 | 系统 ld64 | 系统 ld64 + `-mlinker-version=409.12` |
| AVX-512 标志 | `-mavx512f -mavx512bw -mavx512vl` | 不需要 |
| C++ 头文件 | 系统 libc++ | `-isystem .../clang+llvm-13.0.1/include/c++/v1` |
| dsymutil | 系统 `/usr/bin/dsymutil` | LLVM 13 `dsymutil` |

### 关键技术点

1. **`-mlinker-version=409.12`**: LLVM 13 的 clang 会自动生成 `-platform_version` 链接器标志，
   系统 ld64 (Xcode 10.1) 不支持该标志。`-mlinker-version=409.12` 让 clang 使用旧版链接器
   命令语法（`-macosx_version_min`），避免兼容性问题。

2. **LLVM 13 dsymutil**: 系统 dsymutil (Apple LLVM 10.0.0) 处理 LLVM 13 生成的调试信息时
   会崩溃（`LLVM ERROR: IO failure on output stream: Invalid argument`）。必须使用 LLVM 13 
   自带的 dsymutil 通过 CMake 变量 `-DDSYMUTIL=` 指定。

3. **libc++ 头文件**: 本地编译的 LLVM 13 不包含 C++ 标准库头文件，需要使用预编译的
   Clang 13 发行版的 libc++ 头文件，通过 `-isystem` 指定。

4. **AVX-512**: LLVM 13 内联汇编器原生支持 AVX-512 指令，不需要手动传递 `-mavx512*` 
   编译标志。C 代码中的 AVX-512 内建函数仍需要对应标志，但 .NET 的 AVX-512 代码是
   汇编形式，LLVM 13 可以直接处理。

5. **singlefilehost**: Apple Clang 10 构建中 singlefilehost 链接失败（缺少符号），
   LLVM 13 构建通过补丁 05/06 将 CryptoKit 依赖替换为 OpenSSL，使 singlefilehost 
   成功链接。

## CMake 配置命令

```bash
cmake /path/to/runtime-8.0/src/coreclr \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=x86_64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=10.13 \
  -DCMAKE_OSX_SYSROOT="/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX10.14.sdk" \
  -DCMAKE_C_COMPILER="/Volumes/Data/src/llvm/build-llvm13/bin/clang" \
  -DCMAKE_CXX_COMPILER="/Volumes/Data/src/llvm/build-llvm13/bin/clang++" \
  -DCMAKE_CXX_FLAGS="-isystem /Volumes/Data/src/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1 -mlinker-version=409.12" \
  -DCMAKE_C_FLAGS="-mlinker-version=409.12" \
  -DCMAKE_EXE_LINKER_FLAGS="-mlinker-version=409.12" \
  -DCMAKE_SHARED_LINKER_FLAGS="-mlinker-version=409.12" \
  -DCMAKE_MODULE_LINKER_FLAGS="-mlinker-version=409.12" \
  -DDSYMUTIL="/Volumes/Data/src/llvm/build-llvm13/bin/dsymutil" \
  -DNUGET_PACKAGE_ROOT="/path/to/runtime-8.0/.packages" \
  -DCLR_ENG_NATIVE_DIR="/path/to/runtime-8.0/eng/native" \
  -DCLI_CMAKE_PKG_RID=osx.10.13-x64 \
  -DCLI_CMAKE_FALLBACK_OS=osx \
  -DCLI_CMAKE_COMMIT_HASH=custom \
  -DOPENSSL_ROOT_DIR="/usr/local/opt/openssl@3" \
  -DOPENSSL_INCLUDE_DIR="/usr/local/opt/openssl@3/include"
```

## 构建结果

| 组件 | 状态 |
|------|------|
| libcoreclr.dylib (6.5M) | ✅ 成功 |
| libclrjit.dylib (3.0M) | ✅ 成功 |
| libclrgc.dylib / libclrgcexp.dylib | ✅ 成功 |
| singlefilehost (11M) | ✅ 成功 (Apple Clang 10 构建中失败) |
| ilasm / ildasm / mcs / superpmi / corerun / createdump | ✅ 成功 |
| libcoreclr_static.a (454M) | ✅ 成功 |
| 各种 JIT 变体 dylib | ✅ 成功 |
| mscordaccore / mscordbi / jitinterface | ✅ 成功 |

**总计**: 15 dylibs, 9 executables, 1 static lib, 6 native libs, 23 debug symbols

## 已知限制

1. **仅原生组件**: 不含托管 BCL，需要 .NET SDK 生成完整运行时
2. **CryptoKit 不可用**: 通过 OpenSSL 替代，CryptoKit 相关功能不可用
3. **ld 警告**: 大量 `could not create compact unwind` 警告，不影响功能
4. **dsymutil**: 必须使用 LLVM 13 版本，系统 dsymutil 不兼容
