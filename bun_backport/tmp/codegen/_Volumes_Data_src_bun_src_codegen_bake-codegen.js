// src/codegen/bake-codegen.ts
import assert from "node:assert";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { basename, join } from "node:path";

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

// src/codegen/bake-codegen.ts
var { "codegen-root": codegenRoot, debug, ...rest } = argParse(["codegen-root", "debug"]);
if (debug === "false" || debug === "0" || debug == "OFF") debug = false;
if (!codegenRoot) {
  console.error("Missing --codegen-root=...");
  process.exit(1);
}
var base_dir = join("/Volumes/Data/src/bun/src/codegen", "../bake");
process.chdir(base_dir);
function convertZigEnum(zig, names) {
  let output = "/** Generated from DevServer.zig */\n";
  for (const name of names) {
    const startTrigger = `
pub const ${name} = enum(u8) {`;
    const start = zig.indexOf(startTrigger) + startTrigger.length;
    const endTrigger = /\n    pub (inline )?fn |\n};/g;
    const end = zig.slice(start).search(endTrigger) + start;
    const enumText = zig.slice(start, end);
    const values = enumText.replaceAll("\n    ", "\n  ").replace(/\n\s*(\w+)\s*=\s*'(.+?)',/g, (_, name2, value) => {
      return `
  ${name2} = ${value.charCodeAt(0)},`;
    });
    output += `export const enum ${name} {${values}}
`;
  }
  return output;
}
function css(file, is_development) {
  const { success, stdout, stderr } = Bun.spawnSync({
    cmd: [process.execPath, "build", file, "--minify"],
    cwd: import.meta.dir,
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (!success) throw new Error(stderr.toString("utf-8"));
  return stdout.toString("utf-8");
}
async function run() {
  const devServerZig = readFileSync(join(base_dir, "DevServer.zig"), "utf-8");
  writeIfNotChanged(join(base_dir, "generated.ts"), convertZigEnum(devServerZig, ["IncomingMessageId", "MessageId"]));
  const results = await Promise.allSettled(
    ["client", "server", "error"].map(async (file) => {
      const side = file === "error" ? "client" : file;
      let result = await Bun.build({
        entrypoints: [join(base_dir, `hmr-runtime-${file}.ts`)],
        define: {
          side: JSON.stringify(side),
          IS_ERROR_RUNTIME: String(file === "error"),
          IS_BUN_DEVELOPMENT: String(!!debug),
          OVERLAY_CSS: css("../bake/client/overlay.css", !!debug)
        },
        minify: {
          syntax: !debug
        },
        target: side === "server" ? "bun" : "browser",
        drop: debug ? [] : ["ASSERT", "DEBUG"],
        conditions: [side]
      });
      if (!result.success) throw new AggregateError(result.logs);
      assert(result.outputs.length === 1, "must bundle to a single file");
      let code = await result.outputs[0].text();
      const in_names = [
        file !== "error" && "unloadedModuleRegistry",
        file !== "error" && "config",
        file === "server" && "server_exports",
        file === "server" && "$separateSSRGraph",
        file === "server" && "$importMeta"
      ].filter(Boolean);
      const combined_source = file === "error" ? code : `
            __marker__;
            ${in_names.length > 0 ? "let" : ""} ${in_names.join(",")};
            __marker__(${in_names.join(",")});
            ${code};
          `;
      const generated_entrypoint = join(base_dir, `.runtime-${file}.generated.ts`);
      writeIfNotChanged(generated_entrypoint, combined_source);
      result = await Bun.build({
        entrypoints: [generated_entrypoint],
        minify: !debug,
        drop: debug ? [] : ["DEBUG"],
        target: side === "server" ? "bun" : "browser"
      });
      if (!result.success) throw new AggregateError(result.logs);
      assert(result.outputs.length === 1, "must bundle to a single file");
      code = (await result.outputs[0].text()).replace(`// ${basename(generated_entrypoint)}`, "").trim();
      rmSync(generated_entrypoint);
      if (code.includes("export default ")) {
        throw new AggregateError([
          new Error("export default is not allowed in bake codegen. this became a commonjs module!")
        ]);
      }
      if (file !== "error") {
        let outName2 = function(name) {
          if (!out_names[name]) throw new Error(`missing out name for ${name}`);
          return out_names[name];
        };
        var outName = outName2;
        let names = "";
        code = code.replace(/(\n?)\s*__marker__.*__marker__\((.+?)\);\s*/s, (_, n, captured) => {
          names = captured;
          return n;
        }).trim();
        assert(names, "missing name");
        const split_names = names.split(",").map((x) => x.trim());
        const out_names = Object.fromEntries(in_names.map((x, i) => [x, split_names[i]]));
        if (debug) {
          code = "\n  " + code.replace(/\n/g, "\n  ") + "\n";
        }
        if (code[code.length - 1] === ";") code = code.slice(0, -1);
        if (side === "server") {
          code = debug ? `${code}  return ${outName2("server_exports")};
` : `${code};return ${outName2("server_exports")};`;
          const params = `${outName2("$separateSSRGraph")},${outName2("$importMeta")}`;
          code = code.replaceAll("import.meta", outName2("$importMeta")).replaceAll(outName2("$importMeta") + ".hot", "import.meta.hot");
          code = `let ${outName2("unloadedModuleRegistry")}={},${outName2("config")}={separateSSRGraph:${outName2("$separateSSRGraph")}},${outName2("server_exports")};${code}`;
          code = debug ? `((${params}) => {${code}})
` : `((${params})=>{${code}})
`;
        } else {
          code = debug ? `(async (${names}) => {${code}})({
` : `(async(${names})=>{${code}})({`;
        }
      }
      if (side === "client" && code.match(/\beval\(|,\s*eval\s*\)/)) {
        throw new AggregateError([
          new Error(
            "eval is not allowed in the HMR runtime. there are problems in all browsers regarding stack traces from eval'd frames and source maps. you must find an alternative solution to your problem."
          )
        ]);
      }
      writeIfNotChanged(join(codegenRoot, `bake.${file}.js`), code);
    })
  );
  const failed = [
    { kind: ["client"], result: results[0] },
    { kind: ["server"], result: results[1] },
    { kind: ["error"], result: results[2] }
  ].filter((x) => x.result.status === "rejected").map((x) => ({ kind: x.kind, err: x.result.reason }));
  if (failed.length > 0) {
    const flattened_errors = [];
    for (const { kind, err } of failed) {
      if (err instanceof AggregateError) {
        flattened_errors.push(...err.errors.map((err2) => ({ kind, err: err2 })));
      }
      flattened_errors.push({ kind, err });
    }
    for (let i = 0; i < flattened_errors.length; i++) {
      const x = flattened_errors[i];
      if (!x.err?.message) continue;
      for (const other of flattened_errors.slice(0, i)) {
        if (other.err?.message === x.err.message || other.err.stack === x.err.stack) {
          other.kind = [...x.kind, ...other.kind];
          flattened_errors.splice(i, 1);
          i -= 1;
          continue;
        }
      }
    }
    for (const { kind, err } of flattened_errors) {
      const map = { error: "error runtime", client: "client runtime", server: "server runtime" };
      console.error(`Errors while bundling Bake ${kind.map((x) => map[x]).join(" and ")}:`);
      console.error(err);
    }
    process.exit(1);
  } else {
    console.log("-> bake.client.js, bake.server.js, bake.error.js");
    const empty_file = join(codegenRoot, "bake_empty_file");
    if (!existsSync(empty_file)) writeIfNotChanged(empty_file, "this is used to fulfill a build dependency");
  }
}
await run();
