var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/codegen/bindgenv2/internal/any.ts
function isAny(type) {
  return type === RawAny || type === StrongAny;
}
function hasRawAny(type) {
  return type === RawAny || type.dependencies.some(hasRawAny);
}
var RawAny, StrongAny;
var init_any = __esm({
  "src/codegen/bindgenv2/internal/any.ts"() {
    "use strict";
    init_base();
    RawAny = new class extends Type {
      get idlType() {
        return "::Bun::IDLRawAny";
      }
      get bindgenType() {
        return "bindgen.BindgenRawAny";
      }
      zigType(style) {
        return "bun.bun_js.jsc.JSValue";
      }
      toCpp(value) {
        throw RangeError("`RawAny` cannot have a default value");
      }
    }();
    StrongAny = new class extends Type {
      get idlType() {
        return "::Bun::Bindgen::IDLStrongAny";
      }
      get bindgenType() {
        return "bindgen.BindgenStrongAny";
      }
      zigType(style) {
        return "bun.bun_js.jsc.Strong";
      }
      optionalZigType(style) {
        return this.zigType(style) + ".Optional";
      }
      toCpp(value) {
        throw RangeError("`StrongAny` cannot have a default value");
      }
    }();
  }
});

// src/codegen/bindgenv2/internal/optional.ts
var optional_exports = {};
__export(optional_exports, {
  LooseNullableType: () => LooseNullableType,
  NullableType: () => NullableType,
  OptionalType: () => OptionalType,
  looseNullable: () => looseNullable,
  null: () => Null,
  nullable: () => nullable,
  optional: () => optional,
  undefined: () => Undefined
});
function bindgenOptional(payload) {
  return `bindgen.BindgenOptional(${payload.bindgenType})`;
}
function optional(payload) {
  if (isAny(payload)) {
    throw RangeError("`Any` types are already optional");
  }
  return new class extends OptionalType {
    get idlType() {
      return `::WebCore::IDLOptional<${payload.idlType}>`;
    }
    get bindgenType() {
      return bindgenOptional(payload);
    }
    zigType(style) {
      return payload.optionalZigType(style);
    }
    toCpp(value) {
      if (value === void 0) {
        return `::WebCore::IDLOptional<${payload.idlType}>::nullValue()`;
      }
      return payload.toCpp(value);
    }
  }();
}
function nullable(payload) {
  return new class extends NullableType {
    /** Treats all falsy values as null. */
    get loose() {
      return looseNullable(payload);
    }
    get idlType() {
      return `::WebCore::IDLNullable<${payload.idlType}>`;
    }
    get bindgenType() {
      return bindgenOptional(payload);
    }
    zigType(style) {
      return payload.optionalZigType(style);
    }
    toCpp(value) {
      if (value == null) {
        return `::WebCore::IDLNullable<${payload.idlType}>::nullValue()`;
      }
      return payload.toCpp(value);
    }
  }();
}
function looseNullable(payload) {
  return new class extends LooseNullableType {
    get idlType() {
      return `::Bun::IDLLooseNullable<${payload.idlType}>`;
    }
    get bindgenType() {
      return bindgenOptional(payload);
    }
    zigType(style) {
      return payload.optionalZigType(style);
    }
    toCpp(value) {
      if (!value) {
        return `::Bun::IDLLooseNullable<${payload.idlType}>::nullValue()`;
      }
      return payload.toCpp(value);
    }
  }();
}
var OptionalType, NullableType, LooseNullableType, Undefined, Null;
var init_optional = __esm({
  "src/codegen/bindgenv2/internal/optional.ts"() {
    "use strict";
    init_any();
    init_base();
    OptionalType = class extends Type {
    };
    NullableType = class extends Type {
    };
    LooseNullableType = class extends Type {
    };
    Undefined = new class extends Type {
      get idlType() {
        return `::Bun::IDLStrictUndefined`;
      }
      get bindgenType() {
        return `bindgen.BindgenNull`;
      }
      zigType(style) {
        return "void";
      }
      toCpp(value) {
        return `{}`;
      }
    }();
    Null = new class extends Type {
      get idlType() {
        return `::Bun::IDLStrictNull`;
      }
      get bindgenType() {
        return `bindgen.BindgenNull`;
      }
      zigType(style) {
        return "void";
      }
      toCpp(value) {
        return `nullptr`;
      }
    }();
  }
});

