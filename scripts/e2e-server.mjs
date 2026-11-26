import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fixtureSetupToken } from '../tests/fixtures/setup.mjs';

const require = createRequire(import.meta.url);
const demo = process.argv[2] === '--demo';
const demoToken = demo ? randomBytes(32).toString('hex') : null;
const port = process.env.LINKROVIA_E2E_PORT ?? (demo ? '4187' : '4173');
const host = demo
  ? '127.0.0.1'
  : (process.env.LINKROVIA_E2E_HOST ?? '127.0.0.1');
if (!/^\d{1,5}$/.test(port)) throw new Error('Invalid test server port.');
const wrangler = join(
  dirname(require.resolve('wrangler/package.json')),
  'bin/wrangler.js',
);
const vite = join(dirname(require.resolve('vite/package.json')), 'bin/vite.js');
mkdirSync('.wrangler', { recursive: true });
const directory = mkdtempSync(resolve('.wrangler/e2e-'));
const generated = mkdtempSync(resolve('.svelte-kit-e2e-'));
const state = join(directory, 'state');
const config = join(directory, 'wrangler.jsonc');

try {
  const local = readFileSync('wrangler.local.jsonc', 'utf8');
  const migrations = relative(directory, resolve('migrations'));
  writeFileSync(
    config,
    local.replace(
      '"migrations_dir": "migrations"',
      '"migrations_dir": ' + JSON.stringify(migrations),
    ),
  );
  writeFileSync(
    join(directory, '.dev.vars'),
    demo ? '' : 'SETUP_TOKEN=' + fixtureSetupToken + '\n',
  );

  const migration = spawnSync(
    process.execPath,
    [
      wrangler,
      'd1',
      'migrations',
      'apply',
      'DB',
      '--local',
      '--config',
      config,
      '--persist-to',
      state,
    ],
    {
      stdio: 'inherit',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    },
  );
  if (migration.error) throw migration.error;
  if (migration.status !== 0)
    throw new Error('Could not initialize the isolated test database.');

  const fixture = demoToken
    ? (await import('./demo-fixtures.mjs')).demoFixtures(demoToken)
    : host === 'localhost'
      ? `INSERT INTO domains (id, hostname, provider_mode, connection_status, verified_at)
       VALUES ('passkey-custom-host', '127.0.0.1', 'cloudflare_custom_domain', 'active', unixepoch())`
      : `INSERT INTO ai_usage (id, feature, provider, model, started_at, status, input_tokens, output_tokens, neurons, cost_microusd)
       VALUES ('browser-ai-cost', 'smart-create', 'fixture', 'fixture', unixepoch(), 'succeeded', 120, 40, 12, 132)`;
  const seeded = spawnSync(
    process.execPath,
    [
      wrangler,
      'd1',
      'execute',
      'DB',
      '--local',
      '--config',
      config,
      '--persist-to',
      state,
      '--command',
      fixture,
    ],
    {
      stdio: 'inherit',
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    },
  );
  if (seeded.error) throw seeded.error;
  if (seeded.status !== 0)
    throw new Error('Could not seed the isolated test data.');

  const server = spawn(
    process.execPath,
    [vite, 'dev', '--host', '127.0.0.1', '--port', port, '--strictPort'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        WRANGLER_SEND_METRICS: 'false',
        LINKROVIA_E2E_OUT_DIR: join(generated, 'kit'),
        LINKROVIA_E2E_VITE_CACHE: join(generated, 'vite'),
        LINKROVIA_E2E_WRANGLER_CONFIG: config,
        LINKROVIA_E2E_WORKER_STATE: join(state, 'v3'),
      },
    },
  );
  const controller = new AbortController();
  let stopping = false;
  /** @param {NodeJS.Signals} signal */
  function stopServer(signal) {
    stopping = true;
    server.kill(signal);
  }
  const exited = new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('exit', (code) => {
      controller.abort();
      resolve(code ?? 0);
    });
  });
  process.once('SIGINT', () => stopServer('SIGINT'));
  process.once('SIGTERM', () => stopServer('SIGTERM'));
  if (demoToken) {
    try {
      const { openDemo } = await import('./demo-browser.mjs');
      await openDemo({
        origin: `http://127.0.0.1:${port}`,
        token: demoToken,
        smoke: process.argv[3] === '--smoke',
        signal: controller.signal,
      });
      if (controller.signal.aborted && !stopping)
        throw new Error('The local demo Worker exited unexpectedly.');
    } finally {
      stopServer('SIGTERM');
      await exited;
    }
  } else {
    process.exitCode = await exited;
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
  rmSync(generated, { recursive: true, force: true });
}
