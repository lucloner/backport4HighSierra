# Codex macOS 10.13 Backport Build Guide (LLVM 13)

## Overview

This document describes the process of compiling the Codex CLI (codex-cli) v0.142.0 for macOS 10.13 (High Sierra) on a machine running macOS 10.13.6 with Xcode 10.1 (Apple Clang 10.0.0), using **LLVM 13** as the compiler toolchain.

It supersedes the previous guide for v0.131.0-alpha.4. The build process files live in `/Users/lucloner/src/backport/codex/` and the resulting binary is placed in `/Users/lucloner/src/backport/out/codex/`.

## Key Differences from Previous Build (0.131.0-alpha.4)

- **Version**: codex-cli 0.142.0
- **Rust toolchain**: `stable` (1.96.0) — bumped from 1.93.0 because `sqlx 0.9.0` now requires rustc 1.94.0+. Verified that stable 1.96.0's `libstd` still carries `LC_VERSION_MIN_MACOSX = 10.12`, so the 10.13 deployment target remains safe.
- **v8**: 149.2.0 (was 146.4.0); prebuilt archive re-downloaded as `librusty_v8_149_release_x86_64-apple-darwin.a.gz`.
- **LK_CUSTOM_WEBRTC**: The prebuilt libwebrtc binary extracted by the previous build is reused (set `LK_CUSTOM_WEBRTC`) so `webrtc-sys`/`libwebrtc` does not re-download it through the flaky proxy.
- **Build directory**: `/Users/lucloner/src/backport/codex/` (was `codex_backport/`).
- **Cargo config**: `net.retry = 20`, `http.timeout = 180`, sparse protocol, proxy.
- **Crates pre-download**: Because the HTTP proxy heavily throttles `static.crates.io`, all 126 missing `.crate` files were pre-downloaded into the cargo registry cache with a parallel curl script before the build.

## Root Cause

The codex-cli binary depends on several crates that require modern compiler/linker features not available in Xcode 10.1:

1. **aws-lc-sys 0.39.0**: Requires AVX512 assembly support (not in Apple Clang 10.0.0)
2. **v8 149.2.0**: Requires the C11 function `aligned_alloc` (not on macOS 10.13)
3. **libwebrtc 0.3.26** (via webrtc-sys/libwebrtc): Prebuilt binary uses ScreenCaptureKit (macOS 12.3+) and other newer APIs
4. **sqlx 0.9.0**: MSRV rustc 1.94.0 (forces the rustc upgrade)

## Prerequisites

- macOS 10.13.6 with Xcode 10.1 (Apple Clang 10.0.0)
- Rust toolchain `stable` (1.96.0) via rustup
- Locally-built LLVM 13 (`~/llvm/build-llvm13/`) with clang, clang++, and lld
- Prebuilt LLVM 13 binary (`~/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/`) for libc++ headers
- HTTP proxy at `http://192.168.4.251:61087` for internet access
- Pre-downloaded v8 149.2.0 prebuilt archive (`librusty_v8_149_release_x86_64-apple-darwin.a.gz`)
- Pre-downloaded crates (see Crates Pre-Download section)

## Environment Setup

See `build_final.sh` for the canonical set. Summary:

