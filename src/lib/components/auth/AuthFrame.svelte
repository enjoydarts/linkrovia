<script lang="ts">
  import type { Snippet } from 'svelte';
  import Brand from '$lib/components/Brand.svelte';

  let {
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: Snippet;
  } = $props();
</script>

<main class="auth-shell">
  <aside class="auth-brand">
    <Brand href="/" />
    <img src="/linkrovia-logo.png" alt="" width="256" height="256" />
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
    background: var(--canvas);
    color: var(--ink);
  }
  .auth-brand {
    position: relative;
    display: grid;
    align-content: center;
    justify-items: center;
    padding: 2.35rem;
    color: white;
    background:
      radial-gradient(
        circle at center,
        rgb(215 243 109 / 12%),
        transparent 48%
      ),
      linear-gradient(rgb(255 255 255 / 4%) 1px, transparent 1px) center / 26px
        26px,
      linear-gradient(90deg, rgb(255 255 255 / 4%) 1px, transparent 1px)
        center / 26px 26px,
      var(--rail);
  }
  .auth-brand :global(.brand-lockup) {
    position: absolute;
    inset: 2rem auto auto 2.25rem;
  }
  .auth-brand > img {
    display: block;
    width: min(15.5rem, 62%);
    height: auto;
    border-radius: 19%;
    filter: drop-shadow(0 18px 24px rgb(0 0 0 / 18%));
  }
  .auth-main {
    display: grid;
    align-items: center;
    justify-items: center;
    padding: clamp(2rem, 6vw, 5.25rem) clamp(1.4rem, 5vw, 4.6rem);
  }
  .auth-inner {
    width: min(100%, 33rem);
  }
  .auth-heading {
    margin-bottom: 1.55rem;
  }
  h1 {
    font-size: clamp(2rem, 4vw, 2.75rem);
    font-weight: 710;
    line-height: 1.12;
    letter-spacing: -0.056em;
  }
  .auth-heading p {
    margin-top: 0.55rem;
    color: var(--muted);
    font-size: 1rem;
  }
  .auth-card {
    padding: clamp(1.1rem, 3vw, 2rem);
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .auth-card
    :global(input:not([type='hidden'], [type='checkbox'], [type='radio'])) {
    min-height: 3rem;
    border: 1px solid var(--line);
    border-radius: 0.56rem;
    color: var(--ink);
  }
  .auth-card :global(button[type='submit']) {
    min-height: 3rem;
    border-radius: 0.56rem;
    background: var(--accent);
    color: white;
    padding-inline: 1.35rem;
  }
  .auth-card :global(button[type='submit']:hover:not(:disabled)) {
    background: var(--accent-hover);
  }
  @media (max-width: 760px) {
    .auth-shell {
      grid-template-columns: minmax(0, 1fr);
      align-content: start;
    }
    .auth-brand {
      justify-items: start;
      padding: 1rem 1.25rem;
    }
    .auth-brand :global(.brand-lockup) {
      position: static;
    }
    .auth-brand > img {
      display: none;
    }
    .auth-main {
      padding: clamp(2.75rem, 12vw, 4.5rem) 1.15rem;
    }
  }
</style>
