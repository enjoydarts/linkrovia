<script lang="ts">
  import { asset } from '$app/paths';
  import ChartNoAxesColumnIncreasing from '@lucide/svelte/icons/chart-no-axes-column-increasing';
  import Link2 from '@lucide/svelte/icons/link-2';
  import Route from '@lucide/svelte/icons/route';
  import { brand } from '$lib/brand';
  import Brand from '$lib/components/Brand.svelte';
  import { locales, localeNames, messagesFor } from '$lib/i18n/locale';
  import { landingCopy } from '$lib/i18n/landing';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let messages = $derived(messagesFor(data.locale));
  let copy = $derived(landingCopy[data.locale]);
  let socialImage = $derived(
    new URL(asset(brand.socialImage), data.origin).href,
  );
  let features = $derived([
    { icon: Link2, title: copy.features[0], detail: copy.features[1] },
    { icon: Route, title: copy.features[2], detail: copy.features[3] },
    {
      icon: ChartNoAxesColumnIncreasing,
      title: copy.features[4],
      detail: copy.features[5],
    },
  ]);
</script>

<svelte:head>
  <title>{brand.name}</title>
  <meta name="description" content={messages['home.description']} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={brand.name} />
  <meta property="og:title" content={brand.name} />
  <meta property="og:description" content={messages['home.description']} />
  <meta property="og:image" content={socialImage} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={brand.name} />
</svelte:head>

