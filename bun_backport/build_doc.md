# Bun v1.3.14 macOS 10.13 Backport Build Guide

> **⚠️ 注意**：本文档由 AI 生成，编译方法大致正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。

## 概述

将 Bun v1.3.14 移植到 macOS 10.13 (High Sierra) / Xcode 10 环境。Bun 是一个用 Zig + C++ 编写的 JavaScript 运行时，依赖 WebKit/JavaScriptCore 作为 JS 引擎。

## 核心问题

| 问题 | 原因 | 状态 |
|------|------|------|
| LLVM 21 硬性要求 | 构建系统强制检查 clang >= 21.1.0 | ✅ 已解决：从源码编译 LLVM 21 |
| macOS 最低版本 13.0 | `MIN_OSX_DEPLOYMENT_TARGET = "13.0"` | ✅ 已修补：改为 "10.13" |
| Zig 编译器不可用 | 预编译二进制需要 macOS 13+ | ❌ 需从源码编译或交叉编译 |
| WebKit/JSC 预编译不可用 | 预编译二进制需要 macOS 13+ | ❌ 需从源码编译 |
| Bun 自身不可用 | 构建脚本需要 bun 运行 codegen | ❌ 循环依赖：需 bun 编译 bun |
| 预编译 bun 二进制不兼容 | LC_DYLD_EXPORTED_TRIE (macOS 12+) | ❌ 无法在 10.13 运行 |

## 环境信息

| 项目 | 值 |
|------|-----|
| 系统 | macOS 10.13.6 High Sierra |
| Xcode | 10.0-10.1 (Apple Clang 10.0.0) |
| SDK | macOS 10.14 (Mojave) |
| LLVM 15 (预编译) | clang+llvm-15.0.7-x86_64-apple-darwin21.0 |
| LLVM 13 (本地编译) | build-llvm13 (clang 13.0.1, lld) |
| **LLVM 21 (本地编译)** | **build-llvm21 (clang 21.1.8, lld 21.1.8)** |
| Node.js | v22.22.2 (backported) |
| CMake | 4.1.0 |
| Ninja | 1.13.1 |

## 阶段一：编译 LLVM 21（已完成）

使用 LLVM 15 作为 bootstrap 编译器，从源码编译 LLVM 21.1.8。

### 下载源码

```bash
# 下载各组件源码到 bun_backport/tmp/
for pkg in llvm clang lld cmake compiler-rt libcxx libcxxabi libunwind third-party; do
  wget -O "${pkg}-21.1.8.src.tar.xz" \
    "https://github.com/llvm/llvm-project/releases/download/llvmorg-21.1.8/${pkg}-21.1.8.src.tar.xz"
done
```

### 解压并组织

```bash
mkdir -p /Volumes/Data/src/llvm/llvm-project-21.1.8.src
cd /Volumes/Data/src/llvm/llvm-project-21.1.8.src
for pkg in llvm clang lld cmake; do
  tar xf ${pkg}-21.1.8.src.tar.xz
  ln -sf ${pkg}-21.1.8.src ${pkg}
done
```

### CMake 配置

```bash
LLVM15_DIR=/Volumes/Data/src/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0
SYSROOT=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX10.14.sdk

mkdir -p /Volumes/Data/src/llvm/build-llvm21 && cd /Volumes/Data/src/llvm/build-llvm21

cmake /Volumes/Data/src/llvm/llvm-project-21.1.8.src/llvm \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=x86_64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=10.13 \
  -DCMAKE_OSX_SYSROOT="$SYSROOT" \
  -DCMAKE_C_COMPILER="$LLVM15_DIR/bin/clang" \
  -DCMAKE_CXX_COMPILER="$LLVM15_DIR/bin/clang++" \
  -DCMAKE_C_FLAGS="-fuse-ld=lld" \
  -DCMAKE_CXX_FLAGS="-fuse-ld=lld -isystem $LLVM15_DIR/include/c++/v1" \
  -DCMAKE_EXE_LINKER_FLAGS="-fuse-ld=lld -L$LLVM15_DIR/lib" \
  -DCMAKE_SHARED_LINKER_FLAGS="-fuse-ld=lld -L$LLVM15_DIR/lib" \
  -DLLVM_ENABLE_PROJECTS="clang;lld" \
  -DLLVM_TARGETS_TO_BUILD=X86 \
  -DLLVM_BUILD_TOOLS=ON \
  -DLLVM_BUILD_UTILS=OFF \
  -DLLVM_BUILD_TESTS=OFF \
  -DLLVM_INCLUDE_TESTS=OFF \
  -DLLVM_INCLUDE_DOCS=OFF \
  -DLLVM_INCLUDE_EXAMPLES=OFF \
  -DLLVM_ENABLE_ZLIB=OFF \
  -DLLVM_ENABLE_ZSTD=OFF \
  -DLLVM_ENABLE_RTTI=ON
```

