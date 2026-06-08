#!/bin/bash
# Codegen runner - replaces "bun run" with esbuild + Node.js
# Special handling for scripts that need non-polyfillable Bun APIs
set -e

if [ "$1" = "run" ]; then shift; fi

SCRIPT="$1"
shift
ARGS="$@"

SRC_DIR="/Volumes/Data/src/bun"
TMP_DIR="/Volumes/Data/src/backport/bun_backport/tmp/codegen"
ESBUILD="/Volumes/Data/src/bun/node_modules/.bin/esbuild"
POLYFILL="/Volumes/Data/src/backport/bun_backport/bun_polyfill.mjs"
BUN_TEST_STUB="/Volumes/Data/src/backport/bun_backport/stubs/bun_test.mjs"
BUN_STUB="/Volumes/Data/src/backport/bun_backport/stubs/bun_runtime.mjs"
PERL_HASH_TABLE="/Volumes/Data/src/bun/src/codegen/create_hash_table"

# Special handling for create-hash-table.ts
if echo "$SCRIPT" | grep -q 'create-hash-table'; then
  INPUT="$1"
  OUTPUT="$2"
  
  if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
    echo "Error: create-hash-table needs input and output args" >&2
    exit 1
  fi
  
  echo "Generating $OUTPUT from $INPUT" >&2
  
  # Extract @begin...@end sections and pipe to Perl
  perl -0777 -ne 'while (/\@begin\s+.+?\@end/gs) { print "$&\n"; }' "$INPUT" | \
    perl "$PERL_HASH_TABLE" - > "$OUTPUT" 2>/dev/null
  
  if [ -s "$OUTPUT" ]; then
    exit 0
  else
    echo "Warning: Perl script produced empty output for $INPUT, creating stub" >&2
    TABLE_NAME=$(basename "$OUTPUT" .lut.h)
    echo "// Generated stub for $TABLE_NAME" > "$OUTPUT"
    echo "#ifndef ${TABLE_NAME}_h" >> "$OUTPUT"
    echo "#define ${TABLE_NAME}_h" >> "$OUTPUT"
    echo "#endif" >> "$OUTPUT"
    exit 0
  fi
fi

# Special handling for bundle-modules.ts - skip it
if echo "$SCRIPT" | grep -q 'bundle-modules'; then
  echo "Skipping bundle-modules (needs Bun.build/Bun.Transpiler)" >&2
  exit 0
fi

# General case: use esbuild + Node.js polyfill
mkdir -p "$TMP_DIR"

BASENAME=$(echo "$SCRIPT" | sed 's|/|_|g' | sed 's|\.ts$||')
OUTFILE="$TMP_DIR/$BASENAME.js"
SCRIPT_DIR=$(cd "$(dirname "$SCRIPT")" && pwd)

"$ESBUILD" "$SCRIPT" \
  --bundle \
  --platform=node \
  --format=esm \
  --alias:bindgenv2=./src/codegen/bindgenv2/lib.ts \
  --alias:bindgen=./src/codegen/bindgen-lib.ts \
  --alias:bun:test="$BUN_TEST_STUB" \
  --alias:bun="$BUN_STUB" \
  --external:bun \
  --external:bun:test \
  --external:bun:sqlite \
  --define:import.meta.dirname="'$SCRIPT_DIR'" \
  --define:import.meta.filename="'$SCRIPT'" \
  --define:import.meta.url="'file://$SCRIPT'" \
  --log-level=error \
  --outfile="$OUTFILE" \
  2>&1

ESBUILD_RC=$?
if [ $ESBUILD_RC -ne 0 ]; then
  echo "Error: esbuild failed to transpile $SCRIPT" >&2
  exit 1
fi

cd "$SRC_DIR" && node --import "$POLYFILL" "$OUTFILE" $ARGS
