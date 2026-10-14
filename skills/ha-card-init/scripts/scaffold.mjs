import { mkdir, readdir, readFile, writeFile, lstat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const options = {};
for (let i = 2; i < process.argv.length; i++) {
  const key = process.argv[i];
  if (key === '--git') { options.git = true; continue; }
  if (!['--path', '--name', '--title', '--owner', '--domain', '--git-name'].includes(key) || !process.argv[i + 1] || process.argv[i + 1].startsWith('--')) throw new Error(`Invalid argument: ${key}`);
  options[key.slice(2)] = process.argv[++i];
}
if (!options.path || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-card$/.test(options.name || '') || options.name.length > 63) throw new Error('Provide --path and a lowercase custom-element slug ending in -card (maximum 63 characters).');
if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(options.owner || '')) throw new Error('Provide a valid GitHub --owner.');
const title = options.title || options.name.split('-').map(word => word[0].toUpperCase() + word.slice(1)).join(' ');
if (!/^[\p{L}\p{N} ._()-]{1,80}$/u.test(title)) throw new Error('Title must be 1-80 letters, numbers, spaces or ._()- characters.');
if (options.domain !== undefined && !/^[a-z][a-z0-9_]*$/.test(options.domain)) throw new Error('Invalid entity domain.');
if (options['git-name'] && (!options.git || /[\r\n\x00]/.test(options['git-name']))) throw new Error('--git-name requires --git and a single-line name.');
const target = resolve(options.path);
if (target === dirname(target)) throw new Error('Refusing a filesystem root destination.');
try {
  const info = await lstat(target);
  if (!info.isDirectory() || info.isSymbolicLink() || (await readdir(target)).length) throw new Error('Destination must be a new or empty non-symlink directory.');
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const replacements = { __CARD_TAG__: options.name, __TITLE__: title, __OWNER__: options.owner, __DOMAIN_JSON__: JSON.stringify(options.domain || ''), __EXAMPLE_ENTITY__: `${options.domain || 'sensor'}.example`, __YEAR__: String(new Date().getFullYear()) };
const replace = text => Object.entries(replacements).reduce((result, [key, value]) => result.replaceAll(key, value), text);
const source = fileURLToPath(new URL('../assets/starter/', import.meta.url));
async function copy(directory, relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const next = join(relative, entry.name);
    if (entry.isDirectory()) await copy(join(directory, entry.name), next);
    else if (entry.isFile()) {
      const destination = join(target, replace(next).replace(/\.tmpl$/, ''));
      await mkdir(dirname(destination), { recursive: true });
      await writeFile(destination, replace(await readFile(join(directory, entry.name), 'utf8')), { flag: 'wx' });
    } else throw new Error(`Unsupported template entry: ${next}`);
  }
}
await mkdir(target, { recursive: true });
await copy(source);
if (options.git) {
  execFileSync('git', ['init', '-b', 'main'], { cwd: target, stdio: 'inherit' });
  execFileSync('git', ['config', '--local', 'user.name', options['git-name'] || 'jancrab'], { cwd: target });
}
console.log(`Created ${options.name} at ${target}. Next: npm install, npm run check, then implement the requested controls. No remote repository was created.`);