<main class="landing">
  <div class="landing-inner">
    <header class="landing-bar">
      <Brand tone="dark" />
      <a href={brand.repository} class="landing-source">
        GitHub <span aria-hidden="true">↗</span>
      </a>
    </header>
    <section class="hero">
      <div class="hero-copy">
        <h1>
          {copy.headline[0]} <span>{copy.headline[1]}</span>
        </h1>
        <p class="description">{messages['home.description']}</p>
        <a class="landing-action" href={data.initialized ? '/login' : '/setup'}>
          {data.initialized ? messages['login.title'] : messages['setup.title']}
          <span aria-hidden="true">→</span>
        </a>
      </div>
      <div class="route-art" aria-hidden="true">
        <div class="art-grid"></div>
        <svg
          viewBox="0 0 480 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M85 87v106c0 24 19 43 43 43h260"
            stroke="var(--brand-on-ink)"
            stroke-width="9"
            stroke-linecap="round"
          />
          <path
            d="M216 236l116-116h57"
            stroke="var(--brand-signal)"
            stroke-width="9"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <circle cx="85" cy="87" r="13" fill="var(--brand-on-ink)" /><circle
            cx="389"
            cy="120"
            r="13"
            fill="var(--brand-signal)"
          /><circle cx="388" cy="236" r="13" fill="var(--brand-on-ink)" />
        </svg>
      </div>
    </section>
  </div>
  <div class="landing-content">
    <div class="landing-inner">
      <div class="features">
        {#each features as feature (feature.title)}
          <article>
            <div class="feature-icon">
              <feature.icon size={22} aria-hidden="true" />
            </div>
            <h2>{feature.title}</h2>
            <p>{feature.detail}</p>
          </article>
        {/each}
      </div>
      <section class="ownership">
        <div>
          <h2>{copy.ownership[0]}</h2>
          <p>{copy.ownership[1].replaceAll('Linkrovia', () => brand.name)}</p>
          <a
            class="guide-link"
            href={brand.repository + '/blob/main/docs/development.md'}
          >
            {copy.guide} <span aria-hidden="true">↗</span>
          </a>
        </div>
        <figure class="analytics-example">
          <figcaption>{copy.example}</figcaption>
          <div class="example-bars" aria-hidden="true">
            {#each [38, 49, 42, 67, 58, 80, 74] as height (height)}
              <span style:block-size={`${height}%`}></span>
            {/each}
          </div>
        </figure>
      </section>
    </div>
  </div>
  <div class="landing-inner">
    <form method="POST" class="landing-footer">
      <div>
        <label for="locale">{messages['language.label']}</label>
        <select id="locale" name="locale">
          {#each locales as locale (locale)}<option
              value={locale}
              lang={locale}
              selected={locale === data.locale}
            >
              {localeNames[locale]}
            </option>{/each}
        </select>
      </div>
      <button type="submit">{messages['language.save']}</button>
      {#if form?.invalidLocale}<p role="alert">
          {messages['language.invalid']}
        </p>{/if}
    </form>
    <footer class="site-footer">
      <a href={brand.repository + '/blob/main/LICENSE'}>MIT</a>
      <p>{copy.independent}</p>
    </footer>
  </div>
</main>

<style>
  .landing {
    min-height: 100dvh;
    background: var(--brand-ink);
    color: var(--brand-on-ink);
  }
  .landing-inner {
    max-width: 1280px;
    margin: auto;
    padding: 0 32px;
  }
  .landing-bar {
    min-height: 88px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 1px solid var(--brand-ink-panel);
  }
  .landing-source {
    color: var(--brand-on-ink);
    font-size: 0.9rem;
    font-weight: 600;
    text-decoration: none;
  }
  .landing-source span {
    color: var(--brand-signal);
    margin-left: 0.25rem;
  }
  .hero {
    min-height: 570px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
    gap: 48px;
    padding: 72px 0;
  }
  h1 {
    font-size: clamp(2.7rem, 5.2vw, 4.6rem);
    font-weight: 700;
    letter-spacing: -0.045em;
    line-height: 1.08;
    overflow-wrap: anywhere;
  }
  h1 span {
    display: block;
    color: var(--brand-signal);
  }
  .description {
    max-width: 35rem;
    margin-top: 24px;
    color: var(--brand-muted-on-ink);
    font-size: 1.1rem;
    line-height: 1.7;
  }
  .landing-action {
    display: inline-flex;
    align-items: center;
    gap: 36px;
    min-height: 48px;
    margin-top: 32px;
    padding: 12px 18px;
    border-radius: var(--ui-radius-sm);
    background: var(--brand-signal);
    color: var(--brand-ink);
    font-weight: 700;
    text-decoration: none;
  }
  .landing-action:hover {
    filter: brightness(1.1);
  }
  .route-art {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--brand-ink-panel);
    border-radius: var(--ui-radius-lg);
    background: var(--brand-ink-panel);
  }
  .art-grid {
    position: absolute;
    inset: 0;
    opacity: 0.12;
    background-image:
      linear-gradient(var(--brand-muted-on-ink) 1px, transparent 1px),
      linear-gradient(90deg, var(--brand-muted-on-ink) 1px, transparent 1px);
    background-size: 32px 32px;
  }
  .route-art svg {
    position: relative;
    display: block;
    width: 100%;
  }
  .landing-content {
    background: var(--ui-background);
    color: var(--ui-text);
    padding-block: clamp(2.5rem, 7vw, 5rem);
  }
  .features,
  .ownership {
    display: grid;
    gap: 24px;
  }
  .features {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .features article,
  .analytics-example {
    padding: 24px;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    background: var(--ui-surface);
  }
  .feature-icon {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    border-radius: var(--ui-radius-sm);
    background: var(--ui-accent-surface);
    color: var(--ui-link);
  }
  .landing-content h2 {
    margin: 14px 0 8px;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.3;
  }
  .landing-content p {
    color: var(--ui-text-muted);
    line-height: 1.6;
  }
  .ownership {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: center;
    margin-top: 40px;
  }
  .guide-link {
    display: inline-flex;
    gap: 8px;
    margin-top: 16px;
    color: var(--ui-link);
    font-weight: 650;
    text-decoration: underline;
  }
  .analytics-example figcaption {
    color: var(--ui-text-muted);
    font-size: 0.875rem;
    font-weight: 600;
  }
  .example-bars {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    align-items: end;
    gap: 10px;
    height: 8rem;
    border-bottom: 1px solid var(--ui-control-border);
  }
  .example-bars span {
    border-radius: 4px 4px 0 0;
    background: var(--ui-series-2);
  }
  .landing-content :focus-visible {
    outline-color: var(--ui-focus);
  }
  .landing-footer {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 12px;
    padding: 28px 0;
  }
  .landing-footer label {
    display: block;
    margin-bottom: 6px;
    color: var(--brand-muted-on-ink);
    font-size: 0.8rem;
  }
  .landing-footer select,
  .landing-footer button {
    min-height: 42px;
    border: 1px solid var(--brand-muted-on-ink);
    border-radius: var(--ui-radius-sm);
    padding: 8px 12px;
    background: var(--brand-ink);
    color: var(--brand-on-ink);
  }
  .landing-footer p {
    width: 100%;
  }
  .site-footer {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    padding: 20px 0 32px;
    border-top: 1px solid var(--brand-ink-border);
    color: var(--brand-muted-on-ink);
    font-size: 0.875rem;
  }
  .site-footer a {
    color: var(--brand-on-ink);
    text-decoration: underline;
  }
  a:focus-visible,
  button:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--brand-focus-on-ink);
    outline-offset: 3px;
  }
  @media (max-width: 767px) {
    .landing-inner {
      padding: 0 20px;
    }
    .landing-bar {
      min-height: 72px;
    }
    .hero {
      min-height: auto;
      grid-template-columns: minmax(0, 1fr);
      gap: 40px;
      padding: 64px 0 48px;
    }
    .route-art {
      max-width: 460px;
    }
    .features,
    .ownership {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
