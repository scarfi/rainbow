import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { expect, it } from 'vitest';

function workerHarness(base = '') {
  const listeners: Record<string, (event: any) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        addAll: async (paths: string[]) => {
          for (const path of paths)
            store.set(path, new Response(`cached:${path}`));
        },
        match: async (path: string) => store.get(path)?.clone(),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const source = readFileSync(
    new URL('../src/service-worker.ts', import.meta.url),
    'utf8',
  ).replace(
    /import .* from '\$service-worker';/,
    `const base=${JSON.stringify(base)}; const build=['${base}/app.js']; const files=['${base}/icon.svg']; const prerendered=['${base}/']; const version='test';`,
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText;
  runInNewContext(compiled, {
    self: {
      addEventListener: (name: string, listener: (event: any) => void) =>
        (listeners[name] = listener),
      location: { origin: 'https://rainbow.test' },
      clients: { claim: async () => {} },
    },
    caches,
    URL,
    fetch: async () => {
      throw new Error('offline');
    },
  });
  async function lifecycle(name: string) {
    let promise = Promise.resolve();
    listeners[name]({ waitUntil: (p: Promise<void>) => (promise = p) });
    await promise;
  }
  async function request(path: string, mode = 'navigate', method = 'GET') {
    let response: Promise<Response> | undefined;
    listeners.fetch({
      request: { url: `https://rainbow.test${path}`, method, mode },
      respondWith: (p: Promise<Response>) => (response = p),
    });
    return response;
  }
  return { lifecycle, request, stores };
}
it('serves the cached app and code with the network unavailable', async () => {
  const h = workerHarness();
  await h.lifecycle('install');
  expect(await (await h.request('/'))?.text()).toBe('cached:/');
  expect(await (await h.request('/app.js', 'cors'))?.text()).toBe(
    'cached:/app.js',
  );
});
it('never intercepts account APIs or writes', async () => {
  const h = workerHarness();
  await h.lifecycle('install');
  expect(await h.request('/api/training', 'cors')).toBeUndefined();
  expect(await h.request('/', 'navigate', 'POST')).toBeUndefined();
});
it('cleans only old rainbow shell caches on activation', async () => {
  const h = workerHarness();
  h.stores.set('rainbow-shell-%2F-old', new Map());
  h.stores.set('unrelated-cache', new Map());
  await h.lifecycle('install');
  await h.lifecycle('activate');
  expect([...h.stores.keys()].sort()).toEqual([
    'rainbow-shell-%2F-test',
    'unrelated-cache',
  ]);
});

it('serves a GitHub project path offline without intercepting the origin root', async () => {
  const h = workerHarness('/rainbow');
  await h.lifecycle('install');
  expect(await (await h.request('/rainbow/'))?.text()).toBe('cached:/rainbow/');
  expect(await (await h.request('/rainbow/app.js', 'cors'))?.text()).toBe(
    'cached:/rainbow/app.js',
  );
  expect(await h.request('/')).toBeUndefined();
  expect(await h.request('/another-project/')).toBeUndefined();
});
it('leaves another project deployment cache intact', async () => {
  const h = workerHarness('/rainbow');
  h.stores.set('rainbow-shell-%2Fother-old', new Map());
  h.stores.set('rainbow-shell-%2Frainbow-old', new Map());
  await h.lifecycle('install');
  await h.lifecycle('activate');
  expect([...h.stores.keys()].sort()).toEqual([
    'rainbow-shell-%2Fother-old',
    'rainbow-shell-%2Frainbow-test',
  ]);
});