### 编译

```bash
make -j4 clang lld llvm-ar llvm-ranlib llvm-strip dsymutil 2>&1 | tee build.log
```

**编译时间**: 约 3.5 小时 (4 核 Mac mini, 16GB RAM)

**产出**:
- `build-llvm21/bin/clang-21` → clang 21.1.8, macOS 10.13 deployment target
- `build-llvm21/bin/ld64.lld` → LLD 21.1.8
- `build-llvm21/bin/llvm-ar`, `llvm-ranlib`, `llvm-strip`, `dsymutil`

## 阶段二：修补 Bun 构建系统（已完成）

### 源码下载

```bash
git clone --depth 1 --branch bun-v1.3.14 https://github.com/oven-sh/bun.git ../bun
```

### 补丁 1: macOS 部署目标

**文件**: `scripts/build/config.ts`

```diff
-const MIN_OSX_DEPLOYMENT_TARGET = "13.0";
+const MIN_OSX_DEPLOYMENT_TARGET = "10.13";
```

同时修复 SDK 版本解析（10.x 格式）:

```diff
-    const major = sdkVersion.match(/^(\d+)/)?.[1];
-    assert(major !== undefined, `Could not parse macOS SDK version: ${sdkVersion}`);
-    osxDeploymentTarget = major;
+    // backport: handle 10.x SDK versions (e.g. 10.14)
+    const verMatch = sdkVersion.match(/^(\d+\.\d+)/);
+    const major = sdkVersion.match(/^(\d+)/)?.[1];
+    assert(major !== undefined, `Could not parse macOS SDK version: ${sdkVersion}`);
+    osxDeploymentTarget = verMatch ? verMatch[1] : major;
```

### 补丁 2: Zig 最低版本

**文件**: `build.zig`

```diff
-            .semver = .{ .major = 13, .minor = 0, .patch = 0 },
+            .semver = .{ .major = 10, .minor = 13, .patch = 0 },
```

### 补丁 3: LLVM 版本约束

**文件**: `scripts/build/tools.ts`

```diff
-const LLVM_VERSION_RANGE = `>=${LLVM_MAJOR}.${LLVM_MINOR}.0 <${LLVM_MAJOR}.${LLVM_MINOR}.99`;
+const LLVM_VERSION_RANGE = `>=21.0.0 <22.0.0`;
```

添加自定义 LLVM 搜索路径:

```diff
     paths.push(`${brewPrefix}/opt/llvm@${LLVM_MAJOR}/bin`);
+    paths.push("/Volumes/Data/src/llvm/build-llvm21/bin");
     paths.push(`${brewPrefix}/opt/llvm/bin`);
```

### 补丁 4: USAGE 变量初始化顺序

**文件**: `scripts/build.ts`

将 `const USAGE = ...` 定义移到 `await main()` 调用之前，以兼容 Node.js ESM 加载。

### 补丁 5: 构建脚本兼容 Node.js

使用 `node --experimental-strip-types` 代替 bun 运行构建脚本。

## 阶段三：解决循环依赖（进行中）

### 问题

Bun 的构建系统需要 bun 运行 codegen 脚本（bindgenv2），但 bun 二进制在 macOS 10.13 上无法运行。

### 可行方案

1. **使用 bun 1.0.6 作为 codegen 运行器**: bun 1.0.6 是最后一个在 macOS 10.13 上可运行的版本（SDK 12.0，无 LC_DYLD_EXPORTED_TRIE）。但 bun 1.0.6 太旧，无法正确运行现代 codegen 脚本。

2. **在其他机器上预生成 codegen 产物**: 在 macOS 13+ 机器上运行 `bun scripts/build.ts --profile=release --configure-only`，将生成的 codegen 文件复制到 10.13 机器。

3. **用 Node.js 替代 codegen**: 修改 bindgenv2 脚本使其兼容 Node.js（替换 `import.meta.require` 等 bun 专有 API）。

4. **交叉编译**: 从 macOS 13+ 机器远程编译，或使用 CI。

### Bun 版本兼容性测试结果

