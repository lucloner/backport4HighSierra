#!/bin/bash
# Codex CLI macOS 10.13 backport build script (LLVM 13) — codex 0.142.0
# Build process lives in /Users/lucloner/src/backport/codex/
# Run this script; all cargo output goes to /tmp/build_codex_142.log

set -uo pipefail

BACKPORT_DIR=/Users/lucloner/src/backport/codex
LOG=/tmp/build_codex_142.log

export PATH=/Users/lucloner/.cargo/bin:$PATH
export RUSTUP_TOOLCHAIN=stable
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
# Reuse the prebuilt libwebrtc binary extracted by the previous build so webrtc-sys
# does not re-download it through the flaky proxy.
export LK_CUSTOM_WEBRTC=/Users/lucloner/src/codex/codex-rs/target/release/build/scratch-766db70c80e2044b/out/livekit_webrtc/livekit/mac-x64-release-webrtc-24f6822-2/mac-x64-release
export RUSTFLAGS="-L ${BACKPORT_DIR} -C link-arg=-L${BACKPORT_DIR} -C link-arg=-F${BACKPORT_DIR} -C link-arg=-weak_framework -C link-arg=ScreenCaptureKit -C link-arg=-lmacos_compat"

cd /Users/lucloner/src/codex/codex-rs

echo "=== codex 0.142.0 backport build start $(date) ===" > "$LOG"
cargo build --release -p codex-cli >> "$LOG" 2>&1
status=$?
echo "=== cargo exit status: $status ===" >> "$LOG"
if [ "$status" -eq 0 ]; then
  echo "BUILD_DONE_OK" >> "$LOG"
else
  echo "BUILD_DONE_FAIL" >> "$LOG"
fi
date >> "$LOG"
exit $status
