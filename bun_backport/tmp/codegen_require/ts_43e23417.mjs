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

// src/runtime/server/server.classes.ts
function generate(name) {
  return define({
    name,
    memoryCost: true,
    proto: {
      fetch: {
        fn: "doFetch",
        length: 1
      },
      upgrade: {
        fn: "doUpgrade",
        length: 1
      },
      publish: {
        fn: "doPublish",
        length: 3
      },
      subscriberCount: {
        fn: "doSubscriberCount",
        length: 1
      },
      reload: {
        fn: "doReload",
        length: 2
      },
      "@@dispose": {
        fn: "dispose",
        length: 0
      },
      closeIdleConnections: {
        fn: "closeIdleConnections",
        length: 0
      },
      stop: {
        fn: "doStop",
        length: 1
      },
      requestIP: {
        fn: "doRequestIP",
        length: 1
      },
      timeout: {
        fn: "doTimeout",
        length: 2
      },
      port: {
        getter: "getPort"
      },
      id: {
        getter: "getId",
        cache: true
      },
      pendingRequests: {
        getter: "getPendingRequests"
      },
      pendingWebSockets: {
        getter: "getPendingWebSockets"
      },
      ref: {
        fn: "doRef"
      },
      unref: {
        fn: "doUnref"
      },
      hostname: {
        getter: "getHostname",
        cache: true
      },
      address: {
        getter: "getAddress",
        cache: true
      },
      url: {
        getter: "getURL",
        cache: true
      },
      protocol: {
        getter: "getProtocol"
      },
      development: {
        getter: "getDevelopment"
      }
    },
    klass: {},
    finalize: true,
    construct: true,
    noConstructor: true,
    values: ["routeList"]
  });
}
var server_classes_default = [
  generate(`HTTPServer`),
  generate(`DebugHTTPServer`),
  generate(`HTTPSServer`),
  generate(`DebugHTTPSServer`),
  define({
    name: "NodeHTTPResponse",
    JSType: "0b11101110",
    proto: {
      writeHead: {
        fn: "writeHead",
        length: 3
      },
      writeContinue: {
        fn: "writeContinue"
      },
      write: {
        fn: "write",
        length: 3
      },
      end: {
        fn: "end",
        length: 2
      },
      getBytesWritten: {
        fn: "getBytesWritten",
        length: 0
      },
      flushHeaders: {
        fn: "flushHeaders",
        length: 0
      },
      cork: {
        fn: "cork",
        length: 1
      },
      ref: {
        fn: "jsRef"
      },
      unref: {
        fn: "jsUnref"
      },
      abort: {
        fn: "abort",
        length: 0
      },
      pause: {
        fn: "doPause",
        length: 0,
        passThis: true
      },
      drainRequestBody: {
        fn: "drainRequestBody",
        length: 0
      },
      dumpRequestBody: {
        fn: "dumpRequestBody",
        length: 0,
        passThis: true
      },
      resume: {
        fn: "doResume",
        length: 0
      },
      bufferedAmount: {
        getter: "getBufferedAmount"
      },
      aborted: {
        getter: "getAborted"
      },
      flags: {
        getter: "getFlags"
      },
      finished: {
        getter: "getFinished"
      },
      hasBody: {
        getter: "getHasBody"
      },
      ended: {
        getter: "getEnded"
      },
      ondata: {
        getter: "getOnData",
        setter: "setOnData",
        this: true
      },
      onabort: {
        getter: "getOnAbort",
        setter: "setOnAbort",
        this: true
      },
      hasCustomOnData: {
        getter: "getHasCustomOnData",
        setter: "setHasCustomOnData"
      },
      upgraded: {
        getter: "getUpgraded"
      },
      // ontimeout: {
      //   getter: "getOnTimeout",
      //   setter: "setOnTimeout",
      // },
      onwritable: {
        getter: "getOnWritable",
        setter: "setOnWritable",
        this: true
      }
    },
    klass: {},
    finalize: true,
    noConstructor: true,
    values: ["onAborted", "onWritable", "onData"]
  }),
  define({
    name: "ServerWebSocket",
    JSType: "0b11101110",
    memoryCost: true,
    proto: {
      send: {
        fn: "send",
        length: 2
      },
      sendText: {
        fn: "sendText",
        length: 2
        // ASSERTION FAILED: m_data[index].lockCount
        // /Users/jarred/actions-runner/_work/WebKit/WebKit/Source/JavaScriptCore/dfg/DFGRegisterBank.h(204) : void JSC::DFG::RegisterBank<JSC::GPRInfo>::unlock(RegID) [BankInfo = JSC::GPRInfo]
        // 1   0x102740124 WTFCrash
        // 3   0x103076bac JSC::MacroAssemblerARM64::add64(JSC::AbstractMacroAssembler<JSC::ARM64Assembler>::TrustedImm64, JSC::ARM64Registers::RegisterID, JSC::ARM64Registers::RegisterID)
        // 4   0x10309a2d0 JSC::DFG::SpeculativeJIT::compileCallDOM(JSC::DFG::Node*)::$_0::operator()(JSC::DFG::Edge) const
        // DOMJIT: {
        //   returns: "int",
        //   args: ["JSString", "bool"],
        // },
      },
      sendBinary: {
        fn: "sendBinary",
        length: 2
        // ASSERTION FAILED: m_data[index].lockCount
        // /Users/jarred/actions-runner/_work/WebKit/WebKit/Source/JavaScriptCore/dfg/DFGRegisterBank.h(204) : void JSC::DFG::RegisterBank<JSC::GPRInfo>::unlock(RegID) [BankInfo = JSC::GPRInfo]
        // 1   0x102740124 WTFCrash
        // 3   0x103076bac JSC::MacroAssemblerARM64::add64(JSC::AbstractMacroAssembler<JSC::ARM64Assembler>::TrustedImm64, JSC::ARM64Registers::RegisterID, JSC::ARM64Registers::RegisterID)
        // 4   0x10309a2d0 JSC::DFG::SpeculativeJIT::compileCallDOM(JSC::DFG::Node*)::$_0::operator()(JSC::DFG::Edge) const
        // DOMJIT: {
        //   returns: "int",
        //   args: ["JSUint8Array", "bool"],
        // },
      },
      publishText: {
        fn: "publishText",
        length: 2,
        DOMJIT: {
          returns: "int",
          args: ["JSString", "JSString"]
        }
      },
      publishBinary: {
        fn: "publishBinary",
        length: 2,
        DOMJIT: {
          returns: "int",
          args: ["JSString", "JSUint8Array"]
        }
      },
      ping: {
        fn: "ping",
        length: 1
      },
      pong: {
        fn: "pong",
        length: 1
      },
      close: {
        fn: "close",
        length: 3,
        passThis: true
      },
      terminate: {
        fn: "terminate",
        length: 0,
        passThis: true
      },
      cork: {
        fn: "cork",
        length: 1,
        passThis: true
      },
      getBufferedAmount: {
        fn: "getBufferedAmount",
        length: 0
      },
      binaryType: {
        getter: "getBinaryType",
        setter: "setBinaryType"
      },
      publish: {
        fn: "publish",
        length: 3
      },
      data: {
        getter: "getData",
        cache: true,
        setter: "setData"
      },
      readyState: {
        getter: "getReadyState"
      },
      subscribe: {
        fn: "subscribe",
        length: 1
      },
      unsubscribe: {
        fn: "unsubscribe",
        length: 1
      },
      isSubscribed: {
        fn: "isSubscribed",
        length: 1
      },
      subscriptions: {
        getter: "getSubscriptions"
      },
      remoteAddress: {
        getter: "getRemoteAddress",
        cache: true
      }
    },
    finalize: true,
    construct: true,
    klass: {},
    values: ["socket"]
  }),
  define({
    name: "HTMLBundle",
    noConstructor: true,
    finalize: true,
    proto: {
      index: {
        getter: "getIndex",
        cache: true
      }
    },
    klass: {}
  })
];
export {
  server_classes_default as default
};
