import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
await build({
  entryPoints: ['src/smart-fan-2-card.js'],
  outfile: 'dist/smart-fan-2-card.js',
  bundle: true,
  format: 'esm',
  target: 'es2022',
  minify: true,
  legalComments: 'eof',
  define: { __VERSION__: JSON.stringify(version) },
});
await build({ entryPoints: ['demo/icon.js'], outfile: 'demo/icons.js', bundle: true, format: 'esm', target: 'es2022', minify: true, legalComments: 'eof' });
