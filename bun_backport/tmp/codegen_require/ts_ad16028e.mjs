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

// src/runtime/image/Image.classes.ts
var Image_classes_default = [
  define({
    name: "Image",
    construct: true,
    constructNeedsThis: true,
    finalize: true,
    // Report owned input (Blob dupe / data:-URL / path string) so a heap of
    // idle Image objects shows up in the GC's accounting. The js_buffer source
    // is the user's ArrayBuffer and already counted via the cached value slot;
    // off-thread RGBA scratch lives only for the task's duration so isn't.
    estimatedSize: true,
    // Strong-ref slot for the input ArrayBuffer/TypedArray so we BORROW its
    // bytes instead of duping in the constructor. While a task is in flight
    // the JSRef on the Zig side holds a Strong ref to this wrapper, the
    // wrapper's sourceJS slot keeps the ArrayBuffer alive, and the buffer is
    // pinned for the task's duration — so the slice stays valid off-thread.
    // (No `hasPendingActivity` polling; the JSRef upgrade/downgrade is
    //  explicit at schedule/then.)
    values: ["sourceJS"],
    configurable: false,
    JSType: "0b11101110",
    klass: {
      // Process-global backend selector: "system" (CoreGraphics/WIC + vImage,
      // default where available) or "bun" (static libjpeg-turbo/spng/libwebp +
      // Highway resize, byte-identical across platforms). Set BEFORE awaiting a
      // pipeline; in-flight tasks read whatever was set when they launched.
      backend: { getter: "getBackend", setter: "setBackend" },
      // System clipboard image reader. `Image | null` — null on Linux (no
      // native API) and when there's no image present. The probe is the
      // cheap "should I show a paste-an-image hint?" check.
      fromClipboard: { fn: "fromClipboard", length: 0 },
      hasClipboardImage: { fn: "hasClipboardImage", length: 0 },
      clipboardChangeCount: { fn: "clipboardChangeCount", length: 0 }
    },
    proto: {
      // Chainable mutators — record an op and return `this`.
      resize: { fn: "doResize", length: 2 },
      rotate: { fn: "doRotate", length: 1 },
      flip: { fn: "doFlip", length: 0 },
      flop: { fn: "doFlop", length: 0 },
      modulate: { fn: "doModulate", length: 1 },
      // Chainable output-format setters (Sharp-style); the encode happens
      // when a terminal below is awaited.
      jpeg: { fn: "doFormatJpeg", length: 1 },
      png: { fn: "doFormatPng", length: 1 },
      webp: { fn: "doFormatWebp", length: 1 },
      heic: { fn: "doFormatHeic", length: 1 },
      avif: { fn: "doFormatAvif", length: 1 },
      // Terminal async ops — run decode → pipeline → encode on the work pool.
      bytes: { fn: "doBytes", length: 0, async: true },
      buffer: { fn: "doBuffer", length: 0, async: true },
      // Sharp-compat alias for `buffer()`; same Zig fn, no overhead.
      toBuffer: { fn: "doBuffer", length: 0, async: true },
      // Encode → fs.writeFile, both off-thread; resolves bytes-written.
      write: { fn: "doWrite", length: 1, async: true },
      blob: { fn: "doBlob", length: 0, async: true },
      toBase64: { fn: "doToBase64", length: 0, async: true },
      // toBase64() with the `data:{mime};base64,` prefix.
      dataurl: { fn: "doDataUrl", length: 0, async: true },
      // ThumbHash-rendered ≤32px PNG data: URL — ~400-700B, ready for
      // <img src> / blurDataURL.
      placeholder: { fn: "doPlaceholder", length: 0, async: true },
      metadata: { fn: "doMetadata", length: 0, async: true },
      // Read-only after a pipeline has run; -1 before.
      width: { getter: "getWidth" },
      height: { getter: "getHeight" }
    }
  })
];
export {
  Image_classes_default as default
};
