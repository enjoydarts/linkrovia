import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDemoConfig } from './demo-deployment-config.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourcePath = resolve(root, '.svelte-kit/cloudflare/worker/wrangler.json');
const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');
const dryRunDatabaseId = '8f472afc-f2bd-41db-9575-af031ce40630';

/** @param {string[]} args */
function runWrangler(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    cwd: root,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `Demo Wrangler ${args[0]} failed with exit code ${result.status ?? 1}.`,
    );
}

/** @param {{database_id: string, database_name: string}} database */
async function verifyDemoDatabase(database) {
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token } =
    process.env;
  if (!account || !/^[0-9a-f]{32}$/i.test(account) || !token)
    throw new Error(
      'Select the demo Cloudflare account and its deployment token.',
    );

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${database.database_id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok)
    throw new Error(
      `Could not verify the demo D1 database (HTTP ${response.status}).`,
    );
  const { success, result } = await response.json();
  if (
    !success ||
    result?.uuid !== database.database_id ||
    result.name !== database.database_name
  )
    throw new Error(
      'The specified D1 database must be named linkrovia-demo-db.',
    );
}

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--dry-run'))
    throw new Error('Usage: npm run deploy:demo [-- --dry-run]');
  const dryRun =
    args.includes('--dry-run') || process.env.npm_config_dry_run === 'true';
  const override = process.env.WRANGLER_CI_OVERRIDE_NAME;
  if (override && override !== 'linkrovia-demo')
    throw new Error('The demo command is only for the linkrovia-demo Worker.');

  const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
  const databaseId =
    process.env.LINKROVIA_DEMO_D1_ID ?? (dryRun ? dryRunDatabaseId : undefined);
  const config = createDemoConfig(source, databaseId);
  if (!dryRun) await verifyDemoDatabase(config.d1_databases[0]);

  // Paths in the adapter's generated config are relative to its directory.
  const configPath = resolve(
    dirname(sourcePath),
    `.wrangler-demo-${randomUUID()}.json`,
  );
  writeFileSync(configPath, JSON.stringify(config), {
    flag: 'wx',
    mode: 0o600,
  });
  const configArgs = ['--config', configPath];
  try {
    runWrangler(['deploy', '--dry-run', ...configArgs]);
    if (!dryRun) {
      runWrangler([
        'd1',
        'migrations',
        'apply',
        'DB',
        '--remote',
        ...configArgs,
      ]);
      runWrangler(['deploy', ...configArgs]);
    }
  } finally {
    rmSync(configPath, { force: true });
  }
} catch (error) {
  console.error(
    error instanceof Error && 'code' in error && error.code === 'ENOENT'
      ? 'Build Linkrovia with npm run build before deploying the demo.'
      : error instanceof Error
        ? error.message
        : 'The demo deployment failed.',
  );
  process.exitCode = 1;
}
