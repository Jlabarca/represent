import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {configSpan,spliceTitle} from '../../../references/interactive-diagram/scripts/splice.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const upstream=resolve(root,'../../../references/interactive-diagram');
for(const [name,template,variable] of [['explainer','skeleton.html','app'],['poster','platform-skeleton.html','config']]){
 const data=JSON.parse(readFileSync(resolve(root,`${name}.config.json`),'utf8'));
 const source=readFileSync(resolve(upstream,'assets',template),'utf8');
 const [a,b]=configSpan(source,`const ${variable} = {`,template);
 let output=spliceTitle(source.slice(0,a)+`const ${variable} = ${JSON.stringify(data,null,2)};`+source.slice(b),name==='explainer'?data.title:data.meta.title);
 // Appearance adaptation only; all renderer JavaScript is unchanged apart from config.
 if(name==='explainer') output=output.replace('</head>',`<style>.node-group[data-id="blue"] rect{stroke:#2563eb!important;fill:#dbeafe!important}.node-group[data-id="yellow"] rect{stroke:#a16207!important;fill:#fef3c7!important}.node-group[data-id="red"] rect{stroke:#b91c1c!important;fill:#fee2e2!important}.node-group[data-id="black"] rect{stroke:#111827!important;fill:#374151!important}.node-group[data-id="black"] text{fill:#fff!important}#panel-resp a{color:var(--fg)} </style></head>`);
 // UI wording only: preserve selectors, event handlers, algorithms, and renderer behavior.
 const ui={'放大':'Zoom in','縮小':'Zoom out','適應畫面':'Fit','深色':'Dark','淺色':'Light','說明':'Help','檢查重疊':'Audit overlaps','導覽':'Walkthrough','恢復主題預設配色':'Reset theme colours','配色':'Colours','節點類型':'View legend','線旁字':'Edge labels','線色':'Edge colour','連接線顏色':'Edge colour','連接線標籤顏色':'Edge label colour'};
 for(const [from,to] of Object.entries(ui)) output=output.replaceAll(from,to);
 writeFileSync(resolve(root,`${name}.html`),output);
 console.log(`Generated ${name}.html with upstream ${template}`);
}
