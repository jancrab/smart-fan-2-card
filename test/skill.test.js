import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const helper = fileURLToPath(new URL('../skills/ha-card-init/scripts/scaffold.mjs', import.meta.url));
async function isolated(run) {
  const base = await mkdtemp(join(tmpdir(), 'ha-card-skill-'));
  try { await run(base); }
  finally {
    const absolute = resolve(base);
    assert.equal(dirname(absolute), resolve(tmpdir()));
    assert.ok(absolute.split(/[\\/]/).at(-1).startsWith('ha-card-skill-'));
    await rm(absolute, { recursive: true, force: true });
  }
}
const generate = (target, ...extra) => execFileSync(process.execPath, [helper, '--path', target, '--name', 'example-card', '--owner', 'jancrab', ...extra], { encoding: 'utf8', stdio: 'pipe' });

test('skill generates matching HACS/module metadata and embedded general instructions', async () => isolated(async base => {
  const target = join(base, 'new');
  generate(target, '--domain', 'light', '--title', 'Example Light Card');
  const manifest = JSON.parse(await readFile(join(target, 'hacs.json'), 'utf8'));
  const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
  assert.equal(manifest.filename, `${pkg.name}.js`);
  const card = await readFile(join(target, 'src/example-card.js'), 'utf8');
  assert.match(card, /const domain = "light";/);
  assert.ok(!card.includes('__CARD_TAG__') && !card.includes('__DOMAIN_JSON__'));
  assert.match(await readFile(join(target, 'AGENTS.md'), 'utf8'), /docs\/working-guide.md/);
  assert.ok(!(await readFile(join(target, 'AGENTS.md'), 'utf8')).includes('Smartmi'));
  assert.ok((await readdir(join(target, 'test'))).includes('card.test.js'));
}));

test('skill refuses a nonempty target without modifying existing files', async () => isolated(async base => {
  const target = join(base, 'existing'); await mkdir(target);
  await writeFile(join(target, 'keep.txt'), 'keep me');
  assert.throws(() => generate(target));
  assert.equal(await readFile(join(target, 'keep.txt'), 'utf8'), 'keep me');
  assert.deepEqual(await readdir(target), ['keep.txt']);
}));

test('invalid names fail before creating a project and generic mode stays domain-neutral', async () => isolated(async base => {
  assert.throws(() => generate(join(base, 'bad'), '--name', '../../unsafe-card'));
  assert.deepEqual(await readdir(base), []);
  generate(join(base, 'generic'));
  assert.match(await readFile(join(base, 'generic/src/example-card.js'), 'utf8'), /const domain = "";/);
}));

test('optional Git initialization uses main and only the requested local name', async () => isolated(async base => {
  const target = join(base, 'git'); generate(target, '--git', '--git-name', 'jancrab');
  assert.equal(execFileSync('git', ['-C', target, 'symbolic-ref', '--short', 'HEAD'], { encoding: 'utf8' }).trim(), 'main');
  assert.equal(execFileSync('git', ['-C', target, 'config', '--local', '--get', 'user.name'], { encoding: 'utf8' }).trim(), 'jancrab');
  assert.throws(() => execFileSync('git', ['-C', target, 'remote', 'get-url', 'origin'], { stdio: 'pipe' }));
}));
