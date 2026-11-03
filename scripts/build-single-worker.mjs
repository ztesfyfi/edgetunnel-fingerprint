import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

if (!process.argv[2]) throw new Error('Usage: node scripts/build-single-worker.mjs <upstream-core.js>');
const corePath = resolve(process.argv[2]);
const core = (await readFile(corePath, 'utf8')).replace(/^\uFEFF/, '');
const enhancer = await readFile(new URL('../_worker-enhancer.js', import.meta.url), 'utf8');
const exportMatches = core.match(/\bexport\s+default\s*\{/g) || [];
if (exportMatches.length !== 1) {
  throw new Error(`Expected exactly one upstream default export; found ${exportMatches.length}`);
}
if (!enhancer.includes('await upstream.fetch(request, env, ctx)')) {
  throw new Error('TLS fingerprint enhancer is missing its upstream fetch hook');
}
const transformedCore = core.replace(/\bexport\s+default\s*\{/, 'const upstream = {');
const output = [
  '// Generated file. Do not edit directly; edit _worker-enhancer.js and run the sync workflow.',
  transformedCore.trimEnd(),
  enhancer.trim()
].join('\n\n') + '\n';
await writeFile(resolve('_worker.js'), output, 'utf8');
console.log(`Built single-file _worker.js (${new TextEncoder().encode(output).length} bytes)`);
