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

// src/test_runner/jest.classes.ts
var jest_classes_default = [
  define({
    name: "ExpectAnything",
    construct: false,
    noConstructor: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    configurable: false,
    klass: {},
    proto: {}
  }),
  define({
    name: "ExpectAny",
    construct: false,
    noConstructor: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    values: ["constructorValue"],
    configurable: false,
    klass: {},
    proto: {}
  }),
  define({
    name: "ExpectCloseTo",
    construct: false,
    noConstructor: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    values: ["numberValue", "digitsValue"],
    configurable: false,
    klass: {},
    proto: {}
  }),
  define({
    name: "ExpectObjectContaining",
    construct: false,
    noConstructor: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    values: ["objectValue"],
    configurable: false,
    klass: {},
    proto: {}
  }),
  define({
    name: "ExpectStringContaining",
    construct: false,
    noConstructor: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    values: ["stringValue"],
    configurable: false,
    klass: {},
    proto: {}
  }),
  define({
    name: "ExpectStringMatching",
    construct: false,
    noConstructor: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    values: ["testValue"],
    configurable: false,
    klass: {},
    proto: {}
  }),
  define({
    name: "ExpectArrayContaining",
    construct: false,
    noConstructor: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    values: ["arrayValue"],
    configurable: false,
    klass: {},
    proto: {}
  }),
  define({
    name: "ExpectCustomAsymmetricMatcher",
    construct: false,
    noConstructor: true,
    call: false,
    finalize: true,
    JSType: "0b11101110",
    values: ["matcherFn", "capturedArgs"],
    configurable: false,
    klass: {},
    proto: {
      asymmetricMatch: {
        fn: "asymmetricMatch",
        length: 1
      }
    }
  }),
  define({
    name: "ExpectMatcherContext",
    construct: false,
    noConstructor: true,
    call: false,
    finalize: true,
    JSType: "0b11101110",
    configurable: false,
    klass: {},
    proto: {
      utils: {
        getter: "getUtils"
      },
      isNot: {
        getter: "getIsNot"
      },
      promise: {
        getter: "getPromise"
      },
      expand: {
        getter: "getExpand"
      },
      equals: {
        fn: "equals",
        length: 3
      }
    }
  }),
  define({
    name: "ExpectMatcherUtils",
    construct: false,
    noConstructor: true,
    call: false,
    finalize: true,
    JSType: "0b11101110",
    configurable: false,
    klass: {},
    proto: {
      stringify: {
        fn: "stringify",
        length: 1
      },
      printExpected: {
        fn: "printExpected",
        length: 1
      },
      printReceived: {
        fn: "printReceived",
        length: 1
      },
      EXPECTED_COLOR: {
        fn: "printExpected",
        length: 1
      },
      RECEIVED_COLOR: {
        fn: "printReceived",
        length: 1
      },
      matcherHint: {
        fn: "matcherHint",
        length: 1
      }
    }
  }),
  define({
    name: "ExpectStatic",
    construct: false,
    noConstructor: true,
    call: false,
    finalize: true,
    JSType: "0b11101110",
    configurable: false,
    klass: {},
    proto: {
      anything: {
        fn: "anything",
        length: 1
      },
      any: {
        fn: "any",
        length: 1
      },
      arrayContaining: {
        fn: "arrayContaining",
        length: 1
      },
      closeTo: {
        fn: "closeTo",
        length: 1
      },
      objectContaining: {
        fn: "objectContaining",
        length: 1
      },
      stringContaining: {
        fn: "stringContaining",
        length: 1
      },
      stringMatching: {
        fn: "stringMatching",
        length: 1
      },
      not: {
        getter: "getNot",
        this: true
      },
      resolvesTo: {
        getter: "getResolvesTo",
        this: true
      },
      rejectsTo: {
        getter: "getRejectsTo",
        this: true
      }
    }
  }),
  define({
    name: "Expect",
    construct: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    values: ["capturedValue", "resultValue"],
    configurable: false,
    klass: {
      extend: {
        fn: "extend",
        length: 1
      },
      anything: {
        fn: "anything",
        length: 1
      },
      any: {
        fn: "any",
        length: 1
      },
      arrayContaining: {
        fn: "arrayContaining",
        length: 1
      },
      assertions: {
        fn: "assertions",
        length: 1
      },
      hasAssertions: {
        fn: "hasAssertions",
        length: 1
      },
      closeTo: {
        fn: "closeTo",
        length: 1
      },
      objectContaining: {
        fn: "objectContaining",
        length: 1
      },
      stringContaining: {
        fn: "stringContaining",
        length: 1
      },
      stringMatching: {
        fn: "stringMatching",
        length: 1
      },
      addSnapshotSerializer: {
        fn: "addSnapshotSerializer",
        length: 1
      },
      not: {
        getter: "getStaticNot"
      },
      resolvesTo: {
        getter: "getStaticResolvesTo"
      },
      rejectsTo: {
        getter: "getStaticRejectsTo"
      },
      unreachable: {
        fn: "doUnreachable",
        length: 1
      }
    },
    proto: {
      pass: {
        fn: "_pass",
        length: 1
      },
      fail: {
        fn: "fail",
        length: 1
      },
      toBe: {
        fn: "toBe",
        length: 1
      },
      toBeCalled: {
        fn: "toHaveBeenCalled",
        length: 0
      },
      toHaveBeenCalled: {
        fn: "toHaveBeenCalled",
        length: 0
      },
      toHaveBeenCalledOnce: {
        fn: "toHaveBeenCalledOnce",
        length: 0
      },
      toHaveBeenCalledTimes: {
        fn: "toHaveBeenCalledTimes",
        length: 1
      },
      toBeCalledTimes: {
        fn: "toHaveBeenCalledTimes",
        length: 1
      },
      toHaveBeenCalledWith: {
        fn: "toHaveBeenCalledWith"
      },
      toBeCalledWith: {
        fn: "toHaveBeenCalledWith"
      },
      toHaveBeenLastCalledWith: {
        fn: "toHaveBeenLastCalledWith"
      },
      lastCalledWith: {
        fn: "toHaveBeenLastCalledWith"
      },
      toHaveBeenNthCalledWith: {
        fn: "toHaveBeenNthCalledWith"
      },
      nthCalledWith: {
        fn: "toHaveBeenNthCalledWith"
      },
      toHaveReturnedTimes: {
        fn: "toHaveReturnedTimes",
        length: 1
      },
      toReturn: {
        fn: "toHaveReturned",
        length: 1
      },
      toHaveReturned: {
        fn: "toHaveReturned",
        length: 1
      },
      toHaveReturnedWith: {
        fn: "toHaveReturnedWith",
        length: 1
      },
      toHaveLastReturnedWith: {
        fn: "toHaveLastReturnedWith",
        length: 1
      },
      lastReturnedWith: {
        fn: "toHaveLastReturnedWith",
        length: 1
      },
      toHaveNthReturnedWith: {
        fn: "toHaveNthReturnedWith",
        length: 1
      },
      nthReturnedWith: {
        fn: "toHaveNthReturnedWith",
        length: 1
      },
      toHaveLength: {
        fn: "toHaveLength",
        length: 1
      },
      toHaveProperty: {
        fn: "toHaveProperty",
        length: 2
      },
      toBeCloseTo: {
        fn: "toBeCloseTo",
        length: 1
      },
      toBeGreaterThan: {
        fn: "toBeGreaterThan",
        length: 1
      },
      toBeGreaterThanOrEqual: {
        fn: "toBeGreaterThanOrEqual",
        length: 1
      },
      toBeLessThan: {
        fn: "toBeLessThan",
        length: 1
      },
      toBeLessThanOrEqual: {
        fn: "toBeLessThanOrEqual",
        length: 1
      },
      toBeInstanceOf: {
        fn: "toBeInstanceOf",
        length: 1
      },
      toBeTruthy: {
        fn: "toBeTruthy",
        length: 0
      },
      toBeUndefined: {
        fn: "toBeUndefined",
        length: 0
      },
      toBeNaN: {
        fn: "toBeNaN",
        length: 0
      },
      toBeNull: {
        fn: "toBeNull",
        length: 0
      },
      toBeFalsy: {
        fn: "toBeFalsy",
        length: 0
      },
      toBeDefined: {
        fn: "toBeDefined",
        length: 0
      },
      toContain: {
        fn: "toContain",
        length: 1
      },
      toContainKey: {
        fn: "toContainKey",
        length: 1
      },
      toContainAllKeys: {
        fn: "toContainAllKeys",
        length: 1
      },
      toContainAnyKeys: {
        fn: "toContainAnyKeys",
        length: 1
      },
      toContainValue: {
        fn: "toContainValue",
        length: 1
      },
      toContainValues: {
        fn: "toContainValues",
        length: 1
      },
      toContainAllValues: {
        fn: "toContainAllValues",
        length: 1
      },
      toContainAnyValues: {
        fn: "toContainAnyValues",
        length: 1
      },
      toContainKeys: {
        fn: "toContainKeys",
        length: 1
      },
      toContainEqual: {
        fn: "toContainEqual",
        length: 1
      },
      toEqual: {
        fn: "toEqual",
        length: 1
      },
      toMatch: {
        fn: "toMatch",
        length: 1
      },
      toMatchObject: {
        fn: "toMatchObject",
        length: 1
      },
      toMatchSnapshot: {
        fn: "toMatchSnapshot",
        length: 1
      },
      toMatchInlineSnapshot: {
        fn: "toMatchInlineSnapshot",
        length: 1
      },
      toStrictEqual: {
        fn: "toStrictEqual",
        length: 1
      },
      toThrow: {
        fn: "toThrow",
        length: 1
      },
      toThrowError: {
        fn: "toThrow",
        length: 1
      },
      toThrowErrorMatchingSnapshot: {
        fn: "toThrowErrorMatchingSnapshot",
        length: 1
      },
      toThrowErrorMatchingInlineSnapshot: {
        fn: "toThrowErrorMatchingInlineSnapshot",
        length: 1
      },
      toBeOneOf: {
        fn: "toBeOneOf",
        length: 1
      },
      not: {
        getter: "getNot",
        this: true
      },
      resolves: {
        getter: "getResolves",
        this: true
      },
      rejects: {
        getter: "getRejects",
        this: true
      },
      // jest-extended
      toBeEmpty: {
        fn: "toBeEmpty",
        length: 0
      },
      toBeEmptyObject: {
        fn: "toBeEmptyObject",
        length: 0
      },
      toBeEven: {
        fn: "toBeEven",
        length: 0
      },
      toBeOdd: {
        fn: "toBeOdd",
        length: 0
      },
      toBeNil: {
        fn: "toBeNil",
        length: 0
      },
      toBeArray: {
        fn: "toBeArray",
        length: 0
      },
      toBeArrayOfSize: {
        fn: "toBeArrayOfSize",
        length: 1
      },
      toBeBoolean: {
        fn: "toBeBoolean",
        length: 0
      },
      toBeTrue: {
        fn: "toBeTrue",
        length: 0
      },
      toBeTypeOf: {
        fn: "toBeTypeOf",
        length: 1
      },
      toBeFalse: {
        fn: "toBeFalse",
        length: 0
      },
      toBeNumber: {
        fn: "toBeNumber",
        length: 0
      },
      toBeInteger: {
        fn: "toBeInteger",
        length: 0
      },
      toBeObject: {
        fn: "toBeObject",
        length: 0
      },
      toBeFinite: {
        fn: "toBeFinite",
        length: 0
      },
      toBePositive: {
        fn: "toBePositive",
        length: 0
      },
      toBeNegative: {
        fn: "toBeNegative",
        length: 0
      },
      toBeWithin: {
        fn: "toBeWithin",
        length: 2
      },
      toEqualIgnoringWhitespace: {
        fn: "toEqualIgnoringWhitespace",
        length: 1
      },
      toBeSymbol: {
        fn: "toBeSymbol",
        length: 0
      },
      toBeFunction: {
        fn: "toBeFunction",
        length: 0
      },
      toBeDate: {
        fn: "toBeDate",
        length: 0
      },
      toBeValidDate: {
        fn: "toBeValidDate",
        length: 0
      },
      toBeString: {
        fn: "toBeString",
        length: 0
      },
      toInclude: {
        fn: "toInclude",
        length: 1
      },
      toIncludeRepeated: {
        fn: "toIncludeRepeated",
        length: 2
      },
      toSatisfy: {
        fn: "toSatisfy",
        length: 1
      },
      toStartWith: {
        fn: "toStartWith",
        length: 1
      },
      toEndWith: {
        fn: "toEndWith",
        length: 1
      }
    }
  }),
  define({
    name: "ExpectTypeOf",
    construct: true,
    call: true,
    finalize: true,
    JSType: "0b11101110",
    values: [],
    configurable: false,
    klass: {},
    proto: {
      toBeAny: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeUnknown: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeNever: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeFunction: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeObject: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeArray: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeNumber: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeString: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeBoolean: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeVoid: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeSymbol: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeNull: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeUndefined: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeBigInt: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeCallableWith: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toBeConstructibleWith: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      extract: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      exclude: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      pick: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      omit: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      parameter: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      parameters: {
        getter: "getReturnsExpectTypeOf"
      },
      constructorParameters: {
        getter: "getReturnsExpectTypeOf"
      },
      thisParameter: {
        getter: "getReturnsExpectTypeOf"
      },
      instance: {
        getter: "getReturnsExpectTypeOf"
      },
      returns: {
        getter: "getReturnsExpectTypeOf"
      },
      resolves: {
        getter: "getReturnsExpectTypeOf"
      },
      items: {
        getter: "getReturnsExpectTypeOf"
      },
      guards: {
        getter: "getReturnsExpectTypeOf"
      },
      asserts: {
        getter: "getReturnsExpectTypeOf"
      },
      toMatchObjectType: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toExtend: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toEqualTypeOf: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toMatchTypeOf: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      toHaveProperty: {
        fn: "fnOneArgumentReturnsVoid",
        length: 1
      },
      map: {
        fn: "fnOneArgumentReturnsExpectTypeOf",
        length: 1
      },
      not: {
        getter: "getReturnsExpectTypeOf"
      },
      branded: {
        getter: "getReturnsExpectTypeOf"
      }
    }
  }),
  define({
    name: "DoneCallback",
    construct: false,
    noConstructor: true,
    finalize: true,
    JSType: "0b11101110",
    values: [],
    configurable: false,
    klass: {},
    proto: {}
  }),
  define({
    name: "ScopeFunctions",
    construct: false,
    noConstructor: true,
    forBind: true,
    finalize: true,
    JSType: "0b11101110",
    values: ["each"],
    configurable: false,
    klass: {},
    proto: {
      skip: {
        getter: "getSkip",
        cache: true
      },
      todo: {
        getter: "getTodo",
        cache: true
      },
      failing: {
        getter: "getFailing",
        cache: true
      },
      concurrent: {
        getter: "getConcurrent",
        cache: true
      },
      serial: {
        getter: "getSerial",
        cache: true
      },
      only: {
        getter: "getOnly",
        cache: true
      },
      if: {
        fn: "fnIf",
        length: 1
      },
      skipIf: {
        fn: "fnSkipIf",
        length: 1
      },
      todoIf: {
        fn: "fnTodoIf",
        length: 1
      },
      failingIf: {
        fn: "fnFailingIf",
        length: 1
      },
      concurrentIf: {
        fn: "fnConcurrentIf",
        length: 1
      },
      serialIf: {
        fn: "fnSerialIf",
        length: 1
      },
      each: {
        fn: "fnEach",
        length: 1
      }
    }
  })
  // define({
  //   name: "Jest2",
  // }),
];
export {
  jest_classes_default as default
};
