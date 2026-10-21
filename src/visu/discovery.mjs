import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const MAX_LIST_BYTES = 2 * 1024 * 1024;
const MAX_FILES = 20000;
const MAX_FILE_BYTES = 1 * 1024 * 1024;
const MAX_SELECTED = 30;
const MAX_SELECTED_BYTES = 600000;
const MAX_CHARS_PER_FILE = 10000;
const TEXT_EXT = new Set(['.md','.mdx','.txt','.rst','.adoc','.json','.yaml','.yml','.toml','.ini','.js','.jsx','.ts','.tsx','.mjs','.cjs','.py','.go','.rs','.java','.kt','.cs','.php','.rb','.vue','.svelte','.html','.css','.scss','.sh','.ps1','.sql']);
const EXCLUDE_DIR = /^(?:\.git|\.svn|\.hg|node_modules|vendor|dist|build|out|coverage|\.next|\.nuxt|\.turbo|\.cache|\.venv|venv|__pycache__|target|bin|obj|\.represent|\.runs|artifacts|generated|\.idea|\.vscode|\.history|sessions?|transcripts?|private|personal|secrets?|credentials?|data|datasets?|backups?)$/i;
const EXCLUDE_FILE = /(?:^|\/)(?:\.env(?:\..*)?|credentials?(?:\..*)?|secrets?(?:\..*)?|id_(?:rsa|ed25519)|known_hosts|authorized_keys|.*\.(?:pem|key|p12|pfx|crt|cer|der|sqlite|db|lock|log|dump|bak|orig|patch|map|min\.[cm]?js|generated\.[cm]?tsx?))$/i;
const ARCHIVE = /(?:^|\/)(?:archive|archives|historical|history|old|legacy|notion|logs?)(?:\/|$)|(?:^|\/)(?:changelog|release-notes|roadmap-history)(?:\.[^/]*)?$/i;
const RESEARCH = /(?:^|\/)research(?:\/|$)/i;
const STYLE = /(?:^|\/)(?:theme|themes|tokens?|design-system|tailwind\.config|postcss\.config|variables|palette|typography)(?:[./_-]|\/|$)|(?:^|\/)(?:.*\.(?:css|scss|sass))$/i;
const DOC = /\.(?:md|mdx|txt|rst|adoc)$/i;
const ENTRY = /(?:^|\/)(?:main|index|app|server|cli|program|entry|bootstrap|__main__|lib)(?:\.[^/]*)?$/i;
const STATE = /(?:^|\/)(?:context|todo|tasks|status|current|active|plan|impl|feature-impl|readme)(?:[-_.][^/]*)?(?:\.[^/]*)?$/i;
const CONFIG = /(?:^|\/)(?:package\.json|pyproject\.toml|cargo\.toml|go\.mod|composer\.json|pom\.xml|build\.gradle(?:\.kts)?|vite\.config\.[^/]+|next\.config\.[^/]+|astro\.config\.[^/]+)$/i;
const DESIGN = /(?:^|\/)(?:design|spec|architecture|overview|product|vision|ux|ui)(?:\/|[-_.]|$)/i;

