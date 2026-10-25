import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const ts = require('typescript');
export const INDEXER_VERSION = 'grafe-ts/0.1.0';
const MAX_FILES = 2000;
const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOTAL_BYTES = 32 * 1024 * 1024;
const EXTENSIONS = new Set(['.ts','.tsx','.js','.jsx','.mts','.cts','.mjs','.cjs']);
const EXCLUDED = /(^|\/)(\.git|\.hg|\.svn|node_modules|vendor|dist|build|coverage|\.next|\.nuxt|\.output|\.turbo|\.cache|\.represent|\.runs|\.idea|\.vscode|\.venv|venv|target|out|generated|\.generated)(\/|$)/i;
const SECRET = /(^|\/)(\.env(?:\.|$)|secrets?(?:\/|$)|credentials?(?:\/|$)|.*\.(?:pem|key|p12|pfx|cer|crt)$)/i;
const TEST_FILE = /(^|\/)(__tests__|tests?|spec)(\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i;

function hash(text) { return createHash('sha256').update(text).digest('hex'); }
function rel(root, file) { return path.relative(root, file).split(path.sep).join('/'); }
function lineAt(source, pos) { return source.getLineAndCharacterOfPosition(pos).line + 1; }
function endLineAt(source, pos) { return source.getLineAndCharacterOfPosition(Math.max(0, pos - 1)).line + 1; }
function stableId(file, kind, name, owner = '') { return `${kind}:${file}:${owner ? `${owner}.` : ''}${name}`; }
function ownerSegments(node) {
  const parts=[];
  for(let p=node.parent;p&&!ts.isSourceFile(p);p=p.parent){
    if((ts.isClassDeclaration(p)||ts.isClassExpression(p)||ts.isModuleDeclaration(p)||ts.isFunctionDeclaration(p)||ts.isMethodDeclaration(p))&&p.name)parts.unshift(p.name.getText());
    else if((ts.isVariableDeclaration(p)||ts.isPropertyDeclaration(p))&&ts.isIdentifier(p.name)&&p.initializer&&(ts.isArrowFunction(p.initializer)||ts.isFunctionExpression(p.initializer)))parts.unshift(p.name.text);
  }
  return parts;
}
function isDeclarationName(n) { return Boolean(n.parent && ((ts.isFunctionDeclaration(n.parent) || ts.isClassDeclaration(n.parent) || ts.isInterfaceDeclaration(n.parent) || ts.isTypeAliasDeclaration(n.parent) || ts.isEnumDeclaration(n.parent) || ts.isModuleDeclaration(n.parent) || ts.isMethodDeclaration(n.parent) || ts.isMethodSignature(n.parent) || ts.isPropertyDeclaration(n.parent) || ts.isPropertySignature(n.parent) || ts.isVariableDeclaration(n.parent) || ts.isParameter(n.parent) || ts.isTypeParameterDeclaration(n.parent) || ts.isImportClause(n.parent) || ts.isImportSpecifier(n.parent) || ts.isNamespaceImport(n.parent) || ts.isExportSpecifier(n.parent)) && n.parent.name === n)); }

export function discoverFiles(root, { maxFiles = MAX_FILES, maxTotalBytes = MAX_TOTAL_BYTES } = {}) {
  const absolute = path.resolve(root);
  if (!fs.statSync(absolute).isDirectory()) throw new Error(`Project root is not a directory: ${absolute}`);
  const canonicalRoot=fs.realpathSync(absolute);
  if(path.resolve(canonicalRoot).toLowerCase()!==path.resolve(absolute).toLowerCase())throw new Error('Project root or one of its ancestors is a symlink/junction; choose the physical project path.');
  const git = (args) => execFileSync('git', args, { cwd: absolute, encoding: 'buffer', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000, maxBuffer: 16*1024*1024, windowsHide: true });
  let tracked;
  try {
    const patterns=[':(glob)**/*.ts',' :(glob)**/*.tsx',' :(glob)**/*.js',' :(glob)**/*.jsx',' :(glob)**/*.mts',' :(glob)**/*.cts',' :(glob)**/*.mjs',' :(glob)**/*.cjs'].map(x=>x.trim());
    const out = git(['ls-files','-co','--exclude-standard','-z','--',...patterns]);
    tracked = out.toString('utf8').split('\0').filter(Boolean);
    const ignoredTracked = new Set(git(['ls-files','-ci','--exclude-standard','-z','--',...patterns]).toString('utf8').split('\0').filter(Boolean));
    tracked = tracked.filter(p => !ignoredTracked.has(p));
  } catch (e) { throw new Error(`Grafe needs a Git worktree to apply ignore rules safely: ${e.message}`); }
  const candidates = tracked.filter(p => EXTENSIONS.has(path.extname(p).toLowerCase()) && !EXCLUDED.test(p) && !SECRET.test(p) && !p.split(/[\\/]/).some(x => x.startsWith('.'))).sort();
  const files = []; let total = 0; const skipped = [];
  for (const p of candidates) {
    if (files.length >= maxFiles) { skipped.push({ path: p, reason: 'file-count-limit' }); continue; }
    const abs = path.resolve(absolute, p);
    if (!abs.startsWith(absolute + path.sep)) { skipped.push({ path: p, reason: 'path-escape' }); continue; }
    let bytes;
    try {
      const st = fs.lstatSync(abs);
      if (st.isSymbolicLink() || !st.isFile()) { skipped.push({ path: p, reason: 'not-regular-file' }); continue; }
      let parent=path.dirname(abs);let traversedLink=false;while(parent.startsWith(absolute+path.sep)){if(fs.lstatSync(parent).isSymbolicLink()){traversedLink=true;break;}const next=path.dirname(parent);if(next===parent)break;parent=next;}if(traversedLink){skipped.push({path:p,reason:'symlink-ancestor'});continue;}
      const real = fs.realpathSync(abs);
      if (!real.startsWith(fs.realpathSync(absolute) + path.sep)) { skipped.push({ path: p, reason: 'symlink-escape' }); continue; }
      if (st.size > MAX_FILE_BYTES) { skipped.push({ path: p, reason: 'file-size-limit', bytes: st.size }); continue; }
      if (total + st.size > maxTotalBytes) { skipped.push({ path: p, reason: 'total-size-limit', bytes: st.size }); continue; }
      bytes = fs.readFileSync(abs);
      if(bytes.length>MAX_FILE_BYTES||total+bytes.length>maxTotalBytes){skipped.push({path:p,reason:bytes.length>MAX_FILE_BYTES?'file-size-limit-after-read':'total-size-limit-after-read',bytes:bytes.length});continue;}
    } catch (e) { skipped.push({ path: p, reason: `read-error: ${e.code ?? 'unknown'}` }); continue; }
    total += bytes.length;
    files.push({ path: p, text: bytes.toString('utf8'), hash: hash(bytes) });
  }
  return { files, scope: { root: absolute, included: files.map(f => f.path), includedCount: files.length, includedBytes: total, candidateCount: candidates.length, skipped }, diagnostics: skipped.map(x => ({ severity: 'warning', code: 'scope-skipped', ...x })) };
}

function resolveModule(file, specifier, known) {
  if (!specifier.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier));
  for (const candidate of [base, ...[...EXTENSIONS].map(ext => base + ext), ...[...EXTENSIONS].map(ext => `${base}/index${ext}`)]) if (known.has(candidate)) return candidate;
  return null;
}

