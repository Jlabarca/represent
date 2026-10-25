import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Consent, canonicalRoot, assertStoreOutside, projectSlug, readPlan } from '../src/trazo/consent.mjs';
import { captureFiles, scanImports, resolveImport, moduleOf, buildFacts, atLevel, snapshotFolder, LIMITS } from '../src/trazo/facts.mjs';
import { renderSketch, layoutModules, esc } from '../src/trazo/sketch.mjs';

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trazo-fx-'));
  const put = (rel, text) => { const abs = path.join(root, rel); fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, text); };
  put('README.md', '# Demo\n\nA tiny <b>demo</b> project for trazo.\n\n## Usage\n\nRun it.\n');
  put('src/app.js', "import { util } from './lib/util.js';\nimport fs from 'node:fs';\nexport function main() { return util(); }\n");
  put('src/lib/util.js', 'export function util() { return 1; }\n');
  put('tools/run.py', 'from src.app import main\nimport os, json\n');
  put('svc/Program.cs', 'using System;\nusing Svc.Core;\npublic class Program {}\n');
  put('svc/Core/Thing.cs', 'namespace Svc.Core { public class Thing {} }\n');
  put('.env', 'SECRET=do-not-read\n');
  put('node_modules/dep/index.js', 'module.exports = 1;\n');
  put('assets/blob.bin', Buffer.from([0, 1, 2, 3]).toString('binary'));
  return root;
}

test('consent store grants, lists and revokes outside the project root', () => {
  const root = fixture(); const store = fs.mkdtempSync(path.join(os.tmpdir(), 'trazo-store-'));
  const c = new Consent(store);
  assert.equal(c.has(root), false);
  c.grant(root, { budgetUsdPerDay: 0 });
  assert.equal(new Consent(store).has(root), true);
  assert.equal(c.list().length, 1);
  assert.throws(() => c.grant(root, { budgetUsdPerDay: -1 }));
  c.revoke(root);
  assert.equal(new Consent(store).has(root), false);
  assert.throws(() => assertStoreOutside(path.join(root, '.trazo'), root), /outside/);
  assert.throws(() => assertStoreOutside(path.dirname(root), root), /outside/);
  assert.doesNotThrow(() => assertStoreOutside(store, root));
  assert.match(projectSlug(root), /^trazo-fx-[a-z0-9-]*-[0-9a-f]{10}$/);
  assert.throws(() => canonicalRoot(path.join(root, 'README.md')), /Not a directory/);
  assert.ok(readPlan().neverReads.some(l => l.includes('.env')));
});

test('capture skips secrets, dependencies, hidden files and binaries, and is bounded', async () => {
  const root = fixture();
  const cap = await captureFiles(root);
  const paths = cap.files.map(f => f.path);
  assert.equal(cap.mode, 'walk');
  assert.ok(paths.includes('src/app.js') && paths.includes('README.md') && paths.includes('svc/Core/Thing.cs'));
  assert.ok(!paths.some(p => p.startsWith('.env') || p.includes('node_modules') || p.endsWith('.bin')));
  assert.ok(!cap.files.some(f => f.text.includes('do-not-read')));
  assert.ok(LIMITS.maxFiles <= 2000 && LIMITS.maxFileBytes <= 1024 * 1024);
});

test('import scanners cover js, py, cs, go and rs and resolve relative targets', () => {
  assert.deepEqual(scanImports('a.js', "import x from './b.js'; const y = require('pkg'); await import('./c.mjs')").map(i => i.spec), ['./b.js', 'pkg', './c.mjs']);
  assert.deepEqual(scanImports('a.py', 'from .mod import x\nimport os, sys\n').map(i => i.spec), ['.mod', 'os', 'sys']);
  assert.deepEqual(scanImports('a.cs', 'using System;\nusing static Foo.Bar;\n').map(i => i.spec), ['System', 'Foo.Bar']);
  assert.deepEqual(scanImports('a.go', 'import "fmt"\nimport (\n\t"os"\n\tx "net/http"\n)\n').map(i => i.spec), ['fmt', 'os', 'net/http']);
  assert.deepEqual(scanImports('a.rs', 'mod util;\nuse crate::db::conn;\nuse serde::Serialize;\n').map(i => i.spec), ['mod:util', 'crate::db::conn', 'serde']);
  const known = new Set(['src/app.js', 'src/lib/util.js', 'src/lib/index.ts', 'pkg/db/conn.rs', 'src/app.py']);
  assert.deepEqual(resolveImport('src/app.js', './lib/util.js', 'js', known, new Set()), { target: 'src/lib/util.js', quality: 'resolved' });
  assert.deepEqual(resolveImport('src/app.js', './lib', 'js', known, new Set()), { target: 'src/lib/index.ts', quality: 'resolved' });
  assert.equal(resolveImport('src/app.js', 'node:fs', 'js', known, new Set()), null);
  assert.deepEqual(resolveImport('tools/run.py', 'src.app', 'py', known, new Set()), { target: 'src/app.py', quality: 'candidate' });
  assert.equal(moduleOf('src/lib/util.js'), 'src/lib');
  assert.equal(moduleOf('README.md'), '(root)');
  assert.equal(moduleOf('tools/run.py'), 'tools');
});

