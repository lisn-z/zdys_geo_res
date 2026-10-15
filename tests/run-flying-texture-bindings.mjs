/** Run real binding callbacks without creating a browser WebGL context.
 * Only the director constructor body is skipped in this temporary test bundle;
 * its field initializers, replacement callback, and all scene code are intact. */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const folder=await fs.mkdtemp(path.join(os.tmpdir(),'flying-texture-bindings-'));
const output=path.join(folder,'check.mjs');
try {
  const result=await build({
    entryPoints:[fileURLToPath(new URL('./flying-texture-bindings.test.ts',import.meta.url))],
    bundle:true,platform:'node',format:'esm',write:false,logLevel:'warning',
    plugins:[{name:'skip-only-webgl-constructor',setup(build){
      build.onLoad({filter:/[\\/]flying[\\/]director\.ts$/},async({path:file})=>{
        const source=await fs.readFile(file,'utf8');
        const constructor='constructor(private host: HTMLElement, private options: DirectorOptions) {';
        if(!source.includes(constructor))throw new Error('Director constructor changed; review the GPU boundary test harness');
        return {contents:source.replace(constructor,constructor+'\nreturn; // Test-only: no GPU/DOM constructor.'),loader:'ts',resolveDir:path.dirname(file)};
      });
    }}],
  });
  await fs.writeFile(output,result.outputFiles[0].contents);
  await import(pathToFileURL(output).href);
} finally {
  await fs.unlink(output).catch(error=>{if(error.code!=='ENOENT')throw error;});
  await fs.rmdir(folder);
}