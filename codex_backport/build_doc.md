# Codex macOS 10.13 Backport Build Guide

## Overview

This document describes the process of compiling the Codex CLI (codex-cli) for macOS 10.13 (High Sierra) on a machine running macOS 10.13.6 with Xcode 10.1 (Apple Clang 10.0.0).

## Root Cause

The codex-cli binary depends on several crates that require modern compiler/linker features not available in Xcode 10.1:

1. **aws-lc-sys 0.39.0**: Requires AVX512 assembly support (not in Apple Clang 10.0.0)
2. **v8 146.4.0**: Requires a C11 function `aligned_alloc` (not on macOS 10.13)
3. **webrtc-sys**: Prebuilt binary uses ScreenCaptureKit (macOS 12.3+) and other newer APIs
4. **cxx 1.0.194**: Uses `std::ranges::contiguous_range` static_assert incompatible with LLVM 15 libc++

## Prerequisites

- macOS 10.13.6 with Xcode 10.1
- Rust toolchain 1.93.0 (via rustup)
- LLVM 15.0.7 (prebuilt binary for x86_64-apple-darwin21.0)
- HTTP proxy at `http://PROXY_HOST:PORT` for GitHub access
- Pre-downloaded `librusty_v8_release_x86_64-apple-darwin.a.gz`

## Environment Setup

```bash
export RUSTUP_TOOLCHAIN=1.93.0
export MACOSX_DEPLOYMENT_TARGET=10.13
export CC=~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0/bin/clang
export CXX=~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0/bin/clang++
export CFLAGS="-fuse-ld=lld -F./codex_backport"
export CXXFLAGS="-fuse-ld=lld -F./codex_backport"
export HTTPS_PROXY=http://PROXY_HOST:PORT
export HTTP_PROXY=http://PROXY_HOST:PORT
export RUSTY_V8_ARCHIVE=~/librusty_v8_release_x86_64-apple-darwin.a.gz
export RUSTFLAGS="-L ./codex_backport -C link-arg=-L./codex_backport -C link-arg=-F./codex_backport -C link-arg=-weak_framework -C link-arg=ScreenCaptureKit -C link-arg=-lmacos_compat"
```

## Patches Applied

### 1. LLVM 15 Clang for CC/CXX

Apple Clang 10.0.0 cannot compile AVX512 assembly in aws-lc-sys. Using LLVM 15 Clang solves this.

The system linker (ld64-409.12) does not support `-platform_version`, so we use `-fuse-ld=lld` to use LLVM 15 LLD instead.

### 2. cxx.h Patch: Remove static_assert and Add element_type

**Files patched:**
- `~/.cargo/registry/src/.../cxx-1.0.194/include/cxx.h`
- `~/.cargo/registry/src/.../cxx-build-1.0.194/src/gen/include/cxx.h`
- All `cxx.h` in `target/release/build/scratch-*/out/livekit_webrtc/*/mac-x64-release/include/third_party/rust/`
- All `cxx.h` in `target/release/build/webrtc-sys-*/out/cxxbridge/include/rust/`

**Changes:**
- Commented out `static_assert(std::ranges::contiguous_range<rust::Slice<const uint8_t>>)`
- Commented out `static_assert(std::contiguous_iterator<rust::Slice<const uint8_t>::iterator>)`
- Added `using element_type = T;` to `Slice<T>::iterator` class (needed for `std::pointer_traits` in LLVM 15 libc++)

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
- `kVTVideoEncoderSpecification_EnableLowLatencyRateControl`
- `SCStreamFrameInfoStatus/ContentRect/BoundingRect/ScaleFactor/DirtyRects/PresenterOverlayContentRect/ContentScale`

**`stubs_extra.m`** - Additional ObjC stubs:
- `objc_alloc_init` (ObjC runtime, macOS 10.15+)
- `AVCaptureDeviceTypeBuiltInWideAngleCamera` (NSString constant, macOS 10.15+)

### 5. ScreenCaptureKit Stub Framework

A minimal `.framework` bundle at `./codex_backport/ScreenCaptureKit.framework/` containing the compiled stubs as a dylib. This satisfies the `-weak_framework ScreenCaptureKit` linker flag.

### 6. webrtc-sys Build Output Patch

Removed `cargo:rustc-link-lib=framework=ScreenCaptureKit` from `target/release/build/webrtc-sys-*/output` (it was re-added later for weak linking via RUSTFLAGS).

## Build Result

- Binary: `./codex/codex-rs/target/release/codex` (155MB)
- Version: `codex-cli 0.120.0`
- Target: `Mach-O 64-bit executable x86_64`
- macOS deployment target: `10.13`
- SDK: `10.14`
- ScreenCaptureKit linked as weak framework via `@executable_path`

## Files in ./codex_backport/

| File | Description |
|---|---|
| `codex` | Final binary |
| `build_final.sh` | Build script |
| `stubs.m` | ObjC class stubs |
| `stubs.c` | C stubs (old) |
| `stubs2.c` | C/CFString stubs |
| `stubs_extra.m` | Additional ObjC stubs |
| `libmacos_compat.a` | Static library of all stubs |
| `ScreenCaptureKit.framework/` | Stub framework bundle |
| `screen_capture_kit_stub.m` | Early version of SCK stubs |

## Runtime Note

The binary uses `-weak_framework ScreenCaptureKit`, so it will start on macOS 10.13 but any code path that calls ScreenCaptureKit APIs will crash. The WebRTC screen capture functionality will not work on 10.13. Other features should work normally.

The stub `__isPlatformVersionAtLeast` always returns 0, so runtime version checks in the prebuilt webrtc binary will behave as if running on an older OS, which should prevent it from calling unavailable APIs.

## Build Time

LTO fat linking (`-C lto=fat -C codegen-units=1`) takes ~45 minutes on this hardware (16GB RAM, Xeon E5).
