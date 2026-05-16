# .NET 8 Backport for macOS 10.13 High Sierra

在 macOS 10.13.6 (x86_64) 上构建 .NET 8 CoreCLR 原生组件。

## 背景

.NET 8 官方最低要求 macOS 10.15 (Catalina)。此项目通过补丁将构建要求回退至 macOS 10.13 (High Sierra)，
使 2012 年款 Mac Mini 等老设备也能编译 CoreCLR 原生运行时。

经测试的完整构建环境：

| 项目 | 版本 |
|------|------|
| macOS | 10.13.6 High Sierra |
| 硬件 | Macmini5,2 (2012, x86_64) |
| Xcode | 10.1 (AppleClang 10.0.0) |
| CMake | 4.1.0 |
| Swift | 4.2.1 |
| OpenSSL | 3.x (Homebrew) |
| 源码 | `dotnet/runtime` `release/8.0` 分支 |

## 兼容性矩阵

| .NET 版本 | macOS 最低要求 | .NET SDK 可否在 10.13 运行 | 原生组件可否在 10.13 编译 |
|-----------|----------------|---------------------------|--------------------------|
| .NET 6 | 10.15 | ✅ 可以 | 未测试 |
| .NET 8 | 10.15 | ❌ `____chkstk_darwin` 缺失 | ✅ **本项目** |
| .NET 10 | 12.0 | ❌ `LC_BUILD_VERSION` 不兼容 | ❌ CryptoKit + SDK 均不可用 |

> **.NET 8 SDK 二进制**需要 macOS 10.15+（`____chkstk_darwin` 符号仅 10.15+ 提供），
> 因此无法通过 `build.sh` 执行完整的托管构建流程。本项目绕过 SDK，直接使用 CMake 构建原生组件。

## 前置条件

- macOS 10.13+ (x86_64)
- Xcode 10.1+ 及 macOS 10.14 SDK
- CMake 3.20+
- OpenSSL 3.x（`brew install openssl@3` 或从源码编译）
- `dotnet/runtime` 仓库 `release/8.0` 分支

## 快速开始

```bash
# 1. 克隆源码（如尚未克隆）
git clone --depth 1 --branch release/8.0 https://github.com/dotnet/runtime.git /Volumes/Data/src/runtime-8.0

# 2. 构建
cd /Volumes/Data/src/backport/dotnet8_backport
./build.sh /Volumes/Data/src/runtime-8.0
```

`build.sh` 会依次执行：应用补丁 → 生成版本桩文件 → CMake 配置 → make 编译 → 收集产物到 `out/`。

## 补丁说明

| # | 补丁文件 | 说明 | 修改的文件 |
|---|--------|------|-----------|
| 1 | `01-deployment-target.patch` | macOS 部署目标 10.15 → 10.13 | `Directory.Build.props`, `eng/native/configurecompiler.cmake` |
| 2 | `02-cryptokit-openssl-fallback.patch` | CryptoKit 不可用时回退到 OpenSSL | `src/native/libs/CMakeLists.txt`, `.../extra_libs.cmake` |
| 3 | `03-swift-flags.patch` | 移除 Swift 5+ 专用编译标志 | `.../System.Security.Cryptography.Native.Apple/CMakeLists.txt` |
| 4 | `04-const-correctness.patch` | `char*` → `const char*` 兼容旧版 Clang | `src/native/corehost/hostmisc/utils.cpp` |

此外还需要以下 **非补丁修改**（由 `build.sh` 自动处理）：

- **AVX-512 编译标志**：通过 CMake 变量传入 `-mavx512f -mavx512bw -mavx512vl`，使 AppleClang 10.0 能编译 `context2.S` 中的 AVX-512 指令
- **版本桩文件**：`_version.h`、`_version.c`、`runtime_version.h`，正常情况下由托管构建流程生成，此处提供占位文件

## 构建产物 (out/)

### 动态链接库 (`out/dylibs/`, 35MB)

