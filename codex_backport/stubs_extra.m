// Additional stubs for macOS 10.13 compatibility
#import <Foundation/Foundation.h>
#import <objc/runtime.h>

// objc_alloc_init is only available from macOS 10.15+
id objc_alloc_init(Class cls) {
    return [[cls alloc] init];
}

// AVCaptureDeviceTypeBuiltInWideAngleCamera (macOS 10.15+)
NSString* const AVCaptureDeviceTypeBuiltInWideAngleCamera = @"AVCaptureDeviceTypeBuiltInWideAngleCamera";
