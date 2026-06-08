// src/codegen/bindgen.ts
import assert2 from "node:assert";
import fs2 from "node:fs";
import * as path3 from "node:path";

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
var src = path.join("/Volumes/Data/src/bun/src/codegen", "../");
var files = /* @__PURE__ */ new Map();
var typeHashToReachableType = /* @__PURE__ */ new Map();
var typeHashToStruct = /* @__PURE__ */ new Map();
var typeHashToNamespace = /* @__PURE__ */ new Map();
var structHashToSelf = /* @__PURE__ */ new Map();
var str = (v) => JSON.stringify(v);
var cap = (s) => s[0].toUpperCase() + s.slice(1);
var zid = (s) => s.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/) ? s : "@" + str(s);
var snake = (s) => s[0].toLowerCase() + s.slice(1).replace(/([A-Z])/g, "_$1").replace(/-/g, "_").toLowerCase();
var camel = (s) => s[0].toLowerCase() + s.slice(1).replace(/[_-](\w)?/g, (_, letter) => letter?.toUpperCase() ?? "");
var pascal = (s) => cap(camel(s));
var extJsFunction = (namespaceVar, fnLabel) => `bindgen_${cap(namespaceVar)}_js${cap(fnLabel)}`;
var extDispatchVariant = (namespaceVar, fnLabel, variantNumber) => `bindgen_${cap(namespaceVar)}_dispatch${cap(fnLabel)}${variantNumber}`;
var extInternalDispatchVariant = (namespaceVar, fnLabel, variantNumber) => `bindgen_${cap(namespaceVar)}_js${cap(fnLabel)}_v${variantNumber}`;
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
        h += this.data.map((t) => t.hash()).join(",");
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
var isFunc = Symbol("isFunc");
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
  emitZig(zig2, semi) {
    zig2.line("extern struct {");
    zig2.indent();
    for (const field of this.fields) {
      zig2.line(`${snake(field.name)}: ${field.type},`);
    }
    zig2.dedent();
    zig2.line("}" + (semi === "with-semi" ? ";" : ""));
  }
  emitCpp(cpp2, structName) {
    cpp2.line(`struct ${structName} {`);
    cpp2.indent();
    for (const field of this.fields) {
      cpp2.line(`${cAbiTypeName(field.type)} ${field.name};`);
    }
    cpp2.dedent();
    cpp2.line("};");
  }
};
var CodeWriter = class {
  level = 0;
  buffer = "";
  temporaries = /* @__PURE__ */ new Set();
  line(s) {
    this.add((s ?? "") + "\n");
  }
  add(s) {
    this.buffer += (this.buffer.endsWith("\n") ? "    ".repeat(this.level) : "") + s;
  }
  indent() {
    this.level += 1;
  }
  dedent() {
    this.level -= 1;
  }
  trimLastNewline() {
    this.buffer = this.buffer.trimEnd();
  }
  resetTemporaries() {
    this.temporaries.clear();
  }
  nextTemporaryName(label) {
    let i = 0;
    let name = `${label}_${i}`;
    while (this.temporaries.has(name)) {
      i++;
      name = `${label}_${i}`;
    }
    this.temporaries.add(name);
    return name;
  }
};

// src/codegen/helpers.ts
import fs from "node:fs";
import path2 from "path";
function writeIfNotChanged(file, contents) {
  if (Array.isArray(contents)) contents = contents.join("");
  contents = contents.replaceAll("\r\n", "\n").trim() + "\n";
  try {
    const oldContents = fs.readFileSync(file, "utf8");
    if (oldContents === contents) {
      return;
    }
  } catch (e) {
  }
  try {
    fs.writeFileSync(file, contents);
  } catch (error) {
    fs.mkdirSync(path2.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  if (fs.readFileSync(file, "utf8") !== contents) {
    throw new Error(`Failed to write file ${file}`);
  }
}
function readdirRecursiveWithExclusionsAndExtensionsSync(dir, exclusions, exts) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    if (exclusions.includes(entry.name)) return [];
    const fullPath = path2.join(dir, entry.name);
    return entry.isDirectory() ? readdirRecursiveWithExclusionsAndExtensionsSync(fullPath, exclusions, exts) : exts.some((ext) => fullPath.endsWith(ext)) ? fullPath : [];
  });
}
function argParse(keys) {
  const options = {};
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--")) {
      console.error("error: unknown argument: " + arg);
      process.exit(1);
    }
    const splitPos = arg.indexOf("=");
    let name = arg;
    let value = true;
    if (splitPos !== -1) {
      name = arg.slice(0, splitPos);
      value = arg.slice(splitPos + 1);
    }
    options[name.slice(2)] = value;
  }
  const unknown = new Set(Object.keys(options));
  for (const key of keys) {
    unknown.delete(key);
  }
  for (const key of unknown) {
    console.error("error: unknown argument: --" + key);
  }
  if (unknown.size > 0) process.exit(1);
  return options;
}

