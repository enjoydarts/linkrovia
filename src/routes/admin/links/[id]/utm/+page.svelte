<script lang="ts">
  import { brand } from '$lib/brand';
  import { linkUtmMessages } from './messages';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(linkUtmMessages(data.locale));
  let targets = $derived([
    {
      id: 'default',
      destination: data.link.destinationUrl,
      values: data.config.default ?? {},
      position: null,
    },
    ...data.rules.map((rule, index) => ({
      id: rule.id,
      destination: rule.destinationUrl,
      values: data.config.rules?.[rule.id] ?? {},
      position: index + 1,
    })),
  ]);
</script>

<svelte:head><title>{m.title} · {brand.name}</title></svelte:head>
<section class="max-w-3xl space-y-5">
  <p class="text-sm text-muted">{m.help}</p>
  <p class="text-sm text-muted">{m.safe}</p>
  {#each targets as target (target.id)}
    {@const draft = form?.draft?.target === target.id ? form.draft : null}
    <form
      method="POST"
      aria-labelledby={`utm-destination-${target.id}`}
      class="space-y-4 rounded-xl border border-line bg-surface p-5"
    >
      <h2 id={`utm-destination-${target.id}`} class="font-semibold">
        {target.id === 'default' ? m.default : `${m.rule} ${target.position}`}
      </h2>
      <p class="break-all text-sm text-muted">{target.destination}</p>
      <input type="hidden" name="csrfToken" value={data.csrfToken} />
      <input
        type="hidden"
        name="updatedAt"
        value={draft?.updatedAt ?? data.link.updatedAt}
      />
      <input type="hidden" name="target" value={target.id} />
      <label class="block space-y-2">
        <span class="block text-sm font-medium">{m.template}</span>
        <select
          name="templateId"
          class="w-full rounded-md border border-line px-3 py-2"
        >
          <option value="">{m.none}</option>
          {#each data.templates as template (template.id)}
            <option
              value={template.id}
              selected={draft?.templateId === template.id}
            >
              {template.name}
            </option>
          {/each}
        </select>
      </label>
      <div class="grid gap-4 sm:grid-cols-2">
        {#each data.utmKeys as key (key)}
          <label class="block space-y-2">
            <span class="block text-sm font-medium">{key}</span>
            <input
              name={key}
              defaultValue={draft?.values[key] ?? target.values[key] ?? ''}
              maxlength="256"
              class="w-full rounded-md border border-line px-3 py-2"
            />
          </label>
        {/each}
      </div>
      <p class="text-sm text-muted">{m.remove}</p>
      {#if form?.issue && (!form.draft || form.draft.target === target.id)}
        <p role="alert" class="text-sm text-negative">{m[form.issue]}</p>
      {/if}
      {#if form?.saved && form.target === target.id}<p role="status">
          {m.saved}
        </p>{/if}
      <div class="flex flex-wrap gap-3">
        <button
          formaction="?/save"
          type="submit"
          class="rounded-md bg-primary px-4 py-2 font-medium text-on-primary hover:bg-primary-hover"
        >
          {m.save}
        </button>
        <button
          formaction="?/preview"
          type="submit"
          class="rounded-md border border-line px-4 py-2 font-medium"
        >
          {m.preview}
        </button>
      </div>
      {#if form?.preview && draft}
        <dl class="space-y-2 text-sm" aria-live="polite">
          <div>
            <dt class="font-medium">{m.before}</dt>
            <dd class="break-all"><code>{form.preview.before}</code></dd>
          </div>
          <div>
            <dt class="font-medium">{m.after}</dt>
            <dd class="break-all"><code>{form.preview.after}</code></dd>
          </div>
        </dl>
      {/if}
    </form>
  {/each}
</section>
