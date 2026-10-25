#!/usr/bin/env node
// trazo [path] [--store dir] [--port n] [--yes] [--budget usd] [--revoke] [--list] [--once]
// Week 1: consent, snapshot, sketch, viewer. Zero model calls, zero network requests.
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Consent, canonicalRoot, defaultStoreDir, readPlan, assertStoreOutside } from './consent.mjs';
import { Project, createServer } from './server.mjs';

const args = process.argv.slice(2);
const flag = (name, dflt = null) => { const i = args.indexOf(name); return i >= 0 ? (args[i + 1] ?? true) : dflt; };
const has = name => args.includes(name);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--store', '--port', '--budget'].includes(args[i - 1])));

function printPlan(root) {
  const plan = readPlan();
  console.log(`\ntrazo would read this folder:\n  ${root}\n`);
  console.log('It reads:'); for (const r of plan.reads) console.log(`  + ${r}`);
  console.log('It never reads:'); for (const r of plan.neverReads) console.log(`  - ${r}`);
  console.log(`It sends: ${plan.sends}`);
  console.log(`It stores: ${plan.stores}\n`);
}

async function main() {
  const storeDir = path.resolve(flag('--store', defaultStoreDir()));
  const consent = new Consent(storeDir);
  if (has('--list')) { for (const c of consent.list()) console.log(`${c.root}  granted ${c.grantedAt}  budget $${c.budgetUsdPerDay}/day`); if (!consent.list().length) console.log('No consented folders.'); return; }
  const root = canonicalRoot(positional[0] ?? process.cwd());
  assertStoreOutside(storeDir, root);
  if (has('--revoke')) { consent.revoke(root); console.log(`Consent revoked for ${root}. Snapshots in the store are kept until you delete them.`); return; }
  if (!consent.has(root)) {
    printPlan(root);
    let ok = has('--yes');
    if (!ok) {
      if (!stdin.isTTY) { console.error('No consent on record and no terminal to ask. Re-run with --yes to grant consent for this folder.'); process.exit(1); }
      const rl = readline.createInterface({ input: stdin, output: stdout });
      const answer = (await rl.question('Allow trazo to read this folder and draw it? [y/N] ')).trim().toLowerCase(); rl.close();
      ok = answer === 'y' || answer === 'yes';
    }
    if (!ok) { console.log('No consent given. Nothing was read.'); process.exit(1); }
    consent.grant(root, { budgetUsdPerDay: Number(flag('--budget', 0)) || 0 });
    console.log(`Consent recorded in ${consent.file}`);
  }
  const project = new Project({ root, store: storeDir });
  const { facts } = await project.snapshot();
  const t = facts.timings;
  console.log(`\n${facts.snapshot.name} @ ${facts.revision.sha ? facts.revision.sha.slice(0, 7) : 'no-git'}${facts.revision.dirty ? ' (dirty)' : ''}`);
  console.log(`  ${facts.snapshot.files} files, ${(facts.snapshot.bytes / 1024).toFixed(0)} KiB, ${facts.summary.modules} modules, ${facts.summary.commits} commits · mode ${facts.snapshot.mode}${facts.snapshot.truncated ? ' (capped)' : ''}`);
  console.log(`  capture ${t.captureMs} ms · history ${t.historyMs} ms · facts ${t.factsMs} ms · total ${t.totalMs} ms · model calls 0`);
  const sk = await project.sketch(1, null);
  console.log(`  sketch (guide) rendered in ${sk.renderMs} ms`);
  if (has('--once')) { console.log(`Snapshot ${facts.snapshot.id.slice(0, 12)} stored under ${project.dir}`); return; }
  const port = Number(flag('--port', 8875));
  const server = createServer({ project, consent: consent.get(root), port });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  console.log(`\nViewer: http://127.0.0.1:${server.address().port}/  (loopback only; Ctrl+C to stop)\n`);
}

main().catch(e => { console.error(`trazo: ${e.message}`); process.exit(1); });
