import { expect, test, type Page } from '@playwright/test';
import { fixtureSetupToken } from '../fixtures/setup.mjs';

async function signOut(page: Page) {
  const [response] = await Promise.all([
    page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/logout' &&
        response.request().method() === 'POST',
    ),
    page.locator('form[action="/logout"] button').click(),
  ]);
  expect(
    response.status(),
    'logout must complete before opening an invitation',
  ).toBe(303);
  await expect(page).toHaveURL('/login');
}

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
    await signOut(page);
    await expect(
      page.locator('form[action="/login/passkey"] button'),
    ).toBeVisible();
    await expect(page.locator('input[name="password"]')).toHaveCount(0);
    await page
      .locator('form[action="/login/passkey"] button[type="submit"]')
      .click();
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('form[action="/logout"]')).toBeVisible();
    await page.goto('/admin/settings/admins');
    await page.locator('input[name="email"]').fill('second-admin@example.com');
    await page.locator('form[action="?/invite"] button').click();
    const inviteUrl = page.locator('#invite-url');
    await expect(inviteUrl).toHaveValue(/\/invite\/admin#[0-9a-f]{64}$/);
    const invite = await inviteUrl.inputValue();

    await signOut(page);
    await page.goto(invite);
    await expect(page).toHaveURL('/invite/admin');
    const acceptInvite = page.locator(
      'form[action="/invite/admin/passkey"] button',
    );
    await expect(acceptInvite).toBeEnabled();
    await acceptInvite.click();
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('.account-email')).toHaveText(
      'second-admin@example.com',
    );

    const denied = await page.goto('/admin/settings/admins');
    expect(denied?.status()).toBe(403);
    await page.goto('/admin');
    await signOut(page);
    await page.goto(invite);
    await expect(page).toHaveURL('/invite/admin');
    await expect(acceptInvite).toBeEnabled();
    await acceptInvite.click();
    await expect(page.getByRole('alert')).toBeVisible();
    const registered = await cdp.send('WebAuthn.getCredentials', {
      authenticatorId,
    });
    expect(registered.credentials).toHaveLength(2);
  } finally {
    if (!page.isClosed()) {
      await cdp.send('WebAuthn.removeVirtualAuthenticator', {
        authenticatorId,
      });
      await cdp.send('WebAuthn.disable');
    }
  }
});
