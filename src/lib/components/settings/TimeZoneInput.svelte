<script lang="ts">
  let {
    id,
    name,
    zones,
    value = $bindable(''),
    describedby,
    required = false,
    disabled = false,
  }: {
    id: string;
    name: string;
    zones: string[];
    value?: string;
    describedby?: string;
    required?: boolean;
    disabled?: boolean;
  } = $props();

  let open = $state(false);
  let query = $state('');
  let active = $state(-1);
  let matches = $derived(
    zones.filter((zone) =>
      zone
        .toLowerCase()
        .replaceAll('_', ' ')
        .includes(query.toLowerCase().replaceAll('_', ' ').trim()),
    ),
  );
  let expanded = $derived(open && matches.length > 0 && !disabled);

  function choose(zone: string) {
    value = zone;
    open = false;
    active = -1;
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      open = false;
      active = -1;
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        query = '';
        open = true;
      }
      if (matches.length) {
        active =
          event.key === 'ArrowDown'
            ? Math.min(active + 1, matches.length - 1)
            : active < 0
              ? matches.length - 1
              : Math.max(active - 1, 0);
        requestAnimationFrame(() =>
          document
            .getElementById(`${id}-option-${active}`)
            ?.scrollIntoView({ block: 'nearest' }),
        );
      }
    } else if (event.key === 'Enter' && expanded && active >= 0) {
      event.preventDefault();
      choose(matches[active]);
    }
  }
</script>

<div class="relative">
  <input
    {id}
    {name}
    {required}
    {disabled}
    type="text"
    bind:value
    aria-describedby={describedby}
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={expanded}
    aria-controls={expanded ? `${id}-options` : undefined}
    aria-activedescendant={expanded && active >= 0
      ? `${id}-option-${active}`
      : undefined}
    autocomplete="off"
    class="admin-control w-full"
    onfocus={() => {
      query = '';
      active = -1;
      open = true;
    }}
    oninput={() => {
      query = value;
      active = -1;
      open = true;
    }}
    onblur={() => {
      setTimeout(() => {
        open = false;
        active = -1;
      }, 150);
    }}
    onkeydown={keydown}
  />
  {#if expanded}
    <ul id={`${id}-options`} role="listbox" class="zone-options">
      {#each matches as zone, index (zone)}
        <!-- svelte-ignore a11y_click_events_have_key_events: keyboard selection is handled by the combobox -->
        <li
          id={`${id}-option-${index}`}
          role="option"
          aria-selected={active === index}
          class:active={active === index}
          onmousedown={(event) => event.preventDefault()}
          onclick={() => choose(zone)}
        >
          {zone.replaceAll('_', ' ').replaceAll('/', ' · ')}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .zone-options {
    position: absolute;
    z-index: 20;
    top: 100%;
    left: 0;
    right: 0;
    max-height: 15rem;
    overflow-y: auto;
    margin-top: 0.25rem;
    padding: 0.25rem;
    background: var(--color-surface, white);
    border: 1px solid var(--color-line, #ccc);
    border-radius: 0.5rem;
    box-shadow: 0 8px 20px rgb(0 0 0 / 0.12);
  }
  .zone-options li {
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    border-radius: 0.25rem;
  }
  .zone-options li:hover,
  .zone-options li.active {
    background: var(--color-accent-surface);
  }
</style>
