import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';

const databaseId = '8f472afc-f2bd-41db-9575-af031ce40630';
const workerDirectory = '.svelte-kit/cloudflare/worker';
let root: string;

function write(path: string, text: string) {
  const fullPath = join(root, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, text);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'linkrovia-demo-deploy-test-'));
  mkdirSync(join(root, 'scripts'));
  for (const name of ['deploy-demo.mjs', 'demo-deployment-config.mjs']) {
    copyFileSync(
      new URL(`../../scripts/${name}`, import.meta.url),
      join(root, 'scripts', name),
    );
  }
  write(
    `${workerDirectory}/wrangler.json`,
    JSON.stringify({
      main: 'linkrovia.js',
      assets: { binding: 'ASSETS', directory: '../client' },
      d1_databases: [
        {
          binding: 'DB',
          database_id: '00000000-0000-0000-0000-000000000000',
          migrations_dir: '../../../migrations',
        },
      ],
    }),
  );
  write(
    'node_modules/wrangler/bin/wrangler.js',
    String.raw`
    const fs = require('node:fs');
    fs.appendFileSync('commands', JSON.stringify(process.argv.slice(2)) + '\n');
  `,
  );
  write(
    'mock-cloudflare.mjs',
    `
    globalThis.fetch = async (url) => {
      if (url !== 'https://api.cloudflare.com/client/v4/accounts/${'a'.repeat(32)}/d1/database/${databaseId}') throw new Error('Unexpected Cloudflare request');
      return Response.json({success:true,result:{uuid:'${databaseId}',name:process.env.TEST_DATABASE_NAME}});
    };
  `,
  );
  write('commands', '');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function deploy(args: string[], env: Record<string, string> = {}) {
  const result = spawnSync(
    process.execPath,
    ['--import', './mock-cloudflare.mjs', 'scripts/deploy-demo.mjs', ...args],
    {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32),
        CLOUDFLARE_API_TOKEN: 'test-only',
        WRANGLER_CI_OVERRIDE_NAME: 'linkrovia-demo',
        LINKROVIA_DEMO_D1_ID: databaseId,
        TEST_DATABASE_NAME: 'linkrovia-demo-db',
        ...env,
      },
    },
  );
  const commands: string[][] = readFileSync(join(root, 'commands'), 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  expect(readdirSync(join(root, workerDirectory))).toEqual(['wrangler.json']);
  return { ...result, commands };
}

it('only packages the demo build on a dry run', () => {
  const { status, commands } = deploy(['--dry-run'], {
    TEST_DATABASE_NAME: 'wrong',
  });
  expect(status).toBe(0);
  expect(commands).toHaveLength(1);
  expect(commands[0]).toContain('--dry-run');
});

it('never migrates a database with the wrong name', () => {
  const { status, stderr, commands } = deploy([], {
    TEST_DATABASE_NAME: 'linkrovia-db',
  });
  expect(status).toBe(1);
  expect(stderr).toContain('linkrovia-demo-db');
  expect(commands).toHaveLength(0);
});

it('refuses a CI deployment targeting the regular Worker', () => {
  const { status, commands } = deploy([], {
    WRANGLER_CI_OVERRIDE_NAME: 'linkrovia',
  });
  expect(status).toBe(1);
  expect(commands).toHaveLength(0);
});

it('packages, migrates the named demo database, and uploads in order', () => {
  const { status, commands } = deploy([]);
  expect(status).toBe(0);
  expect(
    commands.map((args) => args.slice(0, args.indexOf('--config'))),
  ).toEqual([
    ['deploy', '--dry-run'],
    ['d1', 'migrations', 'apply', 'DB', '--remote'],
    ['deploy'],
  ]);
});
