// Provide ____chkstk_darwin for macOS 10.13 compatibility
// This is a stack probe function that exists on macOS 10.15+
void ____chkstk_darwin(void) {
}

void _chkstk(void) {
}