| 文件 | 大小 | 说明 |
|------|------|------|
| `libcoreclr.dylib` | 7.0M | CoreCLR 运行时引擎 |
| `libclrjit.dylib` | 3.1M | RyuJIT 即时编译器 |
| `libmscordaccore.dylib` | 2.5M | 调试访问 (DAC) |
| `libmscordbi.dylib` | 1.8M | 调试接口 |
| `libclrgc.dylib` | 918K | 垃圾回收器 |
| `libclrgcexp.dylib` | 1.0M | GC 实验性接口 |
| `libclrjit_*_x64.dylib` | 2.6–3.1M | 交叉目标 JIT 变体 |
| `libsuperpmi-*.dylib` | 1.3M×3 | SuperPMI 收集/计数/简化 |
| `libjitinterface_x64.dylib` | 65K | JIT 接口 |

### 可执行文件 (`out/bin/`, 6.2MB)

| 文件 | 大小 | 说明 |
|------|------|------|
| `ilasm` | 1.6M | IL 汇编器 |
| `ildasm` | 1.6M | IL 反汇编器 |
| `superpmi` | 1.4M | SuperPMI 性能测量 |
| `mcs` | 1.3M | MC 编译器 |
| `corerun` | 155K | 最小宿主 |
| `createdump` | 153K | 崩溃转储工具 |

### 静态库 (`out/static-libs/`, 642MB)

| 文件 | 大小 | 说明 |
|------|------|------|
| `libcoreclr_static.a` | 460M | CoreCLR 完整静态库 |
| `libcee_dac.a` | 169M | DAC 静态库 |
| 其他 | — | gcinfo、palrt、utilcode 等 |

### 平台原生库 (`out/native-libs/`, 4.9MB)

| 文件 | 说明 |
|------|------|
| `libSystem.Security.Cryptography.Native.OpenSsl.a` | OpenSSL 加密（替代 CryptoKit） |
| `libSystem.IO.Compression.Native.a` | 压缩 (brotli + zlib) |
| `libSystem.Net.Security.Native.a` | GSSAPI 网络安全 |
| `libSystem.Native.a` | POSIX 原生 API |
| `libSystem.Globalization.Native.a` | ICU 全球化 |
| `libSystem.IO.Ports.Native.a` | 串口 |

### 调试符号 (`out/debug/`, 306MB)

所有 dylib 和可执行文件的 DWARF 调试符号。

## 已知限制

- **仅原生组件**：不产出托管 BCL 程序集（需要 .NET 8+ SDK，即 macOS 10.15+）
- `singlefilehost` 链接失败（缺失 Apple crypto 静态库）
- 部分调试/DI 目标编译失败（缺少托管构建生成的版本宏定义）
- CryptoKit 相关功能不可用（ChaCha20-Poly1305 等）
- AVX-512 编译标志使二进制包含 AVX-512 指令，在无 AVX-512 的 CPU 上会触发运行时异常回退（CoreCLR 已有 runtime guard）

## 完整构建方案

如需构建完整的 .NET 8（含托管库、SDK、测试），需 macOS 10.15+ 环境。可选方案：

1. **升级 macOS**：此硬件 (Macmini5,2) 通过 OpenCore Legacy Patcher 可安装至 macOS 11 Big Sur
2. **Linux VM**：通过 QEMU 运行 Linux（需 `sudo port install qemu`）
3. **Docker**：需启动 Docker Desktop（当前未安装）
4. **远程构建**：使用 GitHub Codespaces 或其他云环境

## 文件清单

| 文件 | 说明 |
|------|------|
| `README.md` | 本文档 |
| `build.sh` | 一键构建脚本 |
| `01–04-*.patch` | 4 个独立补丁 |
| `all-changes.patch` | 全部补丁合集 |
| `version_stub_*.h/c` | 版本桩文件 |
| `net8-build-report.md` | 详细构建报告 |
| `net8-build-make.log` | make 构建日志 (297K) |
| `net8-build-attempt.log` | build.sh + .NET 6 SDK 尝试日志 (142K) |
| `net8-cmake-output.log` | CMake 配置日志 |
