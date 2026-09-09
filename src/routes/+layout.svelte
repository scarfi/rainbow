<script lang="ts">
  import '../app.css';
<<<<<<< Updated upstream
=======
  import { onMount } from 'svelte';

  const clientKey = import.meta.env.VITE_CONNECTLY_CLIENT_KEY?.trim();

  onMount(() => {
    // The widget accesses browser globals and cannot run during prerendering.
    if (clientKey) void import('@connectly/webchat');
  });
>>>>>>> Stashed changes
  let { children } = $props();
</script>

{@render children()}
<<<<<<< Updated upstream
=======

{#if clientKey}
  <connectly-webchat client-key={clientKey}></connectly-webchat>
{/if}
>>>>>>> Stashed changes
