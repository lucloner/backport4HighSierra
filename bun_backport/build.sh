#!/bin/bash
# Build Bun v1.3.14 on macOS 10.13 using LLVM 21
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUN_SRC="${1:-/Volumes/Data/src/bun}"
LLVM21_DIR="/Volumes/Data/src/llvm/build-llvm21"
SYSROOT="/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX10.14.sdk"
NCPUS=$(sysctl -n hw.ncpu)

echo "=== Bun v1.3.14 macOS 10.13 Backport Build ==="
echo "Source:  $BUN_SRC"
echo "LLVM21: $LLVM21_DIR"
echo "NCPUS:  $NCPUS"
echo ""

# Verify LLVM 21 exists
if [ ! -f "$LLVM21_DIR/bin/clang" ]; then
    echo "ERROR: LLVM 21 clang not found at $LLVM21_DIR/bin/clang"
    echo "Run build_llvm21.sh first."
    exit 1
fi

# Step 1: Apply patches
echo "[1/6] Applying source patches..."
cd "$BUN_SRC"

# Patch deployment target
if grep -q '"13.0"' scripts/build/config.ts 2>/dev/null; then
    echo "  Patching MIN_OSX_DEPLOYMENT_TARGET..."
    sed -i '' 's/const MIN_OSX_DEPLOYMENT_TARGET = "13.0"/const MIN_OSX_DEPLOYMENT_TARGET = "10.13"/' scripts/build/config.ts
fi

# Patch Zig version
if grep -q '\.major = 13, \.minor = 0' build.zig 2>/dev/null; then
    echo "  Patching zig os_version_min..."
    sed -i '' 's/\.major = 13, \.minor = 0, \.patch = 0/.major = 10, .minor = 13, .patch = 0/' build.zig
fi

# Patch LLVM version range
if grep -q 'LLVM_MAJOR}.*LLVM_MINOR}.0.*LLVM_MAJOR}.*LLVM_MINOR}.99' scripts/build/tools.ts 2>/dev/null; then
    echo "  Patching LLVM_VERSION_RANGE..."
    sed -i '' "s/const LLVM_VERSION_RANGE = \`\${LLVM_MAJOR}.\${LLVM_MINOR}.0 <\${LLVM_MAJOR}.\${LLVM_MINOR}.99\`/const LLVM_VERSION_RANGE = \`>=21.0.0 <22.0.0\`/" scripts/build/tools.ts
fi

# Patch LLVM search paths
if ! grep -q "build-llvm21" scripts/build/tools.ts 2>/dev/null; then
    echo "  Adding custom LLVM path..."
    sed -i '' '/opt\/llvm@.*LLVM_MAJOR/a\
    paths.push("/Volumes/Data/src/llvm/build-llvm21/bin");' scripts/build/tools.ts
fi

# Patch SDK version parsing
if ! grep -q "verMatch" scripts/build/config.ts 2>/dev/null; then
    echo "  Patching SDK version parsing..."
    sed -i '' 's/const major = sdkVersion.match.*\[1\];/const verMatch = sdkVersion.match(\/^(\\d+\\.\\d+)\/);\n    const major = sdkVersion.match(\/^(\\d+)\/)?.[1];/' scripts/build/config.ts
    sed -i '' 's/osxDeploymentTarget = major;/osxDeploymentTarget = verMatch ? verMatch[1] : major;/' scripts/build/config.ts
fi

# Step 2: Set environment
echo "[2/6] Setting environment..."
export CC="$LLVM21_DIR/bin/clang"
export CXX="$LLVM21_DIR/bin/clang++"
export MACOSX_DEPLOYMENT_TARGET=10.13
export PATH="$LLVM21_DIR/bin:$PATH"

# Step 3: Zig setup
echo "[3/6] Zig compiler setup..."
if [ -n "$BUN_ZIG_PATH" ] && [ -d "$BUN_ZIG_PATH" ]; then
    echo "  Using custom Zig: $BUN_ZIG_PATH"
else
    echo "  WARNING: BUN_ZIG_PATH not set. Build will try to download prebuilt Zig."
    echo "  Prebuilt Zig may not work on macOS 10.13."
fi

# Step 4: WebKit setup
echo "[4/6] WebKit/JSC setup..."
if [ -n "$BUN_WEBKIT_PATH" ] && [ -d "$BUN_WEBKIT_PATH" ]; then
    echo "  Using local WebKit: $BUN_WEBKIT_PATH"
    WEBKIT_FLAG="--webkit=local"
else
    echo "  WARNING: BUN_WEBKIT_PATH not set. Build will try to download prebuilt WebKit."
    echo "  Prebuilt WebKit may not work on macOS 10.13."
    WEBKIT_FLAG=""
fi

# Step 5: Configure
echo "[5/6] Configure (generate build.ninja)..."
mkdir -p "$SCRIPT_DIR/tmp"
node --experimental-strip-types "$BUN_SRC/scripts/build.ts" \
    --profile=release \
    $WEBKIT_FLAG \
    --configure-only \
    2>&1 | tee "$SCRIPT_DIR/tmp/bun-configure.log"

# Step 6: Build
echo "[6/6] Building..."
ninja -C "$BUN_SRC/build/release" 2>&1 | tee "$SCRIPT_DIR/tmp/bun-build.log"

# Copy output
mkdir -p /Volumes/Data/src/backport/out/bun
cp "$BUN_SRC/build/release/bun" /Volumes/Data/src/backport/out/bun/bun 2>/dev/null || true

echo ""
echo "=== Build Complete ==="
echo "Output: /Volumes/Data/src/backport/out/bun/bun"
