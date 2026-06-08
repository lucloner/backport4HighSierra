# Bun v1.3.14 macOS 10.13 Backport - Current Status

## What Works
- LLVM 21 compiled from source (clang 21.1.8, lld 21.1.8)
- Zig binary running on macOS 10.13 (via `_aligned_alloc` shim)
- npm dependencies installed
- C++ compilation: 732 .o files compiled successfully
- Several codegen scripts working:
  - `generate-node-errors.ts` ✅
  - `generate-classes.ts` ✅ (via esbuild+Node.js polyfill)
  - `cppbind.ts` ✅
  - `ci_info.ts` ✅
  - `bindgen.ts` ✅ (partial - generates files but some are empty)
  - `JSSink.ts` ✅

## What Doesn't Work Yet
- **bundle-modules.ts**: Needs Bun.Transpiler, Bun.build, Bun.Glob, Bun.spawn - deeply integrated Bun APIs
- **create-hash-table.ts**: Needs streaming Bun.spawn for piping to Perl script
- **bindgenv2**: `instanceof NamedType` check fails across module boundaries
- **C++ standard library**: Build.ninja needs `-isystem` for libc++ headers (partially fixed)
- **Deployment target**: Changed from 10.14 to 10.13 in build.ninja

## Key Files
| File | Purpose |
|------|---------|
| `aligned_alloc_shim.dylib` | Provides `_aligned_alloc` symbol for Zig |
| `zig-wrapper.sh` | Wrapper for zig binary that sets DYLD env vars |
| `bun_polyfill.mjs` | Node.js polyfill for Bun APIs |
| `codegen_runner.sh` | esbuild + Node.js runner for codegen scripts |
| `bun_test.mjs` | Stub for bun:test module |
| `bun_runtime.mjs` | Stub for bun runtime module |

## Next Steps
1. Fix C++ standard library include paths (partially done)
2. Fix remaining codegen scripts or create stub outputs
3. Complete C++ compilation
4. Compile Zig code
5. Link the final binary
6. Test the binary on macOS 10.13
