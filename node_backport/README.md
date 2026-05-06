# Node.js 24 Backport for macOS 10.13 + Xcode 10 / LLVM 15

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。

## Problem
Node.js 24 (v24.15.0) requires macOS 13.5+ SDK and full C++20 support. This backport enables building on macOS 10.13 (High Sierra) with Xcode 10's SDK and LLVM 15 as the compiler.

## Prerequisites
- macOS 10.13+ (High Sierra or later)
- Xcode 10 (for macOS 10.14 SDK)
- LLVM 15 prebuilt binary at `~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0`
- Python 3.6+

## Files

### `ranges_compat.h`
Compatibility shim providing `std::ranges` algorithms and views that LLVM 15's libc++ doesn't implement:
- Algorithms: `all_of`, `any_of`, `none_of`, `find_if`, `find_if_not`, `replace`, `stable_sort`, `sort`, `for_each`, `lower_bound`
- Views: `ref_view`, `subrange`, `elements_view`, `keys_view`, `keys`, `values`, `iota`, `split`

### `0002-all-source-fixes.patch`
Git patch with all source code modifications:

1. **common.gypi** - Set `MACOSX_DEPLOYMENT_TARGET` to `10.14` (from 13.5), add `-isysroot` flag
2. **deps/ncrypto/ncrypto.cc** - Add missing `#include <vector>`
3. **tools/v8_gypfiles/v8.gyp** - Disable simdutf AVX-512 Icelake path (`SIMDUTF_IMPLEMENTATION_ICELAKE=0`)
4. **deps/ada/ada.h, ada.cpp** - Include `ranges_compat.h` after `<ranges>`
5. **deps/v8/src/base/vector.h** - Replace `std::make_unique_for_overwrite` with `std::make_unique`
6. **deps/v8/src/base/template-meta-programming/list.h** - Add missing `typename` keywords
7. **deps/v8/src/objects/objects.h** - Add missing `typename` keywords for `HandleType<>::MaybeType`
8. **deps/v8/src/objects/ordered-hash-table.h** - Add missing `typename` keywords
9. **deps/v8/src/heap/factory-base.h, factory-base.cc** - Add missing `typename` keywords
10. **deps/v8/src/heap/mark-compact.h, mark-compact.cc** - Add missing `typename` for `WeakObjectWorklist`
11. **deps/v8/src/heap/heap-visitor.h, heap-visitor-inl.h** - Remove `requires` clauses referencing `UsePrecomputedObjectSize`
12. **deps/v8/src/heap/concurrent-marking.cc** - Add `using` for `UsePrecomputedObjectSize`
13. **deps/v8/src/heap/young-generation-marking-visitor.h** - Add `using` for `UsePrecomputedObjectSize`
14. **deps/v8/src/heap/safepoint.h** - Add constructors to `RunningLocalHeap`
15. **deps/v8/src/sandbox/external-entity-table.h** - Add missing `typename` for `Base::` types
16. **deps/v8/src/wasm/value-type.h** - Use brace initialization for `TypeIndex`
17. **src/node_builtins.h, src/util.h, src/util-inl.h, src/node_options-inl.h** - Include `ranges_compat.h`
18. **deps/v8/src/objects/descriptor-array-inl.h, transitions-inl.h** - Include `ranges_compat.h`

### `build.sh`
Automated build script that applies patches and builds with LLVM 15.

## How to Build

```bash
# 1. Place LLVM 15 at ~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。

# 2. Run the build script:

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。
~/node_backport/build.sh ./node

# Or manually:

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。
cd ./node
git apply ~/node_backport/0002-all-source-fixes.patch
export LLVM=~/llvm/clang+llvm-15.0.7-x86_64-apple-darwin21.0
CC=$LLVM/bin/clang CXX=$LLVM/bin/clang++ ./configure
make -j3
```

## Known Issues (Work in Progress)
- `std::views::split` in `src/node_v8_platform-inl.h` needs a proper implementation (currently a placeholder that passes the range through)
- LLVM 15 may crash on some complex template instantiations (e.g., `json-stringifier.cc`) — retry with `-j1` if this happens
- The `ranges_compat.h` is included via absolute path `~/node_backport/ranges_compat.h` — adjust if your layout differs