function safeName(name) {
  const p = name.replaceAll('\\','/').replace(/^\.\//,'');
  if (!p || p.startsWith('/') || p.split('/').some(x => !x || x === '.' || x === '..')) return null;
  if (p.split('/').some(x => EXCLUDE_DIR.test(x) || x.startsWith('.')) || EXCLUDE_FILE.test(p)) return null;
  if (!TEXT_EXT.has(path.posix.extname(p).toLowerCase())) return null;
  return p;
}

async function trackedInventory(root) {
  try {
    // Filter textual extensions in Git before the bounded inventory, so large
    // asset repositories do not exhaust the cap on image/audio filenames.
    const buf = execFileSync('git', ['-C', root, 'ls-files', '-co', '--exclude-standard', '-z','--',...Array.from(TEXT_EXT,e=>`*${e}`)], { encoding: 'buffer', maxBuffer: MAX_LIST_BYTES, timeout:15000, stdio: ['ignore','pipe','ignore'] });
    if (buf.length >= MAX_LIST_BYTES) throw new Error('Git inventory exceeded its 2 MiB safety cap; initialize or prune the repository before automatic discovery.');
    const ignored=execFileSync('git',['-C',root,'ls-files','-ci','--exclude-standard','-z','--',...Array.from(TEXT_EXT,e=>`*${e}`)],{encoding:'buffer',maxBuffer:MAX_LIST_BYTES,timeout:15000,stdio:['ignore','pipe','ignore']});
    const excluded=new Set(ignored.toString('utf8').split('\0'));
    const paths = [...new Set(buf.toString('utf8').split('\0').filter(p=>p&&!excluded.has(p)))].sort();
    return { paths: paths.slice(0, MAX_FILES), mode: 'git', truncated: paths.length > MAX_FILES };
  } catch (e) {
    if (e?.message?.includes('exceeded its 2 MiB')) throw e;
    if(e?.code==='ENOBUFS'||e?.code==='ETIMEDOUT') throw new Error('Git text inventory exceeded the bounded size/time limit; use an explicit manifest for a smaller scope.');
    throw new Error('Automatic source discovery requires a Git repository so ignored files can be excluded safely. Use an explicit source manifest for non-Git folders.');
  }
}

async function noSymlinkPath(root, rel) {
  let current = root;
  const parts = rel.split('/');
  for (let i=0;i<parts.length;i++) {
    current = path.join(current, parts[i]);
    let st; try { st = await fs.lstat(current); } catch { return false; }
    if (st.isSymbolicLink() || (i < parts.length - 1 && !st.isDirectory())) return false;
    if (i === parts.length - 1 && !st.isFile()) return false;
  }
  return true;
}

async function boundedRange(root, rel) {
  const raw=await fs.readFile(path.join(root,rel));
  if(raw.includes(0)) return null;
  const text=raw.toString('utf8');
  let chars=0, endLine=0, bytes=0;
  for(const line of text.split(/(?<=\n)/)) {
    if(!line) continue;
    if(line.length > MAX_CHARS_PER_FILE) return null;
    if(chars + line.length > MAX_CHARS_PER_FILE) break;
    chars += line.length; bytes += Buffer.byteLength(line); endLine++;
  }
  if(!endLine) return null;
  return { endLine, bytes };
}

function classify(p) {
  const overview={role:'art'};
  if (ARCHIVE.test(p) || /(?:^|\/)impl\/|(?:^|\/)LOGBOOK\.md$/i.test(p)) return {role:'detail',kind:'docs',score:8,reason:'Historical material is supporting context with low priority.'};
  if (RESEARCH.test(p)) return {role:'detail',kind:'docs',score:24,reason:'Research material is background context; current project evidence takes priority.'};
  if (STYLE.test(p) && !/\.(?:py|cs|go|rs|java)$/i.test(p)) return {role:'style',kind:'style',score:/typography|fonts?|colors?|palette|variables|tokens/i.test(p)?98:80,reason:'Design tokens or visual styling define the project’s own look.'};
  if (/(?:^|\/)[^/]*(?:-IMPL|IMPL)\.md$/i.test(p) && !/(?:^|\/)impl\//i.test(p)) return {role:'detail',kind:'current',score:97,reason:'An implementation tracker records active work and project state.'};
  if (DOC.test(p) && STATE.test(p) && !/(?:^|\/)impl\//i.test(p) && !/(?:^|\/)readme(?:\.[^/]*)?$/i.test(p)) return {role:'detail',kind:'current',score:/^(?:docs\/)?(?:context|todo)\.md$/i.test(p)?110:92,reason:'Current context, tracked work, or an active implementation plan.'};
  if (/(?:^|\/)readme(?:\.[^/]*)?$/i.test(p)) return {...overview,kind:p.includes('/')?'docs':'identity',score:p.includes('/')?55:96,reason:p.includes('/')?'Nested README adds secondary project context.':'Root README introduces the project and its purpose.'};
  if (CONFIG.test(p)) return {role:'detail',kind:'identity',score:82,reason:'Project manifest identifies its runtime and dependencies.'};
  if(DOC.test(p)&&/(?:^|\/)reference\//i.test(p)) return {...overview,kind:'reference',score:93,reason:'Current system reference explains concrete product behavior.'};
  if (ARCHIVE.test(p)) return {role:'detail',kind:'docs',score:8,reason:'Historical material is supporting context with low priority.'};
  if (RESEARCH.test(p)) return {role:'detail',kind:'docs',score:24,reason:'Research material is background context; current project evidence takes priority.'};
  if (DOC.test(p) && DESIGN.test(p)) return {...overview,kind:'design',score:90,reason:'Design or product document explains intent and structure.'};
  if (DOC.test(p)) return {...overview,kind:'docs',score:74,reason:'Project documentation provides a human-readable explanation.'};
  if(/(?:^|\/)(?:layout|page)\.(?:tsx|jsx|vue|svelte)$/i.test(p)) return {...overview,kind:'code',score:86,reason:'Application page or layout shows the implemented experience and visual identity.'};
  if (ENTRY.test(p)) return {...overview,kind:'code',score:72,reason:'Runtime entry point provides concrete implementation evidence.'};
  if (/\.(?:html|vue|svelte|tsx|jsx)$/i.test(p)) return {...overview,kind:'code',score:62,reason:'User-facing implementation shows the project’s actual experience.'};
  return {role:'detail',kind:'code',score:35,reason:'Source file offers supporting implementation detail.'};
}

export async function discover(root) {
  const abs = path.resolve(root);
  let ancestor=path.parse(abs).root;
  for(const part of abs.slice(ancestor.length).split(path.sep).filter(Boolean)) {
    ancestor=path.join(ancestor,part);
    const st=await fs.lstat(ancestor);
    if(st.isSymbolicLink()) throw new Error('Discovery root path cannot pass through symlinks');
  }
  const rootStat = await fs.lstat(abs);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Discovery root must be a real directory, not a symlink');
  const inventory = await trackedInventory(abs);
  const candidates = [];
  let skipped = 0;
  // Follow the project's own navigation, without inventing a per-project scope.
  const linked=new Set();
  for(const entry of inventory.paths.filter(p=>/^(?:README\.md|docs\/CONTEXT\.md)$/i.test(p))){
    if(!await noSymlinkPath(abs,entry)) continue;
    const st=await fs.stat(path.join(abs,entry));if(st.size>MAX_FILE_BYTES)continue;
    const text=(await fs.readFile(path.join(abs,entry),'utf8')).slice(0,10000);
    for(const match of text.matchAll(/\]\(([^\s)#]+)(?:#[^)]*)?\)/g)){
      try{const target=path.posix.normalize(path.posix.join(path.posix.dirname(entry),decodeURIComponent(match[1])));if(safeName(target))linked.add(target);}catch{}
      if(linked.size>=100)break;
    }
  }
  for (const raw of inventory.paths) {
    const p = safeName(raw);
    if (!p || /(?:^|\/)(?:AGENTS|CLAUDE|DOCS-PROTOCOL)\.md$|\.template\./i.test(p)) { skipped++; continue; }
    if (!await noSymlinkPath(abs,p)) { skipped++; continue; }
    let st; try { st = await fs.stat(path.join(abs,p)); } catch { skipped++; continue; }
    if (st.size === 0 || st.size > MAX_FILE_BYTES) { skipped++; continue; }
    const cls = classify(p);
    if(cls.kind==='code'&&st.size<60) cls.score-=60;
    if(linked.has(p)){cls.score+=30;cls.reason+=' Linked from the project overview/current context.';}
    if(cls.kind==='code'&&/(?:^|\/)(?:src|source|server|client)\//i.test(p)) cls.score+=12;
    candidates.push({ path:p, ...cls, bytes:st.size });
  }
  candidates.sort((a,b)=>b.score-a.score || a.path.localeCompare(b.path,'en'));
  const chosen=[]; let bytes=0;
  const counts={current:0,identity:0,design:0,reference:0,code:0,style:0,docs:0};
  const picked=new Set();
  const add=async c=>{
    if(!c || picked.has(c.path) || chosen.length>=MAX_SELECTED) return false;
    let range; try { range=await boundedRange(abs,c.path); } catch { skipped++; return false; }
    if(!range) { skipped++; return false; }
    if(bytes+range.bytes>MAX_SELECTED_BYTES) return false;
    chosen.push({path:c.path,role:c.role,kind:c.kind,startLine:1,endLine:range.endLine,reason:c.reason});
    picked.add(c.path); counts[c.kind]++; bytes+=range.bytes; return true;
  };
  // Reserve space across distinct evidence types before filling by overall rank.
  const minimums={current:3,identity:2,reference:4,design:3,code:6,style:4,docs:1};
  for(const kind of Object.keys(minimums)) {
    const groups=new Map();
    for(const c of candidates.filter(x=>x.kind===kind).slice(0,MAX_SELECTED)) {
      if(counts[kind]>=minimums[kind] || chosen.length>=MAX_SELECTED) break;
      const group=c.path.split('/').slice(0,c.path.startsWith('src/')?3:1).join('/');
      if(kind==='code'&&(groups.get(group)||0)>=2)continue;
      if(await add(c))groups.set(group,(groups.get(group)||0)+1);
    }
  }
  const caps={current:6,identity:4,reference:6,design:5,code:14,style:6,docs:4};
  for(const c of candidates) {
    if(chosen.length>=MAX_SELECTED) break;
    if(counts[c.kind]>=caps[c.kind]) continue;
    await add(c);
  }
  const scopeCapped=inventory.truncated || candidates.length>MAX_SELECTED || chosen.length<candidates.length;
  return { sources:chosen, report:{ inventory:inventory.mode, filesSeen:inventory.paths.length, candidates:candidates.length, selected:chosen.length, skipped, estimatedBytes:bytes, scopeCapped, scopeNote:scopeCapped?'Source scope is capped; the selected files are a ranked sample, not a complete inventory.':null, limits:{ maxFiles:MAX_FILES, maxFileBytes:MAX_FILE_BYTES, maxSources:MAX_SELECTED, maxSelectedBytes:MAX_SELECTED_BYTES, maxCharsPerFile:MAX_CHARS_PER_FILE }, categories:counts } };
}
