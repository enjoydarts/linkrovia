<script lang="ts">
  import { uiMessages, type Locale } from '$lib/i18n/locale';

  let { locale }: { locale: Locale } = $props();
</script>

<p class="text-sm text-muted">{uiMessages(locale).demo.settingsReadOnly}</p>