// src/codegen/bindgenv2/internal/base.ts
import util from "node:util";
function validateName(name) {
  const reservedPrefixes = ["IDL", "Bindgen", "Extern", "Generated", "MemberType"];
  const reservedNames = ["Bun", "WTF", "JSC", "WebCore", "Self"];
  if (!/^[A-Z]/.test(name)) {
    throw RangeError(`name must start with a capital letter: ${name}`);
  }
  if (/[^a-zA-Z0-9_]/.test(name)) {
    throw RangeError(`name may only contain letters, numbers, and underscores: ${name}`);
  }
  if (reservedPrefixes.some((s) => name.startsWith(s))) {
    throw RangeError(`name starts with reserved prefix: ${name}`);
  }
  if (reservedNames.includes(name)) {
    throw RangeError(`cannot use reserved name: ${name}`);
  }
}
function headersForTypes(types) {
  const headers = /* @__PURE__ */ new Set();
  for (const type of types) {
    type.getHeaders(headers);
  }
  return Array.from(headers);
}
function dedent(text) {
  const commonIndent = Math.min(
    ...Array.from(text.matchAll(/\n( *)[^ \n]/g) ?? []).map((m) => m[1].length)
  );
  text = text.trim();
  if (commonIndent > 0 && commonIndent !== Infinity) {
    text = text.replaceAll("\n" + " ".repeat(commonIndent), "\n");
  }
  return text.replace(/^ +$/gm, "");
}
function reindent(text) {
  return dedent(text).replace(/^ +/gm, "$&$&");
}
function addIndent(amount, text) {
  return text.replaceAll("\n", "\n" + " ".repeat(amount));
}
function joinIndented(amount, pieces) {
  return addIndent(amount, pieces.map(dedent).join("\n"));
}
function toQuotedLiteral(value) {
  return `"${util.inspect(value).slice(1, -1).replaceAll('"', '\\"')}"`;
}
function toASCIILiteral(value) {
  if (value[Symbol.iterator]().some((c) => c.charCodeAt(0) >= 128)) {
    throw RangeError(`string must be ASCII: ${util.inspect(value)}`);
  }
  return `${toQuotedLiteral(value)}_s`;
}
var Type, NamedType;
var init_base = __esm({
  "src/codegen/bindgenv2/internal/base.ts"() {
    "use strict";
    Type = class {
      /** Treats `undefined` as a not-provided value. */
      get optional() {
        return (init_optional(), __toCommonJS(optional_exports)).optional(this);
      }
      /** Treats `null` or `undefined` as a not-provided value. */
      get nullable() {
        return (init_optional(), __toCommonJS(optional_exports)).nullable(this);
      }
      /**
       * This can be overridden to make the generated code clearer. If overridden, it must return an
       * expression that evaluates to the same type as `${this.bindgenType}.ZigType`; it should not
       * actually change the type.
       */
      zigType(style) {
        return this.bindgenType + ".ZigType";
      }
      /** This must be overridden if bindgen.zig defines a custom `OptionalZigType`. */
      optionalZigType(style) {
        return `?${this.zigType(style)}`;
      }
      /** Other types that this type contains or otherwise depends on. */
      get dependencies() {
        return [];
      }
      /** Headers required by users of this type. */
      getHeaders(result) {
        for (const type of this.dependencies) {
          type.getHeaders(result);
        }
      }
    };
    NamedType = class extends Type {
      get cppHeader() {
        return null;
      }
      get cppSource() {
        return null;
      }
      get zigSource() {
        return null;
      }
      // These getters are faster than `.cppHeader != null` etc.
      get hasCppHeader() {
        return false;
      }
      get hasCppSource() {
        return false;
      }
      get hasZigSource() {
        return false;
      }
      getHeaders(result) {
        result.add(`Generated${this.name}.h`);
      }
    };
  }
});

// src/codegen/bindgenv2/internal/primitives.ts
init_base();
import assert from "node:assert";
import util2 from "node:util";
var bool = new class extends Type {
  /** Converts to a boolean, as if by calling `Boolean`. */
  get loose() {
    return LooseBool;
  }
  get idlType() {
    return "::Bun::IDLStrictBoolean";
  }
  get bindgenType() {
    return `bindgen.BindgenBool`;
  }
  zigType(style) {
    return "bool";
  }
  toCpp(value) {
    assert(typeof value === "boolean");
    return value ? "true" : "false";
  }
}();
var LooseBool = new class extends Type {
  get idlType() {
    return "::WebCore::IDLBoolean";
  }
  get bindgenType() {
    return bool.bindgenType;
  }
  zigType(style) {
    return bool.zigType(style);
  }
  toCpp(value) {
    return bool.toCpp(value);
  }
}();
var IntegerType = class extends Type {
};
function makeUnsignedType(width) {
  assert(Number.isInteger(width) && width > 0);
  return new class extends IntegerType {
    /** Converts to a number first. */
    get loose() {
      return looseUnsignedTypes[width];
    }
    get idlType() {
      return `::Bun::IDLStrictInteger<${this.cppType}>`;
    }
    get bindgenType() {
      return `bindgen.BindgenU${width}`;
    }
    zigType(style) {
      return `u${width}`;
    }
    get cppType() {
      return `::std::uint${width}_t`;
    }
    toCpp(value) {
      assert(typeof value === "bigint" || Number.isSafeInteger(value));
      const intValue = BigInt(value);
      if (intValue < 0) throw RangeError("unsigned int cannot be negative");
      const max = 1n << BigInt(width);
      if (intValue >= max) throw RangeError("integer out of range");
      return intValue.toString();
    }
  }();
}
function makeSignedType(width) {
  assert(Number.isInteger(width) && width > 0);
  return new class extends IntegerType {
    /** Tries to convert to a number first. */
    get loose() {
      return looseSignedTypes[width];
    }
    get idlType() {
      return `::Bun::IDLStrictInteger<${this.cppType}>`;
    }
    get bindgenType() {
      return `bindgen.BindgenI${width}`;
    }
    zigType(style) {
      return `i${width}`;
    }
    get cppType() {
      return `::std::int${width}_t`;
    }
    toCpp(value) {
      assert(typeof value === "bigint" || Number.isSafeInteger(value));
      const intValue = BigInt(value);
      const max = 1n << BigInt(width - 1);
      const min = -max;
      if (intValue >= max || intValue < min) {
        throw RangeError("integer out of range");
      }
      if (width === 64 && intValue === min) {
        return `(${intValue + 1n} - 1)`;
      }
      return intValue.toString();
    }
  }();
}
var u8 = makeUnsignedType(8);
var u16 = makeUnsignedType(16);
var u32 = makeUnsignedType(32);
var u64 = makeUnsignedType(64);
var i8 = makeSignedType(8);
var i16 = makeSignedType(16);
var i32 = makeSignedType(32);
var i64 = makeSignedType(64);
var LooseIntegerType = class extends Type {
};
function makeLooseIntegerType(strict) {
  return new class extends LooseIntegerType {
    get idlType() {
      return `::Bun::IDLLooseInteger<${strict.cppType}>`;
    }
    get bindgenType() {
      return strict.bindgenType;
    }
    zigType(style) {
      return strict.zigType(style);
    }
    toCpp(value) {
      return strict.toCpp(value);
    }
  }();
}
var LooseU8 = makeLooseIntegerType(u8);
var LooseU16 = makeLooseIntegerType(u16);
var LooseU32 = makeLooseIntegerType(u32);
var LooseU64 = makeLooseIntegerType(u64);
var LooseI8 = makeLooseIntegerType(i8);
var LooseI16 = makeLooseIntegerType(i16);
var LooseI32 = makeLooseIntegerType(i32);
var LooseI64 = makeLooseIntegerType(i64);
var looseUnsignedTypes = {
  8: LooseU8,
  16: LooseU16,
  32: LooseU32,
  64: LooseU64
};
var looseSignedTypes = {
  8: LooseI8,
  16: LooseI16,
  32: LooseI32,
  64: LooseI64
};
var f64 = new class extends Type {
  /** Does not allow NaN or infinities. */
  get finite() {
    return FiniteF64;
  }
  /** Converts to a number, as if by calling `Number`. */
  get loose() {
    return LooseF64;
  }
  get idlType() {
    return "::Bun::IDLStrictDouble";
  }
  get bindgenType() {
    return `bindgen.BindgenF64`;
  }
  zigType(style) {
    return `f64`;
  }
  toCpp(value) {
    assert(typeof value === "number");
    if (Number.isNaN(value)) {
      return "::std::numeric_limits<double>::quiet_NaN()";
    } else if (value === Infinity) {
      return "::std::numeric_limits<double>::infinity()";
    } else if (value === -Infinity) {
      return "-::std::numeric_limits<double>::infinity()";
    } else {
      return util2.inspect(value);
    }
  }
}();
var FiniteF64 = new class extends Type {
  get idlType() {
    return "::Bun::IDLFiniteDouble";
  }
  get bindgenType() {
    return f64.bindgenType;
  }
  zigType(style) {
    return f64.zigType(style);
  }
  toCpp(value) {
    assert(typeof value === "number");
    if (!Number.isFinite(value)) throw RangeError("number must be finite");
    return util2.inspect(value);
  }
}();
var LooseF64 = new class extends Type {
  get idlType() {
    return "::WebCore::IDLUnrestrictedDouble";
  }
  get bindgenType() {
    return f64.bindgenType;
  }
  zigType(style) {
    return f64.zigType(style);
  }
  toCpp(value) {
    return f64.toCpp(value);
  }
}();

