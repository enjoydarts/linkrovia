<script lang="ts">
  import { page } from '$app/state';
  import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
  import Link2 from '@lucide/svelte/icons/link-2';
  import ChartNoAxesCombined from '@lucide/svelte/icons/chart-no-axes-combined';
  import { analyticsMessages } from '$lib/components/analytics/messages';
  import Upload from '@lucide/svelte/icons/upload';
  import Archive from '@lucide/svelte/icons/archive';
  import { backupMessages } from './backup/messages';
  import Route from '@lucide/svelte/icons/route';
  import Globe from '@lucide/svelte/icons/globe';
  import Settings from '@lucide/svelte/icons/settings';
  import Shield from '@lucide/svelte/icons/shield';
  import KeyRound from '@lucide/svelte/icons/key-round';
  import Menu from '@lucide/svelte/icons/menu';
  import X from '@lucide/svelte/icons/x';
  import { csvMessages } from './import/messages';
  import { brand } from '$lib/brand';
  import Brand from '$lib/components/Brand.svelte';
  import { messagesFor } from '$lib/i18n/locale';
  import { linkMessages } from '$lib/i18n/links';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import type { LayoutProps } from './$types';
  import './admin-context.css';

  let { data, children }: LayoutProps = $props();
  let messages = $derived(messagesFor(data.locale));
  let links = $derived(linkMessages(data.locale));
  let preferences = $derived(preferenceMessages(data.locale));
  let nav = $derived([
    {
      href: '/admin',
      label: messages['admin.overview'],
      icon: LayoutDashboard,
    },
    { href: '/admin/links', label: links.links, icon: Link2 },
    {
      href: '/admin/analytics',
      label: analyticsMessages(data.locale).title,
      icon: ChartNoAxesCombined,
    },
    {
      href: '/admin/import',
      label: csvMessages(data.locale).title,
      icon: Upload,
    },
    ...(data.user.role === 'owner'
      ? [
          {
            href: '/admin/backup',
            label: backupMessages(data.locale).title,
            icon: Archive,
          },
          {
            href: '/admin/integrations/mcp',
            label: 'MCP',
            icon: Route,
          },
        ]
      : []),
    { href: '/admin/utm', label: 'UTM', icon: Route },
    { href: '/admin/domains', label: links.domains, icon: Globe },
    { href: '/admin/settings', label: preferences.settings, icon: Settings },
    {
      href: '/admin/settings/security',
      label: messages['admin.security'],
      icon: Shield,
    },
    {
      href: '/admin/api-keys',
      label: messages['admin.apiKeys'],
      icon: KeyRound,
    },
  ]);
  const groupLabels = {
    en: ['Workspace', 'Manage'],
    ja: ['ワークスペース', '管理'],
    'zh-CN': ['工作区', '管理'],
    'zh-TW': ['工作區', '管理'],
    es: ['Espacio de trabajo', 'Administrar'],
    it: ['Area di lavoro', 'Gestione'],
    fr: ['Espace de travail', 'Gestion'],
  } as const;
  let currentItem = $derived(
    nav.find((item) => active(item.href, page.url.pathname)) ?? nav[0],
  );
  let drawer: HTMLDialogElement;
  const menuLabels = {
    en: 'Open navigation',
    ja: 'ナビゲーションを開く',
    'zh-CN': '打开导航',
    'zh-TW': '開啟導覽',
    es: 'Abrir navegación',
    it: 'Apri navigazione',
    fr: 'Ouvrir la navigation',
  };
  const closeLabels = {
    en: 'Close navigation',
    ja: 'ナビゲーションを閉じる',
    'zh-CN': '关闭导航',
    'zh-TW': '關閉導覽',
    es: 'Cerrar navegación',
    it: 'Chiudi navigazione',
    fr: 'Fermer la navigation',
  };
  function active(href: string, path: string) {
    return href === '/admin' || href === '/admin/settings'
      ? href === path
      : path === href || path.startsWith(`${href}/`);
  }
</script>

