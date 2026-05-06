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
cd ~/src/codex/codex-rs
cargo build --release -p codex-cli >> /tmp/build_final.log 2>&1
echo DONE >> /tmp/build_final.log
date >> /tmp/build_final.log
