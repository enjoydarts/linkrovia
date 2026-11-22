import { expect, test } from '@playwright/test';

test.use({ locale: 'ja-JP' });

test('serves the six locales without a URL prefix', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  expect(await response?.request().headerValue('accept-language')).toMatch(
    /^ja/i,
  );
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');

  for (const locale of ['en', 'zh-CN', 'zh-TW', 'es', 'it', 'ja']) {
    await page.locator('select[name=locale]').selectOption(locale);
    await page.getByRole('button', { name: /./ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(
      page.getByRole('heading', { name: 'Linkrovia' }),
    ).toBeVisible();
    await expect(page).toHaveURL('/');
  }

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
});

test('the Worker can read the migrated D1 database', async ({ request }) => {
  const response = await request.get('/health');
  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: 'ok' });
});