test('facts are deterministic, leveled and carry a readme summary', async () => {
  const root = fixture();
  const a = await snapshotFolder(root, { name: 'demo' });
  const b = await snapshotFolder(root, { name: 'demo' });
  assert.equal(a.facts.snapshot.id, b.facts.snapshot.id);
  assert.deepEqual(a.facts.nodes.map(n => n.id), b.facts.nodes.map(n => n.id));
  const f = a.facts;
  assert.equal(f.schema, 'trazo.facts/v0');
  assert.equal(f.summary.sentence, 'A tiny demo project for trazo.');
  const imports = f.edges.filter(e => e.kind === 'imports');
  assert.ok(imports.some(e => e.from === 'file:src/app.js' && e.to === 'file:src/lib/util.js'));
  assert.ok(imports.some(e => e.from === 'mod:src' && e.to === 'mod:src/lib'));
  assert.ok(imports.some(e => e.from === 'file:svc/Program.cs' && e.to === 'mod:svc' && e.quality === 'candidate'));
  assert.ok(f.nodes.some(n => n.kind === 'section' && n.label === 'Usage'));
  const poster = atLevel(f, 0);
  assert.ok(poster.nodes.every(n => n.kind === 'module') && poster.nodes.length <= 5);
  assert.ok(atLevel(f, 2).nodes.some(n => n.kind === 'file'));
  assert.equal(f.revision.git, false);
  assert.equal(typeof f.timings.totalMs, 'number');
  const mod = f.nodes.find(n => n.id === 'mod:src');
  assert.ok(mod.externals.some(x => x.name === 'node'));
});

test('git-backed capture of this repository never includes hidden or dependency paths', async () => {
  const cap = await captureFiles(path.resolve('.'));
  assert.equal(cap.mode, 'git');
  assert.ok(cap.files.length > 50);
  assert.ok(cap.files.every(f => !f.path.split('/').some(seg => seg.startsWith('.') || seg === 'node_modules')));
});

test('sketch renders every level as escaped svg with stable module order', async () => {
  const root = fixture();
  const { facts } = await snapshotFolder(root, { name: 'demo' });
  for (const level of [0, 1, 2, 3]) {
    const svg = renderSketch(facts, level);
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.includes('</svg>'));
    assert.ok(!svg.includes('<b>demo</b>'), 'labels must be escaped');
  }
  assert.ok(renderSketch(facts, 0).includes('A tiny &lt;b&gt;demo&lt;/b&gt; project') || renderSketch(facts, 0).includes('A tiny demo project'));
  assert.ok(renderSketch(facts, 1).includes('marker-end="url(#t-arr)"'), 'guide level draws module arrows');
  assert.ok(renderSketch(facts, 3).includes('Symbols are computed on demand') || facts.symbols === null);
  const mods = facts.nodes.filter(n => n.kind === 'module');
  const before = layoutModules(mods).map(r => r.id);
  const heavier = mods.map(m => (m.id === 'mod:svc' ? { ...m, weight: m.weight + 50 } : m));
  assert.deepEqual(layoutModules(heavier).map(r => r.id), before, 'module order is by identity, not weight');
  assert.equal(esc('<a href="x">&'), '&lt;a href=&quot;x&quot;&gt;&amp;');
  assert.equal(renderSketch(facts, 1), renderSketch(facts, 1), 'rendering is deterministic');
});
