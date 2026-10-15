/** Run the resource's TypeScript resource regressions with the existing Vite/esbuild
 * dependency. The generated test bundle lives only in the OS temporary folder. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const folder = await fs.mkdtemp(path.join(os.tmpdir(), 'flying-resources-resilience-'));
const output = path.join(folder, 'check.mjs');
try {
  const result = await build({
    entryPoints: [fileURLToPath(new URL('./flying-resources-resilience.test.ts', import.meta.url))],
    bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'warning',
  });
  await fs.writeFile(output, result.outputFiles[0].contents);
  await import(pathToFileURL(output).href);
} finally {
  await fs.unlink(output).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await fs.rmdir(folder);
}
