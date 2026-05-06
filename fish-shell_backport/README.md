# fish-shell backport for macOS 10.13 + CMake 4.x

> **⚠️ 注意**：本文档由 AI 生成，大致编译方法正确，但具体路径、版本号等细节仅供参考，实际执行时需根据自身环境调整。

## 环境

- **fish-shell**: 3.7.1 (git tag 3.7.1)
- **macOS**: 10.13.6 (High Sierra)
- **Xcode**: 10.0 (AppleClang 10.0.0.10001145)
- **CMake**: 4.1.0
- **PCRE2**: 系统 pcre2-8 (/usr/local)

## 编译问题与修复

### 问题 1: CMake CMP0037 策略错误（致命）

**文件**: `cmake/Tests.cmake`
**错误信息**:
```
CMake Error at cmake/Tests.cmake:48 (cmake_policy):
  Policy CMP0037 may not be set to OLD behavior because this version of CMake
  no longer supports it.
CMake Error at cmake/Tests.cmake:49 (add_custom_target):
  The target name "test" is reserved when CTest testing is enabled.
```

**原因**: CMake 4.x 不再允许将 CMP0037 设为 OLD 行为。当 `enable_testing()` 被调用后，目标名 "test" 被保留，不能用于自定义目标。fish 3.7.1 仍使用 `cmake_policy(SET CMP0037 OLD)` 来创建 `test` 别名目标。

**修复**: 删除 `cmake_policy(PUSH/POP)` 和 `add_custom_target(test ...)` 块，替换为注释说明用户应使用 `fish_run_tests` 目标代替。

### 问题 2: add_custom_command 缺少 POST_BUILD 关键字（警告 → 兼容性修复）

**文件**: `cmake/Tests.cmake`
**警告信息**:
```
Exactly one of PRE_BUILD, PRE_LINK, or POST_BUILD must be given.
Assuming POST_BUILD to preserve backward compatibility.
```

**原因**: CMake 4.x 中 `add_custom_command(TARGET ...)` 必须明确指定 `POST_BUILD`、`PRE_BUILD` 或 `PRE_LINK`，不再默认假设。

**修复**: 在 `add_custom_command(TARGET funcs_dir ...)` 和 `add_custom_command(TARGET tests_dir ...)` 中添加 `POST_BUILD` 关键字。

### 问题 3: C++ `<cmath>` 编译错误（致命，13 个错误）

**文件**: 新建 `src/fix_cmath_darwin.h`，修改 `CMakeLists.txt`
**错误信息**:
```
cmath:313:9: error: no member named 'signbit' in the global namespace
cmath:314:9: error: no member named 'fpclassify' in the global namespace
cmath:315:9: error: no member named 'isfinite' in the global namespace
cmath:316:9: error: no member named 'isinf' in the global namespace
cmath:317:9: error: no member named 'isnan' in the global namespace
... (共 13 个类似错误)
```

**原因**: macOS 10.13 SDK 的 `<math.h>` 仅以宏方式定义 C99 数学分类函数（`isfinite`、`isinf`、`isnan`、`signbit`、`fpclassify`、`isnormal`、`isgreater` 等），而非全局命名空间中的实际函数。libc++ 的 `<cmath>` 在 `#include <math.h>` 后执行 `using ::isfinite;` 等声明时找不到这些函数。

**修复**: 创建 `src/fix_cmath_darwin.h` 头文件，其中：
1. 包含 `<math.h>`（使宏被定义）
2. `#undef` 所有相关宏
3. 提供内联函数包装器，调用底层 `__fpclassifyf`/`__inline_isfinitef` 等内部函数

在 `CMakeLists.txt` 中通过 `-include` 编译选项强制包含此头文件：
```cmake
if(APPLE)
  add_compile_options(-include ${CMAKE_CURRENT_SOURCE_DIR}/src/fix_cmath_darwin.h)
endif()
```

## 修改文件清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `cmake/Tests.cmake` | 修改 | 删除 CMP0037 OLD 策略块；添加 POST_BUILD 关键字 |
| `CMakeLists.txt` | 修改 | 添加 Apple 平台 force-include 编译选项 |
| `src/fix_cmath_darwin.h` | 新增 | macOS 10.13 SDK cmath 兼容性修复头文件 |

## 构建验证

```bash
cd ./fish-shell/build
cmake ..
make -j4
```

构建成功产出:
- `fish` (3.7.1-dirty)
- `fish_indent` (3.7.1-dirty)
- `fish_key_reader` (3.7.1-dirty)
- `fish_tests`

运行验证:
```
$ ./fish --version
fish, version 3.7.1-dirty

$ ./fish -c 'echo Hello from fish; math 1+2+3'
Hello from fish
6
```
