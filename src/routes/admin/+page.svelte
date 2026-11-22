<script lang="ts">
  import { messagesFor } from '$lib/i18n/locale';
  import { linkMessages } from '$lib/i18n/links';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import type { PageProps } from './$types';
  let { data }: PageProps = $props();
  let messages = $derived(messagesFor(data.locale));
  let links = $derived(linkMessages(data.locale));
  let preferences = $derived(preferenceMessages(data.locale));
</script>

<svelte:head><title>{messages['admin.title']} · Linkrovia</title></svelte:head>
<div class="overview">
  <header class="overview-header">
    <h1>{messages['admin.title']}</h1>
  </header>
  <div class="cards">
    <a href="/admin/links/new" class="card primary">
      <span class="card-icon" aria-hidden="true">↗</span><span
        class="card-name"
      >
        {links.links}
      </span><span class="card-action">
        {links.create} <span aria-hidden="true">→</span>
      </span>
    </a>
    <a href="/admin/domains" class="card">
      <span class="card-icon" aria-hidden="true">◎</span><span
        class="card-name"
      >
        {links.domains}
      </span><span class="card-action">
        {links.addDomain} <span aria-hidden="true">→</span>
      </span>
    </a>
    <a href="/admin/settings" class="card">
      <span class="card-icon" aria-hidden="true">⚙</span><span
        class="card-name"
      >
        {preferences.settings}
      </span><span class="card-action">
        {preferences.regional} <span aria-hidden="true">→</span>
      </span>
    </a>
  </div>
  <section class="recent" aria-labelledby="recent-links">
    <div class="recent-heading">
      <h2 id="recent-links">{messages['admin.recent']}</h2>
      <a href="/admin/links">{links.links} <span aria-hidden="true">→</span></a>
    </div>
    {#if data.recentLinks.length}
      <ul>
        {#each data.recentLinks as link (link.id)}
          <li>
            <a class="recent-item" href={`/admin/links/${link.id}`}>
              {#if link.title}<strong>{link.title}</strong>{/if}
              <span>{link.shortUrl.replace(/^https?:\/\//, '')}</span>
            </a>
            <span class:enabled={link.isActive} class="state-indicator">
              {link.isActive ? links.active : links.inactive}
            </span>
          </li>
        {/each}
      </ul>
    {:else}
      <p>{links.empty}</p>
    {/if}
  </section>
</div>

<style>
  .overview {
    max-width: 1100px;
  }
  .overview-header {
    margin-bottom: 36px;
  }
  h1 {
    font-size: clamp(30px, 4vw, 40px);
    font-weight: 650;
    letter-spacing: -0.04em;
    line-height: 1.1;
  }
  .cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  .card {
    display: flex;
    min-height: 174px;
    flex-direction: column;
    align-items: flex-start;
    padding: 23px;
    border: 1px solid var(--line);
    border-radius: 14px;
    background: var(--surface);
    color: var(--ink);
    text-decoration: none;
    transition:
      border-color 0.15s,
      transform 0.15s;
  }
  .card:hover {
    border-color: #8eae94;
    transform: translateY(-2px);
  }
  .card-icon {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: #edf4eb;
    color: #3e7650;
    font-size: 22px;
  }
  .card-name {
    margin-top: 18px;
    font-size: 16px;
    font-weight: 650;
  }
  .card-action {
    margin-top: auto;
    padding-top: 10px;
    color: var(--muted);
    font-size: 13px;
  }
  @media (max-width: 760px) {
    .cards {
      grid-template-columns: 1fr;
    }
    .card {
      min-height: 145px;
    }
  }

  .recent {
    margin-top: 2.4rem;
  }
  .recent-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.85rem;
  }
  .recent-heading h2 {
    font-size: 1.21rem;
    font-weight: 680;
    letter-spacing: -0.025em;
  }
  .recent-heading > a {
    color: var(--muted);
    font-weight: 610;
    font-size: 0.86rem;
    white-space: nowrap;
  }
  .recent ul {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 0.9rem;
    background: var(--surface);
  }
  .recent li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.82rem 1.05rem;
  }
  .recent li + li {
    border-top: 1px solid var(--line);
  }
  .recent-item {
    min-width: 0;
    display: grid;
    gap: 0.2rem;
  }
  .recent-item:hover strong,
  .recent-item:hover span {
    text-decoration: underline;
  }
  .recent-item span {
    overflow-wrap: anywhere;
    color: var(--muted);
    font-size: 0.83rem;
  }
  .state-indicator {
    flex: none;
    border-radius: 999px;
    padding: 0.3rem 0.58rem;
    color: var(--muted);
    background: var(--canvas);
    font-size: 0.76rem;
  }
  .state-indicator.enabled {
    color: light-dark(#23563c, #d0e7d6);
    background: light-dark(#e7f1e8, #304336);
  }
  .recent > p {
    color: var(--muted);
  }
</style>
