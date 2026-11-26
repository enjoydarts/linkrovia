import { copyFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { unstable_dev } from 'wrangler';

let directory: string;
let worker: Awaited<ReturnType<typeof unstable_dev>>;

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'linkrovia-metadata-parser-'));
  const entry = join(directory, 'worker.ts');
  const config = join(directory, 'wrangler.json');
  await copyFile(
    new URL('../../services/page-metadata/open-graph.ts', import.meta.url),
    join(directory, 'open-graph.ts'),
  );
  await writeFile(
    entry,
    `
    import { extractOpenGraph } from './open-graph';
    export default { async fetch(request) {
      const result = await extractOpenGraph(new Response(request.body));
      return result ? Response.json(result) : new Response(null, { status: 204 });
    }};
  `,
  );
  await writeFile(
    config,
    JSON.stringify({
      name: 'linkrovia-metadata-parser-test',
      main: 'worker.ts',
      compatibility_date: '2026-11-26',
    }),
  );
  worker = await unstable_dev(entry, {
    config,
    local: true,
    persist: false,
    logLevel: 'error',
    experimental: { forceLocal: true, watch: false, disableDevRegistry: true },
  });
}, 20_000);

afterAll(async () => {
  await worker?.stop();
  if (directory) await rm(directory, { recursive: true, force: true });
});

it('uses Open Graph values ahead of document title and description', async () => {
  const response = await worker.fetch('/', {
    method: 'POST',
    body: `
    <head><title>Browser title</title><meta name="description" content="Ordinary description">
    <meta property="og:title" content="Public article"><meta property="og:description" content="  Open Graph summary "></head>
  `,
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    title: 'Public article',
    description: 'Open Graph summary',
  });
});

it('falls back to ordinary metadata and bounds malformed or oversized HTML', async () => {
  const response = await worker.fetch('/', {
    method: 'POST',
    body: '<title>Browser title</title><meta name="description" content="Ordinary description">',
  });
  expect(await response.json()).toEqual({
    title: 'Browser title',
    description: 'Ordinary description',
  });
  expect(
    (await worker.fetch('/', { method: 'POST', body: 'x'.repeat(65_537) }))
      .status,
  ).toBe(204);
});
