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

// src/runtime/socket/sockets.classes.ts
function generate(ssl) {
  return define({
    name: !ssl ? "TCPSocket" : "TLSSocket",
    JSType: "0b11101110",
    noConstructor: true,
    configurable: false,
    memoryCost: true,
    proto: {
      getAuthorizationError: {
        fn: "getAuthorizationError",
        length: 0
      },
      resume: {
        fn: "resumeFromJS",
        length: 0
      },
      pause: {
        fn: "pauseFromJS",
        length: 0
      },
      getTLSFinishedMessage: {
        fn: "getTLSFinishedMessage",
        length: 0
      },
      getTLSPeerFinishedMessage: {
        fn: "getTLSPeerFinishedMessage",
        length: 0
      },
      getEphemeralKeyInfo: {
        fn: "getEphemeralKeyInfo",
        length: 0
      },
      getCipher: {
        fn: "getCipher",
        length: 0
      },
      renegotiate: {
        fn: "renegotiate",
        length: 0
      },
      disableRenegotiation: {
        fn: "disableRenegotiation",
        length: 0
      },
      isSessionReused: {
        fn: "isSessionReused",
        length: 0
      },
      setVerifyMode: {
        fn: "setVerifyMode",
        length: 2
      },
      getSession: {
        fn: "getSession",
        length: 0
      },
      setSession: {
        fn: "setSession",
        length: 1
      },
      getTLSTicket: {
        fn: "getTLSTicket",
        length: 0
      },
      exportKeyingMaterial: {
        fn: "exportKeyingMaterial",
        length: 3
      },
      setMaxSendFragment: {
        fn: "setMaxSendFragment",
        length: 1
      },
      getSharedSigalgs: {
        fn: "getSharedSigalgs",
        length: 0
      },
      getTLSVersion: {
        fn: "getTLSVersion",
        length: 0
      },
      getPeerCertificate: {
        fn: "getPeerCertificate",
        length: 1
      },
      authorized: {
        getter: "getAuthorized"
      },
      alpnProtocol: {
        getter: "getALPNProtocol"
      },
      bytesWritten: {
        getter: "getBytesWritten"
      },
      fd: {
        getter: "getFD"
      },
      setNoDelay: {
        fn: "setNoDelay",
        length: 1
      },
      setKeepAlive: {
        fn: "setKeepAlive",
        length: 2
      },
      write: {
        fn: "write",
        length: 3
      },
      upgradeTLS: {
        fn: "upgradeTLS",
        length: 1
      },
      end: {
        fn: "end",
        length: 3
      },
      terminate: {
        fn: "terminate",
        length: 0
      },
      listener: {
        getter: "getListener"
      },
      timeout: {
        fn: "timeout",
        length: 1
      },
      flush: {
        fn: "flush",
        length: 0
      },
      "@@dispose": {
        fn: "end",
        length: 0
      },
      shutdown: {
        fn: "shutdown",
        length: 1
      },
      close: {
        fn: "close",
        length: 0
      },
      ref: {
        fn: "jsRef",
        length: 0
      },
      unref: {
        fn: "jsUnref",
        length: 0
      },
      localFamily: {
        getter: "getLocalFamily",
        cache: true
      },
      localAddress: {
        getter: "getLocalAddress",
        cache: true
      },
      localPort: {
        getter: "getLocalPort",
        cache: true
      },
      //   cork: {
      //     fn: "cork",
      //     length: 1,
      //   },
      data: {
        getter: "getData",
        cache: true,
        setter: "setData"
      },
      readyState: {
        getter: "getReadyState"
      },
      // topics: {
      //   getter: "getTopics",
      // },
      remoteFamily: {
        getter: "getRemoteFamily",
        cache: true
      },
      remoteAddress: {
        getter: "getRemoteAddress",
        cache: true
      },
      remotePort: {
        getter: "getRemotePort"
      },
      reload: {
        fn: "reload",
        length: 1
      },
      setServername: {
        fn: "setServername",
        length: 1
      },
      getServername: {
        fn: "getServername",
        length: 0
      },
      "writeBuffered": {
        fn: "writeBuffered",
        length: 2,
        privateSymbol: "write"
      },
      "endBuffered": {
        fn: "endBuffered",
        length: 2,
        privateSymbol: "end"
      },
      getCertificate: {
        fn: "getCertificate",
        length: 0
      },
      ...ssl ? sslOnly : {}
    },
    finalize: true,
    construct: true,
    klass: {}
  });
}
var sslOnly = {
  getPeerX509Certificate: {
    fn: "getPeerX509Certificate",
    length: 0
  },
  getX509Certificate: {
    fn: "getX509Certificate",
    length: 0
  }
};
var sockets_classes_default = [
  generate(true),
  generate(false),
  define({
    name: "Listener",
    noConstructor: true,
    JSType: "0b11101110",
    proto: {
      stop: {
        fn: "stop",
        length: 1
      },
      "@@dispose": {
        fn: "dispose",
        length: 0
      },
      ref: {
        fn: "ref",
        length: 0
      },
      unref: {
        fn: "unref",
        length: 0
      },
      fd: {
        getter: "getFD"
      },
      port: {
        getter: "getPort"
      },
      unix: {
        getter: "getUnix",
        cache: true
      },
      reload: {
        fn: "reload",
        length: 1
      },
      hostname: {
        getter: "getHostname",
        cache: true
      },
      data: {
        getter: "getData",
        setter: "setData"
      },
      getsockname: {
        fn: "getsockname",
        length: 1
      }
    },
    finalize: true,
    construct: true,
    klass: {}
  }),
  define({
    name: "UDPSocket",
    noConstructor: true,
    JSType: "0b11101110",
    finalize: true,
    construct: true,
    values: ["on_data", "on_drain", "on_error"],
    proto: {
      send: {
        fn: "send",
        length: 3
      },
      sendMany: {
        fn: "sendMany",
        length: 3
      },
      close: {
        fn: "close",
        length: 0
      },
      "@@dispose": {
        fn: "close",
        length: 0
      },
      reload: {
        fn: "reload",
        length: 1
      },
      ref: {
        fn: "ref",
        length: 0
      },
      unref: {
        fn: "unref",
        length: 0
      },
      hostname: {
        getter: "getHostname",
        cache: true
      },
      port: {
        getter: "getPort",
        cache: true
      },
      address: {
        getter: "getAddress",
        cache: true
      },
      remoteAddress: {
        getter: "getRemoteAddress",
        cache: true
      },
      binaryType: {
        getter: "getBinaryType",
        cache: true
      },
      closed: {
        getter: "getClosed"
      },
      setBroadcast: {
        fn: "setBroadcast",
        length: 1
      },
      setTTL: {
        fn: "setTTL",
        length: 1
      },
      setMulticastTTL: {
        fn: "setMulticastTTL",
        length: 1
      },
      setMulticastLoopback: {
        fn: "setMulticastLoopback",
        length: 1
      },
      setMulticastInterface: {
        fn: "setMulticastInterface",
        length: 1
      },
      addMembership: {
        fn: "addMembership",
        length: 2
      },
      dropMembership: {
        fn: "dropMembership",
        length: 2
      },
      addSourceSpecificMembership: {
        fn: "addSourceSpecificMembership",
        length: 3
      },
      dropSourceSpecificMembership: {
        fn: "dropSourceSpecificMembership",
        length: 3
      }
    },
    klass: {}
  }),
  define({
    name: "SocketAddress",
    construct: true,
    call: false,
    finalize: true,
    estimatedSize: true,
    JSType: "0b11101110",
    klass: {
      parse: {
        fn: "parse",
        length: 1,
        enumerable: false,
        configurable: true
      },
      isSocketAddress: {
        fn: "isSocketAddress",
        length: 1,
        enumerable: false,
        configurable: true
      }
    },
    proto: {
      address: {
        getter: "getAddress",
        enumerable: false,
        configurable: true,
        cache: true
      },
      port: {
        getter: "getPort",
        enumerable: false,
        configurable: true
      },
      family: {
        getter: "getFamily",
        enumerable: false,
        configurable: true,
        cache: true
      },
      addrfamily: {
        getter: "getAddrFamily",
        enumerable: false,
        configurable: false
      },
      flowlabel: {
        getter: "getFlowLabel",
        enumerable: false,
        configurable: true
      },
      toJSON: {
        fn: "toJSON",
        length: 0,
        this: true,
        enumerable: false,
        configurable: true
      }
    }
  }),
  define({
    name: "BlockList",
    construct: true,
    call: false,
    finalize: true,
    estimatedSize: true,
    // inspectCustom: true,
    structuredClone: { transferable: false, tag: 251, storable: false },
    JSType: "0b11101110",
    klass: {
      isBlockList: {
        fn: "isBlockList",
        length: 1
      }
    },
    proto: {
      addAddress: {
        fn: "addAddress",
        length: 1
      },
      addRange: {
        fn: "addRange",
        length: 2
      },
      addSubnet: {
        fn: "addSubnet",
        length: 2
      },
      check: {
        fn: "check",
        length: 1
      },
      rules: {
        getter: "rules"
      }
    }
  })
];
export {
  sockets_classes_default as default
};
