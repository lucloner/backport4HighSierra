/*
 * Compatibility stub for ____chkstk_darwin on macOS 10.13
 * This symbol is referenced by binaries compiled for macOS 10.15+
 * but doesn't exist in macOS 10.13's libSystem.
 *
 * Note: C compiler adds a leading underscore to symbol names.
 * The .NET runtime expects Mach-O symbol ____chkstk_darwin (4 underscores),
 * so the C function name must be ___chkstk_darwin (3 underscores).
 */
void ___chkstk_darwin(void) {
}

void _chkstk(void) {
}
