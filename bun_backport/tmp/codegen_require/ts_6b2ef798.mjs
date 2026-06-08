// src/codegen/class-definitions.ts
var ClassDefinition = class {
  /**
   * Class name.
   *
   * Used to find the proper struct and as the `.name` of the JS constructor
   * function.
   */
  name;
  /**
   * Class constructor is newable. Called before the JSValue corresponding to
   * the object is created. Throwing an exception prevents the object from being
   * created.
   */
  construct;
  /**
   * Class constructor needs `this` value.
   *
   * Makes the code generator call the Zig constructor function **after** the
   * JSValue is instantiated. Only use this if you must, as it probably isn't
   * good for GC since it means if the constructor throws the GC will have to
   * clean up the object that never reached JS.
   */
  constructNeedsThis;
  /**
   * Class constructor is callable. In JS, ES6 class constructors are not
   * callable.
   */
  call;
  /**
   * The instances of this class are intended to be inside the this of a bound function.
   */
  forBind;
  /**
   * ## IMPORTANT
   * You _must_ free the pointer to your native class!
   *
   * Example for pointers only owned by JavaScript classes:
   * ```zig
   * pub const NativeClass = struct {
   *
   *   fn constructor(global: *JSC.JSGlobalObject, frame: *JSC.CallFrame) bun.JSError!*SocketAddress {
   *     // do stuff
   *     return bun.new(NativeClass, .{
   *       // ...
   *     });
   *   }
   *
   *   fn finalize(this: *NativeClass) void {
   *     // free allocations owned by this class, then free the struct itself.
   *     bun.destroy(this);
   *   }
   * };
   * ```
   * Example with ref counting:
   * ```
   * pub const RefCountedNativeClass = struct {
   *   const RefCount = bun.ptr.RefCount(@This(), "ref_count", deinit, .{});
   *   pub const ref = RefCount.ref;
   *   pub const deref = RefCount.deref;
   *
   *   fn constructor(global: *JSC.JSGlobalObject, frame: *JSC.CallFrame) bun.JSError!*SocketAddress {
   *     // do stuff
   *     return bun.new(NativeClass, .{
   *       // ...
   *     });
   *   }
   *
   *   fn deinit(this: *NativeClass) void {
   *     // free allocations owned by this class, then free the struct itself.
   *     bun.destroy(this);
   *   }
   *
   *   pub const finalize = deref; // GC will deref, which can free if no references are left.
   * };
   * ```
   * @todo remove this and require all classes to implement `finalize`.
   */
  finalize;
  overridesToJS;
  /**
   * Static properties and methods.
   */
  klass;
  /**
   * properties and methods on the prototype.
   */
  proto;
  /**
   * Properties and methods attached to the instance itself.
   */
  own;
  values;
  /**
   * When true, the class will accept a MarkedArgumentBuffer* to create a
   * WTF::FixedVector<JSC::Unknown> jsvalueArray member that will be visited by GC.
   */
  valuesArray;
  /**
   * Set this to `"0b11101110"`.
   */
  JSType;
  noConstructor;
  final;
  /**
   * Class has an `estimatedSize` function that reports external allocations to GC.
   * Called from any thread.
   *
   * When `true`, classes should have a method with this signature:
   * ```zig
   * pub fn estimatedSize(this: *@This()) usize;
   * ```
   *
   * Report `@sizeOf(@this())` as well as any external allocations.
   */
  estimatedSize;
  /**
   * Used in heap snapshots.
   *
   * If true, the class will have a `memoryCost` method that returns the size of the object in bytes.
   *
   * Unlike estimatedSize, this is always called on the main thread and not used for GC.
   *
   * If none is provided, we use the struct size.
   */
  memoryCost;
  hasPendingActivity;
  isEventEmitter;
  supportsObjectCreate;
  getInternalProperties;
  custom;
  configurable;
  enumerable;
  structuredClone;
  inspectCustom;
  callbacks;
  constructor(options) {
    this.name = options.name ?? "";
    this.klass = options.klass ?? {};
    this.proto = options.proto ?? {};
    this.own = options.own ?? {};
    Object.assign(this, options);
  }
  hasOwnProperties() {
    for (const key in this.own) {
      return true;
    }
    return false;
  }
};
function define({
  klass = {},
  proto = {},
  own = {},
  values = [],
  overridesToJS = false,
  estimatedSize = false,
  call = false,
  construct = false,
  structuredClone,
  inspectCustom = false,
  ...rest
} = {}) {
  if (inspectCustom) {
    proto.inspectCustom = {
      fn: "inspectCustom",
      length: 2,
      publicSymbol: "inspectCustom",
      name: "[nodejs.util.inspect.custom]"
    };
  }
  return new ClassDefinition({
    ...rest,
    call,
    overridesToJS,
    construct,
    estimatedSize,
    structuredClone,
    values,
    own: own || {},
    klass: Object.fromEntries(
      Object.entries(klass).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
        v["DOMJIT"] = void 0;
        return [k, v];
      })
    ),
    proto: Object.fromEntries(
      Object.entries(proto).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => {
        v["DOMJIT"] = void 0;
        return [k, v];
      })
    )
  });
}

