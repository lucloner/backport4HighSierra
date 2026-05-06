// fix_cmath_darwin.h - Workaround for macOS 10.13 SDK missing C99 math functions
// in the global namespace. The macOS 10.13 SDK defines isfinite, isinf, isnan,
// signbit, fpclassify, isnormal, isgreater, isgreaterequal, isless, islessequal,
// islessgreater, isunordered as macros only, not as actual functions. This
// causes libc++ <cmath> to fail because it does `using ::isfinite;` etc.
// This header must be force-included before any C++ standard library header.
#ifndef FIX_CMATH_DARWIN_H
#define FIX_CMATH_DARWIN_H

#include <math.h>

// Undefine the macros that <cmath> will try to use with `using ::`
#undef fpclassify
#undef isfinite
#undef isinf
#undef isnan
#undef signbit
#undef isnormal
#undef isgreater
#undef isgreaterequal
#undef isless
#undef islessequal
#undef islessgreater
#undef isunordered

// Provide inline functions in the global namespace so that <cmath> can find them.
inline int fpclassify(float x) { return __fpclassifyf(x); }
inline int fpclassify(double x) { return __fpclassifyd(x); }
inline int fpclassify(long double x) { return __fpclassifyl(x); }

inline int isfinite(float x) { return __inline_isfinitef(x); }
inline int isfinite(double x) { return __inline_isfinited(x); }
inline int isfinite(long double x) { return __inline_isfinitel(x); }

inline int isinf(float x) { return __inline_isinff(x); }
inline int isinf(double x) { return __inline_isinfd(x); }
inline int isinf(long double x) { return __inline_isinfl(x); }

inline int isnan(float x) { return __inline_isnanf(x); }
inline int isnan(double x) { return __inline_isnand(x); }
inline int isnan(long double x) { return __inline_isnanl(x); }

inline int signbit(float x) { return __inline_signbitf(x); }
inline int signbit(double x) { return __inline_signbitd(x); }
inline int signbit(long double x) { return __inline_signbitl(x); }

inline int isnormal(float x) { return __inline_isnormalf(x); }
inline int isnormal(double x) { return __inline_isnormald(x); }
inline int isnormal(long double x) { return __inline_isnormall(x); }

inline bool isgreater(float x, float y) { return __builtin_isgreater(x, y); }
inline bool isgreater(double x, double y) { return __builtin_isgreater(x, y); }
inline bool isgreater(long double x, long double y) { return __builtin_isgreater(x, y); }

inline bool isgreaterequal(float x, float y) { return __builtin_isgreaterequal(x, y); }
inline bool isgreaterequal(double x, double y) { return __builtin_isgreaterequal(x, y); }
inline bool isgreaterequal(long double x, long double y) { return __builtin_isgreaterequal(x, y); }

inline bool isless(float x, float y) { return __builtin_isless(x, y); }
inline bool isless(double x, double y) { return __builtin_isless(x, y); }
inline bool isless(long double x, long double y) { return __builtin_isless(x, y); }

inline bool islessequal(float x, float y) { return __builtin_islessequal(x, y); }
inline bool islessequal(double x, double y) { return __builtin_islessequal(x, y); }
inline bool islessequal(long double x, long double y) { return __builtin_islessequal(x, y); }

inline bool islessgreater(float x, float y) { return __builtin_islessgreater(x, y); }
inline bool islessgreater(double x, double y) { return __builtin_islessgreater(x, y); }
inline bool islessgreater(long double x, long double y) { return __builtin_islessgreater(x, y); }

inline bool isunordered(float x, float y) { return __builtin_isunordered(x, y); }
inline bool isunordered(double x, double y) { return __builtin_isunordered(x, y); }
inline bool isunordered(long double x, long double y) { return __builtin_isunordered(x, y); }

#endif // FIX_CMATH_DARWIN_H
