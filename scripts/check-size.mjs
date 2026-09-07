import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
async function walk(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : `${dir}/${e.name}`,
      ),
    )
  ).flat();
}
const files = (await walk('build')).filter((f) => f.endsWith('.js'));
const size = (
  await Promise.all(files.map(async (f) => gzipSync(await readFile(f)).length))
).reduce((a, b) => a + b, 0);
console.log(
  `All shipped JavaScript: ${(size / 1024).toFixed(1)} KiB gzip (${files.length} files); budget: 300 KiB.`,
);
if (size > 300 * 1024) process.exitCode = 1;