// src/codegen/bindgenv2/lib.ts
init_any();

// src/codegen/bindgenv2/internal/string.ts
init_base();
import assert2 from "node:assert";
var String = new class extends Type {
  /** Converts to a string, as if by calling `String`. */
  get loose() {
    return LooseString;
  }
  get idlType() {
    return "::Bun::IDLStrictString";
  }
  get bindgenType() {
    return "bindgen.BindgenString";
  }
  zigType(style) {
    return "bun.string.WTFString";
  }
  optionalZigType(style) {
    return this.zigType(style) + ".Optional";
  }
  toCpp(value) {
    assert2(typeof value === "string");
    return toASCIILiteral(value);
  }
}();
var LooseString = new class extends Type {
  get idlType() {
    return "::Bun::IDLDOMString";
  }
  get bindgenType() {
    return String.bindgenType;
  }
  zigType(style) {
    return String.zigType(style);
  }
  optionalZigType(style) {
    return String.optionalZigType(style);
  }
  toCpp(value) {
    return String.toCpp(value);
  }
}();

// src/codegen/bindgenv2/lib.ts
init_optional();

// src/codegen/bindgenv2/internal/union.ts
init_base();
import assert3 from "node:assert";
var AnonymousUnionType = class extends Type {
};
var NamedUnionType = class extends NamedType {
};
function isUnion(type) {
  return type instanceof AnonymousUnionType || type instanceof NamedUnionType;
}
function union(alternativesOrName, maybeNamedAlternatives) {
  let alternatives;
  function toCpp(value) {
    assert3(alternatives.includes(value.type));
    return `${value.type.idlType}::ImplementationType { ${value.type.toCpp(value.value)} }`;
  }
  function getUnionType() {
    return `::Bun::IDLOrderedUnion<${alternatives.map((a) => a.idlType).join(", ")}>`;
  }
  function validateAlternatives(name2) {
    const suffix = name2 == null ? "" : `: ${name2}`;
    if (alternatives.length === 0) {
      throw RangeError("union cannot be empty" + suffix);
    }
  }
  if (typeof alternativesOrName !== "string") {
    alternatives = alternativesOrName.slice();
    validateAlternatives();
    return new class extends AnonymousUnionType {
      get idlType() {
        return getUnionType();
      }
      get bindgenType() {
        return `bindgen.BindgenUnion(&.{ ${alternatives.map((a) => a.bindgenType).join(", ")} })`;
      }
      zigType(style) {
        if (style !== "pretty") {
          return `bun.meta.TaggedUnion(&.{ ${alternatives.map((a) => a.zigType()).join(", ")} })`;
        }
        return dedent(`bun.meta.TaggedUnion(&.{
          ${joinIndented(
          10,
          alternatives.map((a) => a.zigType("pretty") + ",")
        )}
        })`);
      }
      get dependencies() {
        return Object.freeze(alternatives);
      }
      toCpp(value) {
        return toCpp(value);
      }
    }();
  }
  assert3(maybeNamedAlternatives !== void 0);
  const namedAlternatives = maybeNamedAlternatives;
  const name = alternativesOrName;
  validateName(name);
  alternatives = Object.values(namedAlternatives);
  validateAlternatives(name);
  return new class extends NamedUnionType {
    get name() {
      return name;
    }
    get idlType() {
      return `::Bun::Bindgen::Generated::IDL${name}`;
    }
    get bindgenType() {
      return `bindgen_generated.internal.${name}`;
    }
    zigType(style) {
      return `bindgen_generated.${name}`;
    }
    get dependencies() {
      return Object.freeze(alternatives);
    }
    toCpp(value) {
      return toCpp(value);
    }
    get hasCppHeader() {
      return true;
    }
    get cppHeader() {
      return reindent(`
        #pragma once
        #include "Bindgen/IDLTypes.h"
        ${headersForTypes(alternatives).map((headerName) => `#include <${headerName}>
` + " ".repeat(8)).join("")}
        namespace Bun::Bindgen::Generated {
        using IDL${name} = ${getUnionType()};
        using ${name} = IDL${name}::ImplementationType;
        }
      `);
    }
    get hasZigSource() {
      return true;
    }
    get zigSource() {
      return reindent(`
        pub const ${name} = union(enum) {
          ${joinIndented(
        10,
        Object.entries(namedAlternatives).map(([altName, altType]) => {
          return `${altName}: ${altType.zigType("pretty")},`;
        })
      )}

          pub fn deinit(self: *@This()) void {
            switch (std.meta.activeTag(self.*)) {
              inline else => |tag| bun.memory.deinit(&@field(self, @tagName(tag))),
            }
            self.* = undefined;
          }
        };

        pub const Bindgen${name} = struct {
          const Self = @This();
          pub const ZigType = ${name};
          pub const ExternType = bindgen.ExternTaggedUnion(&.{ ${alternatives.map((a) => a.bindgenType + ".ExternType").join(", ")} });
          pub fn convertFromExtern(extern_value: Self.ExternType) Self.ZigType {
            return switch (extern_value.tag) {
              ${joinIndented(
        14,
        Object.entries(namedAlternatives).map(([altName, altType], i) => {
          const bindgenType = altType.bindgenType;
          const innerRhs = `${bindgenType}.convertFromExtern(extern_value.data.@"${i}")`;
          return `${i} => .{ .${altName} = ${innerRhs} },`;
        })
      )}
              else => unreachable,
            };
          }
        };

        const bindgen_generated = @import("bindgen_generated");
        const std = @import("std");
        const bun = @import("bun");
        const bindgen = bun.bun_js.bindgen;
      `);
    }
  }();
}