// src/runtime/api/h2.classes.ts
var h2_classes_default = [
  define({
    name: "H2FrameParser",
    JSType: "0b11101110",
    proto: {
      request: {
        fn: "request",
        length: 2
      },
      setNativeSocket: {
        fn: "setNativeSocketFromJS",
        length: 1
      },
      ping: {
        fn: "ping",
        length: 0
      },
      altsvc: {
        fn: "altsvc",
        length: 3
      },
      origin: {
        fn: "origin",
        length: 1
      },
      goaway: {
        fn: "goaway",
        length: 3
      },
      getCurrentState: {
        fn: "getCurrentState",
        length: 0
      },
      settings: {
        fn: "updateSettings",
        length: 1
      },
      setLocalWindowSize: {
        fn: "setLocalWindowSize",
        length: 1
      },
      read: {
        fn: "read",
        length: 1
      },
      flush: {
        fn: "flushFromJS",
        length: 0
      },
      detach: {
        fn: "detachFromJS",
        length: 0
      },
      rstStream: {
        fn: "rstStream",
        length: 1
      },
      writeStream: {
        fn: "writeStream",
        length: 3
      },
      sendTrailers: {
        fn: "sendTrailers",
        length: 2
      },
      noTrailers: {
        fn: "noTrailers",
        length: 1
      },
      setStreamPriority: {
        fn: "setStreamPriority",
        length: 2
      },
      getStreamContext: {
        fn: "getStreamContext",
        length: 1
      },
      setStreamContext: {
        fn: "setStreamContext",
        length: 2
      },
      getEndAfterHeaders: {
        fn: "getEndAfterHeaders",
        length: 1
      },
      isStreamAborted: {
        fn: "isStreamAborted",
        length: 1
      },
      getStreamState: {
        fn: "getStreamState",
        length: 1
      },
      bufferSize: {
        fn: "getBufferSize",
        length: 0
      },
      hasNativeRead: {
        fn: "hasNativeRead",
        length: 1
      },
      setNextStreamID: {
        fn: "setNextStreamID",
        length: 1
      },
      forEachStream: {
        fn: "forEachStream",
        length: 2
      },
      emitErrorToAllStreams: {
        fn: "emitErrorToAllStreams",
        length: 1
      },
      emitAbortToAllStreams: {
        fn: "emitAbortToAllStreams",
        length: 0
      },
      getNextStream: {
        fn: "getNextStream",
        length: 0
      }
    },
    finalize: true,
    construct: true,
    constructNeedsThis: true,
    klass: {},
    values: [
      "context",
      "onError",
      "onWrite",
      "onStreamError",
      "onStreamStart",
      "onStreamHeaders",
      "onStreamEnd",
      "onStreamData",
      "onRemoteSettings",
      "onLocalSettings",
      "onWantTrailers",
      "onPing",
      "onEnd",
      "onGoAway",
      "onAborted",
      "onAltSvc",
      "onOrigin",
      "onFrameError"
    ]
  })
];
export {
  h2_classes_default as default
};
