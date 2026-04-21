import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const releaseArgs = process.argv.slice(2);
const isWindows = process.platform === 'win32';
function resolveGhExecutable() {
  if (!isWindows) return 'gh';

  const candidates = [
    join(process.env.ProgramFiles ?? 'C:\\Program Files', 'GitHub CLI', 'gh.exe'),
    'C:\\Program Files\\GitHub CLI\\gh.exe',
  ];

  const found = candidates.find((candidate) => existsSync(candidate));
  return found ?? 'gh.exe';
}

const ghExecutable = resolveGhExecutable();
const pnpmExecutable = isWindows ? 'pnpm.cmd' : 'pnpm';

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();

  try {
    return execFileSync(ghExecutable, ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Unable to read GitHub token from gh CLI. Run "gh auth login" first.\n${message}`,
      { cause: error }
    );
  }
}

function runRelease(token) {
  const env = {
    ...process.env,
    GITHUB_TOKEN: token,
    GH_TOKEN: token,
  };

  const result = isWindows
    ? spawnSync(
        pnpmExecutable,
        ['exec', 'release-it', ...releaseArgs],
        {
          stdio: 'inherit',
          env,
          shell: true,
        }
      )
    : spawnSync(
        pnpmExecutable,
        ['exec', 'release-it', ...releaseArgs],
        {
          stdio: 'inherit',
          env,
        }
      );

  if (typeof result.status === 'number') {
    process.exit(result.status);
  }

  process.exit(1);
}

try {
  const token = getGitHubToken();
  if (!token) {
    throw new Error('GitHub token is empty. Run "gh auth login" first.');
  }

  runRelease(token);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
