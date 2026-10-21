// Decode SCIP 0.4's bundled generated protobuf classes and verify UTF-16 spans.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function findScipPackage() {
  const roots = [path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_npx')];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      const dir = path.join(root, entry.name, 'node_modules', '@sourcegraph', 'scip-typescript');
      const pkg = path.join(dir, 'package.json');
      if (fs.existsSync(pkg) && JSON.parse(fs.readFileSync(pkg, 'utf8')).version === '0.4.0') return dir;
    }
  }
  throw new Error('SCIP TypeScript 0.4.0 package not found in npm _npx cache; run the pinned index command first.');
}

const [indexPath, sourceRoot, outputPath, mode = 'full'] = process.argv.slice(2);
if (!indexPath || !sourceRoot || !outputPath) {
  throw new Error('usage: node decode-scip.cjs <index.scip> <source-root> <output.json>');
}
const pkg = findScipPackage();
const { scip } = require(path.join(pkg, 'dist', 'src', 'scip.js'));
const ts = require(path.join(path.dirname(path.dirname(pkg)), 'typescript'));
const index = scip.Index.deserializeBinary(fs.readFileSync(indexPath));
const role = { 1: 'definition', 2: 'import', 4: 'write', 8: 'read', 10: 'import+read' };
const docs = index.documents.map((doc) => {
  const file = path.join(sourceRoot, doc.relative_path);
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/);
  const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const lineOffsets = [];
  let offset = 0;
  for (const line of lines) { lineOffsets.push(offset); offset += line.length + 1; }
  const occurrences = doc.occurrences.map((occ) => {
    const r = occ.range;
    const startLine = r[0], startCol = r[1];
    const endLine = r.length === 3 ? startLine : r[2];
    const endCol = r.length === 3 ? r[2] : r[3];
    const exactText = startLine === endLine ? (lines[startLine] || '').slice(startCol, endCol) : null;
    const from = lineOffsets[startLine] + startCol;
    const to = lineOffsets[endLine] + endCol;
    let exactNode;
    function walk(node) {
      if (node.getStart(ast) === from && node.end === to) exactNode = node;
      ts.forEachChild(node, walk);
    }
    walk(ast);
    let usage = 'reference';
    if (occ.symbol_roles & 1) usage = 'definition';
    else if (exactNode) {
      for (let node = exactNode; node && node !== ast; node = node.parent) {
        if (ts.isImportSpecifier(node) || ts.isImportClause(node) || ts.isNamespaceImport(node)) { usage = 'symbol-import'; break; }
        if (ts.isStringLiteral(node) && node.parent && (ts.isImportDeclaration(node.parent) || ts.isExportDeclaration(node.parent))) { usage = 'module-import'; break; }
        if (ts.isCallExpression(node.parent) && node.parent.expression === node) { usage = 'call'; break; }
      }
    }
    const zeroWidthContainer = startCol === endCol && startLine === endLine;
    return {
      symbol: occ.symbol,
      roleBits: occ.symbol_roles,
      role: role[occ.symbol_roles] || (occ.symbol_roles ? `bits:${occ.symbol_roles}` : 'reference/unspecified'),
      usage,
      range: { startLine: startLine + 1, startColumn: startCol, endLine: endLine + 1, endColumn: endCol },
      exactText,
      excerpt: lines.slice(startLine, Math.min(endLine + 1, startLine + 3)).join('\n'),
      spanMatchesSource: zeroWidthContainer || (exactText !== null && exactText.length > 0),
    };
  });
  const summary = { path: doc.relative_path, occurrenceCount: occurrences.length, symbolCount: doc.symbols.length, diagnosticCount: (doc.diagnostics || []).length, spanMismatchCount: occurrences.filter(o => !o.spanMatchesSource).length };
  if (mode === 'summary') {
    summary.usageCounts = occurrences.reduce((acc, occ) => (acc[occ.usage] = (acc[occ.usage] || 0) + 1, acc), {});
    return summary;
  }
  return { ...summary, occurrences };
});
const result = { schema: 'grafe-scip-audit/1', index: path.resolve(indexPath), tool: index.metadata?.tool_info?.toObject?.() || null, projectRoot: index.metadata?.project_root || null, documentCount: docs.length, documents: docs };
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ documentCount: docs.length, occurrences: docs.reduce((n, d) => n + d.occurrenceCount, 0), spanMismatches: docs.reduce((n, d) => n + d.spanMismatchCount, 0), mode }, null, 2));
