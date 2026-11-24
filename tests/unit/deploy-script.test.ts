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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const generatedPath = '.svelte-kit/cloudflare/worker/wrangler.json';
const config = {
  name: 'test-linkrovia',
  main: 'linkrovia.js',
  assets: { directory: '../client', binding: 'ASSETS' },
  triggers: { crons: ['15,45 * * * *'] },
  compatibility_flags: ['nodejs_compat'],
  ratelimits: [{ name: 'AUTH_LIMIT', namespace_id: '1' }],
  d1_databases: [
    {
      binding: 'DB',
      database_id: '01234567-89ab-cdef-0123-456789abcdef',
      migrations_dir: '../../../migrations',
    },
  ],
  analytics_engine_datasets: [
    { binding: 'CLICKS', dataset: 'test_clicks' },
    { binding: 'OTHER', dataset: 'test_other' },
  ],
  analytics: { binding: 'ANALYTICS_SQL' },
  vars: { LINKROVIA_CLICKS_DATASET: 'test_clicks', OTHER: 'keep me' },
  secrets: { required: ['SETUP_TOKEN'] },
};

const originalCommands = [
  ['deploy', '--config', generatedPath, '--dry-run'],
  ['d1', 'migrations', 'apply', 'DB', '--remote', '--config', generatedPath],
  ['deploy', '--config', generatedPath],
];

const analyticsDisabled = [
  '\u001b[31mYou need to enable Analytics Engine [code: 100',
  '89]\u001b[0m\n',
];

type Command = { args: string[]; config: typeof config };
type Outcome = { status: number; stderr?: string[] };

let root: string;

function write(path: string, data: string) {
  const target = join(root, path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, data);
}

function deploy(outcomes: Outcome[] = [], args: string[] = []) {
  write('outcomes.json', JSON.stringify(outcomes));
  const result = spawnSync(process.execPath, ['scripts/deploy.mjs', ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, npm_config_dry_run: 'false' },
  });
  const commands: Command[] = readFileSync(join(root, 'commands.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line));
  return { ...result, commands };
}

describe('deployment script', () => {
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'linkrovia-deploy-test-'));
    write('wrangler.jsonc', '{}');
    write(
      '.wrangler/deploy/config.json',
      JSON.stringify({
        configPath: `../../${generatedPath}`,
      }),
    );
    write('migrations/0001_initial.sql', 'SELECT 1;');
    write(generatedPath, JSON.stringify(config));
    mkdirSync(join(root, 'scripts'));
    copyFileSync(
      new URL('../../scripts/deploy.mjs', import.meta.url),
      join(root, 'scripts/deploy.mjs'),
    );
    write(
      'node_modules/wrangler/bin/wrangler.js',
      String.raw`
      const fs = require('node:fs');
      const args = process.argv.slice(2);
      const config = JSON.parse(fs.readFileSync(args[args.indexOf('--config') + 1], 'utf8'));
      fs.appendFileSync('commands.jsonl', JSON.stringify({ args, config }) + '\n');
      const commandIndex = fs.readFileSync('commands.jsonl', 'utf8').trim().split('\n').length - 1;
      const outcome = JSON.parse(fs.readFileSync('outcomes.json', 'utf8'))[commandIndex];
      console.log('Wrangler command ' + (commandIndex + 1));
      async function finish() {
        for (const part of outcome?.stderr ?? []) {
          process.stderr.write(part);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        process.exitCode = outcome?.status ?? 0;
      }
      finish();
    `,
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('preflights, migrates, and uploads the original Worker on success', () => {
    const { status, stdout, commands } = deploy();

    expect(status).toBe(0);
    expect(commands.map(({ args }) => args)).toEqual(originalCommands);
    expect(commands.every((command) => command.config.analytics)).toBe(true);
    expect(stdout).toContain('Wrangler command 3');
  });

  it('only preflights on a standalone dry run', () => {
    const { status, commands } = deploy([], ['--dry-run']);

    expect(status).toBe(0);
    expect(commands.map(({ args }) => args)).toEqual([originalCommands[0]]);
  });

  it('retries the upload with only Linkrovia Analytics Engine bindings removed', () => {
    const { status, stdout, stderr, commands } = deploy([
      { status: 0 },
      { status: 0 },
      { status: 1, stderr: analyticsDisabled },
    ]);

    expect(status).toBe(0);
    expect(stdout).toContain('Wrangler command 4');
    expect(stderr).toContain(analyticsDisabled.join(''));
    expect(commands).toHaveLength(4);
    expect(commands.slice(0, 3).map(({ args }) => args)).toEqual(
      originalCommands,
    );
    const retry = commands[3];
    expect(retry.args.slice(0, 2)).toEqual(['deploy', '--config']);
    expect(dirname(retry.args[2])).toBe(dirname(generatedPath));
    expect(retry.args[2]).not.toBe(generatedPath);
    expect(retry.config).toEqual({
      ...config,
      analytics: undefined,
      analytics_engine_datasets: [{ binding: 'OTHER', dataset: 'test_other' }],
      vars: { OTHER: 'keep me' },
    });
    expect(readdirSync(join(root, dirname(generatedPath)))).toEqual([
      'wrangler.json',
    ]);
    expect(readFileSync(join(root, generatedPath), 'utf8')).toBe(
      JSON.stringify(config),
    );
  });

  it('preserves the exact exit code from an unrelated upload failure', () => {
    const { status, stderr, commands } = deploy([
      { status: 0 },
      { status: 0 },
      { status: 5, stderr: ['Different failure [code: 100890]\n'] },
    ]);

    expect(status).toBe(5);
    expect(stderr).toContain('Different failure [code: 100890]');
    expect(commands).toHaveLength(3);
  });

  it('preserves a migration failure even with the Analytics Engine error code', () => {
    const { status, commands } = deploy([
      { status: 0 },
      { status: 3, stderr: analyticsDisabled },
    ]);

    expect(status).toBe(3);
    expect(commands).toHaveLength(2);
  });

  it('returns the fallback upload failure and removes its temporary config', () => {
    const { status, commands } = deploy([
      { status: 0 },
      { status: 0 },
      { status: 1, stderr: analyticsDisabled },
      { status: 9, stderr: analyticsDisabled },
    ]);

    expect(status).toBe(9);
    expect(commands).toHaveLength(4);
    expect(readdirSync(join(root, dirname(generatedPath)))).toEqual([
      'wrangler.json',
    ]);
  });
});
