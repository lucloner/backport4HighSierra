#!/bin/bash
# Recompile the macOS 10.13 compatibility stubs into libmacos_compat.a
# and the ScreenCaptureKit stub framework, using LLVM 13.
# Run from /Users/lucloner/src/backport/codex/

set -euo pipefail

CLANG=/Users/lucloner/llvm/build-llvm13/bin/clang
CXXHDR=-isystem /Users/lucloner/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1
FWFLAGS="-F. $CXXHDR"

# 1) Compile stub object files with LLVM 13 clang
$CLANG -c stubs.m      -o stubs_m.o      $FWFLAGS
$CLANG -c stubs2.c     -o stubs2_c.o     $FWFLAGS
$CLANG -c stubs_extra.m -o stubs_extra_m.o $FWFLAGS

# 2) Static archive linked via -lmacos_compat
ar rcs libmacos_compat.a stubs_m.o stubs2_c.o stubs_extra_m.o

# 3) ScreenCaptureKit stub framework dylib (weak-linked at runtime)
FW=ScreenCaptureKit.framework/Versions/A
mkdir -p "$FW"
$CLANG -dynamiclib \
  -install_name @rpath/ScreenCaptureKit.framework/Versions/A/ScreenCaptureKit \
  -framework Foundation -framework CoreFoundation -lobjc \
  $FWFLAGS stubs_m.o stubs2_c.o stubs_extra_m.o \
  -o "$FW/ScreenCaptureKit"
ln -sf Versions/A/ScreenCaptureKit ScreenCaptureKit.framework/ScreenCaptureKit

echo "stubs rebuilt -> libmacos_compat.a + ScreenCaptureKit.framework"
