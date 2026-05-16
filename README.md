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
| Go | 1.26.3 | `go_backport/` | Go 1.24.6 (bootstrap) | 内部链接器最低版本 12.0 + Security.framework 10.14+ API |
| ParadeDB pg_search | 0.22.6 | `paradedb_backport/` | LLVM 15 | aws-lc-sys AVX512 + PG 扩展链接符号 |
| **.NET 8** | **8.0** | **`dotnet8_backport/`** | **Apple Clang 10 + CMake** | **CryptoKit 10.15+ / SDK 10.15+ / AVX-512** |
| **.NET 8 (LLVM 13)** | **8.0** | **`dotnet8_backport/`** | **LLVM 13 + CMake** | **CryptoKit / dsymutil 兼容性 / 链接器** |

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

**表现**: 编译/链接时缺少 ScreenCaptureKit (12.3+)、`aligned_alloc` (C11)、`objc_alloc_init` (10.15+)、CryptoKit (10.15+) 等符号。

**方案**: 编写 stub 函数/类，编译为静态库 (`libmacos_compat.a`) 或弱链接框架。运行时相关功能不可用但不会阻止程序启动（见 `codex_backport/`）。对于 CryptoKit，回退到 OpenSSL 实现（见 `dotnet8_backport/`）。

### 4. Rust 工具链兼容性

**表现**: 部分 Rust crate 依赖现代 C/C++ 编译器特性（AVX512 汇编、C++20 ranges 等），Apple Clang 10 无法满足。

**方案**: 设置 `CC`/`CXX`/`CFLAGS`/`CXXFLAGS` 环境变量指向 LLVM 编译器，配合 `MACOSX_DEPLOYMENT_TARGET=10.13` 和 `-fuse-ld=lld`。注意使用绝对路径（`cc-rs` 不展开 `~`）。

### 5. .NET SDK 二进制不兼容旧 macOS

**表现**: .NET 8+ SDK 的预编译二进制需要 macOS 10.15+（`____chkstk_darwin` 符号），.NET 10+ 需要 12.0+（`LC_BUILD_VERSION`），均无法在 10.13 上运行。

**方案**: 跳过 SDK 托管构建流程，直接用 CMake 编译 CoreCLR 原生组件。提供版本桩文件替代托管构建产物，4 个补丁解决部署目标、CryptoKit、Swift 标志和 const 正确性问题（见 `dotnet8_backport/`）。

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

### Go 1.26.3 → [go_backport/](go_backport/)

- 修改内部链接器 LC_BUILD_VERSION 最低版本 12.0 → 10.13
- 替换 macOS 10.14+ Security.framework API (SecTrustEvaluateWithError/SecTrustCopyCertificateChain) 为 10.3+/10.6+ 等价 API
- 证书验证错误映射精度降低（无法区分过期/域名不匹配等具体错误类型）

### ParadeDB pg_search 0.22.6 → [paradedb_backport/](paradedb_backport/)

- LLVM 15 编译 aws-lc-sys AVX512 汇编
- `-undefined dynamic_lookup` 允许 PG 扩展运行时解析符号
- 无需 V8/WebRTC/ObjC stub

### .NET 8.0 (Apple Clang 10) → [dotnet8_backport/](dotnet8_backport/)

- **首个不依赖 LLVM 13/15 的项目**：使用系统 Apple Clang 10 + CMake 直接编译
- 4 个补丁：降低部署目标、CryptoKit→OpenSSL 回退、Swift 标志兼容、const 正确性
- 通过 CMake 变量注入 AVX-512 编译标志（`-mavx512f -mavx512bw -mavx512vl`），无需修改源码
- 版本桩文件替代托管构建流程生成的版本头
- **绕过 .NET SDK**：SDK 二进制需 macOS 10.15+，直接用 CMake 构建 CoreCLR 原生组件
- 产出 15 个 dylib（含 `libcoreclr.dylib` 7.0M、`libclrjit.dylib` 3.1M）、6 个可执行文件、12 个静态库
- **已知限制**：仅原生组件，不含托管 BCL；`singlefilehost` 链接失败；CryptoKit 功能不可用

### .NET 8.0 (LLVM 13) → [dotnet8_backport/](dotnet8_backport/)

- 使用本地编译的 LLVM 13 (Clang 13.0.1) 替代 Apple Clang 10 编译
- 6 个补丁：部署目标、CryptoKit→OpenSSL 回退、const 正确性、singlefilehost→OpenSSL、移除 CryptoApple 引用
- **不需要** AVX-512 编译标志（LLVM 13 内联汇编器原生支持 AVX-512 指令）
- 使用 `-mlinker-version=409.12` 解决 LLVM 13 与系统 ld64 的 `-platform_version` 兼容性问题
- 使用 LLVM 13 的 `dsymutil` 替代系统版本（系统 dsymutil 无法处理 LLVM 13 调试信息）
- 使用预编译 Clang 13 的 libc++ 头文件（`-isystem` 指定）
- **singlefilehost 成功链接**（Apple Clang 10 构建中失败）
- 产出 15 个 dylib（含 `libcoreclr.dylib` 6.5M）、9 个可执行文件（含 `singlefilehost` 11M）、1 个静态库、6 个原生库
- **已知限制**：仅原生组件，不含托管 BCL；CryptoKit 不可用（OpenSSL 替代）；大量 ld compact-unwrap 警告
- 详细构建文档：[build_doc_llvm13.md](dotnet8_backport/build_doc_llvm13.md)

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

| 目录 | 项目 | 大小 | 说明 |
|------|------|------|------|
| `out/codex/` | Codex CLI | 194M | 0.131.0-alpha.4 二进制 |
| `out/fish-shell/` | fish-shell | 7.7M | 3.7.1 二进制 (fish, fish_indent, fish_key_reader) |
| `out/node/` | Node.js | 123M | v22.22.2 二进制 |
| `out/go/` | Go | 15M | 1.26.3 二进制 |
| `out/dotnet8/` | .NET 8 (Apple Clang) | 994M | 原生组件 (详见下方) |
| `out/dotnet8-llvm13/` | .NET 8 (LLVM 13) | 880M | 原生组件 (详见下方) |
| `out/llvm-13/` | LLVM 13 | — | 需通过 MacPorts 安装 |
| `out/paradedb/` | ParadeDB | — | 需通过 Cargo + LLVM 15 编译 |

### `out/dotnet8/` 详解 (Apple Clang 10)

| 子目录 | 大小 | 内容 |
|--------|------|------|
| `dylibs/` | 35M | 15 个动态链接库 (libcoreclr 7.0M, libclrjit 3.1M 等) |
| `bin/` | 6.2M | 6 个可执行文件 (ilasm, ildasm, superpmi, mcs, corerun, createdump) |
| `static-libs/` | 642M | 12 个静态库 (libcoreclr_static.a 460M 等) |
| `native-libs/` | 4.9M | 7 个平台原生库 |
| `debug/` | 306M | DWARF 调试符号 |

### `out/dotnet8-llvm13/` 详解 (LLVM 13)

| 子目录 | 大小 | 内容 |
|--------|------|------|
| `dylibs/` | 33M | 15 个动态链接库 (libcoreclr 6.5M, libclrjit 3.0M 等) |
| `bin/` | 17M | 9 个可执行文件 (含 singlefilehost 11M, ilasm, ildasm 等) |
| `static-libs/` | 454M | 1 个静态库 (libcoreclr_static.a) |
| `native-libs/` | 4.3M | 6 个平台原生库 (含 OpenSSL 加密) |
| `debug/` | 372M | 23 个 DWARF 调试符号文件 |
