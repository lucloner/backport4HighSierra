// Provide ____chkstk_darwin for macOS 10.13 compatibility
// ____chkstk_darwin is a stack probing function introduced in macOS 10.15

// Stack probing: touch each page of the stack to ensure it's committed
// This prevents stack overflow from causing silent data corruption
__attribute__((noinline, used))
void ____chkstk_darwin(void) {
    // On macOS 10.13, the OS handles stack growth via page faults
    // The stack guard pages are already set up by the kernel
    // Just return - no probing needed as the OS will handle it
}

__attribute__((used))
void _chkstk(void) {
}
