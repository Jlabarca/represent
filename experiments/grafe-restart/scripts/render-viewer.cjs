const fs = require('node:fs');
const path = require('node:path');
const [dataPath, outputPath] = process.argv.slice(2);
if (!dataPath || !outputPath) throw new Error('usage: node render-viewer.cjs decoded.json viewer.html');
const report = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const grouped = new Map();
for (const doc of report.documents) for (const occ of doc.occurrences) {
  if (!occ.symbol || !occ.exactText || occ.usage === 'definition' && occ.symbol.startsWith('scip-typescript npm typescript ')) continue;
  const item = grouped.get(occ.symbol) || { symbol: occ.symbol, usages: [] };
  item.usages.push({ file: doc.path, line: occ.range.startLine, text: occ.exactText, excerpt: occ.excerpt, usage: occ.usage });
  grouped.set(occ.symbol, item);
}
const symbols = [...grouped.values()].sort((a, b) => b.usages.length - a.usages.length || a.symbol.localeCompare(b.symbol));
const b64 = Buffer.from(JSON.stringify({ index: path.basename(report.index), documents: report.documentCount, symbols }), 'utf8').toString('base64');
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grafe source explorer spike</title>
<style>
:root{color-scheme:dark;font:14px/1.5 system-ui,sans-serif;background:#10151d;color:#e7edf6}*{box-sizing:border-box}body{margin:0}header{padding:18px 24px;border-bottom:1px solid #344153}h1{font-size:18px;margin:0 0 4px}.sub{color:#9eacbf}.layout{display:grid;grid-template-columns:minmax(240px,34%) 1fr;height:calc(100vh - 75px)}nav{overflow:auto;border-right:1px solid #344153;padding:10px}.item{display:block;width:100%;text-align:left;background:transparent;color:inherit;border:0;border-radius:6px;padding:9px;cursor:pointer}.item:hover,.item[aria-current=true]{background:#24344b}.count{float:right;color:#9eacbf}.detail{padding:22px;overflow:auto}.badge{font-size:11px;color:#a9c8f7;border:1px solid #405a79;border-radius:99px;padding:2px 8px;margin-left:6px}article{border:1px solid #344153;background:#171f2b;border-radius:8px;margin:12px 0;padding:12px}pre{white-space:pre-wrap;background:#0b1017;padding:10px;border-radius:5px;overflow:auto}.loc{color:#9eacbf;margin-bottom:4px}@media(max-width:700px){.layout{grid-template-columns:40% 60%}.detail{padding:12px}header{padding:14px}}
</style><header><h1>Grafe · focused source explorer</h1><div class="sub">Experimental SCIP snapshot · no server or AI calls · source excerpts embedded in this file</div></header><div class="layout"><nav id="list" aria-label="Indexed symbols"></nav><main class="detail" id="detail"><h2>Select a symbol</h2><p class="sub">Browse indexed definitions and usages. Calls are identified from the source AST; SCIP contributes the resolved symbol identity and range.</p></main></div><script>
const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob('${b64}'),c=>c.charCodeAt(0))));
const list=document.querySelector('#list'),detail=document.querySelector('#detail');
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
data.symbols.forEach((s,i)=>{const b=el('button','item');b.type='button';b.setAttribute('aria-current','false');b.append(document.createTextNode(s.symbol));b.append(el('span','count',String(s.usages.length)));b.onclick=()=>{document.querySelectorAll('.item').forEach(x=>x.setAttribute('aria-current','false'));b.setAttribute('aria-current','true');detail.replaceChildren();detail.append(el('h2','',s.symbol),el('p','sub',s.usages.length+' source occurrences in '+new Set(s.usages.map(u=>u.file)).size+' files'));for(const u of s.usages){const a=el('article');a.append(el('div','loc',u.file+':'+u.line),el('span','badge',u.usage),el('pre','',u.excerpt));detail.append(a)}};list.append(b)});
document.title+=' — '+data.index+' ('+data.documents+' files)';
</script></html>`;
fs.writeFileSync(outputPath, html);
console.log(JSON.stringify({ output: outputPath, symbols: symbols.length, documents: report.documentCount }));
