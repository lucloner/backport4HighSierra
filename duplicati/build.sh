#!/bin/bash
# Duplicati Build Script for macOS 10.13 (High Sierra)
# 
# This script builds Duplicati from source on macOS 10.13, using the
# .NET 8 SDK with compatibility shims for ____chkstk_darwin and other
# macOS 10.15+ APIs.
#
# Prerequisites:
# - macOS 10.13+ (x86_64)
# - .NET 8 SDK (installed via dotnet-install.sh)
# - ____chkstk_darwin compatibility shim library
# - LLVM 13 (for backported CoreCLR, optional)
#
# Usage:
#   ./build.sh [--skip-sdk-patch] [--skip-build] [--skip-package]
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKPORT_DIR="$(dirname "$SCRIPT_DIR")"
DUPLICATI_SRC="${1:-/Users/lucloner/src/duplicati}"
OUTPUT_DIR="${BACKPORT_DIR}/out/duplicati"
INSTALLER_DIR="${BACKPORT_DIR}/out/duplicati_installer"
DOTNET_ROOT="${DOTNET_ROOT:-/Volumes/Data/src/runtime-8.0/.dotnet}"
DOTNET8_CORECLR="${BACKPORT_DIR}/out/dotnet8-llvm13"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[BUILD]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Step 1: Patch .NET 8 SDK for macOS 10.13 compatibility
patch_dotnet_sdk() {
    log "Patching .NET 8 SDK for macOS 10.13 compatibility..."
    
    # Find all Mach-O binaries in the .NET 8 installation
    local sdk_dir="${DOTNET_ROOT}"
    
    # Remove code signatures (required for DYLD_INSERT_LIBRARIES)
    find "$sdk_dir" -type f -perm +111 | while read f; do
        if file "$f" 2>/dev/null | grep -q "Mach-O"; then
            codesign --remove-signature "$f" 2>/dev/null || true
        fi
    done
    
    # Find and patch all ____chkstk_darwin references
    find "$sdk_dir" -type f -perm +111 | while read f; do
        if file "$f" 2>/dev/null | grep -q "Mach-O"; then
            if nm "$f" 2>/dev/null | grep -q "chkstk_darwin"; then
                log "  Patching $(basename $f)..."
                # Add our chkstk library as a dependency
                python3 "${SCRIPT_DIR}/patch_macho.py" "$f" 2>/dev/null || true
            fi
        fi
    done
    
    # Copy the chkstk compatibility library next to dotnet
    if [ -f "${SCRIPT_DIR}/stubs/libchkstk.dylib" ]; then
        cp "${SCRIPT_DIR}/stubs/libchkstk.dylib" "$sdk_dir/"
    fi
    
    log "SDK patching complete."
}

# Step 2: Build Duplicati
build_duplicati() {
    log "Building Duplicati..."
    
    local version="${2:-2.0.0.1}"
    local build_dir="${SCRIPT_DIR}/build"
    local output_dir="${OUTPUT_DIR}"
    
    mkdir -p "$build_dir" "$output_dir"
    
    # Set up environment for .NET 8 SDK on macOS 10.13
    export DOTNET_ROOT
    export DOTNET_MULTILEVEL_LOOKUP=0
    export MACOSX_DEPLOYMENT_TARGET=10.13
    
    # Use the chkstk compatibility shim
    local chkstk_lib="${SCRIPT_DIR}/stubs/libchkstk.dylib"
    if [ -f "$chkstk_lib" ]; then
        export DYLD_INSERT_LIBRARIES="$chkstk_lib"
        export DYLD_FORCE_FLAT_NAMESPACE=1
    fi
    
    # Build Duplicati GUI (TrayIcon) for macOS x64
    log "Building Duplicati.GUI.TrayIcon (osx-x64)..."
    "$DOTNET_ROOT/dotnet" publish \
        "$DUPLICATI_SRC/Executables/net8/Duplicati.GUI.TrayIcon/Duplicati.GUI.TrayIcon.csproj" \
        -c Release \
        -r osx-x64 \
        -o "$build_dir/osx-x64-gui" \
        --self-contained true \
        -p:AssemblyVersion="$version" \
        -p:Version="$version-debug-$(date +%Y%m%d)" \
        || { err "Build failed!"; return 1; }
    
    # Build Duplicati Command Line for macOS x64
    log "Building Duplicati.CommandLine (osx-x64)..."
    "$DOTNET_ROOT/dotnet" publish \
        "$DUPLICATI_SRC/Executables/net8/Duplicati.CommandLine/Duplicati.CommandLine.csproj" \
        -c Release \
        -r osx-x64 \
        -o "$build_dir/osx-x64-cli" \
        --self-contained true \
        -p:AssemblyVersion="$version" \
        -p:Version="$version-debug-$(date +%Y%m%d)" \
        || { err "Build failed!"; return 1; }
    
    # Build Duplicati Server
    log "Building Duplicati.Server (osx-x64)..."
    "$DOTNET_ROOT/dotnet" publish \
        "$DUPLICATI_SRC/Executables/net8/Duplicati.Server/Duplicati.Server.csproj" \
        -c Release \
        -r osx-x64 \
        -o "$build_dir/osx-x64-server" \
        --self-contained true \
        -p:AssemblyVersion="$version" \
        -p:Version="$version-debug-$(date +%Y%m%d)" \
        || { err "Build failed!"; return 1; }
    
    log "Build complete!"
}

