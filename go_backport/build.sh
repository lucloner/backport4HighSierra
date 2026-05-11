#!/bin/bash
# Go 1.26.3 macOS 10.13 Backport Build Script
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
GOROOT_SRC="${GOROOT_SRC:-/Volumes/Data/src/go}"
GOROOT_BOOTSTRAP="${GOROOT_BOOTSTRAP:-/usr/local/Cellar/go/1.24.6/libexec}"
MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-10.13}"

echo "=== Go 1.26.3 macOS 10.13 Backport Build ==="
echo ""
echo "GOROOT_SRC:           $GOROOT_SRC"
echo "GOROOT_BOOTSTRAP:      $GOROOT_BOOTSTRAP"
echo "MACOSX_DEPLOYMENT_TARGET: $MACOSX_DEPLOYMENT_TARGET"
echo ""

# Apply patches if not already applied
cd "$GOROOT_SRC"

# Check if patches are already applied
if grep -q "10.13.0 (backport)" src/cmd/link/internal/ld/macho.go 2>/dev/null; then
    echo "Patches already applied, skipping."
else
    echo "Applying patches..."
    git apply "$SCRIPT_DIR/0001-macho-min-version.patch" || true
    git apply "$SCRIPT_DIR/0002-security-api-backport.patch" || true
    git apply "$SCRIPT_DIR/0003-root-darwin-backport.patch" || true
    echo "Patches applied."
fi

echo ""
echo "Building Go..."
cd "$GOROOT_SRC/src"
GOROOT_BOOTSTRAP="$GOROOT_BOOTSTRAP" \
CGO_ENABLED=1 \
MACOSX_DEPLOYMENT_TARGET="$MACOSX_DEPLOYMENT_TARGET" \
./make.bash

echo ""
echo "Build complete!"
echo "Binary: $GOROOT_SRC/bin/go"
echo ""

# Copy binary to output directory
mkdir -p "$SCRIPT_DIR"
cp "$GOROOT_SRC/bin/go" "$SCRIPT_DIR/go"
echo "Binary copied to $SCRIPT_DIR/go"

# Verify
echo ""
echo "=== Verification ==="
"$GOROOT_SRC/bin/go" version
otool -l "$GOROOT_SRC/bin/go" | grep -A4 "LC_BUILD_VERSION" | head -5
