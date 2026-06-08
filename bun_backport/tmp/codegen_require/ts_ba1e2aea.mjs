// ../backport/bun_backport/stubs/bun_test.mjs
var noop = () => {
};
var noopChain = new Proxy({}, { get: () => () => noopChain });
function expect(actual) {
  return noopChain;
}
expect.extend = noop;
expect.anything = () => true;
expect.any = () => ({});
expect.arrayContaining = () => ({});
expect.objectContaining = () => ({});
expect.stringContaining = () => ({});
expect.stringMatching = () => ({});
expect.addEqualityTesters = noop;

// src/codegen/bindgen-lib-internal.ts
import assert from "node:assert";
import * as path from "node:path";
var src = path.join(import.meta.dirname, "../");
var allFunctions = [];
var files = /* @__PURE__ */ new Map();
var typeHashToReachableType = /* @__PURE__ */ new Map();
var typeHashToStruct = /* @__PURE__ */ new Map();
var typeHashToNamespace = /* @__PURE__ */ new Map();
var structHashToSelf = /* @__PURE__ */ new Map();
var cap = (s) => s[0].toUpperCase() + s.slice(1);
var snake = (s) => s[0].toLowerCase() + s.slice(1).replace(/([A-Z])/g, "_$1").replace(/-/g, "_").toLowerCase();
var numericTypes = /* @__PURE__ */ new Set(["f64", "i8", "i16", "i32", "i64", "u8", "u16", "u32", "u64", "usize"]);
var TypeImpl = class _TypeImpl {
  kind;
  data;
  flags;
  /** Access via .name(). */
  nameDeduplicated = void 0;
  /** Access via .hash() */
  #hash = void 0;
  ownerFile;
  constructor(kind, data, flags = {}) {
    this.kind = kind;
    this.data = data;
    this.flags = flags;
    this.ownerFile = path.basename(stackTraceFileName(snapshotCallerLocation()), ".bind.ts");
  }
  isVirtualArgument() {
    return this.kind === "globalObject" || this.kind === "zigVirtualMachine";
  }
  hash() {
    if (this.#hash) {
      return this.#hash;
    }
    let h = `${this.kind}:`;
    switch (this.kind) {
      case "ref":
        throw new Error("TODO");
      case "sequence":
        h += this.data.element.hash();
        break;
      case "record":
        h += this.data.value.hash();
        break;
      case "zigEnum":
        h += `${this.data.file}:${this.data.impl}`;
        break;
      case "stringEnum":
        h += this.data.join(",");
        break;
      case "oneOf":
        h += this.data.map((t2) => t2.hash()).join(",");
        break;
      case "dictionary":
        h += this.data.map(({ key, required, type }) => `${key}:${required}:${type.hash()}`).join(",");
        break;
    }
    let hash = String(Bun.hash(h));
    this.#hash = hash;
    return hash;
  }
  /**
   * If this type lowers to a named type (struct, union, enum)
   */
  lowersToNamedType() {
    switch (this.kind) {
      case "ref":
        throw new Error("TODO");
      case "sequence":
      case "record":
      case "oneOf":
      case "dictionary":
      case "stringEnum":
      case "zigEnum":
        return true;
      default:
        return false;
    }
  }
  canDirectlyMapToCAbi() {
    let kind = this.kind;
    switch (kind) {
      case "ref":
        throw new Error("TODO");
      case "any":
        return "JSValue";
      case "ByteString":
      case "DOMString":
      case "USVString":
      case "UTF8String":
        return "bun.String";
      case "boolean":
        return "bool";
      case "strictBoolean":
        return "bool";
      case "f64":
      case "i8":
      case "i16":
      case "i32":
      case "i64":
      case "u8":
      case "u16":
      case "u32":
      case "u64":
      case "usize":
        return kind;
      case "globalObject":
      case "zigVirtualMachine":
        return "*JSGlobalObject";
      case "stringEnum":
        return cAbiTypeForEnum(this.data.length);
      case "zigEnum":
        throw new Error("TODO");
      case "undefined":
        return "u0";
      case "oneOf":
      case "UTF8String":
      case "record":
      case "sequence":
        return null;
      case "externalClass":
        throw new Error("TODO");
        return "*anyopaque";
      case "dictionary": {
        let existing = typeHashToStruct.get(this.hash());
        if (existing) return existing;
        existing = new Struct();
        for (const { key, type } of this.data) {
          if (type.flags.optional && !("default" in type.flags)) {
            return null;
          }
          const repr = type.canDirectlyMapToCAbi();
          if (!repr) return null;
          existing.add(key, repr);
        }
        existing.reorderForSmallestSize();
        if (!structHashToSelf.has(existing.hash())) {
          structHashToSelf.set(existing.hash(), existing);
        }
        existing.assignName(this.name());
        typeHashToStruct.set(this.hash(), existing);
        return existing;
      }
      case "sequence": {
        return null;
      }
      default: {
        throw new Error("unexpected: " + kind);
      }
    }
  }
  name() {
    if (this.nameDeduplicated) {
      return this.nameDeduplicated;
    }
    const hash = this.hash();
    const existing = typeHashToReachableType.get(hash);
    if (existing) return this.nameDeduplicated = existing.nameDeduplicated ??= this.#generateName();
    return this.nameDeduplicated = `anon_${this.kind}_${hash}`;
  }
  cppInternalName() {
    const name = this.name();
    const cAbiType = this.canDirectlyMapToCAbi();
    const namespace = typeHashToNamespace.get(this.hash());
    if (cAbiType) {
      if (typeof cAbiType === "string") {
        return cAbiType;
      }
    }
    return namespace ? `${namespace}${name}` : name;
  }
  cppClassName() {
    assert(this.lowersToNamedType(), `Does not lower to named type: ${inspect(this)}`);
    const name = this.name();
    const namespace = typeHashToNamespace.get(this.hash());
    return namespace ? `${namespace}::${cap(name)}` : name;
  }
  cppName() {
    const name = this.name();
    const cAbiType = this.canDirectlyMapToCAbi();
    const namespace = typeHashToNamespace.get(this.hash());
    if (cAbiType && typeof cAbiType === "string" && this.kind !== "zigEnum" && this.kind !== "stringEnum") {
      return cAbiTypeName(cAbiType);
    }
    return namespace ? `${namespace}::${cap(name)}` : name;
  }
  #generateName() {
    return `bindgen_${this.ownerFile}_${this.hash()}`;
  }
  /**
   * Name assignment is done to give readable names.
   * The first name to a unique hash wins.
   */
  assignName(name) {
    if (this.nameDeduplicated) return;
    const hash = this.hash();
    const existing = typeHashToReachableType.get(hash);
    if (existing) {
      this.nameDeduplicated = existing.nameDeduplicated ??= name;
      return;
    }
    this.nameDeduplicated = name;
  }
  markReachable() {
    if (!this.lowersToNamedType()) return;
    const hash = this.hash();
    const existing = typeHashToReachableType.get(hash);
    this.nameDeduplicated ??= existing?.name() ?? `anon_${this.kind}_${hash}`;
    if (!existing) typeHashToReachableType.set(hash, this);
    switch (this.kind) {
      case "ref":
        throw new Error("TODO");
      case "sequence":
        this.data.element.markReachable();
        break;
      case "record":
        this.data.value.markReachable();
        break;
      case "oneOf":
        for (const type of this.data) {
          type.markReachable();
        }
        break;
      case "dictionary":
        for (const { type } of this.data) {
          type.markReachable();
        }
        break;
    }
  }
  #rangeModifier(min, max, kind) {
    if (this.flags.range) {
      throw new Error("This type already has a range modifier set");
    }
    const range = cAbiIntegerLimits(this.kind);
    const abiMin = BigInt(range[0]);
    const abiMax = BigInt(range[1]);
    if (min === void 0) {
      min = abiMin;
      max = abiMax;
    } else {
      if (max === void 0) {
        throw new Error("Expected min and max to be both set or both unset");
      }
      min = BigInt(min);
      max = BigInt(max);
      if (min < abiMin || min > abiMax) {
        throw new Error(`Expected integer in range ${range}, got ${inspect(min)}`);
      }
      if (max < abiMin || max > abiMax) {
        throw new Error(`Expected integer in range ${range}, got ${inspect(max)}`);
      }
      if (min > max) {
        throw new Error(`Expected min <= max, got ${inspect(min)} > ${inspect(max)}`);
      }
    }
    return new _TypeImpl(this.kind, this.data, {
      ...this.flags,
      range: min === BigInt(range[0]) && max === BigInt(range[1]) ? [kind, "abi", "abi"] : [kind, min, max]
    });
  }
  assertDefaultIsValid(value) {
    switch (this.kind) {
      case "DOMString":
      case "ByteString":
      case "USVString":
      case "UTF8String":
        if (typeof value !== "string") {
          throw new Error(`Expected string, got ${inspect(value)}`);
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          throw new Error(`Expected boolean, got ${inspect(value)}`);
        }
        break;
      case "f64":
        if (typeof value !== "number") {
          throw new Error(`Expected number, got ${inspect(value)}`);
        }
        break;
      case "usize":
      case "u8":
      case "u16":
      case "u32":
      case "u64":
      case "i8":
      case "i16":
      case "i32":
      case "i64":
        const range = this.flags.range?.slice(1) ?? cAbiIntegerLimits(this.kind);
        if (typeof value === "number") {
          if (value % 1 !== 0) {
            throw new Error(`Expected integer, got ${inspect(value)}`);
          }
          if (value >= Number.MAX_SAFE_INTEGER || value <= Number.MIN_SAFE_INTEGER) {
            throw new Error(
              `Specify default ${this.kind} outside of max safe integer range as a BigInt to avoid precision loss`
            );
          }
          if (value < Number(range[0]) || value > Number(range[1])) {
            throw new Error(`Expected integer in range [${range[0]}, ${range[1]}], got ${inspect(value)}`);
          }
        } else if (typeof value === "bigint") {
          if (value < BigInt(range[0]) || value > BigInt(range[1])) {
            throw new Error(`Expected integer in range [${range[0]}, ${range[1]}], got ${inspect(value)}`);
          }
        } else {
          throw new Error(`Expected integer, got ${inspect(value)}`);
        }
        break;
      case "dictionary":
        if (typeof value !== "object" || value === null) {
          throw new Error(`Expected object, got ${inspect(value)}`);
        }
        for (const { key, type } of this.data) {
          if (key in value) {
            type.assertDefaultIsValid(value[key]);
          } else if (type.flags.required) {
            throw new Error(`Missing key ${key} in dictionary`);
          }
        }
        break;
      case "undefined":
        assert(value === void 0, `Expected undefined, got ${inspect(value)}`);
        break;
      default:
        throw new Error(`TODO: set default value on type ${this.kind}`);
    }
  }
  emitCppDefaultValue(w) {
    const value = this.flags.default;
    switch (this.kind) {
      case "boolean":
        w.add(value ? "true" : "false");
        break;
      case "f64":
        w.add(String(value));
        break;
      case "usize":
      case "u8":
      case "u16":
      case "u32":
      case "u64":
      case "i8":
      case "i16":
      case "i32":
      case "i64":
        w.add(String(value));
        break;
      case "dictionary":
        const struct = this.structType();
        w.line(`${this.cppName()} {`);
        w.indent();
        for (const { name } of struct.fields) {
          w.add(`.${name} = `);
          const type = this.data.find((f) => f.key === name).type;
          type.emitCppDefaultValue(w);
          w.line(",");
        }
        w.dedent();
        w.add(`}`);
        break;
      case "DOMString":
      case "ByteString":
      case "USVString":
      case "UTF8String":
        if (typeof value === "string") {
          w.add("Bun::BunStringEmpty");
        } else {
          throw new Error(`TODO: non-empty string default`);
        }
        break;
      case "undefined":
        throw new Error("Zero-sized type");
      default:
        throw new Error(`TODO: set default value on type ${this.kind}`);
    }
  }
  structType() {
    const direct = this.canDirectlyMapToCAbi();
    assert(typeof direct !== "string");
    if (direct) return direct;
    throw new Error("TODO: generate non-extern struct for representing this data type");
  }
  isIgnoredUndefinedType() {
    return this.kind === "undefined";
  }
  isStringType() {
    return this.kind === "DOMString" || this.kind === "ByteString" || this.kind === "USVString" || this.kind === "UTF8String";
  }
  isNumberType() {
    return numericTypes.has(this.kind);
  }
  isObjectType() {
    return this.kind === "externalClass" || this.kind === "dictionary";
  }
  [Symbol.toStringTag] = "Type";
  [Bun.inspect.custom](depth, options, inspect2) {
    return `${options.stylize("Type", "special")} ${this.lowersToNamedType() && this.nameDeduplicated ? options.stylize(JSON.stringify(this.nameDeduplicated), "string") + " " : ""}${options.stylize(
      `[${this.kind}${["required", "optional", "nullable"].filter((k) => this.flags[k]).map((x) => ", " + x).join("")}]`,
      "regexp"
    )}` + (this.data ? " " + inspect2(this.data, {
      ...options,
      depth: options.depth === null ? null : options.depth - 1
    }).replace(/\n/g, "\n") : "");
  }
  // Public interface definition API
  get optional() {
    if (this.flags.required) {
      throw new Error("Cannot derive optional on a required type");
    }
    if (this.flags.default) {
      throw new Error("Cannot derive optional on a something with a default value (default implies optional)");
    }
    return new _TypeImpl(this.kind, this.data, {
      ...this.flags,
      optional: true
    });
  }
  get finite() {
    if (this.kind !== "f64") {
      throw new Error("finite can only be used on f64");
    }
    if (this.flags.finite) {
      throw new Error("This type already has finite set");
    }
    return new _TypeImpl(this.kind, this.data, {
      ...this.flags,
      finite: true
    });
  }
  get required() {
    if (this.flags.required) {
      throw new Error("This type already has required set");
    }
    if (this.flags.required) {
      throw new Error("Cannot derive required on an optional type");
    }
    return new _TypeImpl(this.kind, this.data, {
      ...this.flags,
      required: true
    });
  }
  default(def) {
    if ("default" in this.flags) {
      throw new Error("This type already has a default value");
    }
    if (this.flags.required) {
      throw new Error("Cannot derive default on a required type");
    }
    this.assertDefaultIsValid(def);
    return new _TypeImpl(this.kind, this.data, {
      ...this.flags,
      default: def
    });
  }
  clamp(min, max) {
    return this.#rangeModifier(min, max, "clamp");
  }
  enforceRange(min, max) {
    return this.#rangeModifier(min, max, "enforce");
  }
  get nonNull() {
    if (this.flags.nonNull) {
      throw new Error("Cannot derive nonNull on a nonNull type");
    }
    return new _TypeImpl(this.kind, this.data, {
      ...this.flags,
      nonNull: true
    });
  }
  validateInt32(min, max) {
    if (this.kind !== "i32") {
      throw new Error("validateInt32 can only be used on i32 or u32");
    }
    const rangeInfo = cAbiIntegerLimits("i32");
    return this.validateInteger(min ?? rangeInfo[0], max ?? rangeInfo[1]);
  }
  validateUint32(min, max) {
    if (this.kind !== "u32") {
      throw new Error("validateUint32 can only be used on i32 or u32");
    }
    const rangeInfo = cAbiIntegerLimits("u32");
    return this.validateInteger(min ?? rangeInfo[0], max ?? rangeInfo[1]);
  }
  validateInteger(min, max) {
    min ??= Number.MIN_SAFE_INTEGER;
    max ??= Number.MAX_SAFE_INTEGER;
    const enforceRange = this.#rangeModifier(min, max, "enforce");
    enforceRange.flags.nodeValidator = "validateInteger" /* validateInteger */;
    return enforceRange;
  }
};
function cAbiIntegerLimits(type) {
  switch (type) {
    case "u8":
      return [0, 255];
    case "u16":
      return [0, 65535];
    case "u32":
      return [0, 4294967295];
    case "u64":
      return [0, 18446744073709551615n];
    case "usize":
      return [0, 18446744073709551615n];
    case "i8":
      return [-128, 127];
    case "i16":
      return [-32768, 32767];
    case "i32":
      return [-2147483648, 2147483647];
    case "i64":
      return [-9223372036854775808n, 9223372036854775807n];
    case "f64":
      return [-Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER];
    default:
      throw new Error(`Unexpected type ${type}`);
  }
}
function cAbiTypeForEnum(length) {
  return "u" + alignForward(length, 8);
}
function inspect(value) {
  return Bun.inspect(value, { colors: Bun.enableANSIColors });
}
function oneOfImpl(types) {
  const out = [];
  for (const type of types) {
    if (type.kind === "oneOf") {
      out.push(...type.data);
    } else {
      if (type.flags.default) {
        throw new Error(
          "Union type cannot include a default value. Instead, set a default value on the union type itself"
        );
      }
      if (type.isVirtualArgument()) {
        throw new Error(`t.${type.kind} can only be used as a function argument type`);
      }
      out.push(type);
    }
  }
  return new TypeImpl("oneOf", out);
}
function dictionaryImpl(record) {
  const out = [];
  for (const key in record) {
    const type = record[key];
    if (type.isVirtualArgument()) {
      throw new Error(`t.${type.kind} can only be used as a function argument type`);
    }
    out.push({
      key,
      type
    });
  }
  return new TypeImpl("dictionary", out);
}
var isFunc = Symbol("isFunc");
function registerFunction(opts) {
  const snapshot = snapshotCallerLocation();
  const filename = stackTraceFileName(snapshot);
  expect(filename).toEndWith(".bind.ts");
  const zigFile = path.relative(src, filename.replace(/\.bind\.ts$/, ".zig"));
  let file = files.get(zigFile);
  if (!file) {
    file = { functions: [], typedefs: [] };
    files.set(zigFile, file);
  }
  const variants = [];
  if ("variants" in opts) {
    let i = 1;
    for (const variant of opts.variants) {
      const { minRequiredArgs } = validateVariant(variant);
      variants.push({
        args: Object.entries(variant.args).map(([name, type]) => ({ name, type })),
        ret: variant.ret,
        suffix: `${i}`,
        minRequiredArgs
      });
      i++;
    }
  } else {
    const { minRequiredArgs } = validateVariant(opts);
    variants.push({
      suffix: "",
      args: Object.entries(opts.args).map(([name, type]) => ({ name, type })),
      ret: opts.ret,
      minRequiredArgs
    });
  }
  const func = {
    [isFunc]: true,
    name: "",
    zigPrefix: opts.implNamespace ? `${opts.implNamespace}.` : "",
    snapshot,
    zigFile,
    variants
  };
  allFunctions.push(func);
  file.functions.push(func);
  return func;
}
function validateVariant(variant) {
  let minRequiredArgs = 0;
  let seenOptionalArgument = false;
  let i = 0;
  for (const [name, type] of Object.entries(variant.args)) {
    if (!(type instanceof TypeImpl)) {
      throw new Error(`Expected type for argument ${name}, got ${inspect(type)}`);
    }
    i += 1;
    if (type.isVirtualArgument()) {
      continue;
    }
    if (!type.flags.optional && !("default" in type.flags)) {
      if (seenOptionalArgument) {
        throw new Error(`Required argument ${name} cannot follow an optional argument`);
      }
      minRequiredArgs++;
    } else {
      seenOptionalArgument = true;
    }
  }
  return { minRequiredArgs };
}
function snapshotCallerLocation() {
  const stack = new Error().stack;
  const lines = stack.split("\n");
  let i = 1;
  for (; i < lines.length; i++) {
    if (!lines[i].includes(import.meta.dir)) {
      return lines[i];
    }
  }
  throw new Error("Couldn't find caller location in stack trace");
}
function stackTraceFileName(line) {
  const match = /(?:at\s+|\()(.:?[^:\n(\)]*)[^(\n]*$/i.exec(line);
  assert(match, `Couldn't extract filename from stack trace line: ${line}`);
  return match[1].replaceAll("\\", "/");
}
function cAbiTypeInfo(type) {
  if (typeof type !== "string") {
    return type.abiInfo();
  }
  switch (type) {
    case "u0":
      return [0, 0];
    case "bool":
    case "u8":
    case "i8":
      return [1, 1];
    case "u16":
    case "i16":
      return [2, 2];
    case "u32":
    case "i32":
      return [4, 4];
    case "usize":
    case "u64":
    case "i64":
    case "f64":
      return [8, 8];
    case "*anyopaque":
    case "*JSGlobalObject":
    case "JSValue":
    case "JSValue.MaybeException":
      return [8, 8];
    case "bun.String":
      return [24, 8];
    default:
      throw new Error("unexpected: " + type);
  }
}
function cAbiTypeName(type) {
  if (typeof type !== "string") {
    return type.name();
  }
  return {
    "*anyopaque": "void*",
    "*JSGlobalObject": "JSC::JSGlobalObject*",
    "JSValue": "JSValue",
    "JSValue.MaybeException": "JSValue",
    "bool": "bool",
    "u8": "uint8_t",
    "u16": "uint16_t",
    "u32": "uint32_t",
    "u64": "uint64_t",
    "i8": "int8_t",
    "i16": "int16_t",
    "i32": "int32_t",
    "i64": "int64_t",
    "f64": "double",
    "usize": "size_t",
    "bun.String": "BunString",
    u0: "void"
  }[type];
}
function alignForward(size, alignment) {
  return Math.floor((size + alignment - 1) / alignment) * alignment;
}
var Struct = class _Struct {
  fields = [];
  #hash;
  #name;
  namespace;
  abiInfo() {
    let size = 0;
    let align = 0;
    for (const field of this.fields) {
      size = alignForward(size, field.naturalAlignment);
      size += field.size;
      align = Math.max(align, field.naturalAlignment);
    }
    return [size, align];
  }
  reorderForSmallestSize() {
    this.fields.sort((a, b) => {
      if (a.naturalAlignment !== b.naturalAlignment) {
        return a.naturalAlignment - b.naturalAlignment;
      }
      if (a.size !== b.size) {
        return a.size - b.size;
      }
      return a.name.localeCompare(b.name);
    });
  }
  hash() {
    return this.#hash ??= String(
      Bun.hash(
        this.fields.map((f) => {
          if (f.type instanceof _Struct) {
            return f.name + `:` + f.type.hash();
          }
          return f.name + `:` + f.type;
        }).join(",")
      )
    );
  }
  name() {
    if (this.#name) return this.#name;
    const hash = this.hash();
    const existing = structHashToSelf.get(hash);
    if (existing && existing !== this) return this.#name = existing.name();
    return this.#name = `anon_extern_struct_${hash}`;
  }
  toString() {
    return this.namespace ? `${this.namespace}.${this.name()}` : this.name();
  }
  assignName(name) {
    if (this.#name) return;
    const hash = this.hash();
    const existing = structHashToSelf.get(hash);
    if (existing && existing.#name) name = existing.#name;
    this.#name = name;
    if (existing) existing.#name = name;
  }
  assignGeneratedName(name) {
    if (this.#name) return;
    this.assignName(name);
  }
  add(name, cType) {
    const [size, naturalAlignment] = cAbiTypeInfo(cType);
    this.fields.push({ name, type: cType, size, naturalAlignment });
  }
  emitZig(zig, semi) {
    zig.line("extern struct {");
    zig.indent();
    for (const field of this.fields) {
      zig.line(`${snake(field.name)}: ${field.type},`);
    }
    zig.dedent();
    zig.line("}" + (semi === "with-semi" ? ";" : ""));
  }
  emitCpp(cpp, structName) {
    cpp.line(`struct ${structName} {`);
    cpp.indent();
    for (const field of this.fields) {
      cpp.line(`${cAbiTypeName(field.type)} ${field.name};`);
    }
    cpp.dedent();
    cpp.line("};");
  }
};

// src/codegen/bindgen-lib.ts
function builtinType() {
  return (kind) => new TypeImpl(kind, void 0, {});
}
var t;
((t2) => {
  t2.globalObject = builtinType()("globalObject");
  t2.zigVirtualMachine = builtinType()("zigVirtualMachine");
  t2.any = builtinType()("any");
  t2.undefined = builtinType()("undefined");
  t2.boolean = builtinType()("boolean");
  t2.strictBoolean = builtinType()("strictBoolean");
  t2.f64 = builtinType()("f64");
  t2.u8 = builtinType()("u8");
  t2.u16 = builtinType()("u16");
  t2.u32 = builtinType()("u32");
  t2.u64 = builtinType()("u64");
  t2.i8 = builtinType()("i8");
  t2.i16 = builtinType()("i16");
  t2.i32 = builtinType()("i32");
  t2.i64 = builtinType()("i64");
  t2.usize = builtinType()("usize");
  t2.DOMString = builtinType()("DOMString");
  t2.USVString = builtinType()("USVString");
  t2.ByteString = builtinType()("ByteString");
  t2.UTF8String = builtinType()("UTF8String");
  function sequence(itemType) {
    return new TypeImpl("sequence", {
      element: itemType,
      repr: "slice"
    });
  }
  t2.sequence = sequence;
  function record(valueType) {
    return new TypeImpl("record", {
      value: valueType,
      repr: "kv-slices"
    });
  }
  t2.record = record;
  function ref(name) {
    return new TypeImpl("ref", name);
  }
  t2.ref = ref;
  function externalClass(name) {
    return new TypeImpl("ref", name);
  }
  t2.externalClass = externalClass;
  function oneOf(...types) {
    return oneOfImpl(types);
  }
  t2.oneOf = oneOf;
  function dictionary(fields) {
    return dictionaryImpl(fields);
  }
  t2.dictionary = dictionary;
  function stringEnum(...values) {
    return new TypeImpl("stringEnum", values.sort());
  }
  t2.stringEnum = stringEnum;
  function zigEnum(file, impl) {
    return new TypeImpl("zigEnum", { file, impl });
  }
  t2.zigEnum = zigEnum;
})(t || (t = {}));
function fn(opts) {
  return registerFunction(opts);
}

// src/bake/DevServer.bind.ts
var getDeinitCountForTesting = fn({
  args: {},
  ret: t.usize
});
export {
  getDeinitCountForTesting
};
