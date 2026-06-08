// Custom loader for .ts imports in Node.js
// Registers .ts extension resolution using Node.js module register API

import { register } from 'node:module';

// Register the TS resolver with a proper URL
register(new URL('./ts_resolver.mjs', import.meta.url).href);
