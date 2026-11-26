import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { fetchPageHead } from './fetch-page.mjs';

const maxRequestBytes = 8192;
const maxConcurrent = 4;

/** @param {(url: string) => Promise<string | null>} [getHead] */
export function createMetadataServer(getHead = fetchPageHead) {
  let active = 0;
  return createServer(
    { requestTimeout: 8000, headersTimeout: 5000 },
    async (request, response) => {
      response.setHeader('cache-control', 'no-store');
      if (request.method === 'GET' && request.url === '/health') {
        response.writeHead(200).end();
        return;
      }
      if (request.method !== 'POST' || request.url !== '/head') {
        response.writeHead(404).end();
        return;
      }
      if (
        request.headers['content-type']?.split(';')[0] !== 'application/json'
      ) {
        response.writeHead(415).end();
        return;
      }
      if (active >= maxConcurrent) {
        response.writeHead(503).end();
        return;
      }
      active++;
      try {
        /** @type {Buffer[]} */
        const chunks = [];
        let size = 0;
        for await (const chunk of request) {
          size += chunk.length;
          if (size > maxRequestBytes) {
            response.writeHead(413).end();
            return;
          }
          chunks.push(chunk);
        }
        /** @type {unknown} */
        const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (
          !input ||
          typeof input !== 'object' ||
          !('url' in input) ||
          typeof input.url !== 'string'
        ) {
          response.writeHead(400).end();
          return;
        }
        const head = await getHead(input.url);
        if (head === null) {
          response.writeHead(204).end();
          return;
        }
        response
          .writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
          .end(head);
      } catch {
        response.writeHead(400).end();
      } finally {
        active--;
      }
    },
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  createMetadataServer().listen(
    8080,
    process.env.METADATA_LISTEN_HOST ?? '127.0.0.1',
  );
}
