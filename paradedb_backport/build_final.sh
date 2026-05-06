#!/bin/bash
# Build script for pg_search on macOS 10.13 (High Sierra)
# Compiles pg_search v0.22.6 for PostgreSQL 17 using LLVM 15

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
PARADEDB_SRC="./paradedb"
PG_CONFIG="/Applications/Postgres.app/Contents/Versions/17/bin/pg_config"
LLVM_DIR="~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0"
RUST_TOOLCHAIN="1.90.0"
LOGFILE="/tmp/pg_search_build.log"

# ── Toolchain ──────────────────────────────────────────────────
export PATH="${HOME}/.rustup/toolchains/${RUST_TOOLCHAIN}-x86_64-apple-darwin/bin:${PATH}"
export RUSTUP_TOOLCHAIN="${RUST_TOOLCHAIN}"
export MACOSX_DEPLOYMENT_TARGET=10.13

# ── C/C++ Compiler (LLVM 15 for aws-lc-sys AVX512 asm) ────────
export CC="${LLVM_DIR}/bin/clang"
export CXX="${LLVM_DIR}/bin/clang++"
export CFLAGS="-fuse-ld=lld"
export CXXFLAGS="-fuse-ld=lld"

# ── Rust linker flags ──────────────────────────────────────────
# -undefined dynamic_lookup: required for PostgreSQL extensions
#   (PG symbols like pfree, get_attname etc are resolved at runtime
#    when the backend loads the .dylib)
export RUSTFLAGS="-C link-arg=-undefined -C link-arg=dynamic_lookup"

# ── Build ──────────────────────────────────────────────────────
echo "=== Building pg_search for PostgreSQL 17 ===" | tee "${LOGFILE}"
echo "  Rust:  $(rustc --version)" | tee -a "${LOGFILE}"
echo "  CC:    ${CC}" | tee -a "${LOGFILE}"
echo "  PG:    $(${PG_CONFIG} --version)" | tee -a "${LOGFILE}"
echo "" | tee -a "${LOGFILE}"

cd "${PARADEDB_SRC}"

cargo pgrx install \
  --package pg_search \
  --release \
  --pg-config "${PG_CONFIG}" \
  2>&1 | tee -a "${LOGFILE}"

echo "" | tee -a "${LOGFILE}"
echo "=== Build complete ===" | tee -a "${LOGFILE}"
echo "  Extension: $(${PG_CONFIG} --pkglibdir)/pg_search.dylib" | tee -a "${LOGFILE}"
echo "  Control:   $(${PG_CONFIG} --sharedir)/extension/pg_search.control" | tee -a "${LOGFILE}"
date | tee -a "${LOGFILE}"
