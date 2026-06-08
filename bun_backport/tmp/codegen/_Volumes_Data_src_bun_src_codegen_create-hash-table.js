// src/codegen/create-hash-table.ts
import fs2 from "node:fs";

// ../backport/bun_backport/stubs/bun_runtime.mjs
import { spawn as nodeSpawn, execSync } from "node:child_process";
function spawn(opts) {
  const cmd = Array.isArray(opts?.cmd) ? opts.cmd : [];
  const proc2 = nodeSpawn(cmd[0], cmd.slice(1), {
    cwd: opts?.cwd,
    env: opts?.env || process.env,
    stdio: opts?.stdin ? ["pipe", "pipe", "pipe"] : ["pipe", "pipe", "pipe"]
  });
  const result = {
    stdin: proc2.stdin,
    stdout: proc2.stdout,
    stderr: proc2.stderr,
    exited: new Promise((resolve) => {
      proc2.on("close", (code) => {
        result.exitCode = code;
        resolve(code);
      });
    }),
    exitCode: null,
    killed: false
  };
  return result;
}
var env = process.env;

// src/codegen/create-hash-table.ts
import path2 from "path";

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

// src/codegen/create-hash-table.ts
var input = process.argv[2];
var output = process.argv[3];
var platform = process.env.TARGET_PLATFORM ?? process.platform;
var create_hash_table = path2.join("/Volumes/Data/src/bun/src/codegen", "./create_hash_table");
var input_text = fs2.readFileSync(input, "utf-8");
var to_preprocess = [...input_text.matchAll(/@begin\s+.+?@end/gs)].map((m) => m[0]).join("\n");
var os = platform === "win32" ? "WINDOWS" : platform.toUpperCase();
var other_oses = ["WINDOWS", "DARWIN", "LINUX"].filter((x) => x !== os);
var to_remove = new RegExp(`#if\\s+(!OS\\(${os}\\)|OS\\((${other_oses.join("|")})\\))\\n.*?#endif`, "gs");
var input_preprocessed = to_preprocess.replace(to_remove, "");
console.log("Generating " + output + " from " + input);
var proc = spawn({
  cmd: ["perl", create_hash_table, "-"],
  stdin: "pipe",
  stdout: "pipe",
  stderr: "inherit"
});
proc.stdin.write(input_preprocessed);
proc.stdin.end();
await proc.exited;
if (proc.exitCode !== 0) {
  console.log(
    "Failed to generate " + output + ", create_hash_table exited with " + (proc.exitCode || "") + (proc.signalCode || "")
  );
  process.exit(1);
}
var str = await new Response(proc.stdout).text();
str = str.replaceAll(/^\/\/.*$/gm, "");
str = str.replaceAll(/^#include.*$/gm, "");
str = str.replaceAll(`namespace JSC {`, "");
str = str.replaceAll(`} // namespace JSC`, "");
str = str.replaceAll(/NativeFunctionType,\s([a-zA-Z0-99_]+)/gm, "NativeFunctionType, &$1");
str = str.replaceAll("&Generated::", "Generated::");
str = "#pragma once\n// File generated via `create-hash-table.ts`\n" + str.trim() + "\n";
writeIfNotChanged(output, str);
