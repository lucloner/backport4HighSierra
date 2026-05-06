# macOS 10.13 Backport 合集

将现代软件移植到 macOS 10.13 (High Sierra) / Xcode 10 环境下的补丁与构建指南。

## 背景

macOS 10.13 的系统编译器 (Apple Clang 10.0.0) 和 SDK 严重滞后于现代 C++/Rust 工具链的需求。这些 backport 项目通过引入预编译 LLVM、编写兼容性 shim、修补构建系统等方式，使新版软件能在 High Sierra 上编译运行。

## 项目一览

| 项目 | 版本 | Git Hash | 目录 | 核心问题 |
|------|------|----------|------|----------|
| LLVM | 13.0.1 | `16c31431` | `llvm-13_backport/` | Apple Clang 10 无法编译 LLVM 13，需 bootstrap 编译器 |
| fish-shell | 3.7.1 | `80394ea4` | `fish-shell_backport/` | CMake 4.x 策略不兼容 + `<cmath>` 宏冲突 |
| Node.js | v24.15.0 | `a20a2441` | `node_backport/` | 缺少 C++20 `<ranges>` 支持 + V8 模板兼容性 |
| Codex CLI | 0.120.0 | `65319eb1` | `codex_backport/` | V8/ScreenCaptureKit/AVX512 依赖缺失 |
| ParadeDB pg_search | 0.22.6 | `0b5f5714` | `paradedb_backport/` | aws-lc-sys AVX512 + PG 扩展链接符号 |

## 共性问题与解决方案

### 1. Apple Clang 10 无法编译现代 C++/Rust 代码

**表现**: 缺少 C++17 constexpr 析构函数支持、AVX512 汇编编译失败

**统一方案**: 使用预编译 [LLVM 15](https://releases.llvm.org/download.html) 作为 C/C++ 编译器，系统链接器不支持 `-platform_version`，配合 `-fuse-ld=lld` 使用 LLD。

```bash
export CC=/path/to/clang+llvm-15.0.7-x86_64-apple-darwin21.0/bin/clang
export CXX=/path/to/clang+llvm-15.0.7-x86_64-apple-darwin21.0/bin/clang++
export CFLAGS="-fuse-ld=lld"
export CXXFLAGS="-fuse-ld=lld"
```

### 2. `<cmath>` 宏冲突

**表现**: macOS 10.13 SDK 的 `<math.h>` 以宏定义 `isnan`/`isinf` 等 C99 函数，与 libc++ 的 `<cmath>` 冲突，导致 `no member named 'isnan' in the global namespace` 等错误。

**方案**: 创建兼容性头文件，`#undef` 宏并提供内联函数包装器（见 `fish-shell_backport/fix_cmath_darwin.h`），或禁用引入 `-isystem` SDK 路径的 CMake 模块（见 LLVM 13 backport）。

### 3. macOS 新 API 缺失

**表现**: 编译/链接时缺少 ScreenCaptureKit (12.3+)、`aligned_alloc` (C11)、`objc_alloc_init` (10.15+) 等符号。

**方案**: 编写 stub 函数/类，编译为静态库 (`libmacos_compat.a`) 或弱链接框架。运行时相关功能不可用但不会阻止程序启动（见 `codex_backport/`）。

## 各项目详情

### LLVM 13.0.1 (`16c31431`) → [llvm-13_backport/](llvm-13_backport/)

- 使用预编译 Clang 13 作为 bootstrap 编译器
- 应用 MacPorts 兼容性补丁 (17 个)
- 额外修复 LLDB (`CPU_SUBTYPE_ARM64E`、Python 3.9+ 兼容、MIG 生成文件)
- 禁用 ZLIB/LibXML2 避免 `-isystem` SDK 路径冲突
- 产出: clang 13.0.1, lld, lldb, LLVM 工具链

### fish-shell 3.7.1 (`80394ea4`) → [fish-shell_backport/](fish-shell_backport/)

- 修复 CMake 4.x CMP0037 策略错误
- 添加 `POST_BUILD` 关键字适配新版 CMake
- 提供 `fix_cmath_darwin.h` 解决 `<cmath>` 编译错误

### Node.js v24.15.0 (`a20a2441`) → [node_backport/](node_backport/)

- 提供 `ranges_compat.h` 为 LLVM 15 libc++ 补齐 `<ranges>` 算法/视图
- 补丁修复 V8 缺少 `typename`、`requires` 子句、`make_unique_for_overwrite` 等问题
- 降低 `MACOSX_DEPLOYMENT_TARGET` 至 10.14

### Codex CLI 0.120.0 (`65319eb1`) → [codex_backport/](codex_backport/)

- ScreenCaptureKit / ObjC / C11 stub 静态库与框架
- `cxx.h` 补丁移除 `std::ranges::contiguous_range` static_assert
- V8 预编译 archive 本地化
- 弱链接 ScreenCaptureKit，运行时屏幕共享不可用

### ParadeDB pg_search 0.22.6 (`0b5f5714`) → [paradedb_backport/](paradedb_backport/)

- LLVM 15 编译 aws-lc-sys AVX512 汇编
- `-undefined dynamic_lookup` 允许 PG 扩展运行时解析符号
- 无需 V8/WebRTC/ObjC stub

## 环境信息

| 项目 | 值 |
|------|-----|
| 系统 | macOS 10.13.6 High Sierra |
| Xcode | 10.0–10.1 (Apple Clang 10.0.0) |
| SDK | macOS 10.14 (Mojave) |
| LLVM (预编译) | 13.0.1 / 15.0.7 |
| Rust | 1.90.0 / 1.93.0 |
| CMake | 4.1.0 |
| Ninja | 1.13.1 |
