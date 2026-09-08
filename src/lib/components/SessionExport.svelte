<script lang="ts">
  import type { MessageKey } from '$lib/i18n';
  import type { ExportFormat } from '$lib/exports';
  let {
    label,
    disabled = false,
    t,
    onexport,
  }: {
    label: MessageKey;
    disabled?: boolean;
    t: (key: MessageKey) => string;
    onexport: (format: ExportFormat) => void;
  } = $props();
</script>

<details class="session-export">
  <summary>{t(label)}</summary>
  <div class="export-options">
    <button class="secondary" {disabled} onclick={() => onexport('csv')}
      >{t('CSV spreadsheet')}</button
    >
    <button class="secondary" {disabled} onclick={() => onexport('json')}
      >{t('JSON full details')}</button
    >
  </div>
</details>
