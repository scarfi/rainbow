/// <reference lib="webworker" />
import { base, build, files, prerendered, version } from '$service-worker';
const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE_PREFIX = `rainbow-shell-${encodeURIComponent(base || '/')}-`;
const CACHE = `${CACHE_PREFIX}${version}`;
const APP_ROOT = `${base}/`;
const assets = [...new Set([...build, ...files, ...prerendered, APP_ROOT])];
worker.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(assets)));
  // Let existing tabs close before activating a new application version.
});
worker.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith(CACHE_PREFIX) && key !== CACHE)
          await caches.delete(key);
      await worker.clients.claim();
    })(),
  );
});
worker.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== worker.location.origin)
    return;
  // Cache only the app shell: future authenticated API responses must not enter this cache.
  if (
    !assets.includes(url.pathname) &&
    !(event.request.mode === 'navigate' && url.pathname === APP_ROOT)
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(url.pathname);
      return cached ?? fetch(event.request);
    })(),
  );
});