# Step 3: Replace .NET 8 runtime with backported CoreCLR
replace_runtime() {
    log "Replacing .NET 8 runtime with backported CoreCLR..."
    
    local coreclr_dir="${DOTNET8_CORECLR}"
    if [ ! -d "$coreclr_dir" ]; then
        warn "Backported CoreCLR not found at $coreclr_dir, skipping runtime replacement."
        return
    fi
    
    # Find all publish output directories
    for dir in "${SCRIPT_DIR}"/build/*/; do
        local runtime_dir="$dir/publish"
        if [ -d "$runtime_dir" ]; then
            log "  Replacing runtime in $(basename "$dir")..."
            
            # Replace native .NET 8 dylibs with backported ones
            for dylib in "$coreclr_dir"/dylibs/*.dylib; do
                if [ -f "$dylib" ]; then
                    local basename=$(basename "$dylib")
                    if [ -f "$runtime_dir/$basename" ]; then
                        cp "$dylib" "$runtime_dir/$basename"
                    fi
                fi
            done
            
            # Replace singlefilehost if present
            if [ -f "$coreclr_dir/bin/singlefilehost" ] && [ -f "$runtime_dir/singlefilehost" ]; then
                cp "$coreclr_dir/bin/singlefilehost" "$runtime_dir/singlefilehost"
            fi
        fi
    done
    
    log "Runtime replacement complete."
}

# Step 4: Package the output
package_output() {
    log "Packaging output..."
    
    mkdir -p "$OUTPUT_DIR" "$INSTALLER_DIR"
    
    # Copy all build outputs to the output directory
    for dir in "${SCRIPT_DIR}"/build/*/; do
        local target_name=$(basename "$dir")
        if [ -d "$dir" ]; then
            # Create a clean distribution
            cp -r "$dir" "$OUTPUT_DIR/$target_name"
        fi
    done
    
    # Create installer
    log "Creating installer package..."
    
    local version="${1:-2.0.0.1}"
    local pkg_name="duplicati-${version}-osx-x64"
    
    mkdir -p "$INSTALLER_DIR/$pkg_name"
    
    # Copy the GUI distribution (self-contained)
    if [ -d "${SCRIPT_DIR}/build/osx-x64-gui" ]; then
        cp -r "${SCRIPT_DIR}/build/osx-x64-gui/"* "$INSTALLER_DIR/$pkg_name/"
    fi
    
    # Create a launch script
    cat > "$INSTALLER_DIR/$pkg_name/duplicati" << 'LAUNCHEOF'
#!/bin/bash
# Duplicati launch script for macOS 10.13 (High Sierra)
# This script provides ____chkstk_darwin compatibility and sets
# the correct environment for running Duplicati on macOS 10.13.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Set DOTNET_ROOT to the runtime directory
export DOTNET_ROOT="$SCRIPT_DIR"

# Provide ____chkstk_darwin compatibility
CHKSTK_LIB="$SCRIPT_DIR/libchkstk.dylib"
if [ -f "$CHKSTK_LIB" ]; then
    export DYLD_INSERT_LIBRARIES="$CHKSTK_LIB"
    export DYLD_FORCE_FLAT_NAMESPACE=1
fi

# Launch Duplicati Server
exec "$SCRIPT_DIR/Duplicati.Server" "$@"
LAUNCHEOF
    chmod +x "$INSTALLER_DIR/$pkg_name/duplicati"
    
    # Copy chkstk library
    if [ -f "${SCRIPT_DIR}/stubs/libchkstk.dylib" ]; then
        cp "${SCRIPT_DIR}/stubs/libchkstk.dylib" "$INSTALLER_DIR/$pkg_name/"
    fi
    
    # Create README
    cat > "$INSTALLER_DIR/$pkg_name/README.md" << 'READMEEOF'
# Duplicati for macOS 10.13 (High Sierra)

This is a backported build of Duplicati for macOS 10.13 (High Sierra).

## Known Limitations

- CryptoKit is not available; OpenSSL is used as a fallback
- Some features that depend on macOS 10.15+ APIs may not work
- Performance may be slightly reduced compared to newer macOS versions

## Installation

1. Extract the archive
2. Run `./duplicati` to start the server
3. Access the web UI at http://localhost:8200

## Technical Details

This build uses:
- .NET 8 SDK with ____chkstk_darwin compatibility shim
- Backported CoreCLR native components compiled for macOS 10.13
- OpenSSL 3.x for cryptographic operations (replacing CryptoKit)

For build details, see the `duplicati/` directory in the backport repository.
READMEEOF

    log "Packaging complete! Output in: $INSTALLER_DIR/$pkg_name"
}

# Main entry point
main() {
    local skip_sdk_patch=false
    local skip_build=false
    local skip_package=false
    
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-sdk-patch) skip_sdk_patch=true ;;
            --skip-build) skip_build=true ;;
            --skip-package) skip_package=true ;;
            *) echo "Unknown option: $1"; exit 1 ;;
        esac
        shift
    done
    
    log "Duplicati Build for macOS 10.13"
    log "================================"
    log "Source: $DUPLICATI_SRC"
    log "Output: $OUTPUT_DIR"
    log ""
    
    if [ "$skip_sdk_patch" = false ]; then
        patch_dotnet_sdk
    fi
    
    if [ "$skip_build" = false ]; then
        build_duplicati
    fi
    
    if [ "$skip_package" = false ]; then
        replace_runtime
        package_output
    fi
    
    log "All done!"
}

main "$@"
