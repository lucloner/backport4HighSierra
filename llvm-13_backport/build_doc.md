# LLVM 13 Backport Build on macOS 10.13 (High Sierra)

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。

## 环境

| 项目 | 值 |
|------|-----|
| 系统 | macOS 10.13.6 High Sierra (Darwin 17.7.0) |
| Xcode SDK | 10.14 (Mojave SDK) |
| Apple Clang | 10.0.0 (clang-1000.11.45.5) — **不支持编译 LLVM 13** |
| CMake | 4.1.0 |
| Ninja | 1.13.1 |
| Python | 3.13.6 |

## 构建方案

由于系统自带的 Apple Clang 10 不支持编译 LLVM 13（缺少 C++17 constexpr 析构函数支持），我们使用预编译的 Clang 13 二进制作为 bootstrap 编译器。

## 源码与补丁

- **源码**: `~/llvm/llvm-project-llvmorg-13.0.1.tar.gz`
- **MacPorts 补丁**: `~/src/macports-ports/lang/llvm-13/files/`
- **Bootstrap 编译器**: 预编译 `clang+llvm-13.0.1-x86_64-apple-darwin.tar.xz`

## 构建步骤

### 1. 解压源码

```bash
cd ./llvm
tar xzf ~/llvm/llvm-project-llvmorg-13.0.1.tar.gz
```

### 2. 解压预编译 Clang 13 (用作 bootstrap 编译器)

```bash
tar xJf clang+llvm-13.0.1-x86_64-apple-darwin.tar.xz
```

### 3. 应用 MacPorts 兼容性补丁

以下补丁适用于 macOS 10.13（Darwin 17），跳过了 MacPorts 专有路径补丁 (0001-0004, 0005) 和仅适用于 10.6 及以下版本的补丁 (0016-0018, 0020-0022, 0024, 0027)：

```bash
cd ./llvm/llvm-project-llvmorg-13.0.1
PATCHDIR=~/src/macports-ports/lang/llvm-13/files

for p in \
  0006-Define-EXC_MASK_CRASH-and-MACH_EXCEPTION_CODES-if-th.patch \
  0007-Threading-Only-call-pthread_setname_np-if-we-have-it.patch \
  0008-Threading-Only-call-setpriority-PRIO_DARWIN_THREAD-0.patch \
  0009-lib-Support-Unix-Path.inc-define-COPYFILE_CLONE-if-n.patch \
  0010-compiler-rt-cmake-config-ix.cmake-was-Leopard-No-ASA.patch \
  0011-Fix-missing-long-long-math-prototypes-when-using-the.patch \
  0012-compiler-rt-add-some-defs-missing-in-older-SDKs.patch \
  0013-clang-add-back-runtime-libraries-used-on-10.4-and-10.patch \
  0014-Fix-float.h-to-work-on-Snow-Leopard-and-earlier.patch \
  0015-Fixup-libstdc-header-search-paths-for-older-versions.patch \
  0019-10.6-and-less-use-emulated-TLS-before-10.7.patch \
  0025-lldb-add-defines-needed-for-older-SDKs.patch \
  0028-lldb-Add-cstdio-include-to-fix-a595b931f1f91897317a4.patch \
  0029-xray-Use-L-instead-of-.L-for-Mach-O.patch \
  0030-builtins-Move-cfi-start-s-after-the-symbol-name-NFC.patch \
  1234-stop-on-linker-error.patch \
  SyntheticSections.cpp-types.patch \
  patch-lldb-stdc-macros-134877.diff \
  patch-lldb-fix-swig-lvalue-2128646.diff \
  patch-xcode-15.diff; do
  patch -p1 --forward < "$PATCHDIR/$p"
done
```

### 4. 额外源码修复

#### 4a. LLDB HostInfoMacOSX.mm — 缺少 `CPU_SUBTYPE_ARM64E` 定义

macOS 10.13 系统头文件 `<mach/machine.h>` 不包含 `CPU_SUBTYPE_ARM64E`（仅在 10.14 SDK 中引入）：

```bash
# 添加 #include <mach/machine.h> 和兼容性定义

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。
sed -i '' '/^#include <cstdlib>$/i\
#include <mach/machine.h>
' lldb/source/Host/macosx/objcxx/HostInfoMacOSX.mm

sed -i '' '/#include <mach\/machine.h>/a\
#ifndef CPU_SUBTYPE_ARM64E\
#define CPU_SUBTYPE_ARM64E ((cpu_subtype_t) 2)\
#endif
' lldb/source/Host/macosx/objcxx/HostInfoMacOSX.mm
```

#### 4b. LLDB Python 兼容性 — `PyEval_ThreadsInitialized` 已在 Python 3.9+ 中移除

```bash
sed -i '' 's/if (PyEval_ThreadsInitialized())/if (true)/' \
  lldb/source/Plugins/ScriptInterpreter/Python/ScriptInterpreterPython.cpp
```

