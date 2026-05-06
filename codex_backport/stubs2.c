// Comprehensive C stubs for macOS 10.13 compatibility
// Symbols from newer macOS versions referenced by webrtc and v8

#include <stdlib.h>
#include <string.h>
#include <CoreFoundation/CoreFoundation.h>

// aligned_alloc is C11, not available on macOS 10.13
void* aligned_alloc(size_t alignment, size_t size) {
    void* ptr = NULL;
    if (posix_memalign(&ptr, alignment, size) != 0) { return NULL; }
    return ptr;
}

// __isPlatformVersionAtLeast is a compiler builtin from newer SDKs
// Always returns 0 to indicate we are not on a newer platform
int __isPlatformVersionAtLeast(int platform, int major, int minor) {
    return 0;
}

// kVTCompressionPropertyKey_PrioritizeEncodingSpeedOverQuality (macOS 10.15+)
CFStringRef const kVTCompressionPropertyKey_PrioritizeEncodingSpeedOverQuality = CFSTR("PrioritizeEncodingSpeedOverQuality");

// kVTCompressionPropertyKey_MaxAllowedFrameQP (macOS 11+)
CFStringRef const kVTCompressionPropertyKey_MaxAllowedFrameQP = CFSTR("MaxAllowedFrameQP");

// kVTVideoEncoderSpecification_EnableLowLatencyRateControl (macOS 11+)
CFStringRef const kVTVideoEncoderSpecification_EnableLowLatencyRateControl = CFSTR("EnableLowLatencyRateControl");

// SCStreamFrameInfo* constants (macOS 12.3+)
CFStringRef const SCStreamFrameInfoStatus = CFSTR("Status");
CFStringRef const SCStreamFrameInfoContentRect = CFSTR("ContentRect");
CFStringRef const SCStreamFrameInfoBoundingRect = CFSTR("BoundingRect");
CFStringRef const SCStreamFrameInfoScaleFactor = CFSTR("ScaleFactor");
CFStringRef const SCStreamFrameInfoDirtyRects = CFSTR("DirtyRects");
CFStringRef const SCStreamFrameInfoPresenterOverlayContentRect = CFSTR("PresenterOverlayContentRect");
CFStringRef const SCStreamFrameInfoContentScale = CFSTR("ContentScale");
