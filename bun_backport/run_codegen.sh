#!/bin/bash
# Wrapper script to run bun codegen scripts with Node.js
# Usage: run_codegen.sh <script.ts> [args...]
# Environment: TARGET_PLATFORM and TARGET_ARCH are passed through

set -e

SCRIPT="$1"
shift
ARGS="$@"

SRC_DIR="/Volumes/Data/src/bun"
TMP_DIR="/Volumes/Data/src/backport/bun_backport/tmp/codegen"
ESBUILD="/Volumes/Data/src/bun/node_modules/.bin/esbuild"
POLYFILL="/Volumes/Data/src/backport/bun_backport/bun_polyfill.mjs"

# Create temp directory
mkdir -p "$TMP_DIR"

# Derive output filename from input
BASENAME=$(echo "$SCRIPT" | sed 's|/|_|g' | sed 's|\.ts$||')
OUTFILE="$TMP_DIR/$BASENAME.js"

# Get the directory of the source script for import.meta.dirname
SCRIPT_DIR=$(dirname "$SCRIPT")

# Transpile with esbuild, bundling but injecting correct paths
"$ESBUILD" "$SCRIPT" \
  --bundle \
  --platform=node \
  --format=esm \
  --outfile="$OUTFILE" \
  --external:node:* \
  --define:import.meta.dirname="'$SCRIPT_DIR'" \
  --define:import.meta.filename="'$SCRIPT'" \
  2>/dev/null

if [ $? -ne 0 ]; then
  echo "Error: esbuild failed to transpile $SCRIPT" >&2
  exit 1
fi

# Run the transpiled JS with Node.js + polyfill
cd "$SRC_DIR" && node --import "$POLYFILL" "$OUTFILE" $ARGS
