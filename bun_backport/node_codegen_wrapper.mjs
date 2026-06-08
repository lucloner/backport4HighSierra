// Node.js wrapper to run bun codegen scripts on macOS 10.13
// Replaces bun-specific APIs with Node.js equivalents

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// Register .ts handler for node --experimental-strip-types
// This allows require() of .ts files when using --experimental-strip-types

// Patch: make import.meta.require work by adding a global polyfill
// This wrapper runs a codegen script with bun APIs replaced

const scriptPath = process.argv[2];
const scriptArgs = process.argv.slice(3);

if (!scriptPath) {
  console.error('Usage: node node_codegen_wrapper.mjs <script.ts> [args...]');
  process.exit(1);
}

// Create a temporary patched version of the script that replaces bun APIs
const originalCode = fs.readFileSync(scriptPath, 'utf-8');

let patchedCode = originalCode;

// Replace import.meta.require with dynamic import (synchronous-ish via top-level await)
// Actually, we need sync require. Let's use a different approach:
// Replace import.meta.require(path) with require(path) after registering .ts extension

// For --experimental-strip-types, we can use require() directly on .ts files
// But first we need to handle the module resolution

// Patch: replace import.meta.require with a custom function
patchedCode = patchedCode.replace(
  /import\.meta\.require\(([^)]+)\)/g,
  '(__import_meta_require($1))'
);

// Add the polyfill at the top
const polyfill = `
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const __require = createRequire(import.meta.url);

// Polyfill for import.meta.require
function __import_meta_require(specifier) {
  // Resolve relative paths
  if (specifier.startsWith('.') || specifier.startsWith('/')) {
    const resolved = __require.resolve(specifier);
    return __require(resolved);
  }
  // For package specifiers like "bindgenv2", try require.resolve
  try {
    return __require(__require.resolve(specifier));
  } catch (e) {
    throw new Error('Cannot resolve: ' + specifier + ' - ' + e.message);
  }
}

// Polyfill for Bun.resolveSync  
const __origBun = typeof Bun !== 'undefined' ? Bun : undefined;
if (typeof globalThis.Bun === 'undefined') {
  globalThis.Bun = {
    resolveSync(specifier, from) {
      try {
        const resolved = __require.resolve(specifier, { paths: [from] });
        return resolved;
      } catch (e) {
        throw new Error('Cannot resolve: ' + specifier + ' from ' + from);
      }
    }
  };
}
`;

// Write patched script to temp file
const tmpScript = path.join(path.dirname(scriptPath), '.node_patched_' + path.basename(scriptPath));
fs.writeFileSync(tmpScript, polyfill + '\n' + patchedCode);

// Run the patched script
const { execSync } = await import('node:child_process');
try {
  const result = execSync(
    `node --experimental-strip-types ${JSON.stringify(tmpScript)} ${scriptArgs.join(' ')}`,
    { encoding: 'utf-8', cwd: path.dirname(scriptPath), stdio: ['pipe', 'pipe', 'pipe'] }
  );
  process.stdout.write(result);
} catch (e) {
  process.stderr.write(e.stderr || e.message);
  process.exit(e.status || 1);
} finally {
  try { fs.unlinkSync(tmpScript); } catch {}
}