// src/codegen/bindgenv2/internal/dictionary.ts
init_any();
init_base();
init_optional();
var DictionaryType = class extends NamedType {
};
function dictionary(nameOrOptions, members) {
  let name;
  let userFacingName;
  let generateConversionFunction = false;
  if (typeof nameOrOptions === "string") {
    name = nameOrOptions;
    userFacingName = name;
  } else {
    name = nameOrOptions.name;
    userFacingName = nameOrOptions.userFacingName ?? name;
    generateConversionFunction = !!nameOrOptions.generateConversionFunction;
  }
  validateName(name);
  const fullMembers = Object.entries(members).map(
    ([name2, value]) => new FullDictionaryMember(name2, value)
  );
  return new class extends DictionaryType {
    get name() {
      return name;
    }
    get idlType() {
      return `::Bun::Bindgen::Generated::IDL${name}`;
    }
    get bindgenType() {
      return `bindgen_generated.internal.${name}`;
    }
    zigType(style) {
      return `bindgen_generated.${name}`;
    }
    get dependencies() {
      return fullMembers.map((m) => m.type);
    }
    toCpp(value) {
      for (const memberName of Object.keys(value)) {
        if (!(memberName in members)) throw RangeError(`unexpected key: ${memberName}`);
      }
      return reindent(`${name} {
        ${joinIndented(
        8,
        fullMembers.map((memberInfo) => {
          let memberValue;
          if (Object.hasOwn(value, memberInfo.name)) {
            memberValue = value[memberInfo.name];
          } else if (memberInfo.hasDefault) {
            memberValue = memberInfo.default;
          } else if (!permitsUndefined(memberInfo.type)) {
            throw RangeError(`missing key: ${memberInfo.name}`);
          }
          const internalName = memberInfo.internalName;
          return `.${internalName} = ${memberInfo.type.toCpp(memberValue)},`;
        })
      )}
      }`);
    }
    get hasCppHeader() {
      return true;
    }
    get cppHeader() {
      return reindent(`
        #pragma once
        #include "Bindgen.h"
        #include "JSDOMConvertDictionary.h"
        ${headersForTypes(Object.values(fullMembers).map((m) => m.type)).map((headerName) => `#include <${headerName}>
` + " ".repeat(8)).join("")}
        namespace Bun {
        namespace Bindgen {
        namespace Generated {
        struct ${name} {
          ${joinIndented(
        10,
        fullMembers.map((memberInfo, i) => {
          return `
                using MemberType${i} = ${memberInfo.type.idlType}::ImplementationType;
                MemberType${i} ${memberInfo.internalName};
              `;
        })
      )}
        };
        using IDL${name} = ::WebCore::IDLDictionary<${name}>;
        struct Extern${name} {
          ${joinIndented(
        10,
        fullMembers.map((memberInfo, i) => {
          return `
                using MemberType${i} = ExternTraits<${name}::MemberType${i}>::ExternType;
                MemberType${i} ${memberInfo.internalName};
              `;
        })
      )}
        };${(() => {
        if (!generateConversionFunction) {
          return "";
        }
        const result = dedent(`
            extern "C" bool bindgenConvertJSTo${name}(
              ::JSC::JSGlobalObject* globalObject,
              ::JSC::EncodedJSValue value,
              Extern${name}* result);
          `);
        return addIndent(8, "\n" + result);
      })()}
        }

        template<> struct ExternTraits<Generated::${name}> {
          using ExternType = Generated::Extern${name};
          static ExternType convertToExtern(Generated::${name}&& cppValue)
          {
            return ExternType {
              ${joinIndented(
        14,
        fullMembers.map((memberInfo, i) => {
          const cppType = `Generated::${name}::MemberType${i}`;
          const cppValue = `::std::move(cppValue.${memberInfo.internalName})`;
          const rhs = `ExternTraits<${cppType}>::convertToExtern(${cppValue})`;
          return `.${memberInfo.internalName} = ${rhs},`;
        })
      )}
            };
          }
        };
        }

        template<>
        struct IDLHumanReadableName<::WebCore::IDLDictionary<Bindgen::Generated::${name}>>
          : BaseIDLHumanReadableName {
          static constexpr auto humanReadableName
            = ::std::to_array(${toQuotedLiteral(userFacingName)});
        };
        }

        template<> Bun::Bindgen::Generated::${name}
        WebCore::convertDictionary<Bun::Bindgen::Generated::${name}>(
          JSC::JSGlobalObject& globalObject,
          JSC::JSValue value);

        ${(() => {
        if (!hasRawAny(this)) {
          return "";
        }
        const code = `
            template<> struct WebCore::IDLDictionary<::Bun::Bindgen::Generated::${name}>
              : ::Bun::Bindgen::IDLStackOnlyDictionary<::Bun::Bindgen::Generated::${name}> {};
          `;
        return joinIndented(8, [code]);
      })()}
      `);
    }
    get hasCppSource() {
      return true;
    }
    get cppSource() {
      return reindent(`
        #include "root.h"
        #include "Generated${name}.h"
        #include "Bindgen/IDLConvert.h"
        #include <JavaScriptCore/Identifier.h>

        template<> Bun::Bindgen::Generated::${name}
        WebCore::convertDictionary<Bun::Bindgen::Generated::${name}>(
          JSC::JSGlobalObject& globalObject,
          JSC::JSValue value)
        {
          ::JSC::VM& vm = globalObject.vm();
          auto throwScope = DECLARE_THROW_SCOPE(vm);
          auto ctx = Bun::Bindgen::LiteralConversionContext { ${toASCIILiteral(userFacingName)} };
          auto* object = value.getObject();
          if (!object) [[unlikely]] {
            ctx.throwNotObject(globalObject, throwScope);
            return {};
          }
          ::Bun::Bindgen::Generated::${name} result;
          ${joinIndented(
        10,
        fullMembers.map((m, i) => memberConversion(userFacingName, m, i))
      )}
          return result;
        }

        ${(() => {
        if (!generateConversionFunction) {
          return "";
        }
        const result = `
            namespace Bun::Bindgen::Generated {
            extern "C" bool bindgenConvertJSTo${name}(
              ::JSC::JSGlobalObject* globalObject,
              ::JSC::EncodedJSValue value,
              Extern${name}* result)
            {
              ::JSC::VM& vm = globalObject->vm();
              auto throwScope = DECLARE_THROW_SCOPE(vm);
              ${name} convertedValue = ::WebCore::convert<IDLDictionary<${name}>>(
                *globalObject,
                JSC::JSValue::decode(value)
              );
              RETURN_IF_EXCEPTION(throwScope, false);
              *result = ExternTraits<${name}>::convertToExtern(::std::move(convertedValue));
              return true;
            }
            }
          `;
        return joinIndented(8, [result]);
      })()}
      `);
    }
    get hasZigSource() {
      return true;
    }
    get zigSource() {
      return reindent(`
        pub const ${name} = struct {
          const Self = @This();

          ${joinIndented(
        10,
        fullMembers.map((memberInfo) => {
          return `${memberInfo.internalName}: ${memberInfo.type.zigType("pretty")},`;
        })
      )}

          pub fn deinit(self: *Self) void {
            ${joinIndented(
        12,
        fullMembers.map((memberInfo) => {
          return `bun.memory.deinit(&self.${memberInfo.internalName});`;
        })
      )}
            self.* = undefined;
          }${(() => {
        if (!generateConversionFunction) {
          return "";
        }
        const result = dedent(`
              pub fn fromJS(globalThis: *jsc.JSGlobalObject, value: jsc.JSValue) bun.JSError!Self {
                var scope: jsc.ExceptionValidationScope = undefined;
                scope.init(globalThis, @src());
                defer scope.deinit();
                var extern_result: Extern${name} = undefined;
                const success = bindgenConvertJSTo${name}(globalThis, value, &extern_result);
                scope.assertExceptionPresenceMatches(!success);
                return if (success)
                  Bindgen${name}.convertFromExtern(extern_result)
                else
                  error.JSError;
              }
            `);
        return addIndent(10, "\n" + result);
      })()}
        };

        pub const Bindgen${name} = struct {
          const Self = @This();
          pub const ZigType = ${name};
          pub const ExternType = Extern${name};
          pub fn convertFromExtern(extern_value: Self.ExternType) Self.ZigType {
            return .{
              ${joinIndented(
        14,
        fullMembers.map((memberInfo) => {
          const internalName = memberInfo.internalName;
          const bindgenType = memberInfo.type.bindgenType;
          const rhs = `${bindgenType}.convertFromExtern(extern_value.${internalName})`;
          return `.${internalName} = ${rhs},`;
        })
      )}
            };
          }
        };

        const Extern${name} = extern struct {
          ${joinIndented(
        10,
        fullMembers.map((memberInfo) => {
          return `${memberInfo.internalName}: ${memberInfo.type.bindgenType}.ExternType,`;
        })
      )}
        };

        extern fn bindgenConvertJSTo${name}(
          globalObject: *jsc.JSGlobalObject,
          value: jsc.JSValue,
          result: *Extern${name},
        ) bool;

        const bindgen_generated = @import("bindgen_generated");
        const bun = @import("bun");
        const bindgen = bun.bun_js.bindgen;
        const jsc = bun.bun_js.jsc;
      `);
    }
  }();
}
var FullDictionaryMember = class {
  names;
  internalName;
  type;
  hasDefault = false;
  default;
  constructor(name, member) {
    if (member instanceof Type) {
      this.names = [name];
      this.internalName = name;
      this.type = member;
    } else {
      this.names = [name, ...member.altNames ?? []];
      this.internalName = member.internalName ?? name;
      this.type = member.type;
      this.hasDefault = Object.hasOwn(member, "default");
      this.default = member.default;
    }
  }
  get name() {
    return this.names[0];
  }
};
function memberConversion(userFacingDictName, memberInfo, memberIndex) {
  const i = memberIndex;
  const internalName = memberInfo.internalName;
  const idlType = memberInfo.type.idlType;
  const qualifiedName = `${userFacingDictName}.${memberInfo.name}`;
  const start = `
    ::JSC::JSValue value${i};
    auto ctx${i} = Bun::Bindgen::LiteralConversionContext { ${toASCIILiteral(qualifiedName)} };
    do {
      ${joinIndented(
    6,
    memberInfo.names.map((memberName, altNameIndex) => {
      let result = "";
      if (altNameIndex > 0) {
        result = `if (!value${i}.isUndefined()) break;
`;
      }
      result += dedent(`
            value${i} = object->get(
              &globalObject,
              ::JSC::Identifier::fromString(vm, ${toASCIILiteral(memberName)}));
            RETURN_IF_EXCEPTION(throwScope, {});
          `);
      return result;
    })
  )}
    } while (false);
  `;
  let end;
  if (memberInfo.hasDefault) {
    end = `
      if (value${i}.isUndefined()) {
        result.${internalName} = ${memberInfo.type.toCpp(memberInfo.default)};
      } else {
        result.${internalName} = Bun::convertIDL<${idlType}>(globalObject, value${i}, ctx${i});
        RETURN_IF_EXCEPTION(throwScope, {});
      }
    `;
  } else if (permitsUndefined(memberInfo.type)) {
    end = `
      result.${internalName} = Bun::convertIDL<${idlType}>(globalObject, value${i}, ctx${i});
      RETURN_IF_EXCEPTION(throwScope, {});
    `;
  } else {
    end = `
      if (value${i}.isUndefined()) {
        ctx${i}.throwRequired(globalObject, throwScope);
        return {};
      }
      result.${internalName} = Bun::convertIDL<${idlType}>(globalObject, value${i}, ctx${i});
      RETURN_IF_EXCEPTION(throwScope, {});
    `;
  }
  const body = dedent(start) + "\n" + dedent(end);
  return addIndent(2, "{\n" + body) + "\n}";
}
function basicPermitsUndefined(type) {
  return type instanceof OptionalType || type instanceof NullableType || type instanceof LooseNullableType || type === Undefined || type === Null || isAny(type);
}
function permitsUndefined(type) {
  if (isUnion(type)) {
    return type.dependencies.some(basicPermitsUndefined);
  }
  return basicPermitsUndefined(type);
}

