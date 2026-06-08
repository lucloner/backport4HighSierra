#!/bin/bash
# Build LLVM 21.1.8 from source on macOS 10.13 using LLVM 15 as bootstrap compiler
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRCROOT="/Volumes/Data/src/llvm/llvm-project-21.1.8.src"
BUILDDIR="/Volumes/Data/src/llvm/build-llvm21"
NCPUS=$(sysctl -n hw.ncpu)

LLVM15_DIR="/Volumes/Data/src/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0"
CLANG15="$LLVM15_DIR/bin/clang"
CLANGXX15="$LLVM15_DIR/bin/clang++"

SYSROOT="/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX10.14.sdk"
MACOSX_DEPLOYMENT_TARGET="10.13"

echo "=== LLVM 21.1.8 Bootstrap Build on macOS 10.13 ==="
echo "Source:  $SRCROOT"
echo "Build:   $BUILDDIR"
echo "CC:      $CLANG15"
echo "CXX:     $CLANGXX15"
echo "NCPUS:   $NCPUS"
echo ""

# Verify LLVM 15 exists
if [ ! -f "$CLANGXX15" ]; then
    echo "ERROR: LLVM 15 clang++ not found at $CLANGXX15"
    exit 1
fi

# Step 1: CMake configure
echo "[1/2] CMake configure..."
rm -rf "$BUILDDIR"
mkdir -p "$BUILDDIR"
cd "$BUILDDIR"

cmake "$SRCROOT/llvm" \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_OSX_ARCHITECTURES=x86_64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=10.13 \
  -DCMAKE_OSX_SYSROOT="$SYSROOT" \
  -DCMAKE_C_COMPILER="$CLANG15" \
  -DCMAKE_CXX_COMPILER="$CLANGXX15" \
  -DCMAKE_C_FLAGS="-fuse-ld=lld" \
  -DCMAKE_CXX_FLAGS="-fuse-ld=lld -isystem $LLVM15_DIR/include/c++/v1" \
  -DCMAKE_EXE_LINKER_FLAGS="-fuse-ld=lld -L$LLVM15_DIR/lib" \
  -DCMAKE_SHARED_LINKER_FLAGS="-fuse-ld=lld -L$LLVM15_DIR/lib" \
  -DCMAKE_MODULE_LINKER_FLAGS="-fuse-ld=lld -L$LLVM15_DIR/lib" \
  -DLLVM_ENABLE_PROJECTS="clang;lld" \
  -DLLVM_ENABLE_RUNTIMES="libcxx;libcxxabi;compiler-rt" \
  -DLLVM_TARGETS_TO_BUILD="X86" \
  -DLLVM_BUILD_RUNTIME=ON \
  -DLLVM_BUILD_TOOLS=ON \
  -DLLVM_BUILD_UTILS=OFF \
  -DLLVM_BUILD_TESTS=OFF \
  -DLLVM_BUILD_BENCHMARKS=OFF \
  -DLLVM_BUILD_DOCS=OFF \
  -DLLVM_INCLUDE_TESTS=OFF \
  -DLLVM_INCLUDE_BENCHMARKS=OFF \
  -DLLVM_INCLUDE_DOCS=OFF \
  -DLLVM_INCLUDE_EXAMPLES=OFF \
  -DCLANG_BUILD_TOOLS=ON \
  -DCLANG_INCLUDE_DOCS=OFF \
  -DCLANG_INCLUDE_TESTS=OFF \
  -DLLD_BUILD_TOOLS=ON \
  -DLLVM_ENABLE_ASSERTIONS=OFF \
  -DLLVM_ENABLE_BINDINGS=OFF \
  -DLLVM_ENABLE_IDE=OFF \
  -DLLVM_ENABLE_PIC=ON \
  -DLLVM_ENABLE_RTTI=ON \
  -DLLVM_ENABLE_THREADS=ON \
  -DLLVM_ENABLE_ZLIB=OFF \
  -DLLVM_ENABLE_ZSTD=OFF \
  -DLLVM_ENABLE_TERMINFO=OFF \
  -DLLDB_ENABLE_PYTHON=OFF \
  -DCOMPILER_RT_BUILD_SANITIZERS=OFF \
  -DCOMPILER_RT_BUILD_XRAY=OFF \
  -DCOMPILER_RT_BUILD_LIBFUZZER=OFF \
  -DCOMPILER_RT_BUILD_MEMPROF=OFF \
  -DCOMPILER_RT_BUILD_ORC=OFF \
  -DCOMPILER_RT_BUILD_GWP_ASAN=OFF \
  -DLIBCXX_ENABLE_SHARED=OFF \
  -DLIBCXX_ENABLE_STATIC=ON \
  -DLIBCXXABI_ENABLE_SHARED=OFF \
  -DLIBCXXABI_ENABLE_STATIC=ON \
  -DLIBCXX_CXX_ABI=libcxxabi \
  2>&1 | tee "$SCRIPT_DIR/tmp/llvm21-cmake.log"

echo ""
echo "[2/2] Building (using $NCPUS CPUs)..."
echo "This will take several hours. Build log: $SCRIPT_DIR/tmp/llvm21-build.log"
make -j$NCPUS 2>&1 | tee "$SCRIPT_DIR/tmp/llvm21-build.log"

echo ""
echo "=== LLVM 21 Build Complete ==="
echo "Binary: $BUILDDIR/bin/clang"
echo "LLD:    $BUILDDIR/bin/ld64.lld"
echo ""

# Verify
"$BUILDDIR/bin/clang" --version
