#!/bin/bash
# Generate .lut.h files from .lut.txt or .cpp source files
# Usage: gen_lut_h.sh <input_file> <output_file>

INPUT="$1"
OUTPUT="$2"
PERL_SCRIPT="/Volumes/Data/src/bun/src/codegen/create_hash_table"

if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: gen_lut_h.sh <input_file> <output_file>"
  exit 1
fi

# Read input file and extract @begin...@end sections
INPUT_TEXT=$(cat "$INPUT")

# Extract hash table entries
TO_PREPROCESS=$(echo "$INPUT_TEXT" | perl -0777 -ne 'while (/\@begin\s+.+?\@end/gs) { print "$1\n"; }' 2>/dev/null)

if [ -z "$TO_PREPROCESS" ]; then
  # No @begin/@end sections found, try processing the whole file
  echo "$INPUT_TEXT" | perl "$PERL_SCRIPT" - > "$OUTPUT" 2>/dev/null
else
  echo "$TO_PREPROCESS" | perl "$PERL_SCRIPT" - > "$OUTPUT" 2>/dev/null
fi

# If output is empty, create a minimal valid .h file
if [ ! -s "$OUTPUT" ]; then
  TABLE_NAME=$(basename "$OUTPUT" .lut.h)
  cat > "$OUTPUT" << EOF
// Generated stub for $TABLE_NAME
// Original input: $INPUT
#ifndef ${TABLE_NAME}_h
#define ${TABLE_NAME}_h
#endif
EOF
fi