// src/codegen/bindgenv2/internal/enumeration.ts
init_base();
import assert4 from "node:assert";
import util3 from "node:util";
var EnumType = class extends NamedType {
};
function enumeration(name, values) {
  const uniqueValues = values.map((v, i) => {
    if (!Array.isArray(v)) return v;
    if (v.length === 0) throw RangeError(`enum value cannot be empty (index ${i})`);
    return v[0];
  });
  if (uniqueValues.length === 0) {
    throw RangeError("enum cannot be empty: " + name);
  }
  const indexedValues = values.map((v) => Array.isArray(v) ? v : [v]).flatMap((arr, i) => arr.map((v) => [v, i]));
  const valueMap = /* @__PURE__ */ new Map();
  for (const [value, index] of indexedValues) {
    if (valueMap.size === valueMap.set(value, index).size) {
      throw RangeError(`duplicate enum value: ${util3.inspect(value)}`);
    }
  }
  const cppMemberSet = /* @__PURE__ */ new Set();
  for (const value of uniqueValues) {
    let cppName = "k";
    cppName += value.split(/[^A-Za-z0-9]+/).filter((x) => x).map((s) => s[0].toUpperCase() + s.slice(1)).join("");
    if (cppMemberSet.size === cppMemberSet.add(cppName).size) {
      let i = 2;
      while (cppMemberSet.size === cppMemberSet.add(cppName + i).size) {
        ++i;
      }
    }
  }
  const cppMembers = Array.from(cppMemberSet);
  return new class extends EnumType {
    get name() {
      return name;
    }
    get idlType() {
      return `::Bun::Bindgen::Generated::IDL${name}`;
    }
    get bindgenType() {
      return `bindgen_generated.internal.${name}`;
    }
    zigType(style) {
      return `bindgen_generated.${name}`;
    }
    toCpp(value) {
      const index = valueMap.get(value);
      if (index == null) {
        throw RangeError(`not a member of ${name}: ${util3.inspect(value)}`);
      }
      return `::Bun::Bindgen::Generated::${name}::${cppMembers[index]}`;
    }
    get hasCppHeader() {
      return true;
    }
    get cppHeader() {
      const quotedValues = uniqueValues.map((v) => `"${v}"`);
      let humanReadableName;
      if (quotedValues.length == 0) {
        assert4(false);
      } else if (quotedValues.length == 1) {
        humanReadableName = quotedValues[0];
      } else if (quotedValues.length == 2) {
        humanReadableName = quotedValues[0] + " or " + quotedValues[1];
      } else {
        humanReadableName = quotedValues.slice(0, -1).join(", ") + ", or " + quotedValues[quotedValues.length - 1];
      }
      return reindent(`
        #pragma once
        #include "Bindgen/ExternTraits.h"
        #include "JSDOMConvertEnumeration.h"

        namespace Bun {
        namespace Bindgen {
        namespace Generated {
        enum class ${name} : ::std::uint32_t {
          ${joinIndented(
        10,
        cppMembers.map((memberName) => `${memberName},`)
      )}
        };
        using IDL${name} = ::WebCore::IDLEnumeration<Generated::${name}>;
        }
        template<> struct ExternTraits<Generated::${name}> : TrivialExtern<Generated::${name}> {};
        }
        template<>
        struct IDLHumanReadableName<::WebCore::IDLEnumeration<Bindgen::Generated::${name}>>
          : BaseIDLHumanReadableName {
          static constexpr auto humanReadableName
            = std::to_array(${toQuotedLiteral(humanReadableName)});
        };
        }

        template<> std::optional<Bun::Bindgen::Generated::${name}>
        WebCore::parseEnumerationFromString<Bun::Bindgen::Generated::${name}>(
          const WTF::String&);

        template<> std::optional<Bun::Bindgen::Generated::${name}>
        WebCore::parseEnumeration<Bun::Bindgen::Generated::${name}>(
          JSC::JSGlobalObject& globalObject,
          JSC::JSValue value);
      `);
    }
    get hasCppSource() {
      return true;
    }
    get cppSource() {
      const qualifiedName = "Bun::Bindgen::Generated::" + name;
      const pairType = `::std::pair<::WTF::ComparableASCIILiteral, ::${qualifiedName}>`;
      return reindent(`
        #include "root.h"
        #include "Generated${name}.h"
        #include <wtf/SortedArrayMap.h>

        template<> std::optional<${qualifiedName}>
        WebCore::parseEnumerationFromString<${qualifiedName}>(const WTF::String& stringVal)
        {
          static constexpr ::WTF::SortedArrayMap enumerationMapping { ::std::to_array<${pairType}>({
            ${joinIndented(
        12,
        Array.from(valueMap.entries()).sort(([v1], [v2]) => v1 < v2 ? -1 : 1).map(([value, i]) => {
          return `${pairType} {
                    ${toASCIILiteral(value)},
                    ::${qualifiedName}::${cppMembers[i]},
                  },`;
        })
      )}
          }) };
          if (auto* enumerationValue = enumerationMapping.tryGet(stringVal)) [[likely]] {
            return *enumerationValue;
          }
          return std::nullopt;
        }

        template<> std::optional<${qualifiedName}>
        WebCore::parseEnumeration<${qualifiedName}>(
          JSC::JSGlobalObject& globalObject,
          JSC::JSValue value)
        {
          return parseEnumerationFromString<::${qualifiedName}>(
            value.toWTFString(&globalObject)
          );
        }
      `);
    }
    get hasZigSource() {
      return true;
    }
    get zigSource() {
      return reindent(`
        pub const ${name} = enum(u32) {
          ${joinIndented(
        10,
        uniqueValues.map((value) => `@${toQuotedLiteral(value)},`)
      )}
        };

        pub const Bindgen${name} = bindgen.BindgenTrivial(${name});
        const bun = @import("bun");
        const bindgen = bun.bun_js.bindgen;
      `);
    }
  }();
}

