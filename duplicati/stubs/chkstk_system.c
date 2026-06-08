// Provide ____chkstk_darwin for macOS 10.13 compatibility
// Stack probing function - just return since macOS 10.13 handles
// stack growth via page faults
void ____chkstk_darwin(void) {
}

void _chkstk(void) {
}
