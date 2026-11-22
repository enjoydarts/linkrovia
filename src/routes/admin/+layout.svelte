<script lang="ts">
  import { page } from '$app/state';
  import { csvMessages } from './import/messages';
  import Brand from '$lib/components/Brand.svelte';
  import { messagesFor } from '$lib/i18n/locale';
  import { linkMessages } from '$lib/i18n/links';
  import { preferenceMessages } from '$lib/i18n/preferences';
  import type { LayoutProps } from './$types';

  let { data, children }: LayoutProps = $props();
  let messages = $derived(messagesFor(data.locale));
  let links = $derived(linkMessages(data.locale));
  let preferences = $derived(preferenceMessages(data.locale));
  let nav = $derived([
    { href: '/admin', label: messages['admin.overview'], icon: '◫' },
    { href: '/admin/links', label: links.links, icon: '↗' },
    { href: '/admin/import', label: csvMessages(data.locale).title, icon: '⇧' },
    { href: '/admin/utm', label: 'UTM', icon: '⌘' },
    { href: '/admin/domains', label: links.domains, icon: '◎' },
    { href: '/admin/settings', label: preferences.settings, icon: '⚙' },
    {
      href: '/admin/settings/security',
      label: messages['admin.security'],
      icon: '◇',
    },
    { href: '/admin/api-keys', label: messages['admin.apiKeys'], icon: '⌁' },
  ]);
  function active(href: string, path: string) {
    return href === '/admin' || href === '/admin/settings'
      ? href === path
      : path === href || path.startsWith(`${href}/`);
  }
</script>

<div class="admin-shell">
  <aside class="sidebar">
    <div class="brand-wrap"><Brand href="/admin" /></div>
    <nav aria-label={messages['admin.title']} class="navigation">
      {#each nav as item (item.href)}
        <a
          href={item.href}
          aria-current={active(item.href, page.url.pathname)
            ? 'page'
            : undefined}
          class:active={active(item.href, page.url.pathname)}
        >
          <span class="nav-icon" aria-hidden="true">{item.icon}</span><span>
            {item.label}
          </span>
        </a>
      {/each}
    </nav>
  </aside>
  <div class="admin-content">
    <header class="topbar">
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
    grid-template-columns: 248px minmax(0, 1fr);
    background: var(--canvas);
    color: var(--ink);
  }
  .sidebar {
    background: var(--rail);
    color: #d7e2da;
    display: flex;
    flex-direction: column;
    padding: 28px 16px;
  }
  .brand-wrap {
    padding: 0 10px 35px;
    color: #fff;
  }
  .navigation {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .navigation a {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 11px 13px;
    border-radius: 9px;
    color: #bdcbc2;
    font-size: 14px;
    font-weight: 550;
    text-decoration: none;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .navigation a:hover,
  .navigation a.active {
    background: #30483e;
    color: #fff;
  }
  .navigation a:focus-visible,
  .signout:focus-visible {
    outline: 3px solid #a9d0aa;
    outline-offset: 2px;
  }
  .navigation a.active {
    box-shadow: inset 3px 0 #a9d0aa;
  }
  .nav-icon {
    width: 20px;
    text-align: center;
    font-size: 17px;
    line-height: 1;
    color: #a7c0af;
  }
  .admin-content {
    min-width: 0;
  }
  .topbar {
    min-height: 78px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 24px;
    padding: 14px 40px;
    border-bottom: 1px solid var(--line);
    background: var(--surface);
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
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #e2eee3;
    color: #345c40;
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
    color: var(--muted);
    font-size: 11px;
  }
  .signout {
    color: var(--muted);
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
  }
  .signout:hover {
    color: var(--accent-light);
    text-decoration: underline;
  }
  .main-content {
    max-width: 1280px;
    margin: 0 auto;
    padding: 48px 48px 80px;
  }
  @media (max-width: 760px) {
    .admin-shell {
      display: block;
    }
    .sidebar {
      padding: 18px 18px 12px;
    }
    .brand-wrap {
      padding: 0 2px 15px;
    }
    .navigation {
      flex-direction: row;
      overflow-x: auto;
      gap: 4px;
    }
    .navigation a {
      flex: none;
      padding: 9px 10px;
    }
    .navigation a:focus-visible,
    .signout:focus-visible {
      outline: 3px solid #a9d0aa;
      outline-offset: 2px;
    }
    .navigation a.active {
      box-shadow: inset 0 -3px #a9d0aa;
    }
    .nav-icon {
      display: none;
    }
    .topbar {
      padding: 12px 20px;
      min-height: 68px;
    }
    .main-content {
      padding: 32px 20px 60px;
    }
  }
</style>
