import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtureSetupToken } from '../fixtures/setup.mjs';

test('sets up an owner, manages a short link, scopes API access, and signs out', async ({
  page,
  context,
  request,
  browser,
}) => {
  test.setTimeout(90_000);
  const email = 'owner@example.com';
  const password = 'a long development passphrase';
  const csvExpiry = '2099-12-31T00:15:00Z';

  const crossOrigin = await request.post('/setup?/verify', {
    headers: { origin: 'https://other.example.com' },
    form: { setupToken: fixtureSetupToken },
  });
  expect(crossOrigin.status()).toBe(403);

  await page.goto('/setup');
  await page
    .locator('[name=setupToken]')
    .fill('wrong-test-setup-token-that-is-long-enough');
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('[name=setupToken]')).toBeVisible();

  await page.locator('[name=setupToken]').fill(fixtureSetupToken);
  await page.locator('form button[type=submit]').click();
  await expect(page.locator('[name=email]')).toBeVisible();
  await page.locator('[name=email]').fill(email);
  await page.locator('[name=password]').fill(password);
  await page.locator('[name=confirmPassword]').fill(password);
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL('/login');

  const wrongHost = await request.get('/login', {
    headers: { Host: 'localhost:4173' },
    maxRedirects: 0,
  });
  expect(wrongHost.status()).toBe(404);

  const repeatedSetup = await request.get('/setup');
  expect(repeatedSetup.status()).toBe(410);

  await page.locator('[name=email]').fill(email);
  await page.locator('[name=password]').fill('a different test passphrase');
  await page.locator('form button[type=submit]').click();
  await expect(page.getByRole('alert')).toHaveText(/email|password/i);
  await page.locator('[name=email]').fill(email);
  await page.locator('[name=password]').fill(password);
  await page.locator('form button[type=submit]').click();
  await expect(page).toHaveURL('/admin');

  const cookie = (await context.cookies()).find(
    ({ name }) => name === '__Host-linkrovia_session',
  );
  expect(cookie).toMatchObject({
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
  });

  await test.step('create a short link on the deployment hostname', async () => {
    await page.goto('/admin/links/new', { waitUntil: 'networkidle' });
    await page.locator('[name=slug]').fill('ci-link');
    await page
      .locator('[name=destinationUrl]')
      .fill('https://example.org/path?fixed=1#target');
    await page.locator('[name=title]').fill('A fixture link');
    await page.locator('[name=tags]').fill('fixture');
    const linkForm = page
      .locator('form')
      .filter({ has: page.locator('[name=slug]') });
    await linkForm.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/admin\/links\/[a-f0-9-]{36}$/);
    const shortUrl = new URL('/ci-link', page.url()).href;
    await expect(page.locator(`a[href="${shortUrl}"]`)).toBeVisible();

    const visit = await request.get('/ci-link?private=ignore', {
      maxRedirects: 0,
    });
    expect(visit.status()).toBe(302);
    expect(visit.headers()['location']).toBe(
      'https://example.org/path?fixed=1#target',
    );
    expect(visit.headers()['cache-control']).toBe('no-store');
    const head = await request.head('/ci-link', { maxRedirects: 0 });
    expect(head.status()).toBe(302);
    expect(await head.body()).toHaveLength(0);
    const wrongMethod = await request.post('/ci-link', {
      headers: {
        Origin: new URL(page.url()).origin,
        'content-type': 'application/json',
      },
      data: {},
      maxRedirects: 0,
    });
    expect(wrongMethod.status()).toBe(405);

    await page.goto('/admin');
    await expect(page.locator('canvas')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Popular links' }),
    ).toBeVisible();
    const recentLink = page
      .getByRole('region', { name: 'Recent links' })
      .getByRole('listitem')
      .filter({ hasText: 'A fixture link' });
    await expect(recentLink.getByText('Active', { exact: true })).toBeVisible();
    await recentLink.getByRole('link', { name: /A fixture link/ }).click();
    await expect(page).toHaveURL(/\/admin\/links\/[a-f0-9-]{36}$/);
    await page.waitForLoadState('networkidle');

    await test.step('view analytics and create a conversion goal', async () => {
      const linkPage = page.url();
      const linkId = new URL(linkPage).pathname.split('/').at(-1)!;
      await page.goto('/admin/analytics');
      await expect(
        page.getByRole('heading', { name: 'Analytics', exact: true }),
      ).toBeVisible();
      await expect(page.getByText('Sample data')).toBeVisible();
      await expect(
        page
          .getByRole('combobox', { name: 'Domain', exact: true })
          .locator('option')
          .last(),
      ).toHaveText(new URL(linkPage).hostname);
      await expect(
        page.getByRole('heading', { name: 'Daily clicks' }),
      ).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(2);
      await expect(page.locator('table').first()).toBeVisible();
      const clicks = await page.locator('.count').innerText();
      expect(Number(clicks.replaceAll(',', ''))).toBeGreaterThan(0);

      await page.getByRole('link', { name: 'Last 24 hours' }).click();
      await expect(
        page.getByRole('heading', { name: 'Hourly clicks' }),
      ).toBeVisible();
      const hourExport = await page
        .getByRole('link', { name: 'Export CSV' })
        .getAttribute('href');
      expect(hourExport).toContain('range=24h');
      const hourlyCsv = await context.request.get(hourExport!);
      expect(hourlyCsv.status()).toBe(200);
      expect(await hourlyCsv.text()).toMatch(
        /"hourly","\d{4}-\d{2}-\d{2}T\d{2}:00:00Z"/,
      );

      await page.getByRole('link', { name: 'Last 7 days' }).click();
      await page.getByLabel('Group by').selectOption('week');
      await page.getByRole('button', { name: 'Apply', exact: true }).click();
      await expect(
        page.getByRole('heading', { name: 'Weekly clicks' }),
      ).toBeVisible();

      await page.goto(`${linkPage}/analytics`);
      await expect(
        page.getByRole('heading', { name: 'Link analytics' }),
      ).toBeVisible();
      await expect(page.getByText('No clicks for this period.')).toBeVisible();
      await expect(page.locator('canvas')).toHaveCount(0);
      const exportHref = await page
        .getByRole('link', { name: 'Export CSV' })
        .getAttribute('href');
      expect(exportHref).toContain(`/admin/links/${linkId}/analytics/export?`);
      const csv = await context.request.get(exportHref!);
      expect(csv.status()).toBe(200);
      expect(csv.headers()['content-type']).toContain('text/csv');
      const rows = (await csv.text()).trim().split('\r\n');
      expect(rows[0]).toContain('date_basis');
      expect(rows.slice(1).every((row) => row.split(',')[4] === '"0"')).toBe(
        true,
      );

      const archived = '/admin/analytics?from=2025-01-01&to=2025-01-01';
      await page.goto(`${archived}&dimension=country&source=qr`);
      await expect(page.getByRole('alert')).toContainText(
        'This date range supports one breakdown filter at a time.',
      );
      await page.getByRole('link', { name: 'Clear breakdown filters' }).click();
      await expect(
        page.getByText('Saved daily totals · UTC dates'),
      ).toBeVisible();
      await expect(page.getByRole('cell', { name: 'No data' })).toBeVisible();
      await expect(page.getByText('Sample data')).toHaveCount(0);

      await page.goto(
        `/admin/conversions?linkId=${encodeURIComponent(linkId)}`,
      );
      await expect(
        page.getByRole('heading', { name: 'Conversions' }),
      ).toBeVisible();
      const goal = page.locator('form[action="?/create"]');
      await goal.locator('[name=name]').fill('Purchase');
      await goal.locator('[name=eventName]').fill('purchase');
      await goal.locator('[name=linkId]').selectOption(linkId);
      await goal.getByRole('button', { name: 'Create goal' }).click();
      await expect(page.getByRole('status')).toContainText('Changes saved.');
      await expect(
        page.getByRole('heading', { name: 'Purchase' }),
      ).toBeVisible();
      await page.goto(linkPage, { waitUntil: 'networkidle' });
    });

    await page.locator('[name=active]').uncheck();
    const editUrl = page.url();
    const [saved] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().endsWith('?/save') &&
          response.status() === 303,
      ),
      page.waitForResponse(
        (response) =>
          response.url() === editUrl &&
          response.request().isNavigationRequest() &&
          response.request().method() === 'GET' &&
          response.ok(),
      ),
      linkForm.locator('button[type=submit]').click(),
    ]);
    expect(
      new URLSearchParams(saved.request().postData() ?? '').has('active'),
    ).toBe(false);
    await page.waitForLoadState('networkidle');
    expect((await request.get('/ci-link', { maxRedirects: 0 })).status()).toBe(
      404,
    );
    await expect(page.locator('[name=active]')).not.toBeChecked();
    await page.goto('/admin');
    await expect(
      recentLink.getByText('Inactive', { exact: true }),
    ).toBeVisible();
  });

  await test.step('preview and import CSV rows with partial success', async () => {
    const batchHeaders = {
      origin: new URL(page.url()).origin,
      'content-type': 'text/csv',
      'x-import-mode': 'preview',
    };
    expect(
      (
        await request.post('/admin/import/batch', {
          headers: batchHeaders,
          data: 'destination_url\nhttps://example.org',
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await context.request.post('/admin/import/batch', {
          headers: batchHeaders,
          data: 'destination_url\nhttps://example.org',
        })
      ).status(),
    ).toBe(403);
    await page.getByRole('link', { name: 'CSV import' }).click();
    await page.getByLabel('CSV file').setInputFiles({
      name: 'links.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        `destination_url,slug,expires_at\r\nhttps://example.org/import,csv-e2e,${csvExpiry}\r\nhttp://localhost,bad-destination,\r\nhttps://example.org/duplicate,csv-e2e,`,
      ),
    });
    await page.getByLabel('Duplicate slugs').selectOption('skip');
    await page.getByRole('button', { name: 'Preview links' }).click();
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
    await expect(page.getByText('Skipped', { exact: true })).toBeVisible();
    await expect(page.getByText('Check the listed columns.')).toBeVisible();
    expect((await request.get('/csv-e2e', { maxRedirects: 0 })).status()).toBe(
      404,
    );

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download error CSV' }).click(),
    ]);
    expect(download.suggestedFilename()).toBe('import-errors.csv');
    await page.getByRole('button', { name: 'Import ready rows' }).click();
    await expect(page.getByText('Imported', { exact: true })).toBeVisible();
    const visit = await request.get('/csv-e2e', { maxRedirects: 0 });
    expect(visit.status()).toBe(302);
    expect(visit.headers()['location']).toBe('https://example.org/import');
  });

  await test.step('create a QR code and redeem a password-protected one-time link', async () => {
    const destination = 'https://example.org/private-target';
    const password = 'a shared fixture password';
    await page.goto('/admin/links/new', { waitUntil: 'networkidle' });
    await page.locator('[name=slug]').fill('shared-once');
    await page.locator('[name=destinationUrl]').fill(destination);
    await page
      .locator('form')
      .filter({ has: page.locator('[name=slug]') })
      .locator('button[type=submit]')
      .click();
    await expect(page).toHaveURL(/\/admin\/links\/[a-f0-9-]{36}$/);
    const editUrl = page.url();
    await page.getByRole('link', { name: 'Link protection' }).click();
    const mode = page.locator('[name=mode]');
    await mode.selectOption('password_one_time');
    await page.locator('[name=password]').fill(password);
    await expect(mode).toHaveValue('password_one_time');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(
      page.getByText('The protection settings were saved.'),
    ).toBeVisible();

    await page.goto(editUrl);
    await page.getByRole('link', { name: 'QR code' }).click();
    await page.getByRole('button', { name: 'Create QR code' }).click();
    const qrUrl = await page.getByText(/\/q\/[a-f0-9]{64}$/).textContent();
    if (!qrUrl) throw new Error('Missing QR URL');
    const qr = qrUrl.trim();
    const svgPath = await page
      .getByRole('link', { name: 'Download SVG' })
      .getAttribute('href');
    const pngPath = await page
      .getByRole('link', { name: 'Download PNG' })
      .getAttribute('href');
    if (!svgPath || !pngPath) throw new Error('Missing image download');
    const svg = await context.request.get(svgPath);
    expect(svg.headers()['content-type']).toContain('image/svg+xml');
    expect(await svg.text()).toMatch(/^<svg\b/);
    const png = await context.request.get(pngPath);
    expect(png.headers()['content-type']).toContain('image/png');
    expect((await png.body()).subarray(0, 8).toString('hex')).toBe(
      '89504e470d0a1a0a',
    );

    const locked = await request.get(qr, { maxRedirects: 0 });
    expect(locked.status()).toBe(302);
    const gateUrl = locked.headers()['location'];
    expect(gateUrl).toMatch(/\/gate\/q-[a-f0-9]{64}$/);
    expect(locked.headers()['cache-control']).toBe('no-store');
    const visitor = await browser.newContext({ javaScriptEnabled: false });
    try {
      const gatePage = await visitor.newPage();
      await gatePage.goto(gateUrl);
      await expect(
        gatePage.getByRole('heading', { name: 'Open protected link' }),
      ).toBeVisible();
      const csrf = await gatePage.locator('[name=csrfToken]').inputValue();
      const headers = { origin: new URL(gateUrl).origin, accept: 'text/html' };
      const wrongOrigin = await visitor.request.post(gateUrl, {
        headers: { origin: 'https://other.example.com' },
        form: { csrfToken: csrf, password },
        maxRedirects: 0,
      });
      expect(wrongOrigin.status()).toBe(403);
      const wrongPassword = await visitor.request.post(gateUrl, {
        headers,
        form: { csrfToken: csrf, password: 'the wrong fixture password' },
        maxRedirects: 0,
      });
      expect(wrongPassword.status()).toBe(403);
      const accepted = await visitor.request.post(gateUrl, {
        headers,
        form: { csrfToken: csrf, password },
        maxRedirects: 0,
      });
      expect(accepted.status()).toBe(303);
      expect(accepted.headers()['location']).toBe(
        new URL(gateUrl).pathname + '?continue=1',
      );
      const unlock = (await visitor.cookies()).find(
        (cookie) => cookie.name === '__Host-linkrovia_unlock',
      );
      expect(unlock).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'Lax',
      });
      expect(
        (await visitor.request.head(qr, { maxRedirects: 0 })).headers()[
          'location'
        ],
      ).toBe(gateUrl);
      await gatePage.route(destination, (route) =>
        route.fulfill({ body: 'Fixture destination' }),
      );
      await gatePage.locator('[name=password]').fill(password);
      const browserPost = gatePage.waitForRequest(
        (outgoing) =>
          outgoing.method() === 'POST' && outgoing.url() === gateUrl,
      );
      await gatePage
        .getByRole('button', { name: 'Continue', exact: true })
        .click();
      expect(await (await browserPost).headerValue('origin')).toBe(
        new URL(gateUrl).origin,
      );
      await expect(gatePage).toHaveURL(destination);
    } finally {
      await visitor.close();
    }
    expect(
      (await request.get('/shared-once', { maxRedirects: 0 })).status(),
    ).toBe(410);
    expect((await request.get(qr, { maxRedirects: 0 })).status()).toBe(410);
  });

  await test.step('issue and revoke a read-only API key', async () => {
    expect((await request.get('/api/v1/links')).status()).toBe(401);
    await page.goto('/admin/api-keys', { waitUntil: 'networkidle' });
    await page.locator('[name=name]').fill('End-to-end read key');
    await page.locator('[name=scope][value="links:read"]').check();
    await page.locator('form[action="?/create"] button[type=submit]').click();

    const displayedKey = page.locator(
      'input[readonly][aria-labelledby="new-api-key"]',
    );
    await expect(displayedKey).toBeVisible();
    const token = await displayedKey.inputValue();
    const headers = { Authorization: `Bearer ${token}` };
    expect((await request.get('/api/v1/links', { headers })).status()).toBe(
      200,
    );
    expect(
      (await request.post('/api/v1/links', { headers, data: {} })).status(),
    ).toBe(403);
    await page.reload();
    await expect(displayedKey).toHaveCount(0);

    await page.locator('form[action="?/revoke"] button[type=submit]').click();
    await expect(page.locator('form[action="?/revoke"]')).toHaveCount(0);
    expect((await request.get('/api/v1/links', { headers })).status()).toBe(
      401,
    );
  });

  await test.step('serves MCP on the primary host with independent tool scopes', async () => {
    const headers = { Accept: 'application/json, text/event-stream' };
    const initialize = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'Linkrovia E2E', version: '1.0.0' },
      },
    };
    expect(
      (await request.post('/mcp', { headers, data: initialize })).status(),
    ).toBe(404);
    await page.goto('/admin/integrations/mcp');
    await page.getByRole('button', { name: 'Enable MCP' }).click();
    await expect(
      page.getByRole('button', { name: 'Disable MCP' }),
    ).toBeVisible();
    expect(
      (
        await context.request.post('/mcp', { headers, data: initialize })
      ).status(),
    ).toBe(401);
    await page.goto('/admin/api-keys');
    await page.locator('[name=name]').fill('MCP read key');
    await page.locator('[name=scope][value="mcp:connect"]').check();
    await page.locator('[name=scope][value="links:read"]').check();
    await page.locator('form[action="?/create"] button[type=submit]').click();
    const token = await page
      .locator('input[readonly][aria-labelledby="new-api-key"]')
      .inputValue();
    const authorizedHeaders = { ...headers, Authorization: `Bearer ${token}` };
    const rpc = (method: string, params?: unknown) =>
      request.post('/mcp', {
        headers: { ...authorizedHeaders, 'MCP-Protocol-Version': '2025-11-25' },
        data: { jsonrpc: '2.0', id: 2, method, params },
      });
    const readMessage = async (response: Awaited<ReturnType<typeof rpc>>) => {
      const body = await response.text();
      expect(response.status(), body).toBe(200);
      if (response.headers()['content-type'].includes('application/json'))
        return JSON.parse(body);
      const lines = body.split('\n');
      return JSON.parse(
        lines.find((line) => line.startsWith('data: '))!.slice(6),
      );
    };
    expect(
      (
        await request.post('/mcp', {
          headers: {
            ...authorizedHeaders,
            Origin: 'https://elsewhere.example',
          },
          data: initialize,
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await request.post('/mcp', {
          headers: { ...authorizedHeaders, Host: 'localhost:4173' },
          data: initialize,
        })
      ).status(),
    ).toBe(404);
    const initialized = await request.post('/mcp', {
      headers: authorizedHeaders,
      data: initialize,
    });
    expect(initialized.headers()['mcp-session-id']).toBeUndefined();
    expect(await readMessage(initialized)).toMatchObject({
      result: { protocolVersion: '2025-11-25' },
    });
    const tools = (await readMessage(await rpc('tools/list'))).result.tools;
    expect(tools.map(({ name }: { name: string }) => name)).toContain(
      'list_links',
    );
    expect(tools.map(({ name }: { name: string }) => name)).not.toContain(
      'create_link',
    );
    const list = await readMessage(
      await rpc('tools/call', { name: 'list_links', arguments: { limit: 1 } }),
    );
    expect(list.result.structuredContent.data).toHaveLength(1);
    expect(JSON.stringify(list)).not.toMatch(/passwordHash|proofToken|keyHash/);
    const discovery = await request.post('/mcp', {
      headers: {
        ...authorizedHeaders,
        'MCP-Protocol-Version': '2026-07-28',
        'Mcp-Method': 'server/discover',
      },
      data: {
        jsonrpc: '2.0',
        id: 3,
        method: 'server/discover',
        params: {
          _meta: {
            'io.modelcontextprotocol/protocolVersion': '2026-07-28',
            'io.modelcontextprotocol/clientCapabilities': {},
          },
        },
      },
    });
    expect((await readMessage(discovery)).result.supportedVersions).toContain(
      '2026-07-28',
    );
    const write = await readMessage(
      await rpc('tools/call', { name: 'create_link', arguments: {} }),
    );
    expect(write.error).toMatchObject({ code: -32602 });
    expect(
      (
        await request.post('/mcp', {
          headers: { ...authorizedHeaders, 'content-type': 'application/json' },
          data: '{',
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await request.post('/mcp', {
          headers: authorizedHeaders,
          data: { padding: 'x'.repeat(263_000) },
        })
      ).status(),
    ).toBe(413);
    await page.locator('form[action="?/revoke"] button[type=submit]').click();
    await expect(page.locator('form[action="?/revoke"]')).toHaveCount(0);
    expect((await rpc('tools/list')).status()).toBe(401);

    await page.locator('[name=name]').fill('MCP write key');
    await page.locator('[name=scope][value="mcp:connect"]').check();
    await page.locator('[name=scope][value="links:write"]').check();
    await page.locator('form[action="?/create"] button[type=submit]').click();
    authorizedHeaders.Authorization =
      'Bearer ' +
      (await page
        .locator('input[readonly][aria-labelledby="new-api-key"]')
        .inputValue());
    const created = await readMessage(
      await rpc('tools/call', {
        name: 'create_link',
        arguments: {
          domainId: list.result.structuredContent.data[0].domainId,
          slug: 'mcp-fixture',
          destinationUrl: 'https://example.org/mcp',
        },
      }),
    );
    const { id, updatedAt } = created.result.structuredContent;
    expect(
      (await request.get('/mcp-fixture', { maxRedirects: 0 })).status(),
    ).toBe(302);
    const disabled = await readMessage(
      await rpc('tools/call', {
        name: 'disable_link',
        arguments: { id, updatedAt },
      }),
    );
    expect(disabled.result.structuredContent).toMatchObject({
      id,
      isActive: false,
    });
    expect(
      (await request.get('/mcp-fixture', { maxRedirects: 0 })).status(),
    ).toBe(404);
    await page.locator('form[action="?/revoke"] button[type=submit]').click();
    await expect(page.locator('form[action="?/revoke"]')).toHaveCount(0);
    await page.goto('/admin/integrations/mcp');
    await page.getByRole('button', { name: 'Disable MCP' }).click();
    await expect(
      page.getByRole('button', { name: 'Enable MCP' }),
    ).toBeVisible();
    expect((await rpc('tools/list')).status()).toBe(404);
  });

  await test.step('receives a conversion only with the scoped API key', async () => {
    const endpoint = '/api/v1/conversions/events';
    expect((await request.post(endpoint, { data: {} })).status()).toBe(401);
    await page.goto('/admin/api-keys', { waitUntil: 'networkidle' });
    await page.locator('[name=name]').fill('Conversion sender');
    await page.locator('[name=scope][value="conversions:write"]').check();
    await page.locator('[name=scope][value="analytics:read"]').check();
    await page.locator('form[action="?/create"] button[type=submit]').click();
    const displayed = page.locator(
      'input[readonly][aria-labelledby="new-api-key"]',
    );
    await expect(displayed).toBeVisible();
    const headers = { Authorization: `Bearer ${await displayed.inputValue()}` };
    const response = await request.get('/api/v1/conversion-goals', { headers });
    expect(response.ok()).toBe(true);
    const {
      data: [goal],
    } = await response.json();
    const event = {
      goalId: goal.id,
      occurredAt: Math.floor(Date.now() / 1000),
    };
    const accepted = await request.post(endpoint, {
      headers: { ...headers, 'Idempotency-Key': 'fixture-purchase-1' },
      data: event,
    });
    expect(accepted.status()).toBe(201);
    const { receipt } = await accepted.json();
    expect(receipt.status).toBe('unattributed');
    const retry = await request.post(endpoint, {
      headers: { ...headers, 'Idempotency-Key': 'fixture-purchase-1' },
      data: event,
    });
    expect(retry.status()).toBe(200);
    expect(await retry.json()).toEqual({ receipt, duplicate: true });
    const analytics = await request.get('/api/v1/analytics/overview', {
      headers,
    });
    expect(await analytics.json()).toMatchObject({ meta: { source: 'mock' } });
  });

  await test.step('guides the owner through custom domain setup and requires a secure check', async () => {
    await page.goto('/admin/domains', { waitUntil: 'networkidle' });
    await page.locator('[name=hostname]').fill('go.example.com');
    await page.getByRole('button', { name: 'Add a domain' }).click();
    await expect(page).toHaveURL(/\/admin\/domains\/[^/]+\/connect$/);
    await expect(
      page.getByRole('heading', { name: 'Connect domain' }),
    ).toBeVisible();

    const domainId = new URL(page.url()).pathname.split('/').at(-2)!;
    const apiPath = `/api/v1/domains/${domainId}`;
    expect((await request.get(`${apiPath}/connection`)).status()).toBe(401);
    const connection = await context.request.get(`${apiPath}/connection`);
    expect(connection.status()).toBe(200);
    expect(await connection.json()).toMatchObject({
      hostname: 'go.example.com',
      status: 'draft',
    });
    expect(
      (
        await context.request.post(`${apiPath}/connect`, {
          data: { confirmed: true },
          headers: { origin: new URL(page.url()).origin },
        })
      ).status(),
    ).toBe(403);

    await page.waitForLoadState('networkidle');
    const check = page.waitForResponse(
      (response) =>
        response.url().endsWith(`${apiPath}/connect`) &&
        response.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Check connection' }).click();
    const response = await check;
    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'https_required' });
    await expect(page.getByRole('alert')).toBeVisible();
  });

  await test.step('persists the chosen theme and provides keyboard navigation at 360 px', async () => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/admin/settings');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
    await expect(page.getByLabel('Appearance')).toHaveValue('system');
    await page.getByLabel('Appearance').selectOption('dark');
    await page
      .locator('form[action="?/personal"]')
      .getByRole('button', { name: 'Save' })
      .click();
    await expect(page.getByRole('status')).toHaveText('Settings saved.');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(11, 18, 32)',
    );

    if (!cookie) throw new Error('Missing authenticated session');
    const markup = await request.get('/admin/settings', {
      headers: {
        cookie:
          cookie.name + '=' + cookie.value + '; __Host-linkrovia_theme=light',
      },
    });
    expect((await markup.text()).match(/data-theme="([a-z]+)"/)?.[1]).toBe(
      'dark',
    );
    await page.reload();
    await expect(page.getByLabel('Appearance')).toHaveValue('dark');
    const accessibility = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(accessibility.violations).toEqual([]);

    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 360, height: 800 });
    try {
      const menu = page.getByRole('button', { name: 'Open navigation' });
      await menu.focus();
      await page.keyboard.press('Enter');
      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(drawer).not.toBeVisible();
      await expect(menu).toBeFocused();
      await menu.click();
      await drawer.getByRole('link', { name: 'Links', exact: true }).click();
      await expect(page).toHaveURL('/admin/links');
      await expect(drawer).not.toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(360);
    } finally {
      if (originalViewport) await page.setViewportSize(originalViewport);
    }
  });

  await test.step('persists the French language preference', async () => {
    await page.goto('/admin/settings', { waitUntil: 'networkidle' });
    const personal = page.locator('form[action="?/personal"]');
    await expect(personal.locator('[name=locale] option[value=fr]')).toHaveText(
      'Français',
    );
    await personal.locator('[name=locale]').selectOption('fr');
    await personal.locator('[name=timezone]').fill('Europe/Paris');
    await expect(page.locator('#user-zone-example')).toContainText(
      /(?:GMT|UTC)\+1.*(?:GMT|UTC)\+2/,
    );
    await personal.locator('button[type=submit]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(
      page.getByRole('link', { name: 'Liens', exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    await expect(personal.locator('[name=locale]')).toHaveValue('fr');
    await expect(personal.locator('[name=timezone]')).toHaveValue(
      'Europe/Paris',
    );
    await expect(personal.locator('[name=theme]')).toHaveValue('dark');

    const originalViewport = page.viewportSize();
    await page.setViewportSize({ width: 360, height: 800 });
    try {
      await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
      const drawer = page.getByRole('dialog');
      await expect(
        drawer.getByRole('link', { name: 'Linkrovia' }),
      ).toBeVisible();
      await expect(
        drawer.getByRole('link', { name: 'Liens', exact: true }),
      ).toBeVisible();
      await drawer
        .getByRole('button', { name: 'Fermer la navigation' })
        .click();
      await expect(drawer).not.toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(360);
    } finally {
      if (originalViewport) await page.setViewportSize(originalViewport);
    }

    await page.goto('/admin/links?q=csv-e2e');
    const expiry = page.locator(
      `time[datetime="${new Date(csvExpiry).toISOString()}"]`,
    );
    await expect(expiry.locator('..')).toContainText('(Europe/Paris)');
    await expect(expiry).toContainText('déc.');
    await expect(expiry).toContainText('01:15');
    await page.goto('/admin/settings', { waitUntil: 'networkidle' });
    await personal.locator('[name=locale]').selectOption('en');
    await personal.locator('[name=timezone]').fill('');
    await personal.locator('button[type=submit]').click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    const defaults = page.locator('form[action="?/defaultZone"]');
    async function saveDefaultLocale(locale: string) {
      await defaults.locator('[name=defaultLocale]').selectOption(locale);
      await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().endsWith('?/defaultZone') &&
            response.status() === 303,
        ),
        defaults.locator('button[type=submit]').click(),
      ]);
      await expect(page).toHaveURL('/admin/settings?saved=global');
      await expect(defaults.locator('[name=defaultLocale]')).toHaveValue(
        locale,
      );
    }
    await saveDefaultLocale('fr');
    const guest = await request.get('/login', {
      headers: { 'accept-language': 'nl' },
    });
    expect(await guest.text()).toMatch(/<html[^>]*\blang="fr"/);
    await saveDefaultLocale('en');
  });

  await test.step('download, review, and safely replace from an owner backup', async () => {
    await page.goto('/admin/backup', { waitUntil: 'networkidle' });
    const [backup] = await Promise.all([
      page.waitForEvent('download'),
      page
        .getByRole('button', { name: 'Download backup', exact: true })
        .click(),
    ]);
    expect(backup.suggestedFilename()).toBe('linkrovia-backup.json');
    const path = await backup.path();
    expect(path).toBeTruthy();
    if (!path) throw new Error('Missing backup file');
    await page.getByLabel('Backup JSON file').setInputFiles(path);
    await page.getByLabel('Replace existing data').check();
    await page.getByRole('button', { name: 'Review changes' }).click();
    await expect(
      page.getByRole('heading', { name: 'Restore preview' }),
    ).toBeVisible();
    const settingsExport = await context.request.get('/api/v1/settings/export');
    expect(settingsExport.ok()).toBe(true);
    expect(settingsExport.headers()['cache-control']).toContain('no-store');
    const data = await readFile(path);
    const headers = {
      origin: new URL(page.url()).origin,
      'content-type': 'application/json',
      'x-csrf-token': await page
        .locator('form[action="/logout"] input[name="csrfToken"]')
        .inputValue(),
    };
    const validation = await context.request.post(
      '/api/v1/backup/validate?mode=replace',
      { headers, data },
    );
    expect(validation.ok()).toBe(true);
    const signedPreview = await validation.json();
    const premature = await context.request.post('/api/v1/backup/restore', {
      headers: {
        ...headers,
        'x-backup-manifest': signedPreview.manifest,
      },
      data,
    });
    expect(premature.status()).toBe(409);
    expect(await premature.json()).toMatchObject({
      code: 'confirmation_required',
    });
    const restore = page.getByRole('button', { name: 'Restore data' });
    const confirmation = page.getByLabel(
      'I understand that existing data will be replaced.',
    );
    await expect(restore).toBeDisabled();
    await expect(confirmation).toBeDisabled();
    const [current] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download current backup' }).click(),
    ]);
    expect(current.suggestedFilename()).toBe('linkrovia-backup.json');
    await expect(confirmation).toBeEnabled();
    await expect(restore).toBeDisabled();
    await confirmation.check();
    await expect(restore).toBeEnabled();
    await restore.click();
    await expect(page.getByRole('status')).toHaveText('Restore completed.');
    expect((await request.get('/csv-e2e', { maxRedirects: 0 })).status()).toBe(
      302,
    );
  });

  const invalidLogout = await context.request.post('/logout', {
    headers: { origin: new URL(page.url()).origin },
    form: { csrfToken: 'wrong' },
  });
  expect(invalidLogout.status()).toBe(403);

  await page.locator('form[action="/logout"] button').click();
  await expect(page).toHaveURL('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.goto('/admin');
  await expect(page).toHaveURL('/login');
});
