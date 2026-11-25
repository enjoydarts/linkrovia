<script lang="ts">
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { brand } from '$lib/brand';
  import LinkForm from '$lib/components/links/LinkForm.svelte';
  import { linkMessages } from '$lib/i18n/links';
  import { uiMessages } from '$lib/i18n/locale';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let m = $derived(linkMessages(data.locale));
  let copy = $derived(uiMessages(data.locale));
  let ai = $derived(copy.aiCreate);
  let suggestion = $derived(
    form && 'suggestion' in form ? form.suggestion : null,
  );
  let result = $derived(
    suggestion && 'result' in suggestion ? suggestion.result : null,
  );
  let applied = $derived(Boolean(form && 'applied' in form && form.applied));
  let generating = $state(false);
  let blockedReason = $derived.by(() => {
    const status = data.assistance;
    const messages = copy.aiInsights;
    if (!status.statusAvailable) return messages.statusUnavailable;
    if (!status.enabled) return ai.unavailable;
    if (!status.providerAvailable) return messages.providerUnavailable;
    if (!status.priceVerified) return messages.results.pricing_expired;
    if (status.blocked) return messages.results.blocked;
    if (status.busy) return messages.results.busy;
    if (status.dayCalls >= 10 || status.monthCalls >= 100)
      return messages.results.limit;
    if (status.monthlyBudgetMicrousd === 0) return messages.budgetHelp;
    if (status.monthCostMicrousd >= status.monthlyBudgetMicrousd)
      return messages.budgetReached;
    return null;
  });
  let money = $derived(
    new Intl.NumberFormat(data.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }),
  );

  function showPendingSuggestion(event: SubmitEvent) {
    if (event.submitter?.getAttribute('formaction') === '?/suggest') {
      generating = true;
    }
  }
</script>

<svelte:head><title>{m.create} · {brand.name}</title></svelte:head>
<span role="status" class="sr-only">
  {generating ? copy.aiInsights.generating : ''}
</span>
<LinkForm
  locale={data.locale}
  csrfToken={data.csrfToken}
  domains={data.domains}
  link={data.link}
  timeZone={data.timeZone}
  formAction="?/create"
  onsubmit={showPendingSuggestion}
  busy={generating}
  error={form && 'code' in form ? form.code : undefined}
  values={form && 'values' in form ? form.values : undefined}
>
  {#snippet suggestions()}
    {#if applied}<p class="text-sm text-muted" role="status">
        {ai.applied}
      </p>{/if}
    <details class="suggestions" open={Boolean(suggestion)}>
      <summary>{ai.title}<ChevronDown size={17} aria-hidden="true" /></summary>
      <div class="suggestion-fields">
        {#if suggestion && !result && suggestion.code !== 'generated' && suggestion.code !== 'cached'}
          <p role="alert">{copy.aiInsights.results[suggestion.code]}</p>
        {/if}
        {#if result}
          <div class="suggestion-preview">
            <h2>{ai.suggestions}</h2>
            <dl>
              <dt>{m.title}</dt>
              <dd>{result.title}</dd>
              <dt>{m.slug}</dt>
              <dd><code>{result.slug}</code></dd>
              {#if result.tags.length}<dt>{m.tags}</dt>
                <dd>{result.tags.join(', ')}</dd>{/if}
            </dl>
            <input
              type="hidden"
              name="aiSuggestions"
              value={JSON.stringify(result)}
            />
            <button
              type="submit"
              class="admin-button"
              formaction="?/applySuggestions"
              formnovalidate
            >
              {ai.use}
            </button>
          </div>
        {:else if !blockedReason}
          <p id="ai-description-help">{ai.description}</p>
          <label for="ai-description">{ai.inputDescription}</label>
          <textarea
            id="ai-description"
            name="aiDescription"
            class="admin-control w-full"
            maxlength="700"
            rows="3"
            aria-describedby="ai-description-help"
            value={suggestion?.description ?? ''}
            placeholder={ai.descriptionPlaceholder}></textarea>
          <p>
            {copy.aiInsights.maxCost} · {money.format(
              data.assistance.maxRunCostMicrousd / 1_000_000,
            )}
          </p>
          <button
            type="submit"
            class="admin-button"
            formaction="?/suggest"
            formnovalidate
          >
            {generating ? copy.aiInsights.generating : ai.generate}
          </button>
        {:else}
          <p>{blockedReason}</p>
          <a href="/admin/settings/ai">{copy.aiInsights.settings}</a>
        {/if}
      </div>
    </details>
  {/snippet}
</LinkForm>

<style>
  .suggestions {
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    min-width: 0;
  }
  summary {
    display: flex;
    min-height: 2.9rem;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    padding: 0.55rem 0.85rem;
    list-style: none;
    font-weight: 680;
    cursor: pointer;
    color: var(--ui-link);
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .suggestion-fields,
  .suggestion-preview {
    display: grid;
    gap: 0.65rem;
    justify-items: start;
  }
  .suggestion-fields {
    border-top: 1px solid var(--ui-border);
    padding: 0.85rem;
  }
  .suggestion-fields p {
    color: var(--ui-text-muted);
    font-size: 0.875rem;
  }
  .suggestion-fields a {
    text-decoration: underline;
  }
  textarea {
    resize: vertical;
  }
  h2 {
    font-weight: 680;
  }
  dl {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
    gap: 0.25rem 0.8rem;
  }
  dd {
    overflow-wrap: anywhere;
  }
</style>
