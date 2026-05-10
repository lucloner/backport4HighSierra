# Codex macOS 10.13 Backport Build Guide (LLVM 13)

## Overview

This document describes the process of compiling the Codex CLI (codex-cli) v0.131.0-alpha.4 for macOS 10.13 (High Sierra) on a machine running macOS 10.13.6 with Xcode 10.1 (Apple Clang 10.0.0), using **LLVM 13** as the compiler toolchain.

## Key Differences from Previous Build (LLVM 15)

- **Compiler**: Locally-built LLVM 13 (`~/llvm/build-llvm13/`) instead of prebuilt LLVM 15
- **libc++ headers**: Must add `-isystem` flag pointing to the prebuilt LLVM 13's bundled libc++ headers (`~/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1`) because the locally-built LLVM 13 does not include them
- **Linker**: Using `lld` from the locally-built LLVM 13 (the system linker `ld64-409.12` does not support `-platform_version`)
- **Dependency changes**: `webrtc-sys` renamed to `libwebrtc` in the new version; same stubs still work
- **Version**: codex-cli 0.131.0-alpha.4 (upgraded from 0.120.0)
- **cxx.h patches**: NOT needed with LLVM 13's libc++ (no `std::ranges::contiguous_range` static_assert issue)

## Root Cause

The codex-cli binary depends on several crates that require modern compiler/linker features not available in Xcode 10.1:

