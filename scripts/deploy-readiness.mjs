import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout } from 'node:timers/promises';

function readSince(path, offset = 0) {
  if (!statSync(path, { throwIfNoEntry: false })) return '';
  return readFileSync(path).subarray(offset).toString();
}

function listOutputFiles(directory) {
  if (!statSync(directory, { throwIfNoEntry: false })) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && /^wrangler-output-.*\.json$/.test(entry.name),
    )
    .map((entry) => entry.name);
}

export function captureDeploymentOutput(root) {
  const file = process.env.WRANGLER_OUTPUT_FILE_PATH;
  if (file) {
    const path = resolve(root, file);
    const offset = statSync(path, { throwIfNoEntry: false })?.size ?? 0;
    return { env: process.env, read: () => readSince(path, offset) };
  }

  const directory = process.env.WRANGLER_OUTPUT_FILE_DIRECTORY;
  if (directory) {
    const path = resolve(root, directory);
    const oldFiles = new Set(listOutputFiles(path));
    return {
      env: process.env,
      read: () =>
        listOutputFiles(path)
          .filter((name) => !oldFiles.has(name))
          .map((name) => readSince(join(path, name)))
          .join('\n'),
    };
  }

  const temporary = mkdtempSync(join(tmpdir(), 'linkrovia-deploy-'));
  const path = join(temporary, 'output.ndjson');
  return {
    env: { ...process.env, WRANGLER_OUTPUT_FILE_PATH: path },
    read: () => readSince(path),
    dispose: () => rmSync(temporary, { recursive: true, force: true }),
  };
}

function workersDevOrigin(output, workerName) {
  const labels = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  const worker = workerName.toLowerCase();
  if (!labels.test(worker)) return null;
  for (const line of output.trim().split('\n').reverse()) {
    if (!line.trim()) continue;
    let result;
    try {
      result = JSON.parse(line);
    } catch {
      continue;
    }
    if (
      result?.type !== 'deploy' ||
      typeof result.worker_name !== 'string' ||
      result.worker_name.toLowerCase() !== worker ||
      !result.version_id ||
      !Array.isArray(result.targets)
    )
      continue;

    for (const target of result.targets) {
      if (typeof target !== 'string') continue;
      const match =
        /^https:\/\/([^./]+)\.([^./]+)(?:\.fed)?\.workers\.dev\/?$/.exec(
          target,
        );
      if (match?.[1] === worker && labels.test(match[2]))
        return target.replace(/\/$/, '');
    }
    return null;
  }
  return null;
}

function fetchRoute(url) {
  return fetch(url, {
    headers: {
      'user-agent':
        'Linkrovia deployment check (+https://github.com/enjoydarts/linkrovia)',
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(5_000),
  });
}

function isAccessLogin(response) {
  if (response.status < 300 || response.status >= 400) return false;
  return /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com\//i.test(
    response.headers.get('location') ?? '',
  );
}

async function checkBootstrap(origin) {
  const health = await fetchRoute(`${origin}/health`);
  if (!health.ok) {
    await health.body?.cancel();
    if (isAccessLogin(health)) return 'access';
    throw new Error(`/health returned HTTP ${health.status}`);
  }
  if ((await health.json())?.status !== 'ok') {
    throw new Error('/health did not return Linkrovia readiness');
  }
  if (health.headers.get('x-linkrovia-setup') === 'complete')
    return 'installed';

  const setup = await fetchRoute(`${origin}/setup`);
  await setup.body?.cancel();
  if (isAccessLogin(setup)) return 'access';
  if (setup.status === 410) return 'installed';
  if (setup.status === 200) return 'ready';
  throw new Error(`/setup returned HTTP ${setup.status}`);
}

const routeHelp =
  'In Cloudflare, open Workers & Pages and check Your subdomain. Then open this Worker’s Settings → Domains & Routes and enable its workers.dev address.';

export async function reportBootstrapUrl(output, workerName) {
  const origin = workersDevOrigin(output, workerName);
  if (!origin) {
    console.error(
      `Worker upload finished, but Wrangler did not report a workers.dev URL. ${routeHelp}`,
    );
    return false;
  }

  console.log(`Checking the HTTPS setup route at ${origin}/setup…`);
  let lastError;
  for (const delay of [0, 2, 4, 8, 15, 15, 15, 15]) {
    if (delay) await setTimeout(delay * 1_000);
    let state;
    try {
      state = await checkBootstrap(origin);
    } catch (error) {
      lastError = error.cause?.code ?? error.message;
      continue;
    }
    if (state === 'access') {
      console.log(
        `Cloudflare Access requires sign-in for ${origin}/setup. Open the URL in your browser to continue.`,
      );
    } else if (state === 'installed') {
      console.log(
        `Linkrovia is already set up. Open the management hostname you selected during setup.`,
      );
    } else {
      console.log(`Open the Linkrovia setup page: ${origin}/setup`);
    }
    return true;
  }
  console.error(
    `The Worker was uploaded, but ${origin}/setup could not be verified (${lastError}). ${routeHelp} DNS and HTTPS may take a few minutes. Use the same Worker and try the address again before retrying the build.`,
  );
  return false;
}