#### 4c. debugserver MIG 生成文件

```bash
cd ./llvm/build-llvm13/tools/lldb/tools/debugserver/source
MIG_DIR=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/usr/include/mach
mig -arch x86_64 \
  -user mach_excUser.c \
  -server mach_excServer.c \
  -header mach_exc.h \
  $MIG_DIR/mach_exc.defs
```

### 5. CMake 配置

> **关键问题**: macOS 10.14 SDK 的 `<math.h>` 将 `isnan`/`isinf` 定义为宏，
> 与 libc++ 的 `<cmath>` 冲突。CMake 的 `FindZLIB`/`FindLibXml2` 模块
> 会添加 `-isystem /path/to/SDK/usr/include`，导致 SDK 头文件优先级高于
> libc++ 头文件。**解决方案**: 禁用 ZLIB 和 LibXML2 以避免 `-isystem` 路径问题。

```bash
mkdir -p ./llvm/build-llvm13
cd ./llvm/build-llvm13

CLANG13=./llvm/clang+llvm-13.0.1-x86_64-apple-darwin/bin/clang
CLANGXX13=./llvm/clang+llvm-13.0.1-x86_64-apple-darwin/bin/clang++

cmake -G Ninja \
  -DCMAKE_C_COMPILER="$CLANG13" \
  -DCMAKE_CXX_COMPILER="$CLANGXX13" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_INSTALL_PREFIX=./llvm/llvm-13-install \
  -DLLVM_ENABLE_PROJECTS="clang;compiler-rt;lld;lldb" \
  -DLLVM_LINK_LLVM_DYLIB=ON \
  -DLLVM_ENABLE_RTTI=ON \
  -DLLVM_INCLUDE_TESTS=OFF \
  -DLLVM_INCLUDE_EXAMPLES=OFF \
  -DLLVM_INCLUDE_BENCHMARKS=OFF \
  -DLLVM_TARGETS_TO_BUILD="X86" \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=10.13 \
  -DLLVM_ENABLE_LIBCXX=ON \
  -DLLVM_ENABLE_WARNINGS=OFF \
  -DLLVM_ENABLE_ZLIB=OFF \
  -DLLVM_ENABLE_LIBXML2=OFF \
  -DLLDB_ENABLE_LIBXML2=OFF \
  ../llvm-project-llvmorg-13.0.1/llvm
```

### 6. 编译

```bash
cd ./llvm/build-llvm13

# 编译 LLVM 核心（约 10000 个目标）

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。
ninja -j4

# iOS sanitizer 运行时动态库会链接失败（需要 iOS SDK），

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。
# 但核心工具不受影响，可以用 -k0 跳过

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。
ninja -k0 -j4
```

### 7. 编译后处理：移除残留的 SDK include 路径

LLDB 的 CMake 配置仍然会添加 `-I/path/to/SDK/usr/include`，
这会导致同样的 `<cmath>` 宏冲突。需要从 `build.ninja` 中移除：

```bash
sed -i '' 's| -I/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk/usr/include||g' build.ninja
```

## 构建结果

| 组件 | 状态 |
|------|------|
| clang / clang++ | ✅ 成功 (13.0.1, x86_64-apple-darwin17.7.0) |
| lld | ✅ 成功 |
| lldb | ✅ 成功 |
| llvm-config | ✅ 成功 (13.0.1) |
| LLVM 工具链 (opt, llc, etc.) | ✅ 成功 |
| iOS sanitizer runtime dylibs | ❌ 链接失败 (需 iOS SDK，非必须) |
| macOS sanitizer runtime | ✅ 成功 |

## 已知问题与注意事项

1. **`-isystem` SDK 路径冲突**: macOS 10.14 SDK 的 `<math.h>` 将 `isnan`/`isinf`
   定义为 C 宏，与 libc++ 的 `std::isnan`/`std::isinf` 冲突。此问题仅在使用
   `-isystem` 或 `-I` 指向 SDK `/usr/include` 时出现。禁用 ZLIB/LibXML2 后
   CMake 不再添加该 `-isystem`，但 LLDB 仍有残留的 `-I` 需手动移除。

2. **Clang 15 不可用作 bootstrap**: Clang 15 预编译二进制的 libc++ 头文件与
   10.13 SDK 的 `<stddef.h>` 不兼容（`nullptr_t` 未定义在全局命名空间中）。

3. **iOS 运行时编译失败**: iOS sanitizer 动态库链接需要 iOS SDK，对 macOS
   使用者非必须，可忽略。

4. **Apple Clang 10 不可用**: 系统自带编译器缺少 C++17 constexpr 析构函数
   支持（`_LIBCPP_CONSTEXPR_AFTER_CXX17 ~__optional_destruct_base()` 报错）。

## 编译耗时

- CMake 配置: ~12 分钟
- Ninja 编译 (4 线程): ~45 分钟
- 总计: ~57 分钟
