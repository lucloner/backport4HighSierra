#!/usr/bin/env bun
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

// src/codegen/helpers.ts
import fs from "node:fs";
import path from "path";
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
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, contents);
  }
  if (fs.readFileSync(file, "utf8") !== contents) {
    throw new Error(`Failed to write file ${file}`);
  }
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

// src/codegen/bindgenv2/script.ts
init_base();
var USAGE = `Usage: script.ts [options]

Options (all required):
  --command=<command>    Command to run (see below)
  --sources=<sources>    Comma-separated list of *.bindv2.ts files
  --codegen-path=<path>  Path to build/*/codegen

Commands:
  list-outputs  List files that will be generated, separated by semicolons
  generate      Generate all files
`;
var codegenPath;
var sources;
function getNamedExports() {
  return sources.flatMap((path2) => {
    const exports = __require(path2);
    return Object.values(exports).filter((v) => v instanceof NamedType);
  });
}
function getNamedDependencies(type, result) {
  for (const dependency of type.dependencies) {
    if (dependency instanceof NamedType) {
      result.add(dependency);
    }
    getNamedDependencies(dependency, result);
  }
}
function cppHeaderPath(type) {
  return `${codegenPath}/Generated${type.name}.h`;
}
function cppSourcePath(type) {
  return `${codegenPath}/Generated${type.name}.cpp`;
}
function zigSourcePath(typeOrNamespace) {
  let ns;
  if (typeof typeOrNamespace === "string") {
    ns = typeOrNamespace;
  } else {
    ns = toZigNamespace(typeOrNamespace.name);
  }
  return `${codegenPath}/bindgen_generated/${ns}.zig`;
}
function toZigNamespace(name) {
  const result = name.replace(/([^A-Z_])([A-Z])/g, "$1_$2").replace(/([A-Z])([A-Z][a-z])/g, "$1_$2").toLowerCase();
  if (result === name) {
    return result + "_namespace";
  }
  return result;
}
function listOutputs() {
  const outputs = [`${codegenPath}/bindgen_generated.zig`];
  for (const type of getNamedExports()) {
    if (type.hasCppSource) outputs.push(cppSourcePath(type));
    if (type.hasZigSource) outputs.push(zigSourcePath(type));
  }
  process.stdout.write(outputs.join(";"));
}
function generate() {
  const names = /* @__PURE__ */ new Set();
  const zigRoot = [];
  const zigRootInternal = [];
  const namedExports = getNamedExports();
  {
    const namedDependencies = /* @__PURE__ */ new Set();
    for (const type of namedExports) {
      getNamedDependencies(type, namedDependencies);
    }
    const namedExportsSet = new Set(namedExports);
    for (const type of namedDependencies) {
      if (!namedExportsSet.has(type)) {
        console.error(`error: named type must be exported: ${type.name}`);
        process.exit(1);
      }
    }
    const namedTypeNames = /* @__PURE__ */ new Set();
    for (const type of namedExports) {
      if (namedTypeNames.size == namedTypeNames.add(type.name).size) {
        console.error(`error: multiple types with same name: ${type.name}`);
        process.exit(1);
      }
    }
  }
  for (const type of namedExports) {
    const zigNamespace = toZigNamespace(type.name);
    const size = names.size;
    names.add(type.name);
    names.add(zigNamespace);
    if (names.size !== size + 2) {
      console.error(`error: duplicate name: ${type.name}`);
      process.exit(1);
    }
    const cppHeader = type.cppHeader;
    const cppSource = type.cppSource;
    const zigSource = type.zigSource;
    if (cppHeader) {
      writeIfNotChanged(cppHeaderPath(type), cppHeader);
    }
    if (cppSource) {
      writeIfNotChanged(cppSourcePath(type), cppSource);
    }
    if (zigSource) {
      zigRoot.push(
        `pub const ${zigNamespace} = @import("./bindgen_generated/${zigNamespace}.zig");`,
        `pub const ${type.name} = ${zigNamespace}.${type.name};`,
        ""
      );
      zigRootInternal.push(`pub const ${type.name} = ${zigNamespace}.Bindgen${type.name};`);
      writeIfNotChanged(zigSourcePath(zigNamespace), zigSource);
    }
  }
  writeIfNotChanged(
    `${codegenPath}/bindgen_generated.zig`,
    [
      ...zigRoot,
      `pub const internal = struct {`,
      ...zigRootInternal.map((s) => "    " + s),
      `};`,
      ""
    ].join("\n")
  );
}
function main() {
  const args = argParse(["command", "codegen-path", "sources", "help"]);
  if (Object.keys(args).length === 0) {
    process.stderr.write(USAGE);
    process.exit(1);
  }
  const { command, "codegen-path": codegenPathArg, sources: sourcesArg, help } = args;
  if (help != null) {
    process.stdout.write(USAGE);
    process.exit(0);
  }
  if (typeof codegenPathArg !== "string") {
    console.error("error: missing --codegen-path");
    process.exit(1);
  }
  codegenPath = codegenPathArg;
  if (typeof sourcesArg !== "string") {
    console.error("error: missing --sources");
    process.exit(1);
  }
  sources = sourcesArg.split(",").filter((x) => x);
  switch (command) {
    case "list-outputs":
      listOutputs();
      break;
    case "generate":
      generate();
      break;
    default:
      if (typeof command === "string") {
        console.error("error: unknown command: " + command);
      } else {
        console.error("error: missing --command");
      }
      process.exit(1);
  }
}
main();
