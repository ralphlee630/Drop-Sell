const fs = require('fs');
for (const file of ['package-lock.json', 'yarn.lock']) {
  if (fs.existsSync(file)) { fs.unlinkSync(file); }
}
const userAgent = process.env.npm_config_user_agent || '';
if (!userAgent.startsWith('pnpm/')) {
  console.error('Use pnpm instead (this is a pnpm workspace) - run "pnpm install", not npm or yarn.');
  process.exit(1);
}
