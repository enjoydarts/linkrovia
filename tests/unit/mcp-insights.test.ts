import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import type { RequestEvent } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import type { ApiKeyScope } from '../../src/lib/server/auth/api-keys';
import { registerMcpTools } from '../../src/lib/server/mcp/tools';

// These unrelated REST handlers depend on SvelteKit's runtime aliases.
vi.mock('../../src/routes/api/v1/links/+server', () => ({
  GET: vi.fn(),
  POST: vi.fn(),
}));
vi.mock('../../src/routes/api/v1/links/[id]/+server', () => ({
  GET: vi.fn(),
  PATCH: vi.fn(),
}));
vi.mock('../../src/routes/api/v1/links/[id]/analytics/+server', () => ({
  GET: vi.fn(),
}));
vi.mock('../../src/routes/api/v1/links/[id]/simulate/+server', () => ({
  POST: vi.fn(),
}));
vi.mock('../../src/routes/api/v1/utm/templates/+server', () => ({
  POST: vi.fn(),
}));

const url = new URL('https://example.test/mcp');

async function rpc(scopes: ApiKeyScope[], method: string, params?: object) {
  const db = {
    prepare() {
      return {
        bind() {
          return { run: async () => ({ success: true }) };
        },
      };
    },
  } as unknown as D1Database;
  const request = new Request(url, {
    method: 'POST',
    headers: {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
      'MCP-Protocol-Version': '2025-11-25',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const handler = createMcpHandler(() => {
    const server = new McpServer({ name: 'Linkrovia', version: '1.0.0' });
    registerMcpTools(
      server,
      { url, request, locals: { env: { DB: db } } } as RequestEvent,
      db,
      { id: 'key', userId: 'owner', role: 'owner', scopes },
    );
    return server;
  });
  const response = await handler.fetch(request);
  expect(response.status).toBe(200);
  if (response.headers.get('content-type')?.includes('application/json'))
    return response.json();
  const body = await response.text();
  const data = body.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(data!.slice(6));
}

describe('MCP insights', () => {
  it('advertises the two read-only tools only to analytics readers', async () => {
    const authorized = await rpc(
      ['mcp:connect', 'analytics:read'],
      'tools/list',
    );
    expect(authorized.result.tools).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'get_analytics_summary',
          annotations: expect.objectContaining({ readOnlyHint: true }),
        }),
        expect.objectContaining({
          name: 'list_anomalies',
          annotations: expect.objectContaining({ readOnlyHint: true }),
        }),
      ]),
    );
    const unauthorized = await rpc(['mcp:connect', 'links:read'], 'tools/list');
    expect(
      unauthorized.result.tools.map(({ name }: { name: string }) => name),
    ).not.toContain('get_analytics_summary');
    expect(
      unauthorized.result.tools.map(({ name }: { name: string }) => name),
    ).not.toContain('list_anomalies');
  });

  it('returns an unavailable aggregate without analytics configured', async () => {
    const response = await rpc(
      ['mcp:connect', 'analytics:read'],
      'tools/call',
      {
        name: 'list_anomalies',
        arguments: {},
      },
    );
    expect(response.result.structuredContent).toMatchObject({
      status: 'unavailable',
      anomalies: [],
      warnings: ['analytics_unavailable'],
    });
  });
});
