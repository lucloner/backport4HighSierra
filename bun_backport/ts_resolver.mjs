// Custom Node.js ESM resolver for .ts imports
// Usage: node --import ./ts_resolver.mjs --experimental-strip-types <script.ts>

import { resolve as pathResolve, dirname, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TS_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'];

export async function resolve(specifier, context, nextResolve) {
  // Try the default resolution first
  try {
    return await nextResolve(specifier, context);
  } catch (e) {
    // If it's a relative import and the default resolution failed,
    // try adding .ts, .tsx extensions
    if (specifier.startsWith('.') || specifier.startsWith('/')) {
      for (const ext of TS_EXTENSIONS) {
        try {
          return await nextResolve(specifier + ext, context);
        } catch {}
      }
      // Also try /index.ts
      try {
        return await nextResolve(specifier + '/index.ts', context);
      } catch {}
    }
    throw e;
  }
}

export async function load(url, context, nextLoad) {
  return nextLoad(url, context);
}

// Suppress the startup message - it interferes with codegen output
// console.log('[ts_resolver] .ts extension resolver loaded');
