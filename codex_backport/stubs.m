// Comprehensive stubs for macOS 10.13 compatibility
// Symbols from macOS 10.15+ and macOS 12.3+ referenced by webrtc

#import <Foundation/Foundation.h>
#import <CoreFoundation/CoreFoundation.h>

// --- ScreenCaptureKit (macOS 12.3+) ---

@interface SCShareableContent : NSObject
@end
@implementation SCShareableContent
@end

@interface SCStreamConfiguration : NSObject
@end
@implementation SCStreamConfiguration
@end

@interface SCStream : NSObject
@end
@implementation SCStream
@end

@interface SCContentSharingPicker : NSObject
@end
@implementation SCContentSharingPicker
@end

@interface SCContentFilter : NSObject
@end
@implementation SCContentFilter
@end

@interface SCRecordingPickerConfiguration : NSObject
@end
@implementation SCRecordingPickerConfiguration
@end

@interface SCContentSharingPickerConfiguration : NSObject
@end
@implementation SCContentSharingPickerConfiguration
@end

// --- AVAudioSinkNode / AVAudioSourceNode (macOS 10.15+) ---

@interface AVAudioSinkNode : NSObject
@end
@implementation AVAudioSinkNode
@end

@interface AVAudioSourceNode : NSObject
@end
@implementation AVAudioSourceNode
@end

// --- AVCaptureDeviceDiscoverySession (macOS 10.15+) ---

@interface AVCaptureDeviceDiscoverySession : NSObject
+ (instancetype)sessionWithDeviceTypes:(NSArray *)deviceTypes mediaType:(NSString *)mediaType position:(NSInteger)position;
@end
@implementation AVCaptureDeviceDiscoverySession
+ (instancetype)sessionWithDeviceTypes:(NSArray *)deviceTypes mediaType:(NSString *)mediaType position:(NSInteger)position { return nil; }
@end
