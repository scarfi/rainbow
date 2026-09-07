<script lang="ts">
  import { beursaultTotals } from '$lib/model';
  import type { MessageKey } from '$lib/i18n';
  let { ends, t }: { ends: string[][]; t: (key: MessageKey) => string } =
    $props();
  const result = $derived(beursaultTotals(ends));
</script>

<div class="beursault-summary" aria-label={t('Beursault score')}>
  <span><strong>{result.honneurs}</strong><span>{t('Honneurs')}</span></span>
  <span><strong>{result.points}</strong><span>{t('Points')}</span></span>
  <span><strong>{result.chapelets}</strong><span>{t('Chapelets')}</span></span>
  <span><strong>{result.noirs}</strong><span>{t('Noirs')}</span></span>
</div>