// src/codegen/bindgenv2/internal/array.ts
init_any();
init_base();
var ArrayType = class extends Type {
};
function Array2(elemType) {
  if (hasRawAny(elemType)) {
    throw RangeError("arrays cannot contain `RawAny` (use `StrongAny`)");
  }
  return new class extends ArrayType {
    get idlType() {
      return `::Bun::IDLArray<${elemType.idlType}>`;
    }
    get bindgenType() {
      return `bindgen.BindgenArray(${elemType.bindgenType})`;
    }
    zigType(style) {
      return `bun.collections.ArrayListDefault(${elemType.zigType(style)})`;
    }
    toCpp(value) {
      const args = `${value.map((elem) => elemType.toCpp(elem)).join(", ")}`;
      return `${this.idlType}::ImplementationType { ${args} }`;
    }
    get dependencies() {
      return [elemType];
    }
    getHeaders(result) {
      result.add("Bindgen/ExternVectorTraits.h");
      elemType.getHeaders(result);
    }
  }();
}

// src/codegen/bindgenv2/internal/interfaces.ts
init_base();
var ArrayBuffer = new class extends Type {
  get idlType() {
    return `::Bun::IDLArrayBufferRef`;
  }
  get bindgenType() {
    return `bindgen.BindgenArrayBuffer`;
  }
  zigType(style) {
    return "bun.bun_js.jsc.JSCArrayBuffer.Ref";
  }
  optionalZigType(style) {
    return this.zigType(style) + ".Optional";
  }
  toCpp(value) {
    throw RangeError("default values for `ArrayBuffer` are not supported");
  }
}();
var Blob = new class extends Type {
  get idlType() {
    return `::Bun::IDLBlobRef`;
  }
  get bindgenType() {
    return `bindgen.BindgenBlob`;
  }
  zigType(style) {
    return "bun.bun_js.webcore.Blob.Ref";
  }
  optionalZigType(style) {
    return this.zigType(style) + ".Optional";
  }
  toCpp(value) {
    throw RangeError("default values for `Blob` are not supported");
  }
  getHeaders(result) {
    result.add("BunIDLConvertBlob.h");
  }
}();

