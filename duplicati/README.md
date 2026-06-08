# Duplicati Backport for macOS 10.13 (High Sierra)

在 macOS 10.13 (High Sierra) 上编译和运行 Duplicati。

## 状态

⚠️ **进行中** - .NET 8 SDK 兼容性问题尚未完全解决。

## 背景

Duplicati 是一个 .NET 8.0 开源备份客户端，需要 .NET 8 SDK 来编译。
.NET 8 SDK 的原生二进制文件需要 macOS 10.15+（`____chkstk_darwin` 符号仅 10.15+ 提供），
因此无法直接在 macOS 10.13 上运行。

本项目使用以下方法使 Duplicati 能在 macOS 10.13 上编译和运行：

1. **提供 ____chkstk_darwin 兼容性桩** - 在 macOS 10.13 上提供缺失的符号
2. **替换 .NET 8 运行时原生组件** - 使用本项目编译的 CoreCLR（已在 dotnet8_backport 中完成）
3. **修补 .NET 8 SDK 二进制** - 移除代码签名、修补 Mach-O 头等

## 前置条件

| 项目 | 版本 | 说明 |
|------|------|------|
| macOS | 10.13.6 High Sierra | 目标平台 |
| .NET 8 SDK | 8.0.421 | 通过 dotnet-install.sh 安装 |
| LLVM 13 | 13.0.1 | 编译 CoreCLR 原生组件 |
| CMake | 4.1.0+ | 编译 CoreCLR |
| OpenSSL | 3.x | CryptoKit 回退 |

## 编译方法

### 1. 安装 .NET 8 SDK

```bash
./install_sdk.sh
```

此脚本会：
- 下载 .NET 8 SDK 到 `/Volumes/Data/src/runtime-8.0/.dotnet/`
- 修补所有 Mach-O 二进制文件（移除代码签名、添加兼容性库依赖）

### 2. 修补 .NET 8 SDK 以兼容 macOS 10.13

```bash
./patch_sdk.sh
```

此脚本会：
- 从所有 .NET 8 二进制文件中移除代码签名
- 添加 `____chkstk_darwin` 兼容性库作为直接依赖
- 修补 LC_BUILD_VERSION（将 minos 10.15 改为 10.13）

### 3. 编译 Duplicati

```bash
./build.sh
```

此脚本会使用修补后的 .NET 8 SDK 编译 Duplicati。

### 4. 替换运行时组件

```bash
./build.sh --replace-runtime
```

将 .NET 8 SDK 的原生运行时组件替换为本项目编译的 CoreCLR（macOS 10.13 兼容版本）。

## 技术挑战

### ____chkstk_darwin 符号缺失

macOS 10.13 的 `libSystem.B.dylib` 不包含 `____chkstk_darwin` 符号（该符号在 10.15 中引入）。
.NET 8 的原生二进制文件（dotnet、libcoreclr.dylib、libclrjit.dylib 等）引用了此符号。

**解决方案**：提供兼容性桩库 `libchkstk.dylib`，包含 `____chkstk_darwin` 和 `_chkstk` 的空实现。

**当前问题**：macOS 10.13 的 dyld 使用两级命名空间（two-level namespace），
`____chkstk_darwin` 被指定为来自 `libSystem.B.dylib`，而 DYLD_INSERT_LIBRARIES 无法
在符号解析之前注入替代实现。

**临时方案**：
- 使用 `install_name_tool -change` 将 `libSystem.B.dylib` 引用替换为兼容性库
- 这需要兼容性库同时重新导出 `libSystem.B.dylib` 的所有符号
- 目前重新导出机制在 macOS 10.13 上存在兼容性问题

### LC_BUILD_VERSION

.NET 8 二进制文件使用 `LC_BUILD_VERSION` 加载命令（minos 10.15），
macOS 10.13 的 dyld 支持此命令，但最低版本设置为 10.15。
本项目通过 `patch_macho.py` 将 minos 改为 10.13。

## 目录结构

```
duplicati/
├── README.md           # 本文档
├── build.sh            # 编译脚本
├── install_sdk.sh      # SDK 安装脚本（待编写）
├── patch_sdk.sh        # SDK 修补脚本（待编写）
├── patch_macho.py      # Mach-O 补丁工具（LC_BUILD_VERSION 修改）
└── stubs/
    ├── chkstk.c         # ____chkstk_darwin 兼容性桩
    ├── chkstk_interpose.c # DYLD interpose 版本（未成功）
    ├── libchkstk.dylib  # 编译后的兼容性库
    └── ...
```

## 参考

- [dotnet8_backport](../dotnet8_backport/) - .NET 8 CoreCLR 原生组件编译
- [codex_backport](../codex_backport/) - Codex CLI 移植（类似的 macOS 10.13 兼容性方法）
- [Duplicati](https://github.com/duplicati/duplicati) - Duplicati 源码仓库
