<script lang="ts">
  import { brand } from '$lib/brand';
  import { invalidateAll } from '$app/navigation';
  import { domainMessages } from '../../messages';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
  let m = $derived(domainMessages(data.locale));
  let busy = $state(false);
  let message = $state('');
  let failed = $state(false);
  let accountId = $state('');
  let zoneId = $state('');
  let token = $state('');
  let diagnosis = $state('');

  const domainPath = $derived(
    `/api/v1/domains/${encodeURIComponent(data.domain.id)}`,
  );

  async function request<Result>(path: string, body: unknown): Promise<Result> {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': data.csrfToken,
      },
      body: JSON.stringify(body),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      const problem = result as { code?: string } | null;
      throw new Error(problem?.code ?? 'request_failed');
    }
    return result as Result;
  }
  async function probe(url: string) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url, {
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const result = (await response.json().catch(() => null)) as {
        proof?: unknown;
      } | null;
      return typeof result?.proof === 'string' && result.proof.length > 0
        ? result.proof
        : null;
    } finally {
      window.clearTimeout(timer);
    }
  }
  async function connect() {
    busy = true;
    failed = false;
    message = m.checking;
    try {
      const { ticket, url } = await request<{ ticket: string; url: string }>(
        `${domainPath}/connect`,
        { confirmed: true },
      );
      const proof = await probe(url);
      if (!proof) throw new Error('proof_unavailable');
      const result = await request<{ status: string }>(`${domainPath}/verify`, {
        ticket,
        proof,
      });
      message = result.status === 'active' ? m.ready : m.failed;
      failed = result.status !== 'active';
      await invalidateAll();
    } catch (error) {
      message =
        error instanceof Error && error.message === 'https_required'
          ? m.httpsOnly
          : m.failed;
      failed = true;
    } finally {
      busy = false;
    }
  }
  async function disconnect() {
    if (!window.confirm(m.disconnectConfirm)) return;
    busy = true;
    failed = false;
    try {
      await request(`${domainPath}/disconnect`, {
        confirmed: true,
        version: data.domain.version,
      });
      message = m.disconnected;
      await invalidateAll();
    } catch {
      message = m.failed;
      failed = true;
    } finally {
      busy = false;
    }
  }
  async function diagnose() {
    busy = true;
    diagnosis = '';
    try {
      const result = await request<{ code: string }>(
        '/api/v1/domains/preflight',
        {
          hostname: data.domain.hostname,
          accountId,
          zoneId,
          token,
        },
      );
      diagnosis =
        result.code === 'ready'
          ? m.automatic
          : result.code === 'attached'
            ? m.attached
            : m.failed;
    } catch {
      diagnosis = m.failed;
    } finally {
      token = '';
      busy = false;
    }
  }
</script>

<svelte:head><title>{m.wizardTitle} · {brand.name}</title></svelte:head>
<div class="max-w-3xl space-y-8">
  <header class="space-y-3">
    <a href="/admin/domains" class="text-link underline">← {m.backToDomains}</a>
    <h1 class="text-3xl font-semibold tracking-tight">{m.wizardTitle}</h1>
    <p>{m.wizardIntro}</p>
    <p class="break-all rounded-md border border-line p-3 font-mono text-sm">
      {data.domain.hostname}
    </p>
  </header>

  {#if data.isOwner && data.domain.hostname !== data.managementHostname}
    <section class="space-y-4 rounded-lg border border-line p-5">
      <h2 class="text-xl font-semibold">Cloudflare Workers &amp; Pages</h2>
      <ol class="list-decimal space-y-2 pl-5">
        <li>
          <a
            href="https://dash.cloudflare.com/?to=/:account/workers-and-pages"
            target="_blank"
            rel="noreferrer"
            class="text-link underline"
          >
            {m.cloudflareSteps[0]}
          </a>
        </li>
        {#each m.cloudflareSteps.slice(1) as step}<li>{step}</li>{/each}
      </ol>
      <p class="text-sm">{m.automatic}</p>
      <p class="text-sm">{m.externalDns}</p>
      <p class="text-sm font-medium">{m.noWorkersCname}</p>
    </section>
    <section class="space-y-4 rounded-lg border border-line p-5">
      <h2 class="text-xl font-semibold">{m.checkConnection}</h2>
      <p class="text-sm">{m.httpsOnly}</p>
      <button
        type="button"
        disabled={busy}
        onclick={connect}
        class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary disabled:opacity-60"
      >
        {busy ? m.checking : m.checkConnection}
      </button>
      {#if message}<p
          role={failed ? 'alert' : 'status'}
          class={failed ? 'text-negative' : 'text-positive'}
        >
          {message}
        </p>{/if}
    </section>
    <details class="space-y-4 rounded-lg border border-line p-5">
      <summary class="cursor-pointer text-xl font-semibold">
        {m.diagnose}
      </summary>
      <p class="text-sm">{m.advanced}</p>
      <form
        onsubmit={(event) => {
          event.preventDefault();
          diagnose();
        }}
        class="space-y-3"
      >
        <label class="block">
          <span class="mb-1 block font-medium">{m.accountId}</span><input
            bind:value={accountId}
            autocomplete="off"
            class="w-full rounded-md border border-control bg-surface px-3 py-2"
          />
        </label>
        <label class="block">
          <span class="mb-1 block font-medium">{m.zoneId}</span><input
            bind:value={zoneId}
            autocomplete="off"
            class="w-full rounded-md border border-control bg-surface px-3 py-2"
          />
        </label>
        <label class="block">
          <span class="mb-1 block font-medium">{m.token}</span><input
            bind:value={token}
            type="password"
            autocomplete="off"
            class="w-full rounded-md border border-control bg-surface px-3 py-2"
          />
        </label>
        <p class="text-sm">{m.tokenWarning}</p>
        <button
          type="submit"
          disabled={busy}
          class="rounded-md border border-control px-4 py-2 font-medium disabled:opacity-60"
        >
          {m.diagnoseButton}
        </button>
      </form>
      {#if diagnosis}<p role="status">{diagnosis}</p>{/if}
    </details>
    {#if data.domain.status === 'active'}<button
        type="button"
        disabled={busy}
        onclick={disconnect}
        class="rounded-md border border-control px-4 py-2 font-medium"
      >
        {m.disconnect}
      </button>{/if}
  {:else}
    <p class="rounded-md border border-line p-4" role="note">{m.readOnly}</p>
  {/if}
</div>
