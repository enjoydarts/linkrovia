import { setTimeout as pause } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { demoGuardianLinkId } from './demo-fixtures.mjs';
import { allowDemoRequest } from './demo-policy.mjs';

const demoPages = [
  ['/admin/links', 'Links'],
  ['/admin/links/seed-link-001/rules', 'Redirect rules'],
  ['/admin/links/seed-link-001/simulate', 'Rule simulator'],
  ['/admin/analytics', 'Analytics'],
  ['/admin/analytics/insights', 'Insights'],
  ['/admin/guardian', 'Guardian'],
  ['/admin/integrations/mcp', 'MCP'],
];

/** @param {string} origin @param {AbortSignal} signal */
async function waitForWorker(origin, signal) {
  for (let attempt = 0; attempt < 90; attempt++) {
    signal.throwIfAborted();
    const response = await fetch(origin + '/health', {
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]),
    }).catch(() => null);
    if (response?.ok) return;
    await pause(500, undefined, { signal });
  }
  throw new Error('The local demo Worker did not become ready.');
}

/** @param {{origin: string, token: string, smoke: boolean, signal: AbortSignal}} options */
export async function openDemo({ origin, token, smoke, signal }) {
  await waitForWorker(origin, signal);
  const browser = await chromium.launch({ headless: smoke });
  const disconnected = new Promise((resolve) =>
    browser.once('disconnected', resolve),
  );
  const onAbort = () => {
    void browser.close();
  };
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    signal.throwIfAborted();
    const context = await browser.newContext({
      serviceWorkers: 'block',
      locale: 'en-US',
    });
    await context.addCookies([
      {
        name: '__Host-linkrovia_session',
        value: token,
        domain: new URL(origin).hostname,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
      },
    ]);
    await context.routeWebSocket('**/*', (socket) => socket.close());
    await context.route('**/*', async (route) => {
      const request = route.request();
      const target = new URL(request.url());
      if (
        allowDemoRequest(
          {
            url: request.url(),
            method: request.method(),
            resourceType: request.resourceType(),
            body: request.postData(),
            contentType: request.headers()['content-type'],
          },
          origin,
        )
      ) {
        await route.continue();
      } else if (request.isNavigationRequest() && target.origin === origin) {
        await route.fulfill({
          status: 403,
          contentType: 'text/html; charset=utf-8',
          body: '<!doctype html><html lang="en"><meta charset="utf-8"><title>Linkrovia local demo</title><p>This page is outside the read-only demo.</p><p><a href="/admin/links">Back to demo links</a></p></html>',
        });
      } else {
        await route.abort('blockedbyclient');
      }
    });
    await context.addInitScript((pages) => {
      addEventListener(
        'DOMContentLoaded',
        () => {
          const panel = document.createElement('aside');
          panel.setAttribute('aria-label', 'Local demo');
          panel.style.cssText =
            'padding:10px 16px;background:#0d403c;color:white;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;font:14px system-ui,sans-serif';
          const label = document.createElement('strong');
          label.textContent = 'Local demo · Fictional data · Read-only';
          panel.append(label);
          for (const [path, name] of pages) {
            const link = document.createElement('a');
            link.href = path;
            link.textContent = name;
            link.setAttribute('data-sveltekit-reload', '');
            link.style.cssText =
              'color:white;text-decoration:underline;text-underline-offset:3px';
            panel.append(link);
          }
          document.body.prepend(panel);
        },
        { once: true },
      );
    }, demoPages);

    const page = await context.newPage();
    const response = await page.goto(origin + '/admin/links');
    if (!response?.ok() || new URL(page.url()).pathname !== '/admin/links')
      throw new Error('The demo could not open its sample link list.');
    if (smoke) {
      await verifyDemo(page, origin);
    } else {
      console.log(
        'The local demo is open in Chromium. Close the browser to reset and exit.',
      );
      await Promise.race([
        page.waitForEvent('close', { timeout: 0 }),
        disconnected,
      ]);
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    await browser.close();
  }
}

/** @param {import('@playwright/test').Page} page @param {string} origin */
async function verifyDemo(page, origin) {
  for (const [path, name] of demoPages) {
    await page.goto(origin + path);
    await page.getByRole('heading', { name, exact: true }).first().waitFor();
    if (path === '/admin/analytics')
      await page.getByText('Sample data').first().waitFor();
  }

  await page.goto(origin + '/admin/links/seed-link-001/simulate');
  const result = page.getByRole('region', { name: 'Simulation result' });
  await page.getByRole('button', { name: 'Run simulation' }).click();
  await result.getByText('The default destination applies.').waitFor();
  await page.getByLabel('Country code').fill('JP');
  await page.getByRole('button', { name: 'Run simulation' }).click();
  await result
    .getByText('https://example.com/ja/launch', { exact: true })
    .waitFor();

  await page.goto(origin + '/admin/guardian');
  await page.getByLabel('Link to check').selectOption(demoGuardianLinkId);
  await page.getByRole('button', { name: 'Check link' }).click();
  await page.getByText('A link is inactive or unavailable.').waitFor();

  const writeBlocked = await page.evaluate(() =>
    fetch('/admin/links/seed-link-001/rules', { method: 'POST' }).then(
      () => false,
      () => true,
    ),
  );
  if (!writeBlocked) throw new Error('The demo browser sent a rule change.');

  const forbidden = await page.goto(origin + '/admin/api-keys');
  if (forbidden?.status() !== 403)
    throw new Error('The demo exposed the API keys page.');
  console.log(
    'Verified seven demo screens, redirect simulation, Guardian, and the read-only boundary.',
  );
}
