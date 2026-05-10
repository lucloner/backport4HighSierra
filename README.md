# macOS 10.13 Backport 合集

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。

将现代软件移植到 macOS 10.13 (High Sierra) / Xcode 10 环境下的补丁与构建指南。

## 背景

macOS 10.13 的系统编译器 (Apple Clang 10.0.0) 和 SDK 严重滞后于现代 C++/Rust 工具链的需求。这些 backport 项目通过引入预编译 LLVM、编写兼容性 shim、修补构建系统等方式，使新版软件能在 High Sierra 上编译运行。

## 项目一览

| 项目 | 版本 | 目录 | 编译器 | 核心问题 |
|------|------|------|--------|----------|
| LLVM | 13.0.1 | `llvm-13_backport/` | 预编译 Clang 13 bootstrap | Apple Clang 10 无法编译 LLVM 13 |
| fish-shell | 3.7.1 | `fish-shell_backport/` | Apple Clang 10 + CMake 4.x | CMake CMP0037 + `<cmath>` 宏冲突 |
| Node.js | v22.22.2 | `node_backport/` | LLVM 15 | 缺少 C++20 `<ranges>` + V8 模板兼容性 |
| Codex CLI | 0.131.0-alpha.4 | `codex_backport/` | 本地编译 LLVM 13 | V8/ScreenCaptureKit/AVX512 依赖缺失 |
| ParadeDB pg_search | 0.22.6 | `paradedb_backport/` | LLVM 15 | aws-lc-sys AVX512 + PG 扩展链接符号 |

## 共性问题与解决方案

### 1. Apple Clang 10 无法编译现代 C++/Rust 代码

**表现**: 缺少 C++17 constexpr 析构函数支持、AVX512 汇编编译失败

**统一方案**: 使用预编译 [LLVM 15](https://releases.llvm.org/download.html) 或本地编译的 LLVM 13 作为 C/C++ 编译器。系统链接器不支持 `-platform_version`，配合 `-fuse-ld=lld` 使用 LLD。

```bash
# LLVM 15 (预编译)
export CC=/path/to/clang+llvm-15.0.7-x86_64-apple-darwin21.0/bin/clang
export CXX=/path/to/clang+llvm-15.0.7-x86_64-apple-darwin21.0/bin/clang++

# LLVM 13 (本地编译 + 预编译 libc++ headers)
export CC=/path/to/build-llvm13/bin/clang
export CXX=/path/to/build-llvm13/bin/clang++
export CFLAGS="-fuse-ld=lld -isystem /path/to/clang+llvm-13.0.1/include/c++/v1"
export CXXFLAGS="-fuse-ld=lld -isystem /path/to/clang+llvm-13.0.1/include/c++/v1"
```

### 2. `<cmath>` 宏冲突

**表现**: macOS 10.13 SDK 的 `<math.h>` 以宏定义 `isnan`/`isinf` 等 C99 函数，与 libc++ 的 `<cmath>` 冲突，导致 `no member named 'isnan' in the global namespace` 等错误。

**方案**: 创建兼容性头文件，`#undef` 宏并提供内联函数包装器（见 `fish-shell_backport/fix_cmath_darwin.h`），或禁用引入 `-isystem` SDK 路径的 CMake 模块（见 LLVM 13 backport）。

### 3. macOS 新 API 缺失

**表现**: 编译/链接时缺少 ScreenCaptureKit (12.3+)、`aligned_alloc` (C11)、`objc_alloc_init` (10.15+) 等符号。

**方案**: 编写 stub 函数/类，编译为静态库 (`libmacos_compat.a`) 或弱链接框架。运行时相关功能不可用但不会阻止程序启动（见 `codex_backport/`）。

### 4. Rust 工具链兼容性

**表现**: 部分 Rust crate 依赖现代 C/C++ 编译器特性（AVX512 汇编、C++20 ranges 等），Apple Clang 10 无法满足。

**方案**: 设置 `CC`/`CXX`/`CFLAGS`/`CXXFLAGS` 环境变量指向 LLVM 编译器，配合 `MACOSX_DEPLOYMENT_TARGET=10.13` 和 `-fuse-ld=lld`。注意使用绝对路径（`cc-rs` 不展开 `~`）。

## 各项目详情

### LLVM 13.0.1 → [llvm-13_backport/](llvm-13_backport/)

- 使用预编译 Clang 13 作为 bootstrap 编译器
- 应用 MacPorts 兼容性补丁 (17 个)
- 额外修复 LLDB (`CPU_SUBTYPE_ARM64E`、Python 3.9+ 兼容、MIG 生成文件)
- 禁用 ZLIB/LibXML2 避免 `-isystem` SDK 路径冲突
- 产出: clang 13.0.1, lld, lldb, LLVM 工具链

### fish-shell 3.7.1 → [fish-shell_backport/](fish-shell_backport/)

- 修复 CMake 4.x CMP0037 策略错误
- 添加 `POST_BUILD` 关键字适配新版 CMake
- 提供 `fix_cmath_darwin.h` 解决 `<cmath>` 编译错误

### Node.js v22.22.2 → [node_backport/](node_backport/)

- 提供 `ranges_compat.h` 为 LLVM 15 libc++ 补齐 `<ranges>` 算法/视图
- 补丁修复 V8 缺少 `typename`、`requires` 子句、`make_unique_for_overwrite` 等问题
- 降低 `MACOSX_DEPLOYMENT_TARGET` 至 10.14

### Codex CLI 0.131.0-alpha.4 → [codex_backport/](codex_backport/)

- 使用本地编译的 LLVM 13 作为 C/C++ 编译器，配合预编译 LLVM 13 的 libc++ headers
- ScreenCaptureKit / ObjC / C11 stub 静态库与框架
- V8 预编译 archive 本地化（代理下载）
- 弱链接 ScreenCaptureKit，运行时屏幕共享不可用
- **注意**: 与之前版本 (0.120.0) 相比，LLVM 13 的 libc++ 不需要 `cxx.h` 补丁（无 `std::ranges::contiguous_range` static_assert 问题）

### ParadeDB pg_search 0.22.6 → [paradedb_backport/](paradedb_backport/)

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
| LLVM (本地编译) | 13.0.1 (含 clang, clang++, lld) |
| Rust | 1.90.0 / 1.93.0 |
| CMake | 4.1.0 |
| Ninja | 1.13.1 |

## 产出文件 (`out/`)

| 文件 | 说明 |
|------|------|
| `out/codex/codex` | Codex CLI 0.131.0-alpha.4 二进制 |
| `out/codex.tgz` | 压缩包 |
| `out/fish-shell/` | fish-shell 3.7.1 二进制 |
| `out/fish-shell.tgz` | 压缩包 |
| `out/node/` | Node.js v22.22.2 二进制 |
| `out/node.tgz` | 压缩包 |
| `out/llvm-13/` | LLVM 13.0.1 工具链 |
| `out/llvm-13.tgz` | 压缩包 |
| `out/paradedb/` | ParadeDB pg_search 0.22.6 |
| `out/paradedb.tgz` | 压缩包 |
