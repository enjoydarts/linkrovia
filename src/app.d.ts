import type { getSession } from '$lib/server/auth/session';
import type { Locale } from '$lib/i18n/locale';

declare global {
  namespace App {
    interface Locals {
      env: Env;
      locale: Locale;
      session: Awaited<ReturnType<typeof getSession>>;
    }
  }
}

export {};
