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
    prepare(sql: string) {
      if (!sql.startsWith('INSERT INTO audit_events')) {
        throw new Error('Unexpected query during draft evaluation.');
      }
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

const scopes: ApiKeyScope[] = ['mcp:connect', 'links:read'];
const rule = {
  conditions: [{ type: 'country', operator: 'eq', value: 'jp' }],
  priority: 0,
  destinationUrl: 'https://example.org/jp',
};

function call(name: string, args: object) {
  return rpc(scopes, 'tools/call', { name, arguments: args });
}

describe('MCP draft routing', () => {
  it('exposes draft tools as read-only to links readers', async () => {
    const authorized = await rpc(scopes, 'tools/list');
    const unauthorized = await rpc(
      ['mcp:connect', 'links:write'],
      'tools/list',
    );
    for (const name of ['validate_routing_rule', 'simulate_routing_rule']) {
      expect(authorized.result.tools).toContainEqual(
        expect.objectContaining({
          name,
          annotations: expect.objectContaining({ readOnlyHint: true }),
        }),
      );
      expect(unauthorized.result.tools).not.toContainEqual(
        expect.objectContaining({ name }),
      );
    }
  });

  it('validates and normalizes a draft rule', async () => {
    const response = await call('validate_routing_rule', { rule });
    expect(response.result.structuredContent).toEqual({
      valid: true,
      rule: {
        ...rule,
        conditions: [{ type: 'country', operator: 'eq', value: 'JP' }],
        isActive: true,
      },
    });
  });

  it('reports a rule rejected by the redirect policy', async () => {
    const response = await call('validate_routing_rule', {
      rule: { ...rule, destinationUrl: 'http://127.0.0.1/' },
    });
    expect(response.result.structuredContent).toMatchObject({
      valid: false,
      fieldErrors: { rule: expect.any(Array) },
    });
  });

  it('rejects a draft rule with more than five conditions', async () => {
    const response = await call('validate_routing_rule', {
      rule: { ...rule, conditions: Array(6).fill(rule.conditions[0]) },
    });
    expect(response.result).toMatchObject({ isError: true });
  });

  it.each([
    ['JP', 'draft', 'https://example.org/jp'],
    ['US', null, 'https://example.org/default'],
  ])('simulates routing for %s', async (country, matchedRuleId, expected) => {
    const response = await call('simulate_routing_rule', {
      rule,
      destinationUrl: 'https://example.org/default',
      visitor: { country },
    });
    expect(response.result.structuredContent).toMatchObject({
      matchedRuleId,
      destinationUrl: expected,
      fallbackUsed: matchedRuleId === null,
      blockedReason: null,
    });
  });

  it('rejects a private fallback even when the rule would match', async () => {
    const response = await call('simulate_routing_rule', {
      rule,
      destinationUrl: 'http://127.0.0.1/',
      visitor: { country: 'JP' },
    });
    expect(response.result).toMatchObject({
      isError: true,
      structuredContent: { fieldErrors: { destinationUrl: expect.any(Array) } },
    });
  });

  it('reports an invalid visitor region under its draft input path', async () => {
    const response = await call('simulate_routing_rule', {
      rule,
      destinationUrl: 'https://example.org/default',
      visitor: { country: 'US', region: 'JP-13' },
    });
    expect(response.result).toMatchObject({
      isError: true,
      structuredContent: {
        fieldErrors: { 'visitor.region': expect.any(Array) },
      },
    });
  });
});