{#snippet navigation()}
  <nav aria-label={messages['admin.title']} class="navigation">
    {#each nav as item, index (item.href)}
      {#if index === 0 || item.href === '/admin/import'}
        <p class="nav-group">{groupLabels[data.locale][index === 0 ? 0 : 1]}</p>
      {/if}
      <a
        href={item.href}
        aria-current={active(item.href, page.url.pathname)
          ? item.href === page.url.pathname
            ? 'page'
            : 'location'
          : undefined}
        onclick={() => drawer?.close()}
      >
        <span class="nav-icon">
          <item.icon size={18} strokeWidth={1.8} aria-hidden="true" />
        </span>
        <span>{item.label}</span>
        {#if active(item.href, page.url.pathname)}
          <span class="current-position" aria-hidden="true"></span>
        {/if}
      </a>
    {/each}
  </nav>
{/snippet}
<div class="admin-shell">
  <aside class="sidebar">
    <div class="brand-wrap"><Brand href="/admin" tone="dark" /></div>
    {@render navigation()}
  </aside>
  <dialog
    id="admin-navigation"
    class="drawer"
    bind:this={drawer}
    aria-label={messages['admin.title']}
  >
    <div class="drawer-header">
      <Brand href="/admin" tone="dark" />
      <form method="dialog">
        <button
          class="drawer-close"
          type="submit"
          aria-label={closeLabels[data.locale]}
        >
          <X size={22} />
        </button>
      </form>
    </div>
    {@render navigation()}
  </dialog>
  <div class="admin-content">
    <header class="topbar">
      <button
        class="menu-button"
        type="button"
        aria-label={menuLabels[data.locale]}
        aria-haspopup="dialog"
        aria-controls="admin-navigation"
        commandfor="admin-navigation"
        command="show-modal"
        onclick={(event) => {
          if (!('commandForElement' in event.currentTarget)) drawer.showModal();
        }}
      >
        <Menu size={23} />
      </button>
      <div class="topbar-context">
        <span>{brand.name}</span><strong>{currentItem.label}</strong>
      </div>
      <div class="topbar-account">
        <span class="account-mark" aria-hidden="true">
          {data.user.email.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <span class="account-email">{data.user.email}</span><span
            class="account-zone"
          >
            {preferences.effective}: {data.timeZone}
          </span>
        </div>
      </div>
      <form method="POST" action="/logout">
        <input type="hidden" name="csrfToken" value={data.csrfToken} /><button
          type="submit"
          class="signout"
        >
          {messages['admin.signOut']}
        </button>
      </form>
    </header>
    <main class="main-content">{@render children()}</main>
  </div>
</div>

<style>
  .admin-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 240px minmax(0, 1fr);
    background: var(--ui-background);
    color: var(--ui-text);
  }
  .sidebar,
  .drawer {
    background: var(--brand-ink);
    color: var(--brand-on-ink);
  }
  .sidebar {
    padding: 30px 18px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .brand-wrap {
    padding: 0 10px 24px;
  }
  .navigation {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .nav-group {
    margin: 20px 13px 8px;
    color: var(--brand-muted-on-ink);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.11em;
    text-transform: uppercase;
    opacity: 0.8;
  }
  .navigation a {
    display: grid;
    grid-template-columns: 27px minmax(0, 1fr) 6px;
    align-items: center;
    gap: 8px;
    min-height: 40px;
    padding: 6px 11px 6px 8px;
    border: 1px solid transparent;
    border-radius: 10px;
    color: var(--brand-muted-on-ink);
    font-size: 14px;
    font-weight: 530;
    text-decoration: none;
    transition:
      background-color 140ms ease,
      border-color 140ms ease,
      color 140ms ease;
  }
  .nav-icon {
    display: grid;
    width: 27px;
    height: 27px;
    place-items: center;
    border-radius: 7px;
  }
  .navigation a:hover {
    background: var(--brand-ink-panel);
    color: var(--brand-on-ink);
  }
  .navigation a[aria-current] {
    background: color-mix(
      in srgb,
      var(--brand-ink-panel) 95%,
      var(--brand-signal)
    );
    border-color: var(--brand-ink-border);
    color: var(--brand-on-ink);
    font-weight: 640;
  }
  .navigation a[aria-current] .nav-icon {
    background: color-mix(in srgb, var(--brand-signal) 13%, transparent);
    color: var(--brand-focus-on-ink);
  }
  .current-position {
    width: 5px;
    height: 5px;
    justify-self: end;
    border-radius: 50%;
    background: var(--brand-focus-on-ink);
  }
  .navigation a:focus-visible,
  .drawer-close:focus-visible {
    outline: 3px solid var(--brand-focus-on-ink);
    outline-offset: 2px;
  }
  .admin-content {
    min-width: 0;
  }
  .topbar {
    min-height: 76px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 24px;
    padding: 14px 40px;
    border-bottom: 1px solid var(--ui-border);
    background: var(--ui-surface);
  }
  .topbar-context {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-right: auto;
    color: var(--ui-text-muted);
    font-size: 13px;
  }
  .topbar-context strong {
    color: var(--ui-text);
    font-weight: 650;
  }
  .topbar-context strong::before {
    content: '/';
    color: var(--ui-border);
    margin-right: 12px;
  }
  .topbar-account {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .account-mark {
    display: grid;
    place-items: center;
    flex: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--ui-accent-surface);
    color: var(--ui-link);
    font-weight: 700;
  }
  .account-email,
  .account-zone {
    display: block;
    overflow-wrap: anywhere;
  }
  .account-email {
    font-size: 13px;
    font-weight: 650;
  }
  .account-zone {
    margin-top: 2px;
    color: var(--ui-text-muted);
    font-size: 11px;
  }
  .signout {
    color: var(--ui-text-muted);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .signout:hover {
    color: var(--ui-link);
    text-decoration: underline;
  }
  .main-content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 48px 40px 80px;
  }
  .menu-button {
    display: none;
  }
  .drawer {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(280px, 85vw);
    max-height: none;
    height: 100dvh;
    margin: 0;
    padding: 24px 16px;
    border: 0;
  }
  .drawer::backdrop {
    background: rgb(0 0 0 / 55%);
  }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 0 8px 32px;
  }
  .drawer-close {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    color: var(--brand-on-ink);
  }
  @media (max-width: 767px) {
    .admin-shell {
      display: block;
    }
    .sidebar {
      display: none;
    }
    .topbar {
      min-height: 68px;
      gap: 12px;
      padding: 12px 20px;
    }
    .menu-button {
      display: grid;
      place-items: center;
      flex: none;
      width: 44px;
      height: 44px;
      margin-right: auto;
      color: var(--ui-text);
    }
    .topbar-context {
      display: none;
    }
    .account-mark {
      display: none;
    }
    .main-content {
      padding: 32px 20px 60px;
    }
  }
</style>
