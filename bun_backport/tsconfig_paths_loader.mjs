import { resolve as pathResolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';

const REPO_ROOT = '/Volumes/Data/src/bun';
const SRC_ROOT = REPO_ROOT + '/src';

const PATH_ALIASES = {
  'bindgenv2': SRC_ROOT + '/codegen/bindgenv2/lib.ts',
  'bindgen': SRC_ROOT + '/codegen/bindgen-lib.ts',
};

export function resolve(specifier, context, nextResolve) {
  if (PATH_ALIASES[specifier]) {
    return { shortCircuit: true, url: 'file://' + PATH_ALIASES[specifier] };
  }

  if (specifier.startsWith('.') && context.parentURL) {
    const parentPath = fileURLToPath(context.parentURL);
    const parentDir = dirname(parentPath);
    let resolved = pathResolve(parentDir, specifier);

    if (!fs.existsSync(resolved) && fs.existsSync(resolved + '.ts')) {
      return { shortCircuit: true, url: pathToFileURL(resolved + '.ts').href };
    }
    if (fs.existsSync(resolved)) {
      const stat = fs.statSync(resolved);
      if (stat.isDirectory() && fs.existsSync(resolved + '/index.ts')) {
        return { shortCircuit: true, url: pathToFileURL(resolved + '/index.ts').href };
      }
    }
  }

  return nextResolve(specifier, context);
}