// src/runtime/socket/SSLConfig.bindv2.ts
var SSLConfigSingleFile = union("SSLConfigSingleFile", {
  string: String,
  buffer: ArrayBuffer,
  file: Blob
});
var SSLConfigFile = union("SSLConfigFile", {
  none: Null,
  string: String,
  buffer: ArrayBuffer,
  file: Blob,
  array: Array2(SSLConfigSingleFile)
});
var ALPNProtocols = union("ALPNProtocols", {
  none: Null,
  string: String,
  buffer: ArrayBuffer
});
var SSLConfig = dictionary(
  {
    name: "SSLConfig",
    userFacingName: "TLSOptions",
    generateConversionFunction: true
  },
  {
    passphrase: String.nullable,
    dhParamsFile: {
      type: String.nullable,
      internalName: "dh_params_file"
    },
    serverName: {
      type: String.nullable,
      internalName: "server_name",
      altNames: ["servername"]
    },
    lowMemoryMode: {
      type: bool,
      default: false,
      internalName: "low_memory_mode"
    },
    rejectUnauthorized: {
      type: bool.nullable,
      internalName: "reject_unauthorized"
    },
    requestCert: {
      type: bool,
      default: false,
      internalName: "request_cert"
    },
    ca: SSLConfigFile,
    cert: SSLConfigFile,
    key: SSLConfigFile,
    secureOptions: {
      type: u32,
      default: 0,
      internalName: "secure_options"
    },
    keyFile: {
      type: String.nullable,
      internalName: "key_file"
    },
    certFile: {
      type: String.nullable,
      internalName: "cert_file"
    },
    caFile: {
      type: String.nullable,
      internalName: "ca_file"
    },
    ALPNProtocols: {
      type: ALPNProtocols,
      internalName: "alpn_protocols"
    },
    ciphers: String.nullable,
    clientRenegotiationLimit: {
      type: u32,
      default: 0,
      internalName: "client_renegotiation_limit"
    },
    clientRenegotiationWindow: {
      type: u32,
      default: 0,
      internalName: "client_renegotiation_window"
    }
  }
);

