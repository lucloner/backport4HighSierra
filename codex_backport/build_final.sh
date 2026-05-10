#!/bin/bash
set -euo pipefail

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

cd /Users/lucloner/src/codex/codex-rs
cargo build --release -p codex-cli 2>&1 | tee /tmp/build_codex.log
echo DONE >> /tmp/build_codex.log
date >> /tmp/build_codex.log
