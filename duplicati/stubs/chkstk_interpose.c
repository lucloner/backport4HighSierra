#include <stddef.h>

/* Provide ____chkstk_darwin for macOS 10.13 compatibility */
void ____chkstk_darwin(void) __attribute__((used));
void _chkstk(void) __attribute__((used));

void ____chkstk_darwin(void) {
}

void _chkstk(void) {
}

/* DYLD interpose structure */
struct dyld_interpose_tuple {
    const void* replacement;
    const void* replacee;
};

/* We can't use DYLD_INTERPOSE for ____chkstk_darwin because it doesn't
   exist on this system. But we can declare it as a weak external symbol
   and provide an implementation. */
