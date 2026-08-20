// Cross-platform preinstall check (replaces a Unix-only `sh -c` one-liner
// that failed on plain Windows PowerShell/cmd, which have no `sh`).
//
// 1. Removes stray npm/yarn lockfiles so this pnpm workspace never
//    accidentally installs via the wrong package manager.
// 2. Refuses to run unless invoked through pnpm, since this is a pnpm
//    workspace (mixing package managers corrupts the lockfile/node_modules).

const fs = require('fs');

for (const file of ['package-lock.json', 'yarn.lock']) {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
  }
}

const userAgent = process.env.npm_config_user_agent || '';
if (!userAgent.startsWith('pnpm/')) {
  console.error('Use pnpm instead (this is a pnpm workspace) — run "pnpm install", not npm or yarn.');
  process.exit(1);
}