1. **aws-lc-sys 0.39.0**: Requires AVX512 assembly support (not in Apple Clang 10.0.0)
2. **v8 146.4.0**: Requires a C11 function `aligned_alloc` (not on macOS 10.13)
3. **libwebrtc 0.3.26**: Prebuilt binary uses ScreenCaptureKit (macOS 12.3+) and other newer APIs
4. **cxx 1.0.194**: Uses `std::ranges::contiguous_range` static_assert (not an issue with LLVM 13's libc++)

## Prerequisites

- macOS 10.13.6 with Xcode 10.1 (Apple Clang 10.0.0)
- Rust toolchain 1.93.0 (via rustup)
- Locally-built LLVM 13 (`~/llvm/build-llvm13/`) with clang, clang++, and lld
- Prebuilt LLVM 13 binary (`~/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/`) for libc++ headers
- HTTP proxy at `http://192.168.4.251:61087` for internet access
- Pre-downloaded `librusty_v8_release_x86_64-apple-darwin.a.gz`

## Environment Setup

```bash
export PATH=~/.cargo/bin:$PATH
export RUSTUP_TOOLCHAIN=1.93.0
export MACOSX_DEPLOYMENT_TARGET=10.13
export CC=/Users/lucloner/llvm/build-llvm13/bin/clang
export CXX=/Users/lucloner/llvm/build-llvm13/bin/clang++
export CFLAGS="-fuse-ld=lld -F/Users/lucloner/src/backport/codex_backport -isystem /Users/lucloner/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1"
export CXXFLAGS="-fuse-ld=lld -F/Users/lucloner/src/backport/codex_backport -isystem /Users/lucloner/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1"
export HTTPS_PROXY=http://192.168.4.251:61087
export HTTP_PROXY=http://192.168.4.251:61087
export ALL_PROXY=http://192.168.4.251:61087
export http_proxy=http://192.168.4.251:61087
export https_proxy=http://192.168.4.251:61087
export all_proxy=http://192.168.4.251:61087
export RUSTY_V8_ARCHIVE=/Users/lucloner/librusty_v8_release_x86_64-apple-darwin.a.gz
export RUSTFLAGS="-L /Users/lucloner/src/backport/codex_backport -C link-arg=-L/Users/lucloner/src/backport/codex_backport -C link-arg=-F/Users/lucloner/src/backport/codex_backport -C link-arg=-weak_framework -C link-arg=ScreenCaptureKit -C link-arg=-lmacos_compat"
```

**Important**: Use absolute paths (not `~`) in all environment variables, as `cc-rs` does not expand `~`.

## Patches Applied

### 1. LLVM 13 Clang for CC/CXX

Apple Clang 10.0.0 cannot compile AVX512 assembly in aws-lc-sys. Using locally-built LLVM 13 Clang solves this.

The system linker (ld64-409.12) does not support `-platform_version`, so we use `-fuse-ld=lld` to use LLVM 13 LLD instead.

### 2. libc++ Headers from Prebuilt LLVM 13

The locally-built LLVM 13 does not include libc++ headers. We add `-isystem /Users/lucloner/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1` to CFLAGS/CXXFLAGS to provide the C++ standard library headers.

### 3. V8 Archive

The V8 crate downloads a ~32MB binary from GitHub which fails through the proxy. Pre-download the file and set `RUSTY_V8_ARCHIVE` to its path.

### 4. macOS Compatibility Stubs

**`stubs.m`** - Objective-C stubs for classes not available on 10.13:
- `SCShareableContent`, `SCStreamConfiguration`, `SCStream`, `SCContentSharingPicker`, `SCContentFilter`, `SCRecordingPickerConfiguration`, `SCContentSharingPickerConfiguration` (ScreenCaptureKit, macOS 12.3+)
- `AVAudioSinkNode`, `AVAudioSourceNode` (macOS 10.15+)
- `AVCaptureDeviceDiscoverySession` (macOS 10.15+)

**`stubs2.c`** - C/CFString stubs:
- `aligned_alloc` (C11, not on macOS 10.13)
- `__isPlatformVersionAtLeast` (compiler builtin from newer SDK)
- `kVTCompressionPropertyKey_PrioritizeEncodingSpeedOverQuality`
- `kVTCompressionPropertyKey_MaxAllowedFrameQP`
- `kVTCompressionPropertyKey_EnableLowLatencyRateControl`
- `SCStreamFrameInfoStatus/ContentRect/BoundingRect/ScaleFactor/DirtyRects/PresenterOverlayContentRect/ContentScale`

**`stubs_extra.m`** - Additional ObjC stubs:
- `objc_alloc_init` (ObjC runtime, macOS 10.15+)
- `AVCaptureDeviceTypeBuiltInWideAngleCamera` (NSString constant, macOS 10.15+)

### 5. ScreenCaptureKit Stub Framework

A minimal `.framework` bundle at `./codex_backport/ScreenCaptureKit.framework/` containing the compiled stubs as a dylib. This satisfies the `-weak_framework ScreenCaptureKit` linker flag.

### 6. Cargo Configuration

Configure `~/.cargo/config.toml` to use HTTP proxy and sparse registry for better download performance:

```toml
[http]
proxy = "192.168.4.251:61087"

[net]
retry = 5
git-fetch-with-cli = true

[registry]
default = "crates-io"

[registry.crates-io]
protocol = "sparse"
```

Also configure git proxy:
```bash
git config --global http.proxy http://192.168.4.251:61087
git config --global https.proxy http://192.168.4.251:61087
```

## Build Result

- Binary: `/Users/lucloner/src/codex/codex-rs/target/release/codex` (194MB)
- Version: `codex-cli 0.131.0-alpha.4`
- Target: `Mach-O 64-bit executable x86_64`
- macOS deployment target: `10.13`
- SDK: `10.14`
- ScreenCaptureKit linked as weak framework via `@rpath`

## Files in ./codex_backport/

| File | Description |
|---|---|
| `codex` | Final binary (0.131.0-alpha.4) |
| `build_final.sh` | Build script (LLVM 13 version) |
| `stubs.m` | ObjC class stubs |
| `stubs2.c` | C/CFString stubs |
| `stubs_extra.m` | Additional ObjC stubs |
| `libmacos_compat.a` | Static library of all stubs (compiled with LLVM 13) |
| `ScreenCaptureKit.framework/` | Stub framework bundle |

## Runtime Note

The binary uses `-weak_framework ScreenCaptureKit`, so it will start on macOS 10.13 but any code path that calls ScreenCaptureKit APIs will crash. The WebRTC screen capture functionality will not work on 10.13. Other features should work normally.

The stub `__isPlatformVersionAtLeast` always returns 0, so runtime version checks in the prebuilt webrtc binary will behave as if running on an older OS, which should prevent it from calling unavailable APIs.

## Build Time

Total build time with LLVM 13: ~147 minutes on this hardware (16GB RAM, Xeon E5), primarily due to LTO and the webrtc/libwebrtc dependency.
