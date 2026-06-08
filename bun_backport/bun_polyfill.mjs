// Comprehensive Bun API polyfill for Node.js
// Loaded via --import before codegen scripts

import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path aliases from tsconfig.codegen.json
const PATH_ALIASES = {
  'bindgenv2': '/Volumes/Data/src/bun/src/codegen/bindgenv2/lib.ts',
  'bindgen': '/Volumes/Data/src/bun/src/codegen/bindgen-lib.ts',
};

// esbuild path for on-the-fly transpilation
const ESBUILD = '/Volumes/Data/src/bun/node_modules/.bin/esbuild';
const TMP_DIR = '/Volumes/Data/src/backport/bun_backport/tmp/codegen_require';
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// Create a require function that handles .ts files and path aliases
const nodeRequire = createRequire(import.meta.url);
const tsCache = new Map();

function tsRequire(specifier) {
  // Check path aliases first
  if (PATH_ALIASES[specifier]) {
    return tsRequire(PATH_ALIASES[specifier]);
  }
  
  // Resolve .ts extensions
  let filePath = path.resolve(specifier);
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(filePath + '.ts')) filePath = filePath + '.ts';
    else if (fs.existsSync(filePath + '.js')) filePath = filePath + '.js';
    else if (fs.existsSync(filePath + '/index.ts')) filePath = filePath + '/index.ts';
    else if (fs.existsSync(filePath + '/index.js')) filePath = filePath + '/index.js';
  }
  
  // .js/.mjs/.cjs files can be required directly
  if (filePath.endsWith('.js') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) {
    return nodeRequire(filePath);
  }
  
  // Native Node.js modules
  if (specifier.startsWith('node:') || specifier.startsWith('/Volumes/Data/src/bun/node_modules/')) {
    return nodeRequire(specifier);
  }
  
  // .ts files need transpilation
  if (tsCache.has(filePath)) return tsCache.get(filePath);
  
  const hash = crypto.createHash('md5').update(filePath).digest('hex').slice(0, 8);
  const outFile = path.join(TMP_DIR, `ts_${hash}.mjs`);
  
  try {
    execSync(`"${ESBUILD}" "${filePath}" --bundle --platform=node --format=esm --packages=external --alias:bindgenv2=/Volumes/Data/src/bun/src/codegen/bindgenv2/lib.ts --alias:bindgen=/Volumes/Data/src/bun/src/codegen/bindgen-lib.ts --alias:bun:test=/Volumes/Data/src/backport/bun_backport/stubs/bun_test.mjs --outfile="${outFile}" --log-level=error 2>&1`, { encoding: 'utf-8' });
  } catch (e) {
    // Try without bundling
    try {
      execSync(`"${ESBUILD}" "${filePath}" --outfile="${outFile}" --format=esm --platform=node --log-level=error 2>&1`, { encoding: 'utf-8' });
    } catch (e2) {
      throw new Error(`Failed to transpile ${filePath}: ${e2.message}`);
    }
  }
  
  // For ESM, we need to import dynamically. But since this is synchronous, 
  // we'll use require with createRequire for the .mjs file
  try {
    const result = nodeRequire(outFile);
    tsCache.set(filePath, result);
    return result;
  } catch (e) {
    throw new Error(`Failed to load transpiled ${filePath}: ${e.message}`);
  }
}

// BunFile polyfill
class BunFile {
  #path;
  constructor(filePath) { this.#path = typeof filePath === 'string' ? filePath : filePath.toString(); }
  async text() { return fs.readFileSync(this.#path, 'utf-8'); }
  async json() { return JSON.parse(fs.readFileSync(this.#path, 'utf-8')); }
  async exists() { try { fs.accessSync(this.#path, fs.constants.F_OK); return true; } catch { return false; } }
  get size() { try { return fs.statSync(this.#path).size; } catch { return 0; } }
  get type() { return 'application/octet-stream'; }
  toString() { return this.#path; }
}

// Bun global
const BunGlobal = {
  file: (filePath) => new BunFile(filePath),
  resolveSync(specifier, from) {
    if (PATH_ALIASES[specifier]) return PATH_ALIASES[specifier];
    try { return nodeRequire.resolve(specifier, { paths: [from] }); }
    catch {
      const resolved = path.resolve(from, specifier);
      if (fs.existsSync(resolved) || fs.existsSync(resolved + '.ts')) return resolved;
      throw new Error(`Cannot resolve: ${specifier} from ${from}`);
    }
  },
  env: process.env,
  cwd: () => process.cwd(),
  exit: (code) => process.exit(code),
  hash: (data) => crypto.createHash('sha256').update(typeof data === 'string' ? data : Buffer.from(data)).digest('hex'),
  inspect: (obj, opts) => {
    const util = nodeRequire('node:util');
    return util.inspect(obj, { colors: opts?.colors ?? false, depth: opts?.depth ?? 10 });
  },
  enableANSIColors: process.stdout?.isTTY ?? false,
  write: async (dest, data) => {
    const p = typeof dest === 'string' ? dest : dest.toString();
    fs.writeFileSync(p, typeof data === 'string' ? data : Buffer.from(data));
    return data.length ?? 0;
  },
  sleep: (ms) => new Promise(r => setTimeout(r, ms)),
  spawnSync: (opts) => {
    const cmd = typeof opts.cmd === 'string' ? opts.cmd : opts.cmd?.join(' ');
    try {
      const result = execSync(cmd, { cwd: opts.cwd, encoding: 'utf-8', env: opts.env });
      return { stdout: result, exitCode: 0, success: true };
    } catch (e) {
      return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.status ?? 1, success: false };
    }
  },
  build: async (opts) => {
    try {
      const esbuild = nodeRequire('esbuild');
      const result = await esbuild.build({
        entrypoints: opts.entrypoints, bundle: true, minify: opts.minify ?? true,
        target: opts.target ?? ['node18'], format: opts.format ?? 'iife',
        outdir: opts.outdir, write: true, external: opts.external, define: opts.define,
      });
      return { success: true, outputs: result.outputFiles ?? [] };
    } catch (e) { return { success: false, outputs: [] }; }
  },
  Glob: class { #pattern; constructor(p) { this.#pattern = p; } scanSync() { const dir = path.dirname(this.#pattern); try { const files = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else files.push(f); } }; walk(dir); return files; } catch { return []; } } },
  Transpiler: class { constructor(o) { this.opts = o; } transform(c) { return c; } },
};

if (!globalThis.Bun) globalThis.Bun = BunGlobal;
else { for (const k of Object.keys(BunGlobal)) { if (!(k in globalThis.Bun)) globalThis.Bun[k] = BunGlobal[k]; } }

// Make require available globally for ESM (esbuild __require polyfill)
if (typeof globalThis.require === 'undefined') {
  globalThis.require = tsRequire;
  for (const k of Object.keys(nodeRequire)) { try { globalThis.require[k] = nodeRequire[k]; } catch {} }
}
if (typeof globalThis.__require === 'undefined') {
  globalThis.__require = tsRequire;
}

console.log('[polyfill] Bun APIs polyfilled for Node.js');
