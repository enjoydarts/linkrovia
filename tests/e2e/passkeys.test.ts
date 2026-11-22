import { expect, test } from '@playwright/test';
import { fixtureSetupToken } from '../fixtures/setup.mjs';

test('registers and signs in with a discoverable passkey', async ({
  page,
  context,
}) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const { authenticatorId } = await cdp.send(
    'WebAuthn.addVirtualAuthenticator',
    {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    },
  );
  try {
    await page.goto('/setup');
    await page.locator('[name="setupToken"]').fill(fixtureSetupToken);
    await page.locator('form[action="?/verify"] button[type="submit"]').click();
    await expect(page.locator('#passkey-email')).toBeVisible();
    await page.locator('#passkey-email').fill('passkey-owner@example.com');
    await page
      .locator('form[action="/setup/passkey"] button[type="submit"]')
      .click();
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
    const { credentials } = await cdp.send('WebAuthn.getCredentials', {
      authenticatorId,
    });
    expect(credentials).toHaveLength(1);
    expect(credentials[0].isResidentCredential).toBe(true);
    await page.locator('form[action="/logout"] button').click();
    await expect(page).toHaveURL('/login');
    await expect(
      page.locator('form[action="/login/passkey"] button'),
    ).toBeVisible();
    await expect(page.locator('input[name="password"]')).toHaveCount(0);
    await page
      .locator('form[action="/login/passkey"] button[type="submit"]')
      .click();
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('form[action="/logout"]')).toBeVisible();
  } finally {
    if (!page.isClosed()) {
      await cdp.send('WebAuthn.removeVirtualAuthenticator', {
        authenticatorId,
      });
      await cdp.send('WebAuthn.disable');
    }
  }
});
