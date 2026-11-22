import { expect, test } from '@playwright/test';
import { fixtureSetupToken } from '../fixtures/setup.mjs';

test('sets up an owner, manages a short link, scopes API access, and signs out', async ({
  page,
  context,
  request,
}) => {
  const email = 'owner@example.com';
  const password = 'a long development passphrase';

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

    await page.locator('[name=active]').uncheck();
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().endsWith('?/save') &&
          response.status() === 303,
      ),
      linkForm.locator('button[type=submit]').click(),
    ]);
    await expect(page.locator('[name=active]')).not.toBeChecked();
    expect((await request.get('/ci-link', { maxRedirects: 0 })).status()).toBe(
      404,
    );
  });

  await test.step('issue and revoke a read-only API key', async () => {
    expect((await request.get('/api/v1/links')).status()).toBe(401);
    await page.goto('/admin/api-keys');
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

  const invalidLogout = await context.request.post('/logout', {
    headers: { origin: new URL(page.url()).origin },
    form: { csrfToken: 'wrong' },
  });
  expect(invalidLogout.status()).toBe(403);

  await page.locator('form[action="/logout"] button').click();
  await expect(page).toHaveURL('/login');
  await page.goto('/admin');
  await expect(page).toHaveURL('/login');
});
