// Compatibility stubs for macOS 10.13 (High Sierra)
// Provides symbols that are only available on macOS 10.15+

#include <objc/runtime.h>
#include <objc/message.h>

// ____chkstk_darwin - stack probe function (macOS 10.15+)
void ___chkstk_darwin(void) {
}

void _chkstk(void) {
}

// _objc_alloc_init - allocate and initialize an Objective-C object (macOS 10.15+)
// This is equivalent to [[cls alloc] init]
id objc_alloc_init(Class cls) {
    id obj = class_createInstance(cls, 0);
    if (obj) {
        obj = ((id (*)(id, SEL))objc_msgSend)(obj, sel_registerName("init"));
    }
    return obj;
}

// _objc_alloc - allocate an Objective-C object (macOS 10.12+)
// This should already exist on 10.13, but include it for safety
id objc_alloc(Class cls) {
    return class_createInstance(cls, 0);
}
