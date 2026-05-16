#!/bin/bash
# Build .NET 8 CoreCLR native components on macOS 10.13 using LLVM 13
set -e

SRCROOT="${1:-/Volumes/Data/src/runtime-8.0}"
BUILDDIR="$SRCROOT/artifacts/obj/coreclr/x64/Release"
SYSROOT="/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX10.14.sdk"
OPENSSL="/usr/local/opt/openssl@3"
NCPUS=$(sysctl -n hw.ncpu)

LLVM13_DIR="/Volumes/Data/src/llvm/build-llvm13"
CLANG13="$LLVM13_DIR/bin/clang"
CLANGXX13="$LLVM13_DIR/bin/clang++"
DSYMUTIL13="$LLVM13_DIR/bin/dsymutil"
LIBCXX_INC="/Volumes/Data/src/llvm/clang+llvm-13.0.1-x86_64-apple-darwin/include/c++/v1"

echo "=== .NET 8 CoreCLR Build with LLVM 13 ==="
echo "Source: $SRCROOT"
echo "Build:  $BUILDDIR"
echo "CC:     $CLANG13"
echo "CXX:    $CLANGXX13"

# Step 1: Reset and apply patches
echo "[1/5] Applying patches..."
cd "$SRCROOT" && git checkout -- .
for p in 01-deployment-target.patch 02-cryptokit-openssl-fallback.patch 04-const-correctness.patch 05-singlefilehost-openssl.patch 06-remove-crypto-apple-hostpolicy.patch; do
  if [ -f "$(dirname "$0")/$p" ]; then
    echo "  Applying $p"
    cd "$SRCROOT" && git apply --ignore-whitespace "$(dirname "$0")/$p"
  fi
done

# Step 2: Create version stubs
echo "[2/5] Creating version stubs..."
mkdir -p "$SRCROOT/artifacts/obj"
SCRIPTDIR="$(cd "$(dirname "$0")" && pwd)"
cp "$SCRIPTDIR/version_stub__version.h" "$SRCROOT/artifacts/obj/_version.h"
cp "$SCRIPTDIR/version_stub__version.c" "$SRCROOT/artifacts/obj/_version.c"
cp "$SCRIPTDIR/version_stub_runtime_version.h" "$SRCROOT/artifacts/obj/runtime_version.h"

# Step 3: CMake configure with LLVM 13
echo "[3/5] CMake configure (LLVM 13)..."
rm -rf "$BUILDDIR"
mkdir -p "$BUILDDIR"
cd "$BUILDDIR"

cmake "$SRCROOT/src/coreclr" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=x86_64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=10.13 \
  -DCMAKE_OSX_SYSROOT="$SYSROOT" \
  -DCMAKE_C_COMPILER="$CLANG13" \
  -DCMAKE_CXX_COMPILER="$CLANGXX13" \
  -DCMAKE_CXX_FLAGS="-isystem $LIBCXX_INC -mlinker-version=409.12" \
  -DCMAKE_C_FLAGS="-mlinker-version=409.12" \
  -DCMAKE_EXE_LINKER_FLAGS="-mlinker-version=409.12" \
  -DCMAKE_SHARED_LINKER_FLAGS="-mlinker-version=409.12" \
  -DCMAKE_MODULE_LINKER_FLAGS="-mlinker-version=409.12" \
  -DDSYMUTIL="$DSYMUTIL13" \
  -DNUGET_PACKAGE_ROOT="$SRCROOT/.packages" \
  -DCLR_ENG_NATIVE_DIR="$SRCROOT/eng/native" \
  -DCLI_CMAKE_PKG_RID=osx.10.13-x64 \
  -DCLI_CMAKE_FALLBACK_OS=osx \
  -DCLI_CMAKE_COMMIT_HASH=custom \
  -DOPENSSL_ROOT_DIR="$OPENSSL" \
  -DOPENSSL_INCLUDE_DIR="$OPENSSL/include"

# Step 4: Build
echo "[4/5] Building (using $NCPUS CPUs)..."
make -j$NCPUS 2>&1 | tee build.log

# Step 5: Copy outputs
echo "[5/5] Collecting outputs..."
OUTDIR="$(dirname "$0")/../out/dotnet8-llvm13"
mkdir -p "$OUTDIR/dylibs" "$OUTDIR/bin" "$OUTDIR/static-libs" "$OUTDIR/native-libs" "$OUTDIR/debug"
find "$BUILDDIR" -name "*.dylib" -exec cp {} "$OUTDIR/dylibs/" \;
find "$BUILDDIR" -maxdepth 4 -type f -perm +111 | while read f; do
  if file "$f" | grep -q "Mach-O.*executable"; then
    cp "$f" "$OUTDIR/bin/"
  fi
done
find "$BUILDDIR" -name "libcoreclr_static.a" -exec cp {} "$OUTDIR/static-libs/" \;
find "$BUILDDIR/libs-native" -name "*.a" -exec cp {} "$OUTDIR/native-libs/" \;
find "$BUILDDIR" -name "*.dwarf" -exec cp {} "$OUTDIR/debug/" \;

echo "=== Done ==="
echo "Outputs in: $OUTDIR"