```bash
export PATH=~/.cargo/bin:$PATH
export RUSTUP_TOOLCHAIN=stable          # 1.96.0; 1.93.0 no longer satisfies sqlx 0.9.0 MSRV
export MACOSX_DEPLOYMENT_TARGET=10.13
export CC=/Users/lucloner/llvm/build-llvm13/bin/clang
export CXX=/Users/lucloner/llvm/build-llvm13/bin/clang++
export CFLAGS="-fuse-ld=lld -F${BACKPORT_DIR} -isystem /Users/lucloner/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1"
export CXXFLAGS="-fuse-ld=lld -F${BACKPORT_DIR} -isystem /Users/lucloner/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1"
export HTTPS_PROXY=http://192.168.4.251:61087
export HTTP_PROXY=http://192.168.4.251:61087
export ALL_PROXY=http://192.168.4.251:61087
export http_proxy=http://192.168.4.251:61087
export https_proxy=http://192.168.4.251:61087
export all_proxy=http://192.168.4.251:61087
# v8 149.2.0 prebuilt archive (downloaded through the proxy)
export RUSTY_V8_ARCHIVE=${BACKPORT_DIR}/librusty_v8_149_release_x86_64-apple-darwin.a.gz
# Reuse the prebuilt libwebrtc binary so webrtc-sys does not re-download it.
export LK_CUSTOM_WEBRTC=/Users/lucloner/src/codex/codex-rs/target/release/build/scratch-766db70c80e2044b/out/livekit_webrtc/livekit/mac-x64-release-webrtc-24f6822-2/mac-x64-release
export RUSTFLAGS="-L ${BACKPORT_DIR} -C link-arg=-L${BACKPORT_DIR} -C link-arg=-F${BACKPORT_DIR} -C link-arg=-weak_framework -C link-arg=ScreenCaptureKit -C link-arg=-lmacos_compat"
```

`BACKPORT_DIR=/Users/lucloner/src/backport/codex`. Use absolute paths (not `~`) in all env vars — `cc-rs` does not expand `~`.

## Patches Applied

### 1. LLVM 13 Clang for CC/CXX

Apple Clang 10.0.0 cannot compile AVX512 assembly in aws-lc-sys. Using locally-built LLVM 13 Clang solves this. The system linker (ld64-409.12) does not support `-platform_version`, so `-fuse-ld=lld` selects LLVM 13 LLD.

### 2. libc++ Headers from Prebuilt LLVM 13

The locally-built LLVM 13 does not include libc++ headers. `-isystem .../include/c++/v1` provides them.

### 3. V8 Archive

The V8 crate downloads a ~38 MB binary from GitHub which fails through the proxy. Pre-download the file and set `RUSTY_V8_ARCHIVE` to its path (`librusty_v8_149_release_x86_64-apple-darwin.a.gz`).

### 4. LK_CUSTOM_WEBRTC (reuse prebuilt libwebrtc)

The prebuilt libwebrtc binary (~545 MB `libwebrtc.a`) extracted by the previous build is reused by exporting `LK_CUSTOM_WEBRTC=<dir>` containing `lib/libwebrtc.a`, `webrtc.ninja`, `desktop_capture.ninja`, and `include/`. This avoids re-downloading through the flaky proxy.

### 5. macOS Compatibility Stubs

**`stubs.m`** — Objective-C stubs for classes not available on 10.13:
- `SCShareableContent`, `SCStreamConfiguration`, `SCStream`, `SCContentSharingPicker`, `SCContentFilter`, `SCRecordingPickerConfiguration`, `SCContentSharingPickerConfiguration` (ScreenCaptureKit, macOS 12.3+)
- `AVAudioSinkNode`, `AVAudioSourceNode` (macOS 10.15+)
- `AVCaptureDeviceDiscoverySession` (macOS 10.15+)

**`stubs2.c`** — C/CFString stubs:
- `aligned_alloc` (C11, not on macOS 10.13)
- `__isPlatformVersionAtLeast` (compiler builtin from newer SDK)
- `kVTCompressionPropertyKey_PrioritizeEncodingSpeedOverQuality`, `kVTCompressionPropertyKey_MaxAllowedFrameQP`, `kVTVideoEncoderSpecification_EnableLowLatencyRateControl`
- `SCStreamFrameInfo*` constants (Status/ContentRect/BoundingRect/ScaleFactor/DirtyRects/PresenterOverlayContentRect/ContentScale)

**`stubs_extra.m`** — Additional ObjC stubs:
- `objc_alloc_init` (ObjC runtime, macOS 10.15+)
- `AVCaptureDeviceTypeBuiltInWideAngleCamera` (NSString constant, macOS 10.15+)

Recompile stubs with `build_stubs.sh` (uses LLVM 13 clang) → `libmacos_compat.a` + `ScreenCaptureKit.framework/`.

### 6. ScreenCaptureKit Stub Framework

A minimal `.framework` bundle containing the compiled stubs as a dylib, satisfying `-weak_framework ScreenCaptureKit`.

