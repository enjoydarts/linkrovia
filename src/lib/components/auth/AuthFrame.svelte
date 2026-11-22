<script lang="ts">
  import { asset } from '$app/paths';
  import { brand } from '$lib/brand';
  import type { Snippet } from 'svelte';
  import Brand from '$lib/components/Brand.svelte';
  let {
    title,
    description,
    children,
  }: { title: string; description: string; children: Snippet } = $props();
</script>

<main class="auth-shell">
  <aside class="auth-brand">
    <Brand href="/" tone="dark" />
    <div class="brand-art" aria-hidden="true">
      <img src={asset(brand.mark)} alt="" width="128" height="128" />
    </div>
  </aside>
  <section class="auth-main" aria-labelledby="auth-title">
    <div class="auth-inner">
      <header class="auth-heading">
        <h1 id="auth-title">{title}</h1>
        <p>{description}</p>
      </header>
      <div class="auth-card">{@render children()}</div>
    </div>
  </section>
</main>

<style>
  .auth-shell {
    display: grid;
    grid-template-columns: minmax(17rem, 39%) minmax(0, 1fr);
    min-height: 100dvh;
    background: var(--ui-background);
    color: var(--ui-text);
  }
  .auth-brand {
    position: relative;
    display: grid;
    align-content: start;
    padding: 2rem;
    background: var(--brand-ink);
    color: var(--brand-on-ink);
  }
  .brand-art {
    display: grid;
    place-items: center;
    align-self: center;
    margin: auto;
    padding: 4rem 0;
  }
  .brand-art img {
    width: min(128px, 100%);
    height: auto;
  }
  .auth-main {
    display: grid;
    align-items: center;
    justify-items: center;
    padding: clamp(2rem, 6vw, 5rem) clamp(1.25rem, 5vw, 4.5rem);
  }
  .auth-inner {
    width: min(100%, 33rem);
  }
  .auth-heading {
    margin-bottom: 1.5rem;
  }
  h1 {
    font-size: clamp(2rem, 4vw, 2.5rem);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.035em;
  }
  .auth-heading p {
    margin-top: 0.6rem;
    color: var(--ui-text-muted);
    line-height: 1.6;
  }
  .auth-card {
    padding: clamp(1.1rem, 3vw, 2rem);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-lg);
    background: var(--ui-surface);
  }
  .auth-card
    :global(input:not([type='hidden'], [type='checkbox'], [type='radio'])) {
    min-height: 3rem;
    border: 1px solid var(--ui-control-border);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text);
    background: var(--ui-surface);
  }
  .auth-card :global(button[type='submit']) {
    min-height: 3rem;
    border-radius: var(--ui-radius-sm);
    background: var(--ui-primary);
    color: var(--ui-on-primary);
    padding-inline: 1.35rem;
  }
  .auth-card :global(button[type='submit']:hover:not(:disabled)) {
    background: var(--ui-primary-hover);
  }
  @media (max-width: 767px) {
    .auth-shell {
      grid-template-columns: minmax(0, 1fr);
      align-content: start;
    }
    .auth-brand {
      padding: 1rem 1.25rem;
    }
    .brand-art {
      display: none;
    }
    .auth-main {
      padding: clamp(2.75rem, 12vw, 4.5rem) 1.15rem;
    }
  }
</style>
