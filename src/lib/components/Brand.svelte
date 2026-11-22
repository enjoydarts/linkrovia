<script lang="ts">
  let {
    href = '/',
    iconOnly = false,
    class: className = '',
  }: {
    href?: string;
    iconOnly?: boolean;
    class?: string;
  } = $props();
</script>

<a
  {href}
  class={`brand-lockup ${className}`}
  aria-label={iconOnly ? 'Linkrovia' : undefined}
>
  <img src="/linkrovia-logo.png" width="42" height="42" alt="" />
  {#if !iconOnly}<span>Linkrovia</span>{/if}
</a>