// src/codegen/bindgen.ts
var { "codegen-root": codegenRoot, debug } = argParse(["codegen-root", "debug"]);
if (debug === "false" || debug === "0" || debug == "OFF") debug = false;
if (!codegenRoot) {
  console.error("Missing --codegen-root=...");
  process.exit(1);
}
function resolveVariantStrategies(vari, name) {
  let argIndex = 0;
  let communicationStruct;
  for (const arg of vari.args) {
    if (arg.type.isVirtualArgument() && vari.globalObjectArg === void 0) {
      vari.globalObjectArg = argIndex;
    }
    argIndex += 1;
    const isNullable = arg.type.flags.optional && !("default" in arg.type.flags);
    const abiType = !isNullable && arg.type.canDirectlyMapToCAbi();
    if (abiType) {
      arg.loweringStrategy = {
        // This does not work in release builds, possibly due to a Zig 0.13 bug
        // regarding by-value extern structs in C functions.
        // type: cAbiTypeInfo(abiType)[0] > 8 ? "c-abi-pointer" : "c-abi-value",
        // Always pass an argument by-pointer for now.
        type: abiType === "*anyopaque" || abiType === "*JSGlobalObject" ? "c-abi-value" : "c-abi-pointer",
        abiType
      };
      continue;
    }
    communicationStruct ??= new Struct();
    const prefix = `${arg.name}`;
    const children = isNullable ? resolveNullableArgumentStrategy(arg.type, prefix, communicationStruct) : resolveComplexArgumentStrategy(arg.type, prefix, communicationStruct);
    arg.loweringStrategy = {
      type: "uses-communication-buffer",
      prefix,
      children
    };
  }
  if (vari.globalObjectArg === void 0) {
    vari.globalObjectArg = "hidden";
  }
  return_strategy: {
    if (vari.ret.kind === "undefined") {
      vari.returnStrategy = { type: "void" };
      break return_strategy;
    }
    if (vari.ret.kind === "any") {
      vari.returnStrategy = { type: "jsvalue" };
      break return_strategy;
    }
    const abiType = vari.ret.canDirectlyMapToCAbi();
    if (abiType) {
      vari.returnStrategy = {
        type: "basic-out-param",
        abiType
      };
      break return_strategy;
    }
  }
  communicationStruct?.reorderForSmallestSize();
  communicationStruct?.assignGeneratedName(name);
  vari.communicationStruct = communicationStruct;
}
function resolveNullableArgumentStrategy(type, prefix, communicationStruct) {
  assert2(type.flags.optional && !("default" in type.flags));
  communicationStruct.add(`${prefix}Set`, "bool");
  return resolveComplexArgumentStrategy(type, `${prefix}Value`, communicationStruct);
}
function resolveComplexArgumentStrategy(type, prefix, communicationStruct) {
  const abiType = type.canDirectlyMapToCAbi();
  if (abiType) {
    communicationStruct.add(prefix, abiType);
    return [
      {
        type: "c-abi-compatible",
        abiType
      }
    ];
  }
  switch (type.kind) {
    default:
      throw new Error(`TODO: resolveComplexArgumentStrategy for ${type.kind}`);
  }
}
function collectStringTemps(args) {
  const result = /* @__PURE__ */ new Map();
  let jsArgIdx = 0;
  for (const arg of args) {
    const type = arg.type;
    if (type.isVirtualArgument()) continue;
    if (type.isIgnoredUndefinedType()) {
      jsArgIdx++;
      continue;
    }
    if (type.isStringType()) {
      result.set(jsArgIdx, [cpp.nextTemporaryName("wtfString")]);
    } else if (type.kind === "dictionary") {
      const temps = [];
      for (const field of type.data) {
        if (field.type.isStringType()) {
          temps.push(cpp.nextTemporaryName("wtfString"));
        }
      }
      if (temps.length > 0) {
        result.set(jsArgIdx, temps);
      }
    }
    jsArgIdx++;
  }
  return result;
}
function emitCppCallToVariant(name, variant, dispatchFunctionName) {
  cpp.line(`auto& vm = JSC::getVM(global);`);
  cpp.line(`auto throwScope = DECLARE_THROW_SCOPE(vm);`);
  if (variant.minRequiredArgs > 0) {
    cpp.line(`size_t argumentCount = callFrame->argumentCount();`);
    cpp.line(`if (argumentCount < ${variant.minRequiredArgs}) {`);
    cpp.line(`    return JSC::throwVMError(global, throwScope, createNotEnoughArgumentsError(global));`);
    cpp.line(`}`);
  }
  const communicationStruct = variant.communicationStruct;
  if (communicationStruct) {
    cpp.line(`${communicationStruct.name()} buf;`);
    communicationStruct.emitCpp(cppInternal, communicationStruct.name());
  }
  const hoistedTemps = collectStringTemps(variant.args);
  for (const temps of hoistedTemps.values()) {
    for (const temp of temps) {
      cpp.line(`WTF::String ${temp};`);
    }
  }
  let i = 0;
  for (const arg of variant.args) {
    const type = arg.type;
    if (type.isVirtualArgument()) continue;
    if (type.isIgnoredUndefinedType()) {
      i += 1;
      continue;
    }
    const exceptionContext = {
      type: "argument",
      argumentIndex: i,
      name: arg.name,
      functionName: name
    };
    const strategy = arg.loweringStrategy;
    assert2(strategy);
    const get = variant.minRequiredArgs > i ? "uncheckedArgument" : "argument";
    cpp.line(`JSC::EnsureStillAliveScope arg${i} = callFrame->${get}(${i});`);
    let storageLocation;
    let needDeclare = true;
    switch (strategy.type) {
      case "c-abi-pointer":
      case "c-abi-value":
        storageLocation = "arg" + cap(arg.name);
        break;
      case "uses-communication-buffer":
        storageLocation = `buf.${strategy.prefix}`;
        needDeclare = false;
        break;
      default:
        throw new Error(`TODO: emitCppCallToVariant for ${inspect(strategy)}`);
    }
    const jsValueRef = `arg${i}.value()`;
    const isOptionalToUser = type.flags.optional || "default" in type.flags;
    const isNullable = type.flags.optional && !("default" in type.flags);
    const argTemps = hoistedTemps.get(i);
    if (isOptionalToUser) {
      if (needDeclare) {
        addHeaderForType(type);
        cpp.line(`${type.cppName()} ${storageLocation};`);
      }
      const isUndefinedOrNull = type.flags.nonNull ? "isUndefined" : "isUndefinedOrNull";
      if (isNullable) {
        assert2(strategy.type === "uses-communication-buffer");
        cpp.line(`if ((${storageLocation}Set = !${jsValueRef}.${isUndefinedOrNull}())) {`);
        storageLocation = `${storageLocation}Value`;
      } else {
        cpp.line(`if (!${jsValueRef}.${isUndefinedOrNull}()) {`);
      }
      cpp.indent();
      const hoistedTemp = type.isStringType() ? argTemps?.[0] : void 0;
      emitConvertValue(storageLocation, arg.type, jsValueRef, exceptionContext, "assign", hoistedTemp, argTemps);
      cpp.dedent();
      if ("default" in type.flags) {
        cpp.line(`} else {`);
        cpp.indent();
        cpp.add(`${storageLocation} = `);
        type.emitCppDefaultValue(cpp);
        cpp.line(";");
        cpp.dedent();
      } else {
        assert2(isNullable);
      }
      cpp.line(`}`);
    } else {
      const hoistedTemp = type.isStringType() ? argTemps?.[0] : void 0;
      emitConvertValue(
        storageLocation,
        arg.type,
        jsValueRef,
        exceptionContext,
        needDeclare ? "declare" : "assign",
        hoistedTemp,
        argTemps
      );
    }
    i += 1;
  }
  const returnStrategy = variant.returnStrategy;
  switch (returnStrategy.type) {
    case "jsvalue":
      cpp.line(`return ${dispatchFunctionName}(`);
      break;
    case "basic-out-param":
      cpp.line(`${cAbiTypeName(returnStrategy.abiType)} out;`);
      cpp.line(`if (!${dispatchFunctionName}(`);
      break;
    case "void":
      cpp.line(`if (!${dispatchFunctionName}(`);
      break;
    default:
      throw new Error(`TODO: emitCppCallToVariant for ${inspect(returnStrategy)}`);
  }
  let emittedFirstArgument = false;
  function addCommaAfterArgument() {
    if (emittedFirstArgument) {
      cpp.line(",");
    } else {
      emittedFirstArgument = true;
    }
  }
  const totalArgs = variant.args.length;
  i = 0;
  cpp.indent();
  if (variant.globalObjectArg === "hidden") {
    addCommaAfterArgument();
    cpp.add("global");
  }
  for (const arg of variant.args) {
    i += 1;
    if (arg.type.isIgnoredUndefinedType()) continue;
    if (arg.type.isVirtualArgument()) {
      switch (arg.type.kind) {
        case "zigVirtualMachine":
        case "globalObject":
          addCommaAfterArgument();
          cpp.add("global");
          break;
        default:
          throw new Error(`TODO: emitCppCallToVariant for ${inspect(arg.type)}`);
      }
    } else {
      const storageLocation = `arg${cap(arg.name)}`;
      const strategy = arg.loweringStrategy;
      switch (strategy.type) {
        case "c-abi-pointer":
          addCommaAfterArgument();
          cpp.add(`&${storageLocation}`);
          break;
        case "c-abi-value":
          addCommaAfterArgument();
          cpp.add(`${storageLocation}`);
          break;
        case "uses-communication-buffer":
          break;
        default:
          throw new Error(`TODO: emitCppCallToVariant for ${inspect(strategy)}`);
      }
    }
  }
  if (communicationStruct) {
    addCommaAfterArgument();
    cpp.add("&buf");
  }
  switch (returnStrategy.type) {
    case "jsvalue":
      cpp.dedent();
      if (totalArgs === 0) {
        cpp.trimLastNewline();
      }
      cpp.line(");");
      break;
    case "void":
      cpp.dedent();
      cpp.line(")) {");
      cpp.line(`    return {};`);
      cpp.line("}");
      cpp.line("return JSC::JSValue::encode(JSC::jsUndefined());");
      break;
    case "basic-out-param":
      addCommaAfterArgument();
      cpp.add("&out");
      cpp.line();
      cpp.dedent();
      cpp.line(")) {");
      cpp.line(`    return {};`);
      cpp.line("}");
      const simpleType = getSimpleIdlType(variant.ret);
      if (simpleType) {
        cpp.line(`return JSC::JSValue::encode(WebCore::toJS<${simpleType}>(*global, out));`);
        break;
      }
      switch (variant.ret.kind) {
        case "UTF8String":
          throw new Error("Memory lifetime is ambiguous when returning UTF8String");
        case "DOMString":
        case "USVString":
        case "ByteString":
          cpp.line(
            `return JSC::JSValue::encode(WebCore::toJS<WebCore::IDL${variant.ret.kind}>(*global, out.toWTFString()));`
          );
          break;
      }
      break;
    default:
      throw new Error(`TODO: emitCppCallToVariant for ${inspect(returnStrategy)}`);
  }
}
function getSimpleIdlType(type) {
  const map = {
    boolean: "WebCore::IDLBoolean",
    undefined: "WebCore::IDLUndefined",
    usize: "WebCore::IDLUnsignedLongLong",
    u8: "WebCore::IDLOctet",
    u16: "WebCore::IDLUnsignedShort",
    u32: "WebCore::IDLUnsignedLong",
    u64: "WebCore::IDLUnsignedLongLong",
    i8: "WebCore::IDLByte",
    i16: "WebCore::IDLShort",
    i32: "WebCore::IDLLong",
    i64: "WebCore::IDLLongLong"
  };
  let entry = map[type.kind];
  if (!entry) {
    switch (type.kind) {
      case "f64":
        entry = type.flags.finite ? "WebCore::IDLDouble" : "WebCore::IDLUnrestrictedDouble";
        break;
      case "stringEnum":
        type.lowersToNamedType;
        entry = `WebCore::IDLEnumeration<${type.cppClassName()}>`;
        break;
      default:
        return;
    }
  }
  if (type.flags.range) {
    const { range, nodeValidator } = type.flags;
    if (range[0] === "enforce" && range[1] !== "abi" || nodeValidator) {
      if (nodeValidator) assert2(nodeValidator === "validateInteger" /* validateInteger */);
      const [abiMin, abiMax] = cAbiIntegerLimits(type.kind);
      let [_, min, max] = range;
      if (min === "abi") min = abiMin;
      if (max === "abi") max = abiMax;
      headers.add("BindgenCustomEnforceRange.h");
      entry = `Bun::BindgenCustomEnforceRange<${cAbiTypeName(type.kind)}, ${min}, ${max}, Bun::BindgenCustomEnforceRangeKind::${nodeValidator ? "Node" : "Web"}>`;
    } else {
      const rangeAdaptor = {
        "clamp": "WebCore::IDLClampAdaptor",
        "enforce": "WebCore::IDLEnforceRangeAdaptor"
      }[range[0]];
      assert2(rangeAdaptor);
      entry = `${rangeAdaptor}<${entry}>`;
    }
  }
  return entry;
}
function emitConvertValue(storageLocation, type, jsValueRef, exceptionContext, decl, hoistedTemp, dictStringTemps) {
  if (decl === "declare") {
    addHeaderForType(type);
  }
  const simpleType = getSimpleIdlType(type);
  if (simpleType) {
    const cAbiType = type.canDirectlyMapToCAbi();
    assert2(cAbiType);
    let exceptionHandler;
    switch (exceptionContext.type) {
      case "none":
        break;
      case "argument":
        exceptionHandler = getArgumentExceptionHandler(
          type,
          exceptionContext.argumentIndex,
          exceptionContext.name,
          exceptionContext.functionName
        );
    }
    switch (type.kind) {
    }
    if (decl === "declare") {
      cpp.add(`${type.cppName()} `);
    }
    let exceptionHandlerText = exceptionHandler ? `, ${exceptionHandler.params} { ${exceptionHandler.body} }` : "";
    cpp.line(`${storageLocation} = WebCore::convert<${simpleType}>(*global, ${jsValueRef}${exceptionHandlerText});`);
    if (type.flags.range && type.flags.range[0] === "clamp" && type.flags.range[1] !== "abi") {
      emitRangeModifierCheck(cAbiType, storageLocation, type.flags.range);
    }
    cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);
  } else {
    switch (type.kind) {
      case "any": {
        if (decl === "declare") {
          cpp.add(`${type.cppName()} `);
        }
        cpp.line(`${storageLocation} = JSC::JSValue::encode(${jsValueRef});`);
        break;
      }
      case "USVString":
      case "DOMString":
      case "ByteString": {
        const temp = hoistedTemp ?? cpp.nextTemporaryName("wtfString");
        if (hoistedTemp) {
          cpp.line(`${temp} = WebCore::convert<WebCore::IDL${type.kind}>(*global, ${jsValueRef});`);
        } else {
          cpp.line(`WTF::String ${temp} = WebCore::convert<WebCore::IDL${type.kind}>(*global, ${jsValueRef});`);
        }
        cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);
        if (decl === "declare") {
          cpp.add(`${type.cppName()} `);
        }
        cpp.line(`${storageLocation} = Bun::toString(${temp});`);
        break;
      }
      case "UTF8String": {
        const temp = hoistedTemp ?? cpp.nextTemporaryName("wtfString");
        if (hoistedTemp) {
          cpp.line(`${temp} = WebCore::convert<WebCore::IDLDOMString>(*global, ${jsValueRef});`);
        } else {
          cpp.line(`WTF::String ${temp} = WebCore::convert<WebCore::IDLDOMString>(*global, ${jsValueRef});`);
        }
        cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);
        if (decl === "declare") {
          cpp.add(`${type.cppName()} `);
        }
        cpp.line(`${storageLocation} = Bun::toString(${temp});`);
        break;
      }
      case "dictionary": {
        if (decl === "declare") {
          cpp.line(`${type.cppName()} ${storageLocation};`);
        }
        if (dictStringTemps && dictStringTemps.length > 0) {
          cpp.line(
            `auto did_convert = convert${type.cppInternalName()}(&${storageLocation}, global, ${jsValueRef}, ${dictStringTemps.join(", ")});`
          );
        } else {
          cpp.line(`auto did_convert = convert${type.cppInternalName()}(&${storageLocation}, global, ${jsValueRef});`);
        }
        cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);
        cpp.line(`if (!did_convert) return {};`);
        break;
      }
      default:
        throw new Error(`TODO: emitConvertValue for Type ${type.kind}`);
    }
  }
}
function getArgumentExceptionHandler(type, argumentIndex, name, functionName) {
  const { nodeValidator } = type.flags;
  if (nodeValidator) {
    switch (nodeValidator) {
      case "validateInteger" /* validateInteger */:
        headers.add("ErrorCode.h");
        return {
          params: `[]()`,
          body: `return ${str(name)}_s;`
        };
      default:
        throw new Error(`TODO: implement exception thrower for node validator ${nodeValidator}`);
    }
  }
  switch (type.kind) {
    case "zigEnum":
    case "stringEnum": {
      return {
        params: `[](JSC::JSGlobalObject& global, JSC::ThrowScope& scope)`,
        body: `WebCore::throwArgumentMustBeEnumError(${[
          `global`,
          `scope`,
          `${argumentIndex}`,
          `${str(name)}_s`,
          `${str(type.name())}_s`,
          `${str(functionName)}_s`,
          `WebCore::expectedEnumerationValues<${type.cppClassName()}>()`
        ].join(", ")});`
      };
      break;
    }
  }
}
function emitRangeModifierCheck(cAbiType, storageLocation, range) {
  const [kind, min, max] = range;
  if (kind === "clamp") {
    cpp.line(`if (${storageLocation} < ${min}) ${storageLocation} = ${min};`);
    cpp.line(`else if (${storageLocation} > ${max}) ${storageLocation} = ${max};`);
  } else {
    throw new Error(`This should not be called for 'enforceRange' types.`);
  }
}
function addHeaderForType(type) {
  if (type.lowersToNamedType() && type.ownerFile) {
    headers.add(`Generated${pascal(type.ownerFile)}.h`);
  }
}
function emitConvertDictionaryFunction(type) {
  assert2(type.kind === "dictionary");
  const fields = type.data;
  addHeaderForType(type);
  const stringFieldParams = [];
  for (const field of fields) {
    if (field.type.isStringType()) {
      stringFieldParams.push(`WTF::String& ${field.key}_str`);
    }
  }
  cpp.line(`// Internal dictionary parse for ${type.name()}`);
  const params = [
    `${type.cppName()}* result`,
    `JSC::JSGlobalObject* global`,
    `JSC::JSValue value`,
    ...stringFieldParams
  ];
  cpp.line(`bool convert${type.cppInternalName()}(${params.join(", ")}) {`);
  cpp.indent();
  cpp.line(`auto& vm = JSC::getVM(global);`);
  cpp.line(`auto throwScope = DECLARE_THROW_SCOPE(vm);`);
  cpp.line(`bool isNullOrUndefined = value.isUndefinedOrNull();`);
  cpp.line(`auto* object = isNullOrUndefined ? nullptr : value.getObject();`);
  cpp.line(`if (!isNullOrUndefined && !object) [[unlikely]] {`);
  cpp.line(`    throwTypeError(global, throwScope);`);
  cpp.line(`    return false;`);
  cpp.line(`}`);
  cpp.line(`JSC::JSValue propValue;`);
  for (const field of fields) {
    const { key, type: fieldType } = field;
    cpp.line("// " + key);
    cpp.line(`if (isNullOrUndefined) {`);
    cpp.line(`    propValue = JSC::jsUndefined();`);
    cpp.line(`} else {`);
    headers.add("ObjectBindings.h");
    cpp.line(
      `    propValue = Bun::getIfPropertyExistsPrototypePollutionMitigation(vm, global, object, JSC::Identifier::fromString(vm, ${str(key)}_s));`
    );
    cpp.line(`    RETURN_IF_EXCEPTION(throwScope, false);`);
    cpp.line(`}`);
    const hoistedTemp = fieldType.isStringType() ? `${key}_str` : void 0;
    cpp.line(`if (!propValue.isUndefined()) {`);
    cpp.indent();
    emitConvertValue(`result->${key}`, fieldType, "propValue", { type: "none" }, "assign", hoistedTemp);
    cpp.dedent();
    cpp.line(`} else {`);
    cpp.indent();
    if (type.flags.required) {
      cpp.line(`throwTypeError(global, throwScope);`);
      cpp.line(`return false;`);
    } else if ("default" in fieldType.flags) {
      cpp.add(`result->${key} = `);
      fieldType.emitCppDefaultValue(cpp);
      cpp.line(";");
    } else {
      throw new Error(`TODO: optional dictionary field`);
    }
    cpp.dedent();
    cpp.line(`}`);
  }
  cpp.line(`return true;`);
  cpp.dedent();
  cpp.line(`}`);
  cpp.line();
}
function emitZigStruct(type) {
  zig.add(`pub const ${type.name()} = `);
  switch (type.kind) {
    case "zigEnum":
    case "stringEnum": {
      const signPrefix = "u";
      const tagType = `${signPrefix}${alignForward(type.data.length, 8)}`;
      zig.line(`enum(${tagType}) {`);
      zig.indent();
      for (const value of type.data) {
        zig.line(`${snake(value)},`);
      }
      zig.dedent();
      zig.line("};");
      return;
    }
  }
  const externLayout = type.canDirectlyMapToCAbi();
  if (externLayout) {
    if (typeof externLayout === "string") {
      zig.line(externLayout + ";");
    } else {
      externLayout.emitZig(zig, "with-semi");
    }
    return;
  }
  switch (type.kind) {
    case "dictionary": {
      zig.line("struct {");
      zig.indent();
      for (const { key, type: fieldType } of type.data) {
        zig.line(`    ${snake(key)}: ${zigTypeName(fieldType)},`);
      }
      zig.dedent();
      zig.line(`};`);
      break;
    }
    default: {
      throw new Error(`TODO: emitZigStruct for Type ${type.kind}`);
    }
  }
}
function emitCppStructHeader(w, type) {
  if (type.kind === "zigEnum" || type.kind === "stringEnum") {
    emitCppEnumHeader(w, type);
    return;
  }
  const externLayout = type.canDirectlyMapToCAbi();
  if (externLayout) {
    if (typeof externLayout === "string") {
      w.line(`typedef ${externLayout} ${type.name()};`);
      console.warn("should this really be done lol", type);
    } else {
      externLayout.emitCpp(w, type.name());
      w.line();
    }
    return;
  }
  switch (type.kind) {
    default: {
      throw new Error(`TODO: emitZigStruct for Type ${type.kind}`);
    }
  }
}
function emitCppEnumHeader(w, type) {
  assert2(type.kind === "zigEnum" || type.kind === "stringEnum");
  assert2(type.kind === "stringEnum");
  assert2(type.data.length > 0);
  const signPrefix = "u";
  const intBits = alignForward(type.data.length, 8);
  const tagType = `${signPrefix}int${intBits}_t`;
  w.line(`enum class ${type.name()} : ${tagType} {`);
  for (const value of type.data) {
    w.line(`    ${pascal(value)},`);
  }
  w.line(`};`);
  w.line();
}
function emitConvertEnumFunction(w, type) {
  assert2(type.kind === "zigEnum" || type.kind === "stringEnum");
  assert2(type.kind === "stringEnum");
  assert2(type.data.length > 0);
  const name = "Generated::" + type.cppName();
  headers.add("JavaScriptCore/JSCInlines.h");
  headers.add("JavaScriptCore/JSString.h");
  headers.add("wtf/NeverDestroyed.h");
  headers.add("wtf/SortedArrayMap.h");
  w.line(`String convertEnumerationToString(${name} enumerationValue) {`);
  w.indent();
  w.line(`    static const NeverDestroyed<String> values[] = {`);
  w.indent();
  for (const value of type.data) {
    w.line(`        MAKE_STATIC_STRING_IMPL(${str(value)}),`);
  }
  w.dedent();
  w.line(`    };`);
  w.line(`    return values[static_cast<size_t>(enumerationValue)];`);
  w.dedent();
  w.line(`}`);
  w.line();
  w.line(`template<> JSString* convertEnumerationToJS(JSC::JSGlobalObject& global, ${name} enumerationValue) {`);
  w.line(`    return jsStringWithCache(global.vm(), convertEnumerationToString(enumerationValue));`);
  w.line(`}`);
  w.line();
  w.line(`template<> std::optional<${name}> parseEnumerationFromString<${name}>(const String& stringValue)`);
  w.line(`{`);
  w.line(
    `    static constexpr SortedArrayMap enumerationMapping { std::to_array<std::pair<ComparableASCIILiteral, ${name}>>({`
  );
  for (const value of type.data) {
    w.line(`        { ${str(value)}_s, ${name}::${pascal(value)} },`);
  }
  w.line(`    }) };`);
  w.line(`    if (auto* enumerationValue = enumerationMapping.tryGet(stringValue); enumerationValue) [[likely]]`);
  w.line(`        return *enumerationValue;`);
  w.line(`    return std::nullopt;`);
  w.line(`}`);
  w.line();
  w.line(
    `template<> std::optional<${name}> parseEnumeration<${name}>(JSGlobalObject& lexicalGlobalObject, JSValue value)`
  );
  w.line(`{`);
  w.line(`    return parseEnumerationFromString<${name}>(value.toWTFString(&lexicalGlobalObject));`);
  w.line(`}`);
  w.line();
  w.line(`template<> ASCIILiteral expectedEnumerationValues<${name}>()`);
  w.line(`{`);
  w.line(`    return ${str(type.data.map((value) => `${str(value)}`).join(", "))}_s;`);
  w.line(`}`);
  w.line();
}
function zigTypeName(type) {
  let name = zigTypeNameInner(type);
  if (type.flags.optional) {
    name = "?" + name;
  }
  return name;
}
function zigTypeNameInner(type) {
  if (type.lowersToNamedType()) {
    const namespace = typeHashToNamespace.get(type.hash());
    return namespace ? `${namespace}.${type.name()}` : type.name();
  }
  switch (type.kind) {
    case "USVString":
    case "DOMString":
    case "ByteString":
    case "UTF8String":
      return "bun.String";
    case "boolean":
      return "bool";
    case "usize":
      return "usize";
    case "globalObject":
    case "zigVirtualMachine":
      return "*jsc.JSGlobalObject";
    default:
      const cAbiType = type.canDirectlyMapToCAbi();
      if (cAbiType) {
        if (typeof cAbiType === "string") {
          return cAbiType;
        }
        return cAbiType.name();
      }
      throw new Error(`TODO: emitZigTypeName for Type ${type.kind}`);
  }
}
function returnStrategyCppType(strategy) {
  switch (strategy.type) {
    case "basic-out-param":
    case "void":
      return "bool";
    case "jsvalue":
      return "JSC::EncodedJSValue";
    default:
      throw new Error(
        `TODO: returnStrategyCppType for ${Bun.inspect(strategy, { colors: Bun.enableANSIColors })}`
      );
  }
}
function returnStrategyZigType(strategy) {
  switch (strategy.type) {
    case "basic-out-param":
    case "void":
      return "bool";
    case "jsvalue":
      return "jsc.JSValue";
    default:
      throw new Error(
        `TODO: returnStrategyZigType for ${Bun.inspect(strategy, { colors: Bun.enableANSIColors })}`
      );
  }
}
function emitNullableZigDecoder(w, prefix, type, children) {
  assert2(children.length > 0);
  const indent = children[0].type !== "c-abi-compatible";
  w.add(`if (${prefix}_set)`);
  if (indent) {
    w.indent();
  } else {
    w.add(` `);
  }
  emitComplexZigDecoder(w, prefix + "_value", type, children);
  if (indent) {
    w.line();
    w.dedent();
  } else {
    w.add(` `);
  }
  w.add(`else`);
  if (indent) {
    w.indent();
  } else {
    w.add(` `);
  }
  w.add(`null`);
  if (indent) w.dedent();
}
function emitComplexZigDecoder(w, prefix, type, children) {
  assert2(children.length > 0);
  if (children[0].type === "c-abi-compatible") {
    w.add(`${prefix}`);
    return;
  }
  switch (type.kind) {
    default:
      throw new Error(`TODO: emitComplexZigDecoder for Type ${type.kind}`);
  }
}
function typeCanDistinguish(t) {
  const seen = {
    undefined: false,
    string: false,
    number: false,
    boolean: false,
    object: false
  };
  let strategies = [];
  for (const type of t) {
    let primitive = null;
    if (type.kind === "undefined") {
      primitive = "undefined";
    } else if (type.isStringType()) {
      primitive = "string";
    } else if (type.isNumberType()) {
      primitive = "number";
    } else if (type.kind === "boolean") {
      primitive = "boolean";
    } else if (type.isObjectType()) {
      primitive = "object";
    }
    if (primitive) {
      if (seen[primitive]) {
        return null;
      }
      seen[primitive] = true;
      strategies.push(primitive);
      continue;
    }
    return null;
  }
  return strategies;
}
function typeDistinguishmentWeight(type) {
  if (type.kind === "undefined") {
    return 100;
  }
  if (type.isObjectType()) {
    return 10;
  }
  if (type.isStringType()) {
    return 5;
  }
  if (type.isNumberType()) {
    return 3;
  }
  if (type.kind === "boolean") {
    return -1;
  }
  return 0;
}
function getDistinguishCode(strategy, type, value) {
  switch (strategy) {
    case "string":
      return { condition: `${value}.isString()`, canThrow: false };
    case "number":
      return { condition: `${value}.isNumber()`, canThrow: false };
    case "boolean":
      return { condition: `${value}.isBoolean()`, canThrow: false };
    case "object":
      return { condition: `${value}.isObject()`, canThrow: false };
    case "undefined":
      return { condition: `${value}.isUndefined()`, canThrow: false };
    default:
      throw new Error(`TODO: getDistinguishCode for ${strategy}`);
  }
}
function emitCppVariationSelector(fn, namespaceVar) {
  let minRequiredArgs = Infinity;
  let maxArgs = 0;
  const variationsByArgumentCount = /* @__PURE__ */ new Map();
  const pushToList = (argCount, vari) => {
    assert2(typeof argCount === "number");
    let list = variationsByArgumentCount.get(argCount);
    if (!list) {
      list = [];
      variationsByArgumentCount.set(argCount, list);
    }
    list.push(vari);
  };
  for (const vari of fn.variants) {
    const vmra = vari.minRequiredArgs;
    minRequiredArgs = Math.min(minRequiredArgs, vmra);
    maxArgs = Math.max(maxArgs, vari.args.length);
    const allArgCount = vari.args.filter((arg) => !arg.type.isVirtualArgument()).length;
    pushToList(vmra, vari);
    if (allArgCount != vmra) {
      pushToList(allArgCount, vari);
    }
  }
  cpp.line(`auto& vm = JSC::getVM(global);`);
  cpp.line(`auto throwScope = DECLARE_THROW_SCOPE(vm);`);
  if (minRequiredArgs > 0) {
    cpp.line(`size_t argumentCount = std::min<size_t>(callFrame->argumentCount(), ${maxArgs});`);
    cpp.line(`if (argumentCount < ${minRequiredArgs}) {`);
    cpp.line(`    return JSC::throwVMError(global, throwScope, createNotEnoughArgumentsError(global));`);
    cpp.line(`}`);
  }
  const sorted = [...variationsByArgumentCount.entries()].map(([key, value]) => ({ argCount: key, variants: value })).sort((a, b) => b.argCount - a.argCount);
  let argCountI = 0;
  for (const { argCount, variants } of sorted) {
    argCountI++;
    const checkArgCount = argCountI < sorted.length && argCount !== minRequiredArgs;
    if (checkArgCount) {
      cpp.line(`if (argumentCount >= ${argCount}) {`);
      cpp.indent();
    }
    if (variants.length === 1) {
      cpp.line(
        `RELEASE_AND_RETURN(throwScope, ${extInternalDispatchVariant(namespaceVar, fn.name, variants[0].suffix)}(global, callFrame));`
      );
    } else {
      let argIndex = 0;
      let strategies = null;
      while (argIndex < argCount) {
        strategies = typeCanDistinguish(
          variants.map((v) => v.args.filter((v2) => !v2.type.isVirtualArgument())[argIndex].type)
        );
        if (strategies) {
          break;
        }
        argIndex++;
      }
      if (!strategies) {
        const err = new Error(
          `\x1B[0mVariations with ${argCount} required arguments must have at least one argument that can distinguish between them.
Variations:
${variants.map((v) => `    ${inspect(v.args.filter((a) => !a.type.isVirtualArgument()).map((x) => x.type))}`).join("\n")}`
        );
        err.stack = `Error: ${err.message}
${fn.snapshot}`;
        throw err;
      }
      const getArgument = minRequiredArgs > 0 ? "uncheckedArgument" : "argument";
      cpp.line(`JSC::JSValue distinguishingValue = callFrame->${getArgument}(${argIndex});`);
      const sortedVariants = variants.map((v, i) => ({
        variant: v,
        type: v.args.filter((a) => !a.type.isVirtualArgument())[argIndex].type,
        strategy: strategies[i]
      })).sort((a, b) => typeDistinguishmentWeight(a.type) - typeDistinguishmentWeight(b.type));
      for (const { variant: v, strategy: s } of sortedVariants) {
        const arg = v.args[argIndex];
        const { condition, canThrow } = getDistinguishCode(s, arg.type, "distinguishingValue");
        cpp.line(`if (${condition}) {`);
        cpp.indent();
        cpp.line(
          `RELEASE_AND_RETURN(throwScope, ${extInternalDispatchVariant(namespaceVar, fn.name, v.suffix)}(global, callFrame));`
        );
        cpp.dedent();
        cpp.line(`}`);
        if (canThrow) {
          cpp.line(`RETURN_IF_EXCEPTION(throwScope, {});`);
        }
      }
    }
    if (checkArgCount) {
      cpp.dedent();
      cpp.line(`}`);
    }
  }
}
var unsortedFiles = readdirRecursiveWithExclusionsAndExtensionsSync(src, ["node_modules", ".git"], [".bind.ts"]);
for (const fileName of [...unsortedFiles].sort()) {
  const zigFile = path3.relative(src, fileName.replace(/\.bind\.ts$/, ".zig"));
  const zigFilePath = path3.join(src, zigFile);
  let file = files.get(zigFile);
  if (!fs2.existsSync(zigFilePath)) {
    const bindName = path3.basename(fileName);
    throw new Error(
      `${bindName} is missing a corresponding Zig file at ${zigFile}. Please create it and make sure it matches signatures in ${bindName}.`
    );
  }
  if (!file) {
    file = { functions: [], typedefs: [] };
    files.set(zigFile, file);
  }
  const exports = __require(fileName);
  for (let [key, value] of Object.entries(exports)) {
    if (value == null || typeof value !== "object") continue;
    if (value instanceof TypeImpl) {
      value.assignName(key);
      value.markReachable();
      file.typedefs.push({ name: key, type: value });
    }
    if (value[isFunc]) {
      const func = value;
      func.name = key;
    }
  }
  for (const fn of file.functions) {
    if (fn.name === "") {
      const err = new Error(`This function definition needs to be exported`);
      err.stack = `Error: ${err.message}
${fn.snapshot}`;
      throw err;
    }
  }
}
var zig = new CodeWriter();
var zigInternal = new CodeWriter();
var cpp = new CodeWriter();
var cppInternal = new CodeWriter();
var headers = /* @__PURE__ */ new Set();
zig.line('const bun = @import("bun");');
zig.line("const jsc = bun.jsc;");
zig.line("const JSHostFunctionType = jsc.JSHostFn;\n");
zigInternal.line("const binding_internals = struct {");
zigInternal.indent();
cpp.line("namespace Generated {");
cpp.line();
cppInternal.line('// These "Arguments" definitions are for communication between C++ and Zig.');
cppInternal.line('// Field layout depends on implementation details in "bindgen.ts", and');
cppInternal.line("// is not intended for usage outside generated binding code.");
headers.add("root.h");
headers.add("IDLTypes.h");
headers.add("JSDOMBinding.h");
headers.add("JSDOMConvertBase.h");
headers.add("JSDOMConvertBoolean.h");
headers.add("JSDOMConvertNumbers.h");
headers.add("JSDOMConvertStrings.h");
headers.add("JSDOMExceptionHandling.h");
headers.add("JSDOMOperation.h");
var fileMap = /* @__PURE__ */ new Map();
var fileNames = /* @__PURE__ */ new Set();
for (const [filename, { functions, typedefs }] of files) {
  const basename3 = path3.basename(filename, ".zig");
  let varName = basename3;
  if (fileNames.has(varName)) {
    throw new Error(`File name collision: ${basename3}.zig`);
  }
  fileNames.add(varName);
  fileMap.set(filename, varName);
  if (functions.length === 0) continue;
  for (const td of typedefs) {
    typeHashToNamespace.set(td.type.hash(), varName);
  }
  for (const fn of functions) {
    for (const vari of fn.variants) {
      for (const arg of vari.args) {
        arg.type.markReachable();
      }
    }
  }
}
var needsWebCore = false;
for (const type of typeHashToReachableType.values()) {
  switch (type.kind) {
    case "dictionary":
      emitConvertDictionaryFunction(type);
      break;
    case "stringEnum":
    case "zigEnum":
      needsWebCore = true;
      break;
  }
}
for (const [filename, { functions, typedefs }] of files) {
  const namespaceVar = fileMap.get(filename);
  assert2(namespaceVar, `namespaceVar not found for ${filename}, ${inspect(fileMap)}`);
  zigInternal.line(`const import_${namespaceVar} = @import(${str("../../" + filename)});`);
  zig.line(`/// Generated for "src/${filename}"`);
  zig.line(`pub const ${namespaceVar} = struct {`);
  zig.indent();
  for (const fn of functions) {
    cpp.line(`// Dispatch for "fn ${zid(fn.name)}(...)" in "src/${fn.zigFile}"`);
    const externName = extJsFunction(namespaceVar, fn.name);
    let variNum = 1;
    for (const vari of fn.variants) {
      resolveVariantStrategies(
        vari,
        `${pascal(namespaceVar)}${pascal(fn.name)}Arguments${fn.variants.length > 1 ? variNum : ""}`
      );
      const dispatchName = extDispatchVariant(namespaceVar, fn.name, variNum);
      const internalDispatchName = extInternalDispatchVariant(namespaceVar, fn.name, variNum);
      const args = [];
      if (vari.globalObjectArg === "hidden") {
        args.push("JSC::JSGlobalObject*");
      }
      for (const arg of vari.args) {
        if (arg.type.isIgnoredUndefinedType()) continue;
        const strategy = arg.loweringStrategy;
        switch (strategy.type) {
          case "c-abi-pointer":
            addHeaderForType(arg.type);
            args.push(`const ${arg.type.cppName()}*`);
            break;
          case "c-abi-value":
            addHeaderForType(arg.type);
            args.push(arg.type.cppName());
            break;
          case "uses-communication-buffer":
            break;
          default:
            throw new Error(`TODO: C++ dispatch function for ${inspect(strategy)}`);
        }
      }
      const { communicationStruct } = vari;
      if (communicationStruct) {
        args.push(`${communicationStruct.name()}*`);
      }
      const returnStrategy = vari.returnStrategy;
      if (returnStrategy.type === "basic-out-param") {
        args.push(cAbiTypeName(returnStrategy.abiType) + "*");
      }
      cpp.line(`extern "C" ${returnStrategyCppType(vari.returnStrategy)} ${dispatchName}(${args.join(", ")});`);
      if (fn.variants.length > 1) {
        cpp.line(
          `extern "C" SYSV_ABI JSC::EncodedJSValue ${internalDispatchName}(JSC::JSGlobalObject* global, JSC::CallFrame* callFrame)`
        );
        cpp.line(`{`);
        cpp.indent();
        cpp.resetTemporaries();
        emitCppCallToVariant(fn.name, vari, dispatchName);
        cpp.dedent();
        cpp.line(`}`);
      }
      variNum += 1;
    }
    zig.line(
      `pub const ${zid("js" + cap(fn.name))} = @extern(*const JSHostFunctionType, .{ .name = ${str(externName)} });`
    );
    cpp.line(
      `extern "C" SYSV_ABI JSC::EncodedJSValue ${externName}(JSC::JSGlobalObject* global, JSC::CallFrame* callFrame)`
    );
    cpp.line(`{`);
    cpp.indent();
    cpp.resetTemporaries();
    if (fn.variants.length === 1) {
      emitCppCallToVariant(fn.name, fn.variants[0], extDispatchVariant(namespaceVar, fn.name, 1));
    } else {
      emitCppVariationSelector(fn, namespaceVar);
    }
    cpp.dedent();
    cpp.line(`}`);
    cpp.line();
    variNum = 1;
    for (const vari of fn.variants) {
      const dispatchName = extDispatchVariant(namespaceVar, fn.name, variNum);
      const args = [];
      const returnStrategy = vari.returnStrategy;
      const { communicationStruct } = vari;
      if (communicationStruct) {
        zigInternal.add(`const ${communicationStruct.name()} = `);
        communicationStruct.emitZig(zigInternal, "with-semi");
      }
      assert2(vari.globalObjectArg !== void 0);
      let globalObjectArg = "";
      if (vari.globalObjectArg === "hidden") {
        args.push(`global: *jsc.JSGlobalObject`);
        globalObjectArg = "global";
      }
      let argNum = 0;
      for (const arg of vari.args) {
        if (arg.type.isIgnoredUndefinedType()) continue;
        let argName = `arg_${snake(arg.name)}`;
        if (vari.globalObjectArg === argNum) {
          if (arg.type.kind !== "globalObject") {
            argName = "global";
          }
          globalObjectArg = argName;
        }
        argNum += 1;
        arg.zigMappedName = argName;
        const strategy = arg.loweringStrategy;
        switch (strategy.type) {
          case "c-abi-pointer":
            args.push(`${argName}: *const ${zigTypeName(arg.type)}`);
            break;
          case "c-abi-value":
            args.push(`${argName}: ${zigTypeName(arg.type)}`);
            break;
          case "uses-communication-buffer":
            break;
          default:
            throw new Error(`TODO: zig dispatch function for ${inspect(strategy)}`);
        }
      }
      assert2(globalObjectArg, `globalObjectArg not found from ${vari.globalObjectArg}`);
      if (communicationStruct) {
        args.push(`buf: *${communicationStruct.name()}`);
      }
      if (returnStrategy.type === "basic-out-param") {
        args.push(`out: *${zigTypeName(vari.ret)}`);
      }
      zigInternal.line(`export fn ${zid(dispatchName)}(${args.join(", ")}) ${returnStrategyZigType(returnStrategy)} {`);
      zigInternal.indent();
      zigInternal.line(
        `if (!@hasDecl(import_${namespaceVar}${fn.zigPrefix.length > 0 ? "." + fn.zigPrefix.slice(0, -1) : ""}, ${str(fn.name + vari.suffix)}))`
      );
      zigInternal.line(
        `    @compileError(${str(`Missing binding declaration "${fn.zigPrefix}${fn.name + vari.suffix}" in "${path3.basename(filename)}"`)});`
      );
      for (const arg of vari.args) {
        if (arg.type.kind === "UTF8String") {
          zigInternal.line(`const ${arg.zigMappedName}_utf8 = ${arg.zigMappedName}.toUTF8(bun.default_allocator);`);
          zigInternal.line(`defer ${arg.zigMappedName}_utf8.deinit();`);
        }
      }
      switch (returnStrategy.type) {
        case "jsvalue":
          zigInternal.add(`return jsc.toJSHostCall(${globalObjectArg}, @src(), `);
          break;
        case "basic-out-param":
          zigInternal.add(`out.* = @as(bun.JSError!${returnStrategy.abiType}, `);
          break;
        case "void":
          zigInternal.add(`@as(bun.JSError!void, `);
          break;
      }
      zigInternal.add(`${zid("import_" + namespaceVar)}.${fn.zigPrefix}${fn.name + vari.suffix}`);
      if (returnStrategy.type === "jsvalue") {
        zigInternal.line(", .{");
      } else {
        zigInternal.line("(");
      }
      zigInternal.indent();
      for (const arg of vari.args) {
        const argName = arg.zigMappedName;
        if (arg.type.isIgnoredUndefinedType()) continue;
        if (arg.type.isVirtualArgument()) {
          switch (arg.type.kind) {
            case "zigVirtualMachine":
              zigInternal.line(`${argName}.bunVM(),`);
              break;
            case "globalObject":
              zigInternal.line(`${argName},`);
              break;
            default:
              throw new Error("unexpected");
          }
          continue;
        }
        const strategy = arg.loweringStrategy;
        switch (strategy.type) {
          case "c-abi-pointer":
            if (arg.type.kind === "UTF8String") {
              zigInternal.line(`${argName}_utf8.slice(),`);
              break;
            }
            zigInternal.line(`${argName}.*,`);
            break;
          case "c-abi-value":
            zigInternal.line(`${argName},`);
            break;
          case "uses-communication-buffer":
            const prefix = `buf.${snake(arg.name)}`;
            const type = arg.type;
            const isNullable = type.flags.optional && !("default" in type.flags);
            if (isNullable) emitNullableZigDecoder(zigInternal, prefix, type, strategy.children);
            else emitComplexZigDecoder(zigInternal, prefix, type, strategy.children);
            zigInternal.line(`,`);
            break;
          default:
            throw new Error(`TODO: zig dispatch function for ${inspect(strategy)}`);
        }
      }
      zigInternal.dedent();
      switch (returnStrategy.type) {
        case "jsvalue":
          zigInternal.line(`});`);
          break;
        case "basic-out-param":
        case "void":
          zigInternal.line(`)) catch |err| switch (err) {`);
          zigInternal.line(`    error.JSError => return false,`);
          zigInternal.line(`    error.OutOfMemory => ${globalObjectArg}.throwOutOfMemory() catch return false,`);
          zigInternal.line(`    error.JSTerminated => return false,`);
          zigInternal.line(`};`);
          zigInternal.line(`return true;`);
          break;
      }
      zigInternal.dedent();
      zigInternal.line(`}`);
      variNum += 1;
    }
  }
  if (functions.length > 0) {
    zig.line();
  }
  for (const fn of functions) {
    const wrapperName = zid("create" + cap(fn.name) + "Callback");
    const minArgCount = fn.variants.reduce((acc, vari) => Math.min(acc, vari.args.length), Number.MAX_SAFE_INTEGER);
    zig.line(`pub fn ${wrapperName}(global: *jsc.JSGlobalObject) callconv(jsc.conv) jsc.JSValue {`);
    zig.line(
      `    return jsc.host_fn.NewRuntimeFunction(global, jsc.ZigString.static(${str(fn.name)}), ${minArgCount}, js${cap(fn.name)}, false, null);`
    );
    zig.line(`}`);
  }
  if (typedefs.length > 0) {
    zig.line();
  }
  for (const td of typedefs) {
    emitZigStruct(td.type);
  }
  zig.dedent();
  zig.line(`};`);
  zig.line();
}
cpp.line("} // namespace Generated");
cpp.line();
if (needsWebCore) {
  cpp.line(`namespace WebCore {`);
  cpp.line();
  for (const [type, reachableType] of typeHashToReachableType) {
    switch (reachableType.kind) {
      case "zigEnum":
      case "stringEnum":
        emitConvertEnumFunction(cpp, reachableType);
        break;
    }
  }
  cpp.line(`} // namespace WebCore`);
  cpp.line();
}
zigInternal.dedent();
zigInternal.line("};");
zigInternal.line();
zigInternal.line("comptime {");
zigInternal.line(`    if (bun.Environment.export_cpp_apis) {`);
zigInternal.line('        for (@typeInfo(binding_internals).@"struct".decls) |decl| {');
zigInternal.line("            _ = &@field(binding_internals, decl.name);");
zigInternal.line("        }");
zigInternal.line("    }");
zigInternal.line("}");
writeIfNotChanged(
  path3.join(codegenRoot, "GeneratedBindings.cpp"),
  [...headers].map((name) => `#include ${str(name)}
`).join("") + "\n" + cppInternal.buffer + "\n" + cpp.buffer
);
writeIfNotChanged(path3.join(src, "jsc/bindings/GeneratedBindings.zig"), zig.buffer + zigInternal.buffer);
for (const [filename, { functions, typedefs }] of files) {
  const namespaceVar = fileMap.get(filename);
  const header = new CodeWriter();
  const headerIncludes = /* @__PURE__ */ new Set();
  let needsWebCoreNamespace = false;
  headerIncludes.add("root.h");
  header.line(`namespace {`);
  header.line();
  for (const fn of functions) {
    const externName = extJsFunction(namespaceVar, fn.name);
    header.line(`extern "C" SYSV_ABI JSC::EncodedJSValue ${externName}(JSC::JSGlobalObject*, JSC::CallFrame*);`);
  }
  header.line();
  header.line(`} // namespace`);
  header.line();
  header.line(`namespace Generated {`);
  header.line();
  header.line(`/// Generated binding code for src/${filename}`);
  header.line(`namespace ${namespaceVar} {`);
  header.line();
  for (const td of typedefs) {
    emitCppStructHeader(header, td.type);
    switch (td.type.kind) {
      case "zigEnum":
      case "stringEnum":
      case "dictionary":
        needsWebCoreNamespace = true;
        break;
    }
  }
  for (const fn of functions) {
    const externName = extJsFunction(namespaceVar, fn.name);
    header.line(`constexpr auto* js${cap(fn.name)} = &${externName};`);
  }
  header.line();
  header.line(`} // namespace ${namespaceVar}`);
  header.line();
  header.line(`} // namespace Generated`);
  header.line();
  if (needsWebCoreNamespace) {
    header.line(`namespace WebCore {`);
    header.line();
    for (const td of typedefs) {
      switch (td.type.kind) {
        case "zigEnum":
        case "stringEnum":
          headerIncludes.add("JSDOMConvertEnumeration.h");
          const basename3 = td.type.name();
          const name = `Generated::${namespaceVar}::${basename3}`;
          header.line(`// Implement WebCore::IDLEnumeration trait for ${basename3}`);
          header.line(`String convertEnumerationToString(${name});`);
          header.line(`template<> JSC::JSString* convertEnumerationToJS(JSC::JSGlobalObject&, ${name});`);
          header.line(`template<> std::optional<${name}> parseEnumerationFromString<${name}>(const String&);`);
          header.line(
            `template<> std::optional<${name}> parseEnumeration<${name}>(JSC::JSGlobalObject&, JSC::JSValue);`
          );
          header.line(`template<> ASCIILiteral expectedEnumerationValues<${name}>();`);
          header.line();
          break;
        case "dictionary":
          break;
        default:
      }
    }
    header.line(`} // namespace WebCore`);
  }
  header.buffer = "#pragma once\n" + [...headerIncludes].map((name) => `#include ${str(name)}
`).join("") + "\n" + header.buffer;
  writeIfNotChanged(path3.join(codegenRoot, `Generated${pascal(namespaceVar)}.h`), header.buffer);
}
