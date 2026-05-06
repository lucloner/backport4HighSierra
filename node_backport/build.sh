#!/bin/bash
set -e

NODE_SRC="${1:-./node}"
LLVM_DIR="${2:-~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0}"
BACKPORT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Node.js 24 Backport Build Script ==="
echo "Node source: $NODE_SRC"
echo "LLVM dir:   $LLVM_DIR"
echo "Backport:   $BACKPORT_DIR"
echo ""

# Verify LLVM 15 exists
if [ ! -f "$LLVM_DIR/bin/clang++" ]; then
    echo "ERROR: LLVM 15 clang++ not found at $LLVM_DIR/bin/clang++"
    exit 1
fi

# Step 1: Apply patches
echo "[1/5] Applying source patches..."
cd "$NODE_SRC"
if [ -f "$BACKPORT_DIR/0002-all-source-fixes.patch" ]; then
    git apply --check "$BACKPORT_DIR/0002-all-source-fixes.patch" 2>/dev/null && \
    git apply "$BACKPORT_DIR/0002-all-source-fixes.patch" || \
    echo "  Patches may already be applied, skipping."
fi

# Step 2: Copy ranges_compat.h
echo "[2/5] Copying ranges_compat.h..."
cp "$BACKPORT_DIR/ranges_compat.h" ~/node_backport/ranges_compat.h

# Step 3: Configure
echo "[3/5] Configuring..."
export CC="$LLVM_DIR/bin/clang"
export CXX="$LLVM_DIR/bin/clang++"
./configure

# Step 4: Build
echo "[4/5] Building (3 threads)..."
make -j3

# Step 5: Verify
echo "[5/5] Verifying..."
./out/Release/node --version

echo ""
echo "=== Build complete! ==="
