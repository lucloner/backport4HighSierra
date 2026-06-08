#include <stddef.h>

void ____chkstk_darwin(void) {
}

void _chkstk(void) {
}

// Re-export all symbols from libSystem by including a reference
// This is a hack but should work
asm(".section __DATA,__const\n\t"
    ".globl _dyld_stub_binder\n\t"
    ".weak_reference _dyld_stub_binder");
