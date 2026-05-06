# pg_search macOS 10.13 Backport Build Guide

## Overview

This document describes the process of compiling pg_search v0.22.6 (ParadeDB) for PostgreSQL 17 on macOS 10.13.6 (High Sierra) with Xcode 10.1 (Apple Clang 10.0.0).

## Root Cause

Two main issues prevent a straightforward build on macOS 10.13:

1. **aws-lc-sys 0.39.1**: The TLS library used by `reqwest → hyper-rustls → rustls → aws-lc-rs` contains AVX512 assembly that Apple Clang 10.0.0 cannot compile. Requires LLVM 15+ clang.
2. **Linker: missing `-undefined dynamic_lookup`**: pgrx builds PostgreSQL extensions as `.dylib` shared libraries that reference PostgreSQL internal symbols (e.g., `pfree`, `get_attname`, `heap_getsysattr`). The macOS linker requires `-undefined dynamic_lookup` to allow these unresolved symbols — they are resolved at runtime when the PostgreSQL backend loads the extension. Without this flag, linking fails with `ld: symbol(s) not found for architecture x86_64`.

### Dependency Chain for aws-lc-sys

```
pg_search → tokenizers → lindera → lindera-dictionary → reqwest
  → hyper-rustls → rustls → aws-lc-rs → aws-lc-sys
```

### Unresolved PostgreSQL Symbols (partial list)

```
_get_attname, _timestamp2tm, _GetSysCacheOid, _get_rel_relkind,
_heap_getsysattr, _heap_compute_data_size, _OidOutputFunctionCall,
_BufferBlocks, _appendBinaryStringInfo, _bms_next_member,
_FreeExecutorState, _pfree, _ReadNextFullTransactionId, ...
```

## Prerequisites

- macOS 10.13.6 with Xcode 10.1
- Rust toolchain 1.90.0 (via rustup) — required by `rust-toolchain.toml`
- LLVM 15.0.7 (prebuilt binary for x86_64-apple-darwin21.0)
- cargo-pgrx 0.17.0 (must match pgrx version in Cargo.toml)
- PostgreSQL 17 (Postgres.app or compiled from source)

## Environment Setup

```bash
# Toolchain — put Rust 1.90.0 cargo/rustc first in PATH
export PATH="$HOME/.rustup/toolchains/1.90.0-x86_64-apple-darwin/bin:$PATH"
export RUSTUP_TOOLCHAIN=1.90.0
export MACOSX_DEPLOYMENT_TARGET=10.13

# C/C++ compiler — LLVM 15 for aws-lc-sys AVX512 asm
export CC=~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0/bin/clang
export CXX=~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0/bin/clang++
export CFLAGS="-fuse-ld=lld"
export CXXFLAGS="-fuse-ld=lld"

# Rust linker flags — dynamic_lookup for PG extension symbols
export RUSTFLAGS="-C link-arg=-undefined -C link-arg=dynamic_lookup"

# PostgreSQL
export PG_CONFIG=/Applications/Postgres.app/Contents/Versions/17/bin/pg_config
```

## Step-by-Step Build

### 1. Install cargo-pgrx

```bash
cargo install --locked cargo-pgrx --version 0.17.0
```

### 2. Initialize pgrx for PostgreSQL 17

```bash
cargo pgrx init "--pg17=$PG_CONFIG"
```

This creates `~/.pgrx/config.toml` and a data directory for the PG17 cluster.

### 3. Build and Install pg_search

```bash
cd ./paradedb

cargo pgrx install \
  --package pg_search \
  --release \
  --pg-config "$PG_CONFIG"
```

With the environment variables set above, this will:

1. Compile all Rust code using rustc 1.90.0
2. Compile C/C++ code (aws-lc-sys, zstd-sys, libz-sys) using LLVM 15 clang
3. Link the `.dylib` with `-undefined dynamic_lookup` for PG symbols
4. Install `pg_search.dylib` to `$PG_CONFIG --pkglibdir`
5. Install `.control` and `.sql` files to `$PG_CONFIG --sharedir/extension/`

## Patches Applied

### 1. LLVM 15 Clang for CC/CXX

Apple Clang 10.0.0 cannot compile AVX512 assembly in aws-lc-sys. Using LLVM 15 Clang solves this.

The system linker (ld64-409.12) does not support `-platform_version`, so we use `-fuse-ld=lld` (LLVM 15 LLD) for C/C++ linking.

### 2. RUSTFLAGS: `-undefined dynamic_lookup`

macOS shared libraries (.dylib) must have all symbols resolved at link time by default. PostgreSQL extensions are dynamically loaded by the backend process, which provides the missing symbols at runtime. Adding `-undefined dynamic_lookup` to the Rust linker flags tells the linker to allow unresolved symbols.

This is a standard practice for PostgreSQL extensions on macOS — pgrx normally handles this internally, but the flag was missing in this version or not picked up correctly on macOS 10.13.

### 3. PATH Override for Rust 1.90.0

The system default `cargo` is 1.75.0 (at `/usr/local/bin/cargo`). The project requires 1.90.0 per `rust-toolchain.toml`. When `cargo-pgrx` internally spawns `cargo`, it uses the PATH to find the binary. Adding the 1.90.0 toolchain's `bin/` directory first in PATH ensures the correct version is used.

Without this, `cargo pgrx install` would fail with errors like:
```
icu_segmenter@2.1.2 requires rustc 1.83
time@0.3.47 requires rustc 1.88.0
vergen@9.1.0 requires rustc 1.88.0
Either upgrade rustc or select compatible dependency versions
```

## Build Result

- Extension: `/Applications/Postgres.app/Contents/Versions/17/lib/postgresql/pg_search.dylib`
- Format: `Mach-O 64-bit dynamically linked shared library x86_64`
- Size: ~110 MB (release, LTO fat)
- Deployment target: macOS 10.13

## Post-Install Verification

```sql
-- In psql, connect to a database and run:
CREATE EXTENSION pg_search;

-- Verify installation:
SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_search';
```

## Differences from Codex Backport

Unlike the Codex CLI backport (documented at `~/src/codex_backport/build_doc.md`), pg_search does **not** require:

- **V8/rusty_v8**: pg_search has no V8 dependency
- **webrtc-sys / ScreenCaptureKit stubs**: pg_search has no WebRTC dependency
- **cxx.h patches**: pg_search doesn't use cxx with static_assert issues
- **objc_alloc_init / aligned_alloc stubs**: No ObjC runtime or C11 compat stubs needed

The pg_search build only requires the LLVM 15 compiler override and the linker flag fix.

## Files in ~/src/paradedb_backport/

| File | Description |
|---|---|
| `build_doc.md` | This document |
| `build_final.sh` | Complete build script |

## Build Time

Release build with LTO (`lto = "fat"`, `codegen-units = 1`) takes approximately 30–45 minutes on this hardware (Xeon E5, 16 GB RAM), with most time spent in the Rust compilation and final LTO linking step.

## Runtime Note

The extension is compiled with `MACOSX_DEPLOYMENT_TARGET=10.13` and all system framework references (CoreFoundation, libiconv, libSystem) are available on macOS 10.13. The PostgreSQL symbols are resolved at runtime by the backend process, so no additional compatibility stubs are needed.