| 版本 | minos | SDK | 在 10.13 上运行 |
|------|-------|-----|-----------------|
| 0.0.21 | 11.0 | 11.3 | ✅ |
| 1.0.0-1.0.2 | 11.0 | 11.0 | ✅ |
| 1.0.3-1.0.6 | 12.0 | 12.0 | ✅ |
| 1.0.7+ | 12.0 | 12.0 | ⏳ 启动极慢 |
| 1.1.0+ | 11.0 | 13.1 | ❌ LC_DYLD_EXPORTED_TRIE |
| 1.3.14 | 13.0 | 15.2 | ❌ LC_DYLD_EXPORTED_TRIE |

分界线是 SDK 13.0+：链接器开始使用 `LC_DYLD_EXPORTED_TRIE` (0x80000034) 加载命令，macOS 10.13 的 dyld 无法识别。

## 阶段四：编译 Zig 编译器（待完成）

Bun 使用 oven-sh/zig fork 的 Zig 编译器。预编译二进制需要 macOS 13+。

### 方案

1. 在 macOS 10.13 上从源码编译 Zig（使用 LLVM 21）
2. 使用 `BUN_ZIG_PATH` 环境变量指向编译好的 Zig

```bash
export BUN_ZIG_PATH=/path/to/custom/zig
```

## 阶段五：编译 WebKit/JavaScriptCore（待完成）

Bun 使用 oven-sh/WebKit fork 的 JavaScriptCore。预编译二进制需要 macOS 13+。

### 方案

1. 克隆 `oven-sh/WebKit` 到 `vendor/WebKit/`
2. 使用 `--webkit=local` 参数编译
3. 用 LLVM 21 + CMake 编译 JSC

```bash
export BUN_WEBKIT_PATH=/path/to/WebKit
bun scripts/build.ts --profile=release --webkit=local
```

## 阶段六：最终编译 Bun（待完成）

当所有依赖就绪后：

```bash
export CC=/Volumes/Data/src/llvm/build-llvm21/bin/clang
export CXX=/Volumes/Data/src/llvm/build-llvm21/bin/clang++
export MACOSX_DEPLOYMENT_TARGET=10.13
export PATH=/Volumes/Data/src/llvm/build-llvm21/bin:$PATH
export BUN_ZIG_PATH=/path/to/zig
export BUN_WEBKIT_PATH=/path/to/WebKit

node --experimental-strip-types scripts/build.ts --profile=release --webkit=local
```

## 已知限制

- **循环依赖**: 需要 bun 来编译 bun（codegen 脚本），目前无解
- **Zig 编译器**: 预编译不可用，需从源码编译
- **WebKit/JSC**: 预编译不可用，需从源码编译
- **构建时间**: LLVM 21 编译约 3.5 小时，WebKit 编译预计 2-4 小时，总计可能 8+ 小时
- **API 缺失**: 可能需要编写 macOS 10.13 兼容性 stub（类似 codex_backport 的做法）

## 文件清单

| 文件 | 说明 |
|------|------|
| `build_llvm21.sh` | LLVM 21 编译脚本 |
| `build_doc.md` | 本文档 |
| `bun-1.0.6` | 可在 10.13 运行的 bun 1.0.6 二进制 |
| `tmp/` | 临时文件（源码包等） |

## 阶段七：构建进度（5月22日更新）

### 已完成
1. LLVM 21 编译完成
2. npm 依赖安装完成
3. Zig 编译器下载完成，通过 `_aligned_alloc` shim 在 macOS 10.13 上运行
4. 代码生成脚本（codegen）使用 esbuild + Node.js polyfill 方案运行
5. C++ 编译开始（约 725 个 .o 文件已编译）

### 关键补丁和工具
- **aligned_alloc_shim.dylib**: 提供 `_aligned_alloc` 符号，让 Zig 在 macOS 10.13 上运行
- **zig-wrapper.sh**: Zig 包装脚本，设置 `DYLD_FORCE_FLAT_NAMESPACE` 和 `DYLD_INSERT_LIBRARIES`
- **bun_polyfill.mjs**: Bun API 的 Node.js polyfill（`Bun.file`, `Bun.resolveSync`, `Bun.build` 等）
- **codegen_runner.sh**: 使用 esbuild 打包 + Node.js 运行代码生成脚本
- **ts_resolver.mjs**: Node.js ESM 模块解析器，处理 `.ts` 扩展名

### 已知问题
1. **bindgenv2 代码生成**: `instanceof NamedType` 跨模块检查失败，生成的文件内容为空
2. **bundle-modules**: 依赖 `Bun.Transpiler`, `Bun.build`, `Bun.Glob` 等深度 Bun API
3. **WebKit 预编译库**: 使用 `minos 13.0` 编译，但在静态链接场景下可以工作

### 当前构建状态
- C++ 编译进行中（ninja -C build/release -j2 -k0）
- 约 725/1199 目标完成
