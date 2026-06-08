// Wrapper to run bun codegen scripts with Node.js
// Patches bun-specific APIs before running

import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const scriptPath = process.argv[2];
const scriptArgs = process.argv.slice(3).join(' ');

if (!scriptPath) {
  console.error('Usage: node codegen_node.mjs <script.ts> [args...]');
  process.exit(1);
}

// Read the original script
const originalCode = fs.readFileSync(scriptPath, 'utf-8');

// Patch bun-specific APIs
let patchedCode = originalCode
  // Replace import.meta.require with require
  .replace(/import\.meta\.require\(([^)]+)\)/g, 'require($1)')
  // Add require shim
  ;

// Add polyfill header
const polyfill = `
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Override require to resolve 'bindgenv2' and 'bindgen' 
const __origRequire = require;
const __patchedRequire = function(specifier) {
  if (specifier === 'bindgenv2') {
    return __origRequire('/Volumes/Data/src/bun/src/codegen/bindgenv2/lib.ts');
  }
  if (specifier === 'bindgen') {
    return __origRequire('/Volumes/Data/src/bun/src/codegen/bindgen-lib.ts');
  }
  return __origRequire(specifier);
};
// Overwrite the global require
globalThis.require = __patchedRequire;

// Polyfill Bun.resolveSync
if (!globalThis.Bun) {
  globalThis.Bun = {
    resolveSync(specifier, from) {
      if (specifier === 'bindgenv2') return '/Volumes/Data/src/bun/src/codegen/bindgenv2/lib.ts';
      if (specifier === 'bindgen') return '/Volumes/Data/src/bun/src/codegen/bindgen-lib.ts';
      try {
        return __origRequire.resolve(specifier, { paths: [from] });
      } catch {
        throw new Error('Cannot resolve: ' + specifier + ' from ' + from);
      }
    }
  };
}
`;

// Prepend the polyfill but remove the original imports that conflict
// Actually, let's take a simpler approach: generate a self-contained CJS script
const cjsCode = `
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs');

// Setup require with TS support via --experimental-strip-types
const req = createRequire('${scriptPath}');
const origResolve = req.resolve;

// Override resolution for bindgenv2/bindgen
req.resolve = function(specifier, opts) {
  if (specifier === 'bindgenv2') return '/Volumes/Data/src/bun/src/codegen/bindgenv2/lib.ts';
  if (specifier === 'bindgen') return '/Volumes/Data/src/bun/src/codegen/bindgen-lib.ts';
  return origResolve.call(this, specifier, opts);
};

// Polyfill Bun global
globalThis.Bun = globalThis.Bun || {
  resolveSync(specifier, from) {
    if (specifier === 'bindgenv2') return '/Volumes/Data/src/bun/src/codegen/bindgenv2/lib.ts';
    if (specifier === 'bindgen') return '/Volumes/Data/src/bun/src/codegen/bindgen-lib.ts';
    try { return req.resolve(specifier, { paths: [from] }); }
    catch { throw new Error('Cannot resolve: ' + specifier); }
  }
};

// Load and run the script
`;

// Write a temp CJS wrapper
const tmpFile = path.join(path.dirname(scriptPath), '.node_cjs_wrapper.cjs');
fs.writeFileSync(tmpFile, cjsCode + '\n' + 'req("' + scriptPath + '");' + '\n');

// Run it with node --experimental-strip-types
try {
  const result = execSync(
    'node --experimental-strip-types ' + JSON.stringify(tmpFile) + ' ' + scriptArgs,
    { encoding: 'utf-8', cwd: path.dirname(scriptPath), stdio: ['pipe', 'pipe', 'pipe'] }
  );
  process.stdout.write(result);
} catch (e) {
  process.stderr.write(e.stderr || e.message);
  process.exit(e.status || 1);
} finally {
  try { fs.unlinkSync(tmpFile); } catch {}
}
