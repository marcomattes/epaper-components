// Sole entry point for OS command execution used by scripts/*.mjs. Kept in
// its own module, deliberately independent of process.argv/CLI input, so the
// command allowlist below is the only thing standing between a caller and an
// actual spawned process.
import { execFileSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import process from 'node:process';

const ALLOWED_COMMANDS = new Set(['npm', 'git']);

// Resolve each allowed command to an absolute path ourselves — rather than
// pass the bare name to execFileSync and let the OS walk PATH implicitly —
// so the executable actually invoked is fixed and auditable up front.
const resolvedPathCache = new Map();

function resolveExecutable(name) {
  const cached = resolvedPathCache.get(name);
  if (cached) return cached;

  const candidateExts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
  for (const dir of dirs) {
    for (const ext of candidateExts) {
      const candidate = join(dir, name + ext);
      try {
        accessSync(candidate, constants.X_OK);
        resolvedPathCache.set(name, candidate);
        return candidate;
      } catch {
        /* not found in this directory, keep looking */
      }
    }
  }
  throw new Error(`run-command: could not resolve "${name}" to an executable on PATH.`);
}

function assertAllowed(command) {
  if (!ALLOWED_COMMANDS.has(command)) {
    throw new Error(`run-command: "${command}" is not an allowed command.`);
  }
}

/** Run an allowlisted command with argv-array arguments (never through a shell), inheriting stdio. */
export function runCommand(command, args) {
  assertAllowed(command);
  execFileSync(resolveExecutable(command), args, { stdio: 'inherit' });
}

/** Same as runCommand, but captures and returns trimmed stdout instead of inheriting it. */
export function captureCommand(command, args) {
  assertAllowed(command);
  return execFileSync(resolveExecutable(command), args, { encoding: 'utf8' }).trim();
}