export function indexProject(root, { maxFiles, maxTotalBytes } = {}) {
  return analyze(root, discoverFiles(root, { maxFiles, maxTotalBytes }));
}

/** Library seam (Trazo): index an already-captured file list [{path,text,hash}] under root, with no discovery of its own. */
export function indexFiles(root, captured) {
  const absolute = path.resolve(root);
  const files = captured.filter(f => EXTENSIONS.has(path.extname(f.path).toLowerCase()) && !EXCLUDED.test(f.path) && !SECRET.test(f.path)).map(f => ({ path: f.path.replaceAll('\\','/'), text: f.text, hash: f.hash ?? hash(f.text) }));
  return analyze(root, { files, scope: { root: absolute, included: files.map(f => f.path), includedCount: files.length, includedBytes: files.reduce((n, f) => n + Buffer.byteLength(f.text), 0), candidateCount: captured.length, skipped: [] }, diagnostics: [] });
}

function analyze(root, discovered) {
  const files = discovered.files;
  const known = new Set(files.map(f => f.path));
  const byPath = new Map(files.map(f => [f.path, f]));
  const asts = new Map(files.map(f => [f.path, ts.createSourceFile(f.path, f.text, ts.ScriptTarget.Latest, true, f.path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)]));
  const symbols = new Map(); const fileSymbols = new Map(); const declarations = new Map(); const imports = new Map(); const edges = []; const diagnostics = [...discovered.diagnostics];
  const symbolDeclarations=new Map();
  for (const f of files) fileSymbols.set(f.path, []);
  const pushSymbol = (f, source, node, kind, name) => {
    const owner=ownerSegments(node);
    const qualifiedName=[...owner,name].join('.');
    const id = stableId(f.path, kind, name, owner.join('.'));
    let item = symbols.get(id);
    const start = node.getStart(source), end = node.getEnd();
    if (!item) {
      item = { id, name, qualifiedName, kind, file: f.path, startLine: lineAt(source,start), endLine: endLineAt(source,end), start, end, exported: Boolean(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)), sourceHash: f.hash };
      symbols.set(id,item); fileSymbols.get(f.path).push(id);
      symbolDeclarations.set(`${f.path}:${node.getStart(source)}`,item);
      if (!declarations.has(name)) declarations.set(name, []);
      declarations.get(name).push(item);
    } else { item.endLine = Math.max(item.endLine,endLineAt(source,end)); item.end = Math.max(item.end,end); item.exported ||= Boolean(node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)); }
    return item;
  };
  for (const f of files) {
    const ast = asts.get(f.path);
    const visit = node => {
      if (ts.isFunctionDeclaration(node) && node.name) pushSymbol(f,ast,node,'function',node.name.text);
      else if (ts.isClassDeclaration(node) && node.name) pushSymbol(f,ast,node,'class',node.name.text);
      else if (ts.isInterfaceDeclaration(node)) pushSymbol(f,ast,node,'interface',node.name.text);
      else if (ts.isTypeAliasDeclaration(node)) pushSymbol(f,ast,node,'type',node.name.text);
      else if (ts.isEnumDeclaration(node)) pushSymbol(f,ast,node,'enum',node.name.text);
      else if (ts.isMethodDeclaration(node) && node.name && (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent))) pushSymbol(f,ast,node,'method',node.name.getText(ast));
      else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) pushSymbol(f,ast,node,'function',node.name.text);
      else if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) pushSymbol(f,ast,node,'function',node.name.text);
      ts.forEachChild(node,visit);
    };
    visit(ast);
  }
  const compilerOptions={allowJs:true,checkJs:false,noEmit:true,skipLibCheck:true,target:ts.ScriptTarget.Latest,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,types:[]};
  const knownAbsolute=new Map(files.map(f=>[path.resolve(discovered.scope.root,f.path).toLowerCase(),f]));
  const host=ts.createCompilerHost(compilerOptions);
  host.resolveModuleNames=(moduleNames,containingFile)=>moduleNames.map(spec=>{const resolved=resolveModule(rel(discovered.scope.root,containingFile),spec,known);if(!resolved)return undefined;const filename=path.resolve(discovered.scope.root,resolved);const extension=path.extname(filename).toLowerCase();return {resolvedFileName:filename,extension:extension.includes('tsx')?ts.Extension.Tsx:extension.includes('ts')?ts.Extension.Ts:extension.includes('jsx')?ts.Extension.Jsx:ts.Extension.Js};});
  const tsLib=path.dirname(require.resolve('typescript')).toLowerCase();const defaultGetSourceFile=host.getSourceFile.bind(host);const defaultFileExists=host.fileExists.bind(host);
  host.getSourceFile=(filename,languageVersion,onError,shouldCreateNew)=>{const captured=knownAbsolute.get(path.resolve(filename).toLowerCase());if(captured)return ts.createSourceFile(filename,captured.text,languageVersion,true,filename.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);const normalized=path.resolve(filename).toLowerCase();if(path.dirname(normalized)===tsLib&&/^lib\..*\.d\.ts$/.test(path.basename(normalized)))return defaultGetSourceFile(filename,languageVersion,onError,shouldCreateNew);return undefined;};
  host.fileExists=filename=>{const normalized=path.resolve(filename).toLowerCase();return knownAbsolute.has(normalized)||(path.dirname(normalized)===tsLib&&/^lib\..*\.d\.ts$/.test(path.basename(normalized))&&defaultFileExists(filename));};
  const program=ts.createProgram(files.map(f=>path.resolve(discovered.scope.root,f.path)),compilerOptions,host);
  for(const f of files){const source=program.getSourceFile(path.resolve(discovered.scope.root,f.path));if(source)asts.set(f.path,source);}
  const checker=program.getTypeChecker();
  const resolveAstSymbol=node=>{
    let symbol;try{symbol=checker.getSymbolAtLocation(node);}catch{return null;}
    if(symbol?.flags&ts.SymbolFlags.Alias){try{symbol=checker.getAliasedSymbol(symbol);}catch{return null;}}
    for(const declaration of symbol?.declarations??[]){const sf=declaration.getSourceFile();let sourcePath;try{sourcePath=rel(discovered.scope.root,sf.fileName);}catch{continue;}if(!known.has(sourcePath))continue;const candidate=symbolDeclarations.get(`${sourcePath}:${declaration.getStart(sf)}`);if(candidate)return candidate;}
    return null;
  };
  const unique = (arr) => arr?.length === 1 ? arr[0] : null;
  const excerptAt=(f,line)=>f.text.split(/\r?\n/).slice(Math.max(0,line-3),line+2).map((text,i)=>({line:Math.max(1,line-2)+i,text}));
  for (const f of files) {
    const ast = asts.get(f.path); const local = new Map(); const imp = new Map(); imports.set(f.path,imp);
    for (const id of fileSymbols.get(f.path)) { const s = symbols.get(id); if (!local.has(s.name)) local.set(s.name,[]); local.get(s.name).push(s); }
    const visitImports = node => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const spec = node.moduleSpecifier.text; const target = resolveModule(f.path,spec,known);
        const at=lineAt(ast,node.getStart(ast));
        edges.push({ id:`import:${f.path}:${node.getStart(ast)}`,kind:'import',fromFile:f.path,toFile:target,external:!target,line:at,text:spec,excerpt:excerptAt(f,at) });
        if (target) {
          const clause=node.importClause; const named=clause?.namedBindings;
          const add=(alias, original)=>{ const targetDefs=unique(declarations.get(original)?.filter(d=>d.file===target && d.exported)); if (targetDefs) imp.set(alias,targetDefs); else diagnostics.push({severity:'info',code:'unresolved-import-symbol',file:f.path,line:lineAt(ast,node.getStart(ast)),name:original,target}); };
          if(clause?.name)add(clause.name.text,'default');
          if(named && ts.isNamespaceImport(named)) add(named.name.text,'*');
          else if(named && ts.isNamedImports(named)) for(const e of named.elements)add(e.name.text,(e.propertyName??e.name).text);
        } else diagnostics.push({severity:'info',code:'unresolved-module',file:f.path,line:lineAt(ast,node.getStart(ast)),specifier:spec});
      }
      ts.forEachChild(node,visitImports);
    };
    visitImports(ast);
    const addUsage = (target,node,kind,textName) => {
      if (!target) return;
      let caller=null;
      for(let p=node.parent;p && !ts.isSourceFile(p);p=p.parent){
        const named=p.name&&(ts.isIdentifier(p.name)||ts.isPrivateIdentifier(p.name))?p.name.text:null;
        const variableOwner=ts.isArrowFunction(p)||ts.isFunctionExpression(p)?p.parent:null;
        const effectiveName=named??(variableOwner&&(ts.isVariableDeclaration(variableOwner)||ts.isPropertyDeclaration(variableOwner))&&ts.isIdentifier(variableOwner.name)?variableOwner.name.text:null);
        const kindOf=ts.isFunctionDeclaration(p)||ts.isFunctionExpression(p)||ts.isArrowFunction(p)?'function':ts.isMethodDeclaration(p)?'method':ts.isClassDeclaration(p)?'class':null;
        if(effectiveName&&kindOf){let owner=ownerSegments(p);if(variableOwner&&owner[owner.length-1]===effectiveName)owner=owner.slice(0,-1);caller=symbols.get(stableId(f.path,kindOf,effectiveName,owner.join('.')));if(caller)break;}
      }
      const at=lineAt(ast,node.getStart(ast));
      edges.push({ id:`${kind}:${f.path}:${node.getStart(ast)}:${target.id}`,kind,fromFile:f.path,fromSymbol:caller?.id??null,toSymbol:target.id,line:at,name:textName,fromTest:TEST_FILE.test(f.path),resolution:'typescript-checker',excerpt:excerptAt(f,at) });
    };
    const visitUses = node => {
      if (ts.isCallExpression(node)) {
        let targetName=null;
        if (ts.isIdentifier(node.expression)) targetName=node.expression.text;
        else if (ts.isPropertyAccessExpression(node.expression)) targetName=node.expression.name.text;
        const loc=ts.isPropertyAccessExpression(node.expression)?node.expression.name:node.expression;
        const target = targetName ? resolveAstSymbol(loc) : null;
        addUsage(target,node,'call',targetName??node.expression.getText(ast));
        if (!target && targetName) diagnostics.push({severity:'info',code:'unresolved-call',file:f.path,line:lineAt(ast,node.getStart(ast)),name:targetName,reason:'The bounded index does not resolve this call to one in-scope definition.'});
      } else if (ts.isIdentifier(node) && !isDeclarationName(node) && !(ts.isCallExpression(node.parent)&&node.parent.expression===node) && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name===node) && !(ts.isPropertyAssignment(node.parent)&&node.parent.name===node) && !(ts.isPropertyAccessExpression(node.parent)&&node.parent.expression===node)) {
        const target=resolveAstSymbol(node); if (target) addUsage(target,node,TEST_FILE.test(f.path)?'test-reference':'reference',node.text);
      }
      ts.forEachChild(node,visitUses);
    };
    visitUses(ast);
  }
  const testMentions=new Map();for(const f of files){if(!TEST_FILE.test(f.path))continue;const ast=asts.get(f.path),byName=new Map();const visitCandidates=node=>{if(ts.isIdentifier(node)&&!isDeclarationName(node)){const line=lineAt(ast,node.getStart(ast));if(!byName.has(node.text))byName.set(node.text,new Set());byName.get(node.text).add(line);}ts.forEachChild(node,visitCandidates);};visitCandidates(ast);testMentions.set(f.path,byName);}
  const existingMentions=new Map();for(const e of edges)if(e.toSymbol){const key=`${e.toSymbol}|${e.fromFile}`;if(!existingMentions.has(key))existingMentions.set(key,new Set());existingMentions.get(key).add(e.line);}
  for(const symbol of symbols.values())for(const f of files){const lines=testMentions.get(f.path)?.get(symbol.name);if(!lines)continue;const existing=existingMentions.get(`${symbol.id}|${f.path}`)??new Set();for(const line of lines)if(!existing.has(line)){edges.push({id:`test-candidate:${f.path}:${line}:${symbol.id}`,kind:'test-reference',fromFile:f.path,fromSymbol:null,toSymbol:symbol.id,line,name:symbol.name,fromTest:true,resolution:'text-match-candidate',quality:'candidate',excerpt:excerptAt(f,line)});existing.add(line);}existingMentions.set(`${symbol.id}|${f.path}`,existing);}
  for (const e of edges) if (e.kind==='call' && e.fromTest) e.kind='test-reference';
  const diagMap=new Map();for(const d of diagnostics){if(d.code==='unresolved-call'){const key=`${d.code}:${d.file}:${d.name}`;const old=diagMap.get(key);if(old){old.occurrences++;if(old.lines.length<5&&!old.lines.includes(d.line))old.lines.push(d.line);}else diagMap.set(key,{...d,occurrences:1,lines:[d.line]});}else diagMap.set(`${d.code}:${d.file??''}:${d.path??''}:${d.name??''}`,d);}
  diagnostics.splice(0,diagnostics.length,...diagMap.values());
  const enrichedSymbols=[...symbols.values()].map(s=>({ ...s, excerpt:byPath.get(s.file).text.split(/\r?\n/).slice(s.startLine-1,Math.min(s.endLine,s.startLine+18)).join('\n') }));
  const symbolById=new Map(enrichedSymbols.map(s=>[s.id,s]));
  const payload={format:'grafe.snapshot/1',indexer:INDEXER_VERSION,root:path.resolve(root),createdAt:new Date().toISOString(),scope:discovered.scope,files:files.map(f=>({path:f.path,hash:f.hash,bytes:Buffer.byteLength(f.text)})),symbols:enrichedSymbols,edges,diagnostics};
  payload.snapshotId=hash(JSON.stringify({format:payload.format,indexer:payload.indexer,files:payload.files,symbols:payload.symbols.map(({id,file,startLine,endLine,sourceHash})=>({id,file,startLine,endLine,sourceHash})),edges:edges.map(({id,kind,fromFile,toFile,toSymbol,line})=>({id,kind,fromFile,toFile,toSymbol,line})),diagnostics}));
  return payload;
}

export function focus(index, symbolId, { direction = 'both' } = {}) {
  const symbol=index.symbols.find(x=>x.id===symbolId); if(!symbol) throw new Error(`Unknown symbol id: ${symbolId}`);
  const related=index.edges.filter(e=>e.toSymbol===symbolId || e.fromSymbol===symbolId || (e.fromFile===symbol.file && e.toFile));
  const selected=direction==='incoming'?related.filter(e=>e.toSymbol===symbolId):direction==='outgoing'?related.filter(e=>e.fromSymbol===symbolId):related;
  return { symbol, edges:selected, diagnostics:index.diagnostics.filter(d=>d.file===symbol.file || d.target===symbol.file), relatedTests:selected.filter(e=>e.kind==='test-reference'), callers:selected.filter(e=>e.kind==='call'&&e.fromSymbol!==symbolId), imports:selected.filter(e=>e.kind==='import') };
}