// src/runtime/socket/SocketConfig.bindv2.ts
var BinaryType = enumeration("SocketConfigBinaryType", [
  ["arraybuffer", "ArrayBuffer"],
  ["buffer", "Buffer"],
  ["uint8array", "Uint8Array"]
]);
var Handlers = dictionary(
  {
    name: "SocketConfigHandlers",
    userFacingName: "SocketHandler",
    generateConversionFunction: true
  },
  {
    open: { type: RawAny, internalName: "onOpen" },
    close: { type: RawAny, internalName: "onClose" },
    error: { type: RawAny, internalName: "onError" },
    data: { type: RawAny, internalName: "onData" },
    drain: { type: RawAny, internalName: "onWritable" },
    handshake: { type: RawAny, internalName: "onHandshake" },
    end: { type: RawAny, internalName: "onEnd" },
    connectError: { type: RawAny, internalName: "onConnectError" },
    timeout: { type: RawAny, internalName: "onTimeout" },
    binaryType: {
      type: BinaryType,
      default: "buffer",
      internalName: "binary_type"
    }
  }
);
var TLS = union("SocketConfigTLS", {
  none: Null,
  boolean: bool,
  object: SSLConfig
});
var SocketConfig = dictionary(
  {
    name: "SocketConfig",
    userFacingName: "SocketOptions",
    generateConversionFunction: true
  },
  {
    socket: {
      type: Handlers,
      internalName: "handlers"
    },
    data: RawAny,
    allowHalfOpen: {
      type: bool,
      default: false,
      internalName: "allow_half_open"
    },
    hostname: {
      type: String.loose.nullable.loose,
      altNames: ["host"]
    },
    port: u16.loose.nullable,
    tls: TLS,
    exclusive: {
      type: bool,
      default: false
    },
    reusePort: {
      type: bool,
      default: false,
      internalName: "reuse_port"
    },
    ipv6Only: {
      type: bool,
      default: false,
      internalName: "ipv6_only"
    },
    unix: {
      type: String.nullable.loose,
      internalName: "unix_"
      // `unix` is a predefined C macro...
    },
    fd: i32.optional
  }
);
export {
  BinaryType,
  Handlers,
  SocketConfig,
  TLS
};
