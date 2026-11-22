import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const redirectPath = resolve(root, '.wrangler/deploy/config.json');
const wrangler = resolve(root, 'node_modules/wrangler/bin/wrangler.js');

function runWrangler(args) {
  const result = spawnSync(process.execPath, [wrangler, ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

try {
  const args = process.argv.slice(2);
  if (
    args.some((arg) => arg !== '--dry-run' && arg !== '--rollup') ||
    new Set(args).size !== args.length
  )
    throw new Error('Usage: npm run deploy [-- [--dry-run] [--rollup]]');
  // npm consumes --dry-run if it was passed before the argument separator.
  const dryRun =
    args.includes('--dry-run') || process.env.npm_config_dry_run === 'true';
  const rollup = args.includes('--rollup');

  const { configPath } = JSON.parse(readFileSync(redirectPath, 'utf8'));
  const generatedPath = resolve(dirname(redirectPath), configPath);
  if (
    generatedPath !==
    resolve(root, '.svelte-kit/cloudflare/worker/wrangler.json')
  )
    throw new Error(
      'Run npm run build to generate the production Worker configuration.',
    );
  if (
    statSync(resolve(root, 'wrangler.jsonc')).mtimeMs >
    statSync(generatedPath).mtimeMs
  )
    throw new Error(
      'wrangler.jsonc changed after the build. Run npm run build again.',
    );

  const config = JSON.parse(readFileSync(generatedPath, 'utf8'));
  if (
    !config.name ||
    config.main !== 'index.js' ||
    config.assets?.binding !== 'ASSETS'
  )
    throw new Error(
      'The generated configuration must describe the Linkrovia Worker and its assets.',
    );

  const [database] = config.d1_databases ?? [];
  if (config.d1_databases?.length !== 1 || database?.binding !== 'DB')
    throw new Error(
      'The production Worker must have a single D1 binding named DB.',
    );

  const migrationsDir = resolve(
    dirname(generatedPath),
    database.migrations_dir ?? '',
  );
  if (
    migrationsDir !== resolve(root, 'migrations') ||
    database.migrations_pattern ||
    !readdirSync(migrationsDir, { withFileTypes: true }).some(
      (entry) => entry.isFile() && entry.name.endsWith('.sql'),
    )
  )
    throw new Error(
      'The DB binding must point to the repository SQL migrations.',
    );

  if (
    !dryRun &&
    (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(
      database.database_id,
    ) ||
      database.database_id === '00000000-0000-4000-8000-000000000001')
  )
    throw new Error(
      'Set DB to the Cloudflare D1 database ID and run npm run build again.',
    );

  let deployPath = generatedPath;
  if (rollup) {
    deployPath = resolve(dirname(generatedPath), 'rollup.json');
    writeFileSync(
      deployPath,
      JSON.stringify({
        name: `${config.name}-rollup`,
        main: relative(dirname(deployPath), resolve(root, 'workers/rollup.ts')),
        account_id: config.account_id,
        compatibility_date: config.compatibility_date,
        compatibility_flags: config.compatibility_flags,
        workers_dev: false,
        preview_urls: false,
        triggers: { crons: ['15 3 * * *', '45 * * * *'] },
        d1_databases: [database],
        analytics: config.analytics,
        observability: config.observability,
      }),
    );
  }

  // D1 commands do not follow the adapter redirect. Pin both commands to the same build.
  const configArgs = ['--config', relative(root, deployPath)];
  runWrangler(['deploy', ...configArgs, '--dry-run']);
  if (!dryRun) {
    runWrangler(['d1', 'migrations', 'apply', 'DB', '--remote', ...configArgs]);
    runWrangler(['deploy', ...configArgs]);
  }
} catch (error) {
  if (error.code === 'ENOENT') {
    console.error('Build Linkrovia with npm run build before deploying.');
  } else {
    console.error(error.message);
  }
  process.exitCode = 1;
}
