<script lang="ts">
  import type { MessageKey } from '$lib/i18n';
  import type { SyncState } from '$lib/sync/types';
  let {
    t,
    userId,
    status,
    pending,
    conflicts,
    syncing,
    online,
    onsync,
    onresolve,
  }: {
    t: (key: MessageKey) => string;
    userId: string | null;
    status: MessageKey;
    pending: number;
    conflicts: SyncState[];
    syncing: boolean;
    online: boolean;
    onsync: () => void;
    onresolve: (key: string) => void;
  } = $props();
</script>

<div class="sync-status">
  {#if userId}
    <span role="status"
      >{t(!online ? 'Offline. Changes will sync when connected.' : status)}
      {#if pending}({pending} {t('pending')}){/if}</span
    >
    <button class="secondary" disabled={syncing || !online} onclick={onsync}
      >{t('Sync now')}</button
    >
    {#if conflicts.length}<p>
        {t(
          'Another device changed these records. Keep both versions to preserve all edits.',
        )}
      </p>
      {#each conflicts as item (item.key)}<div class="sync-conflict">
          <span
            >{item.kind === 'session'
              ? (item.conflict?.payload as import('$lib/model').Session)
                  ?.title || t('Untitled practice')
              : (item.conflict?.payload as import('$lib/model').Setup)
                  ?.name}</span
          >
          <button class="secondary" onclick={() => onresolve(item.key)}
            >{t('Keep both versions')}</button
          >
        </div>{/each}
    {/if}
  {:else}<p>
      {t(
        'Guest journal. Sign in to start a separate journal that syncs across devices.',
      )}
    </p>{/if}
</div>
