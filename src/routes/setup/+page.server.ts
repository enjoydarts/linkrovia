import { dev } from '$app/env';
import { error, fail, redirect } from '@sveltejs/kit';
import { isValidPassword, normalizeEmail } from '$lib/server/auth/credential';
import {
  checkSetupToken,
  createSetupProof,
  registerOwner,
  setupComplete,
  setupProofCookie,
  setupProofMaxAge,
  verifySetupProof,
} from '$lib/server/auth/setup';
import { allowAuthAttempt } from '$lib/server/security/rate-limit';
import { readSmallForm, requireSameOrigin } from '$lib/server/security/request';
import { normalizeHostname } from '$lib/server/security/url-policy';
import { passkeyRp } from '$lib/server/auth/passkeys';
import {
  getTurnstileConfig,
  turnstileConfigurationStatus,
  verifyTurnstile,
} from '$lib/server/security/turnstile';
import { messagesFor } from '$lib/i18n/locale';
import type { Actions, PageServerLoad } from './$types';

const cookieOptions = {
  path: '/',
  secure: true,
  httpOnly: true,
  sameSite: 'lax',
} as const;

export const load = (async ({ cookies, locals, url }) => {
  const locale = locals.locale;
  const methods = {
    passkeyAvailable: !!passkeyRp(url, { development: dev }),
    passwordAvailable: dev,
  };
  const db = locals.env.DB;
  if (!db)
    return {
      locale,
      ...methods,
      step: 'configuration',
      turnstile: null,
    } as const;
  if (await setupComplete(db))
    error(410, messagesFor(locale)['setup.completed']);

  const secret = locals.env.SETUP_TOKEN;
  if (!secret || secret.trim().length < 32 || secret.length > 512) {
    return {
      locale,
      ...methods,
      step: 'configuration',
      turnstile: null,
    } as const;
  }
  if (await verifySetupProof(cookies.get(setupProofCookie), secret)) {
    return { locale, ...methods, step: 'owner', turnstile: null } as const;
  }
  const config = await getTurnstileConfig(db);
  const status = turnstileConfigurationStatus({
    siteKey: config.siteKey,
    secretKey: locals.env.TURNSTILE_SECRET_KEY,
    hostname: url.hostname,
    development: dev,
  });
  const canRenderWidget =
    config.enabled && (status === 'ready' || status === 'test');
  return {
    locale,
    ...methods,
    step: 'token',
    turnstile: canRenderWidget ? { siteKey: config.siteKey } : null,
  } as const;
}) satisfies PageServerLoad;

export const actions = {
  verify: async (event) => {
    const { request, url, cookies, locals } = event;
    if (!requireSameOrigin(request, url)) return fail(403, { code: 'csrf' });
    const db = locals.env.DB;
    if (!db) return fail(503, { code: 'unavailable' });
    if (await setupComplete(db)) return fail(410, { code: 'unavailable' });

    const secret = locals.env.SETUP_TOKEN;
    if (!secret || secret.trim().length < 32 || secret.length > 512)
      return fail(503, { code: 'unavailable' });
    if (!(await allowAuthAttempt(event, 'setup-verify')))
      return fail(429, { code: 'rate_limit' });

    const form = await readSmallForm(request);
    if (!form) return fail(400, { code: 'invalid_input' });
    if (
      !(await verifyTurnstile({
        config: await getTurnstileConfig(db),
        secretKey: locals.env.TURNSTILE_SECRET_KEY,
        token: form.get('cf-turnstile-response'),
        action: 'setup',
        hostname: url.hostname,
        development: dev,
        fetch: event.fetch,
      }))
    )
      return fail(403, { code: 'turnstile' });
    if (!(await checkSetupToken(form.get('setupToken'), secret))) {
      return fail(403, { code: 'invalid_token' });
    }

    cookies.set(setupProofCookie, await createSetupProof(secret), {
      ...cookieOptions,
      maxAge: setupProofMaxAge,
    });
    redirect(303, '/setup');
  },
  register: async (event) => {
    if (!dev) return fail(403, { code: 'unavailable' });
    const { request, url, cookies, locals } = event;
    if (!requireSameOrigin(request, url)) return fail(403, { code: 'csrf' });
    const db = locals.env.DB;
    if (!db) return fail(503, { code: 'unavailable' });
    if (await setupComplete(db)) return fail(410, { code: 'unavailable' });
    if (!(await allowAuthAttempt(event, 'setup-register')))
      return fail(429, { code: 'rate_limit' });
    if (
      !(await verifySetupProof(
        cookies.get(setupProofCookie),
        locals.env.SETUP_TOKEN,
      ))
    ) {
      return fail(403, { code: 'invalid_token' });
    }

    const form = await readSmallForm(request);
    const email = normalizeEmail(form?.get('email'));
    const password = form?.get('password');
    const hostname = normalizeHostname(url.hostname, { allowLoopback: dev });
    if (
      !email ||
      !hostname ||
      !isValidPassword(password) ||
      password !== form?.get('confirmPassword')
    ) {
      return fail(400, { code: 'invalid_input' });
    }

    if (
      !(await registerOwner(db, {
        email,
        password,
        locale: locals.locale,
        managementHostname: hostname,
      }))
    ) {
      return fail(409, { code: 'unavailable' });
    }
    cookies.delete(setupProofCookie, cookieOptions);
    redirect(303, '/login');
  },
} satisfies Actions;
