// Stub for bun runtime module
import { spawn as nodeSpawn, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Bun.spawn polyfill
export function spawn(opts) {
  const cmd = Array.isArray(opts?.cmd) ? opts.cmd : [];
  const proc = nodeSpawn(cmd[0], cmd.slice(1), {
    cwd: opts?.cwd,
    env: opts?.env || process.env,
    stdio: opts?.stdin ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'pipe', 'pipe'],
  });
  
  const result = {
    stdin: proc.stdin,
    stdout: proc.stdout,
    stderr: proc.stderr,
    exited: new Promise((resolve) => {
      proc.on('close', (code) => {
        result.exitCode = code;
        resolve(code);
      });
    }),
    exitCode: null,
    killed: false,
  };
  
  return result;
}

export const spawnSync = (opts) => {
  const cmd = Array.isArray(opts?.cmd) ? opts.cmd.join(' ') : opts;
  try {
    const result = execSync(cmd, { cwd: opts?.cwd, encoding: 'utf-8', input: opts?.stdin, env: opts?.env, maxBuffer: 50 * 1024 * 1024 });
    return { stdout: Buffer.from(result), exitCode: 0, success: true };
  } catch (e) {
    return { stdout: Buffer.from(e.stdout ?? ''), stderr: Buffer.from(e.stderr ?? ''), exitCode: e.status ?? 1, success: false };
  }
};

export const file = (p) => ({
  text: () => fs.readFileSync(p, 'utf-8'),
  json: () => JSON.parse(fs.readFileSync(p, 'utf-8')),
  exists: () => { try { fs.accessSync(p); return true; } catch { return false; } },
  get size() { try { return fs.statSync(p).size; } catch { return 0; } },
});

export const write = async (dest, data) => {
  const p = typeof dest === 'string' ? dest : dest.toString();
  fs.writeFileSync(p, data);
  return data.length ?? 0;
};

export const resolveSync = (specifier, from) => {
  try { return require.resolve(specifier, { paths: [path.dirname(from)] }); }
  catch { return require.resolve(specifier); }
};

export const env = process.env;
export default { spawn, spawnSync, file, write, resolveSync, env };
