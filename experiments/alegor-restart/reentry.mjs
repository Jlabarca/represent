import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? process.cwd());
const moduleDir = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.argv[3] ?? moduleDir);
const base = process.argv[4] ?? 'd7b24ac';
const fixturePath = resolve(moduleDir, 'synthetic-session.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
const head = git('rev-parse', 'HEAD');
const baseSha = git('rev-parse', `${base}^{commit}`);
const rows = git('log', '--date=iso-strict', '--format=%H%x09%ad%x09%s', `${baseSha}..${head}`).split(/\r?\n/).filter(Boolean);
const commits = rows.map((row) => {
  const [sha, date, ...subject] = row.split('\t');
  const paths = git('diff-tree', '--no-commit-id', '--name-only', '-r', sha).split(/\r?\n/).filter(Boolean);
  return { sha, date, subject: subject.join('\t'), paths };
}).reverse();

const readDoc = (path) => readFileSync(resolve(root, path), 'utf8').split(/\r?\n/);
const context = readDoc('docs/CONTEXT.md');
const todo = readDoc('docs/TODO.md');
function section(lines, heading) {
  const index = lines.findIndex((line) => line.trim() === heading);
  if (index < 0) return { line: null, text: '' };
  const depth = heading.match(/^#+/)[0].length;
  let end = index + 1;
  while (end < lines.length) {
    const nextDepth = lines[end].match(/^#+(?=\s)/)?.[0].length;
    if (nextDepth && nextDepth <= depth) break;
    end++;
  }
  return { line: index + 1, text: lines.slice(index, end).join('\n').trim() };
}
const current = section(context, '## Current Sprint');
const todoVisu = section(todo, '### Completed build: automatic Visu discovery');
const allPaths = [...new Set(commits.flatMap((commit) => commit.paths))].sort();
const sessionPaths = fixture.editedFiles.map((path) => path.replaceAll('\\', '/'));
const overlap = allPaths.filter((path) => sessionPaths.includes(path));
const fileEvidence = overlap.map((path) => ({ path, changedInRange: commits.filter((c) => c.paths.includes(path)).map((c) => c.sha.slice(0, 10)) }));
const brief = {
  schema: 'alegor.reentry-experiment/v0',
  generatedAt: new Date().toISOString(),
  source: { repository: git('remote', 'get-url', 'origin'), base: baseSha, head, commitCount: commits.length, changedPathCount: allPaths.length },
  observed: commits.map(({ sha, date, subject, paths }) => ({ sha: sha.slice(0, 10), date, subject, paths })),
  declared: [
    { label: 'Current-state declaration', source: { path: 'docs/CONTEXT.md', line: 15 }, text: context[14].trim() },
    { label: 'TODO declares discovery work complete', source: { path: 'docs/TODO.md', line: todoVisu.line }, text: todoVisu.text },
    { label: 'CONTEXT next-step statement', source: { path: 'docs/CONTEXT.md', line: current.line }, text: current.text },
  ],
  unresolved: [{ label: 'Current-step mismatch', sources: [{ path: 'docs/CONTEXT.md', line: current.line }, { path: 'docs/TODO.md', line: todoVisu.line }], note: 'CONTEXT still describes discovery as the next proof; TODO records automatic discovery, a non-game test, manual update cost, and browser checks as complete. This experiment records the conflict; it does not decide which document is authoritative.' }],
  correlationTrial: {
    sessionId: fixture.sessionId,
    synthetic: true,
    project: fixture.project,
    basis: ['fixture project path equals this repository root', 'edited file path overlaps changed Git paths'],
    overlap,
    evidence: fileEvidence,
    interpretation: overlap.length ? 'candidate link only; shared paths do not prove the session caused any commit' : 'unlinked; insufficient overlap',
  },
  deterministicDigest: createHash('sha256').update(JSON.stringify({ head, base: baseSha, allPaths, fixture })).digest('hex'),
};

const md = [
  '# Alegor re-entry experiment',
  '',
  '> Experimental local output. Git/docs are real Represent evidence; the session record is synthetic and tests correlation mechanics only.',
  '',
  `- Snapshot: \`${head.slice(0, 10)}\` (base \`${baseSha.slice(0, 10)}\`)`,
  `- Range: ${commits.length} commits; ${allPaths.length} unique changed paths`,
  `- Evidence digest: \`${brief.deterministicDigest}\``,
  '',
  '## What changed (observed)',
  '',
  ...commits.map((c) => `- \`${c.date.slice(0, 10)}\` **${c.subject}** (\`${c.sha.slice(0, 10)}\`; ${c.paths.length} paths)`),
  '',
  '## Project state (declared)',
  '',
  `- ${brief.declared[0].text} ([CONTEXT.md:${brief.declared[0].source.line}](evidence.html#context-${brief.declared[0].source.line}))`,
  `- TODO section records discovery complete ([TODO.md:${todoVisu.line}](evidence.html#todo-${todoVisu.line})).`,
  '',
  '## What is unresolved',
  '',
  `- ${brief.unresolved[0].note} ([CONTEXT.md:${current.line}](evidence.html#context-${current.line}); [TODO.md:${todoVisu.line}](evidence.html#todo-${todoVisu.line})).`,
  '',
  '## Session correlation trial (synthetic)',
  '',
  `- Session \`${fixture.sessionId}\` overlaps ${overlap.length} changed file(s): ${overlap.map((p) => `\`${p}\``).join(', ') || 'none'}.`,
  '- This is a candidate link based on repository identity and path overlap, not evidence of causal explanation. No personal session history was read.',
  '',
  '## Next action',
  '',
  '- Update the active sprint text to reflect completed Visu validation, then select the next independent Grafe or Alegor proof. Keep user correction as an explicit event.',
].join('\n');

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Alegor · re-entry experiment</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#252820;font:16px/1.5 system-ui,sans-serif}.wrap{max-width:960px;margin:auto;padding:32px 20px;overflow-wrap:anywhere}.tag{font-size:.78rem;text-transform:uppercase;letter-spacing:.1em;color:#5b654c}.card{background:#fff;border:1px solid #d6d7cf;border-radius:16px;padding:20px;margin:16px 0;box-shadow:0 4px 18px #2730190b}.timeline{border-left:2px solid #929d7f;padding-left:18px;margin-left:6px}.event{position:relative;padding:0 0 15px}.event:before{content:"";position:absolute;left:-25px;top:8px;width:10px;height:10px;border-radius:50%;background:#77855d}a{color:#416139}code{font-size:.85em;background:#eef0e9;padding:2px 5px;border-radius:4px}.warning{border-left:4px solid #c28531}small{color:#616558}@media(max-width:600px){.wrap{padding:18px 14px}}</style><main class="wrap"><p class="tag">Alegor · experimental local prototype</p><h1>Project re-entry</h1><p>Evidence from Represent history and docs, plus one synthetic session fixture.</p><section class="card"><strong>${commits.length} commits</strong> since <code>${baseSha.slice(0, 10)}</code> · <strong>${allPaths.length} paths</strong><br><small>Current snapshot ${head.slice(0, 10)} · digest ${brief.deterministicDigest.slice(0, 16)}</small></section><section class="card"><h2>What changed</h2><div class="timeline">${commits.map((c) => `<article class="event"><small>${esc(c.date.slice(0, 10))} · ${c.paths.length} changed paths</small><br><strong>${esc(c.subject)}</strong><br><code>${esc(c.sha.slice(0, 10))}</code></article>`).join('')}</div></section><section class="card"><h2>Declared state</h2><p>${esc(brief.declared[0].text)} <a href="evidence.html#context-${brief.declared[0].source.line}">source ↗</a></p><p>TODO records the automatic discovery trial as complete. <a href="evidence.html#todo-${todoVisu.line}">source ↗</a></p></section><section class="card warning"><h2>Needs review</h2><p>CONTEXT still says discovery is the next proof while TODO says it is complete. The prototype surfaces both statements instead of choosing one as truth.</p><p><a href="evidence.html#context-${current.line}">CONTEXT ↗</a> · <a href="evidence.html#todo-${todoVisu.line}">TODO ↗</a></p></section><section class="card"><h2>Session linkage trial</h2><p><span class="tag">Synthetic fixture</span> <code>${esc(fixture.sessionId)}</code> shares ${overlap.length} changed path(s): ${overlap.map(esc).join(', ') || 'none'}.</p><p>Candidate link only. File overlap does not establish why the commit happened. No real transcripts were read.</p></section><p><a href="reentry.md">Read Markdown</a> · <a href="reentry.json">Inspect JSON</a></p></main>`;

const renderSource = (name, lines, target, targetLine) => `<section><h2>${esc(name)}:${targetLine}</h2><pre>${lines.map((line, i) => `<span id="${target}-${i + 1}">${String(i + 1).padStart(4, ' ')}  ${esc(line)}</span>`).join('\n')}</pre></section>`;
const evidenceHtml = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Alegor · source evidence</title><style>*{box-sizing:border-box}body{margin:0;background:#f3f1eb;color:#252820;font:15px/1.5 system-ui,sans-serif}.wrap{max-width:1100px;margin:auto;padding:24px 16px}section{background:#fff;border:1px solid #d6d7cf;border-radius:12px;margin:20px 0;padding:16px;overflow:hidden}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.5 ui-monospace,monospace}span:target{background:#fff0b5}a{color:#416139}</style><main class="wrap"><a href="index.html">← Re-entry brief</a><h1>Source evidence</h1><p>Line-numbered local copies from the Represent repository at ${head.slice(0, 10)}. Original paths are preserved below; select a cited line from the brief to jump here.</p>${renderSource('docs/CONTEXT.md', context, 'context', brief.declared[0].source.line)}${renderSource('docs/TODO.md', todo, 'todo', todoVisu.line)}</main>`;

mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, 'reentry.json'), JSON.stringify(brief, null, 2) + '\n');
writeFileSync(resolve(outDir, 'reentry.md'), md + '\n');
writeFileSync(resolve(outDir, 'index.html'), html + '\n');
writeFileSync(resolve(outDir, 'evidence.html'), evidenceHtml + '\n');
console.log(JSON.stringify({ head, base: baseSha, commits: commits.length, changedPaths: allPaths.length, overlap, digest: brief.deterministicDigest, files: ['reentry.json', 'reentry.md', 'index.html', 'evidence.html'] }, null, 2));
