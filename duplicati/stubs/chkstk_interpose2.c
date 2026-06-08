// Compatibility stubs for macOS 10.13 (High Sierra)
// Provides ____chkstk_darwin and _objc_alloc_init via DYLD_INSERT_LIBRARIES
// The __attribute__((section(","__DATA,__DATA"))) creates an interpose section
// that allows these symbols to be found without DYLD_FORCE_FLAT_NAMESPACE.

#include <objc/runtime.h>
#include <objc/message.h>

// ____chkstk_darwin - stack probe function (macOS 10.15+)
// C name ___chkstk_darwin → Mach-O symbol ____chkstk_darwin
void ___chkstk_darwin(void) {
}

// _chkstk - alternate stack probe
void _chkstk(void) {
}

// _objc_alloc_init - allocate and initialize an Objective-C object (macOS 10.15+)
id objc_alloc_init(Class cls) {
    id obj = class_createInstance(cls, 0);
    if (obj) {
        obj = ((id (*)(id, SEL))objc_msgSend)(obj, sel_registerName("init"));
    }
    return obj;
}

// _objc_alloc - allocate an Objective-C object
id objc_alloc(Class cls) {
    return class_createInstance(cls, 0);
}
