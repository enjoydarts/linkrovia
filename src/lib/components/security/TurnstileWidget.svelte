<script module lang="ts">
  type TurnstileApi = {
    render: (
      element: HTMLElement,
      options: {
        sitekey: string;
        action: string;
        language: string;
        size: 'flexible';
        retry: 'never';
        'refresh-expired': 'manual';
        'refresh-timeout': 'manual';
        callback: () => void;
        'error-callback': () => boolean;
        'expired-callback': () => void;
        'timeout-callback': () => void;
        'unsupported-callback': () => void;
      },
    ) => string;
    remove: (widget: string) => void;
  };

  const scriptUrl =
    'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  let scriptLoad: Promise<TurnstileApi> | undefined;

  function loadTurnstile() {
    const browser = window as Window & { turnstile?: TurnstileApi };
    if (browser.turnstile) return Promise.resolve(browser.turnstile);

    scriptLoad ??= new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = window.setTimeout(
        () => reject(new Error('Turnstile script timed out')),
        12_000,
      );
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => {
        window.clearTimeout(timeout);
        if (browser.turnstile) resolve(browser.turnstile);
        else reject(new Error('Turnstile API is unavailable'));
      };
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error('Turnstile script did not load'));
      };
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      document
        .querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`)
        ?.remove();
      scriptLoad = undefined;
      throw error;
    });

    return scriptLoad;
  }
</script>

<script lang="ts">
  import { uiMessages, type Locale } from '$lib/i18n/locale';
  import type { TurnstileAction } from '$lib/server/security/turnstile';

  let {
    siteKey,
    action,
    locale,
    resetKey = 0,
  }: {
    siteKey: string;
    action: TurnstileAction;
    locale: Locale;
    resetKey?: number;
  } = $props();

  let issue = $state<'expired' | 'unavailable' | undefined>();
  let retries = $state(0);
  let copy = $derived(uiMessages(locale).turnstile);

  function attachWidget(
    key: string,
    widgetAction: TurnstileAction,
    language: string,
  ) {
    return (element: HTMLElement) => {
      issue = undefined;
      let remove: (() => void) | undefined;
      let active = true;

      loadTurnstile()
        .then((api) => {
          if (!active) return;
          const widget = api.render(element, {
            sitekey: key,
            action: widgetAction,
            language,
            size: 'flexible',
            retry: 'never',
            'refresh-expired': 'manual',
            'refresh-timeout': 'manual',
            callback: () => {
              if (active) issue = undefined;
            },
            'error-callback': () => {
              if (active) issue = 'unavailable';
              return true;
            },
            'expired-callback': () => {
              if (active) issue = 'expired';
            },
            'timeout-callback': () => {
              if (active) issue = 'expired';
            },
            'unsupported-callback': () => {
              if (active) issue = 'unavailable';
            },
          });
          remove = () => api.remove(widget);
        })
        .catch(() => {
          if (active) issue = 'unavailable';
        });

      return () => {
        active = false;
        remove?.();
      };
    };
  }
</script>

{#key resetKey + retries}
  <div {@attach attachWidget(siteKey, action, locale.toLowerCase())}></div>
{/key}
{#if issue}
  <p role="status" class="mt-2 text-sm">
    {copy[issue]}
  </p>
  <button
    type="button"
    class="mt-2 rounded-md border px-3 py-2 text-sm"
    onclick={() => (retries += 1)}
  >
    {copy.retry}
  </button>
{/if}
<noscript>{copy.javascript}</noscript>
