<script lang="ts">
  import { brand } from '$lib/brand';
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';
  import { utmMessages } from './messages';

  let { data, form }: PageProps = $props();
  let messages = $derived(utmMessages(data.locale));
  let pageHref = $derived(resolve('/admin/utm'));
  let editQuery = $derived(
    data.editing ? `&edit=${encodeURIComponent(data.editing.id)}` : '',
  );
  let draft = $derived(form?.draft ?? data.editing);
  let previewInput = $derived(form?.previewInput);
  let staleTemplate = $derived(form?.issue === 'stale_template');
  let labels = $derived({
    utm_source: messages.source,
    utm_medium: messages.medium,
    utm_campaign: messages.campaign,
    utm_term: messages.term,
    utm_content: messages.content,
  });

  type Field = PageProps['data']['utmKeys'][number];
  const inputClass =
    'w-full min-w-0 rounded-md border border-line bg-surface px-3 py-2 text-sm';
  const buttonClass =
    'rounded-md bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50';
</script>

<svelte:head>
  <title>{messages.title} · {brand.name}</title>
</svelte:head>

{#snippet utmFields(
  prefix: string,
  values: Partial<Record<Field, string>> = {},
)}
  <div class="grid gap-3 sm:grid-cols-2">
    {#each data.utmKeys.slice(0, 5) as key (key)}
      <div class="space-y-1">
        <label for={`${prefix}-${key}`} class="block text-sm font-medium">
          {key in labels ? labels[key as keyof typeof labels] : key}
        </label>
        <input
          id={`${prefix}-${key}`}
          name={key}
          defaultValue={values[key] ?? ''}
          maxlength="256"
          class={inputClass}
        />
      </div>
    {/each}
  </div>
  <details open={data.utmKeys.slice(5).some((key) => values[key])}>
    <summary class="cursor-pointer text-sm font-medium">
      {messages.additionalFields}
    </summary>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      {#each data.utmKeys.slice(5) as key (key)}
        <div class="space-y-1">
          <label for={`${prefix}-${key}`} class="block font-mono text-sm">
            {key}
          </label>
          <input
            id={`${prefix}-${key}`}
            name={key}
            defaultValue={values[key] ?? ''}
            maxlength="256"
            class={inputClass}
          />
        </div>
      {/each}
    </div>
  </details>
{/snippet}

<div class="space-y-6">
  <header class="workspace-intro">
    <div>
      <h1>{messages.title}</h1>
      <p>{messages.description}</p>
    </div>
  </header>

  {#if form?.issue}
    <p role="alert" class="font-medium">{messages[form.issue]}</p>
  {:else if form?.saved || form?.deleted}
    <p role="status" class="font-medium">
      {form.saved ? messages.saved : messages.deleted}
    </p>
  {/if}

  <div class="grid items-start gap-6 lg:grid-cols-2">
    <section
      aria-labelledby="utm-templates-title"
      class="workspace-panel space-y-5"
    >
      <div class="space-y-3">
        <h2 id="utm-templates-title" class="text-xl font-semibold">
          {messages.templates}
        </h2>
        {#if !data.templates.length}
          <p class="text-sm">{messages.noTemplates}</p>
        {:else}
          <ul class="divide-y divide-line">
            {#each data.templates as template (template.id)}
              <li class="py-2">
                <a
                  class="inline-block max-w-full font-medium break-words underline underline-offset-4"
                  href={`${pageHref}?edit=${encodeURIComponent(template.id)}`}
                  aria-current={data.editing?.id === template.id
                    ? 'page'
                    : undefined}
                  data-sveltekit-reload
                >
                  {template.name}
                </a>
                {#if template.description}
                  <p class="text-sm break-words text-muted">
                    {template.description}
                  </p>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </div>

      <div class="space-y-3 border-t border-line pt-4">
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-lg font-medium">
            {data.editing ? messages.editTemplate : messages.newTemplate}
          </h3>
          {#if data.editing}
            <a
              href={pageHref}
              data-sveltekit-reload
              class="text-sm underline underline-offset-4"
            >
              {messages.newTemplate}
            </a>
          {/if}
        </div>

        <form method="POST" action={`?/save${editQuery}`} class="space-y-4">
          <input type="hidden" name="csrfToken" value={data.csrfToken} />
          {#if data.editing}
            <input type="hidden" name="id" value={data.editing.id} />
            <input
              type="hidden"
              name="updatedAt"
              value={staleTemplate ? '' : data.editing.updatedAt}
            />
          {/if}
          <div class="space-y-1">
            <label for="template-name" class="block text-sm font-medium">
              {messages.name}
            </label>
            <input
              id="template-name"
              name="name"
              defaultValue={draft?.name ?? ''}
              required
              maxlength="80"
              class={inputClass}
            />
          </div>
          <div class="space-y-1">
            <label for="template-purpose" class="block text-sm font-medium">
              {messages.purpose}
            </label>
            <input
              id="template-purpose"
              name="description"
              defaultValue={draft?.description ?? ''}
              maxlength="256"
              class={inputClass}
            />
          </div>
          {@render utmFields('template', draft?.values)}
          <button type="submit" class={buttonClass} disabled={staleTemplate}>
            {messages.save}
          </button>
        </form>

        {#if data.editing}
          <form method="POST" action={`?/remove${editQuery}`}>
            <input type="hidden" name="csrfToken" value={data.csrfToken} />
            <input type="hidden" name="id" value={data.editing.id} />
            <input
              type="hidden"
              name="updatedAt"
              value={staleTemplate ? '' : data.editing.updatedAt}
            />
            <button
              type="submit"
              disabled={staleTemplate}
              class="rounded-md border border-negative px-4 py-2 text-sm font-medium text-negative disabled:opacity-50"
            >
              {messages.remove}
            </button>
          </form>
        {/if}
      </div>
    </section>

    <section
      aria-labelledby="utm-preview-title"
      class="min-w-0 space-y-4 rounded-xl border border-line bg-surface p-5"
    >
      <h2 id="utm-preview-title" class="text-xl font-semibold">
        {messages.preview}
      </h2>
      <form method="POST" action={`?/preview${editQuery}`} class="space-y-4">
        <input type="hidden" name="csrfToken" value={data.csrfToken} />
        <div class="space-y-1">
          <label for="preview-url" class="block text-sm font-medium">
            {messages.url}
          </label>
          <input
            id="preview-url"
            name="destinationUrl"
            type="url"
            defaultValue={previewInput?.destinationUrl ?? ''}
            maxlength="8192"
            required
            class={inputClass}
          />
        </div>
        {#if data.templates.length}
          <div class="space-y-1">
            <label for="preview-template" class="block text-sm font-medium">
              {messages.template}
            </label>
            <select
              id="preview-template"
              name="templateId"
              class={inputClass}
              aria-describedby="utm-override-hint"
            >
              <option value="">{messages.noTemplate}</option>
              {#each data.templates as template (template.id)}
                <option
                  value={template.id}
                  selected={previewInput?.templateId === template.id}
                >
                  {template.name}
                </option>
              {/each}
            </select>
            <p id="utm-override-hint" class="text-sm">
              {messages.overrideHint}
            </p>
          </div>
        {/if}
        {@render utmFields('preview', previewInput?.values)}
        <button type="submit" class={buttonClass}>
          {messages.previewAction}
        </button>
      </form>

      {#if form?.preview}
        <dl
          class="space-y-2 rounded-md border border-line bg-canvas p-3 text-sm"
        >
          <dt class="font-medium">{messages.before}</dt>
          <dd><code class="break-all">{form.preview.before}</code></dd>
          <dt class="font-medium">{messages.after}</dt>
          <dd><code class="break-all">{form.preview.after}</code></dd>
        </dl>
      {/if}
    </section>
  </div>
</div>