### 7. Cargo Configuration

`~/.cargo/config.toml`:

```toml
[http]
timeout = 180

[net]
retry = 20
git-fetch-with-cli = true

[registry]
default = "crates-io"

[registry.crates-io]
protocol = "sparse"
```

Git proxy: `git config --global http.proxy http://192.168.4.251:61087`.

## Crates Pre-Download (proxy throttle workaround)

`static.crates.io` is heavily throttled by the proxy. To avoid `cargo fetch` stalling/corrupting:

1. Pre-download all missing `.crate` files into `~/.cargo/registry/cache/index.crates.io-1949cf8c6b5b557f/` with a parallel curl script (per-crate retries).
2. The v8 149.2.0 crate **source** (`v8-149.2.0.crate`, 36 047 820 bytes, a gzip tarball) was downloaded via a 20-way parallel HTTP-range curl (chunks of 1 802 391 bytes, last 1 802 390), assembled with `cat`, and verified by size + gzip magic `1f 8b 08`.
3. Run `cargo fetch` (online) once to let cargo unpack; then `cargo fetch --offline` to confirm completeness.

## Build Steps

1. Recompile stubs: `bash build_stubs.sh` (produces `libmacos_compat.a` + `ScreenCaptureKit.framework/`).
2. Ensure `RUSTY_V8_ARCHIVE` and `LK_CUSTOM_WEBRTC` point to existing files.
3. Pre-download crates into the cargo cache (see above).
4. Run the build (foreground, in an unrestricted shell):
   ```bash
   bash build_final.sh        # logs to /tmp/build_codex_142.log
   ```
   This runs `cargo build --release -p codex-cli` with the env above. Expect `BUILD_DONE_OK` at the end.
5. Copy the binary:
   ```bash
   cp /Users/lucloner/src/codex/codex-rs/target/release/codex \
      /Users/lucloner/src/backport/out/codex/codex
   ```

## Build Result

- Binary: `/Users/lucloner/src/backport/out/codex/codex` (416 MB)
- Version: `codex-cli 0.142.0`
- Target: `Mach-O 64-bit executable x86_64`
- macOS deployment target: `10.13` (`LC_VERSION_MIN_MACOSX version 10.13`, SDK 10.14)
- ScreenCaptureKit linked as weak framework via `@rpath`
- Dynamic deps: AppKit, CoreGraphics, IOKit, CoreFoundation, CoreServices, SystemConfiguration, Foundation, Security, libSystem, libobjc, libiconv — all present on 10.13. Plus `/usr/local/opt/xz/lib/liblzma.5.dylib` (Homebrew xz; install `xz` on the target machine, or static-link if distributing).
- No `libc++.dylib` dependency (C++ is statically linked into the v8/webrtc archives).

## Files in /Users/lucloner/src/backport/codex/

| File | Description |
|---|---|
| `build_final.sh` | Build script (LLVM 13, stable rustc) |
| `build_stubs.sh` | Recompile stubs into `libmacos_compat.a` + framework |
| `stubs.m` | ObjC class stubs |
| `stubs2.c` | C/CFString stubs |
| `stubs_extra.m` | Additional ObjC stubs |
| `libmacos_compat.a` | Static library of all stubs (compiled with LLVM 13) |
| `ScreenCaptureKit.framework/` | Stub framework bundle |
| `librusty_v8_149_release_x86_64-apple-darwin.a.gz` | v8 149.2.0 prebuilt archive |
| `build_doc.md` | This document |

## Runtime Note

The binary uses `-weak_framework ScreenCaptureKit`, so it starts on macOS 10.13 but any code path calling ScreenCaptureKit APIs will crash; WebRTC screen capture will not work on 10.13. Other features work normally. The stub `__isPlatformVersionAtLeast` always returns 0, so runtime version checks in the prebuilt webrtc binary behave as if running on an older OS, avoiding calls to unavailable APIs.

## Build Time

Total build time with LLVM 13 + stable rustc 1.96.0: ~140 minutes (≈903 crate compilations) on this hardware (16 GB RAM, Xeon E5).
