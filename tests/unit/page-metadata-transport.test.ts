import { EventEmitter } from 'node:events';
import type { ClientRequest, IncomingMessage } from 'node:http';
import type { RequestOptions } from 'node:https';
import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { fetchPageHead } from '../../services/page-metadata/fetch-page.mjs';

const url = 'https://example.com/page';

function fakePage(
  statusCode = 200,
  headers: IncomingMessage['headers'] = {
    'content-type': 'text/html; charset=utf-8',
  },
  body = '<head><title>Example</title></head>',
) {
  return vi.fn(
    (
      options: RequestOptions,
      callback: (response: IncomingMessage) => void,
    ) => {
      const response = Object.assign(new PassThrough(), {
        statusCode,
        headers,
      });
      const client = new EventEmitter();
      return Object.assign(client, {
        end() {
          options.lookup?.(
            String(options.hostname),
            { all: false },
            (error) => {
              if (error) {
                client.emit('error', error);
                return;
              }
              callback(response as unknown as IncomingMessage);
              response.end(Buffer.from(body));
            },
          );
        },
      }) as unknown as ClientRequest;
    },
  );
}

describe('metadata HTTPS transport', () => {
  it('pins the validated address while retaining the original TLS host', async () => {
    const lookup = vi.fn(async () => [{ address: '8.8.8.8', family: 4 }]);
    const request = fakePage();

    await expect(fetchPageHead(url, { lookup, request })).resolves.toContain(
      'Example',
    );
    expect(lookup).toHaveBeenCalledTimes(1);
    const options = request.mock.calls[0][0];
    expect(options).toMatchObject({
      hostname: 'example.com',
      port: 443,
      servername: 'example.com',
      rejectUnauthorized: true,
      agent: false,
    });
    expect(options.headers).toEqual({
      accept: 'text/html',
      'accept-encoding': 'identity',
      'user-agent': 'Linkrovia',
    });
    const callback = vi.fn();
    options.lookup?.('example.com', { all: false }, callback);
    expect(callback).toHaveBeenCalledWith(null, '8.8.8.8', 4);
  });

  it.each([
    'http://example.com/page',
    'https://user:pass@example.com/page',
    'https://example.com:444/page',
    'https://127.1/page',
    'https://[2606:4700::1111]/page',
    'https://service.local/page',
    'https://service.home.arpa/page',
    'https://intranet/page',
  ])('rejects %s before DNS lookup', async (input) => {
    const lookup = vi.fn();
    const request = fakePage();
    await expect(fetchPageHead(input, { lookup, request })).resolves.toBeNull();
    expect(lookup).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it.each([
    { address: '100.64.0.1', family: 4 },
    { address: '169.254.169.254', family: 4 },
    { address: '192.168.0.1', family: 4 },
    { address: '198.18.0.1', family: 4 },
    { address: '::ffff:8.8.8.8', family: 6 },
    { address: 'fe80::1', family: 6 },
    { address: '2002::1', family: 6 },
    { address: '3fff::1', family: 6 },
  ])(
    'rejects mixed DNS results with $address before opening a socket',
    async (record) => {
      const lookup = async () => [{ address: '8.8.8.8', family: 4 }, record];
      const request = fakePage();
      await expect(fetchPageHead(url, { lookup, request })).resolves.toBeNull();
      expect(request).not.toHaveBeenCalled();
    },
  );

  it('resolves and pins a public redirect independently', async () => {
    const first = fakePage(302, { location: 'https://example.org/' });
    const second = fakePage();
    const lookup = vi
      .fn()
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '2606:4700::1111', family: 6 }]);
    const request: typeof first = vi.fn((options, callback) =>
      options.hostname === 'example.com'
        ? first(options, callback)
        : second(options, callback),
    );
    await expect(fetchPageHead(url, { lookup, request })).resolves.toContain(
      'Example',
    );
    expect(lookup.mock.calls.map(([host]) => host)).toEqual([
      'example.com.',
      'example.org.',
    ]);
    const callback = vi.fn();
    second.mock.calls[0][0].lookup?.('example.org', { all: false }, callback);
    expect(callback).toHaveBeenCalledWith(null, '2606:4700::1111', 6);
  });

  it('allows at most three redirects', async () => {
    const lookup = async () => [{ address: '8.8.8.8', family: 4 }];
    const request = fakePage(302, { location: '/next' });
    await expect(fetchPageHead(url, { lookup, request })).resolves.toBeNull();
    expect(request).toHaveBeenCalledTimes(4);
  });

  it('revalidates DNS on a redirect to the same hostname', async () => {
    const lookup = vi
      .fn()
      .mockResolvedValueOnce([{ address: '8.8.8.8', family: 4 }])
      .mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }]);
    const request = fakePage(302, { location: '/next' });
    await expect(fetchPageHead(url, { lookup, request })).resolves.toBeNull();
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('reads at most 64 KiB of HTML', async () => {
    const lookup = async () => [{ address: '8.8.8.8', family: 4 }];
    const request = fakePage(
      200,
      { 'content-type': 'text/html' },
      'a'.repeat(70_000),
    );
    await expect(fetchPageHead(url, { lookup, request })).resolves.toBe(
      'a'.repeat(65_536),
    );
  });

  it.each([
    { 'content-type': 'image/png' },
    { 'content-type': 'text/html', 'content-encoding': 'gzip' },
  ])('rejects unsupported response headers %j', async (headers) => {
    const lookup = async () => [{ address: '8.8.8.8', family: 4 }];
    const request = fakePage(200, headers);
    await expect(fetchPageHead(url, { lookup, request })).resolves.toBeNull();
  });

  it('applies the total deadline while DNS is pending', async () => {
    vi.useFakeTimers();
    try {
      const dns =
        Promise.withResolvers<{ address: string; family: number }[]>();
      const lookup = () => dns.promise;
      const request = fakePage();
      const result = fetchPageHead(url, { lookup, request });
      await vi.advanceTimersByTimeAsync(5000);
      await expect(result).resolves.toBeNull();
      dns.resolve([{ address: '8.8.8.8', family: 4 }]);
      await vi.advanceTimersByTimeAsync(0);
      expect(request).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
