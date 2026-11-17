import test from 'node:test';
import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {resolveLocale,normalizeLanguagePreference,resolveLanguagePreference,translate,direction,locales,catalogs} from '../src/clay-notes/web/i18n.mjs';
test('regional browser preferences select a supported interface language',()=>{
  assert.equal(resolveLocale(['es-CL','en-US']),'es','Spanish regional preference must select Spanish');
  assert.equal(resolveLocale(['pt-BR']),'pt');
});
test('account language preferences accept only Automatic or a supported locale',()=>{
  assert.deepEqual(resolveLanguagePreference('auto',['ar-EG','en']),{language:'auto',locale:'ar'});
  assert.deepEqual(resolveLanguagePreference('zh-CN',['es']),{language:'zh-CN',locale:'zh-CN'});
  assert.equal(normalizeLanguagePreference('fr'),'fr');
  assert.equal(normalizeLanguagePreference('es-MX'),'auto');
  assert.equal(normalizeLanguagePreference(undefined),'auto');
});
test('Spanish controls, English fallback and unsupported locale preferences are predictable',()=>{
  assert.equal(translate('es','Save a video'),'Guardar un video');
  assert.equal(translate('es','unknown authored message'),'unknown authored message');
  assert.equal(resolveLocale(['xx-XX','ja-JP']),'ja');assert.equal(resolveLocale(['xx-XX']),'en');
  assert.equal(resolveLocale(['zh_CN']),'zh-CN');
  assert.equal(translate('fr','Count {n}',{n:3}),'Count 3');
});
test('all offered locales translate every authored catalog entry and Arabic is RTL',()=>{
  const keys=Object.keys(catalogs.en);
  for(const locale of locales){for(const key of keys)assert.ok(typeof catalogs[locale.id][key]==='string'&&catalogs[locale.id][key].trim(),`${locale.id}: missing ${key}`);}
  assert.equal(direction('ar-EG'),'rtl');assert.equal(direction('es'),'ltr');
  assert.notEqual(translate('ar','My library'),'My library');assert.notEqual(translate('hi','Save my notes'),'Save my notes');
});
test('Chrome locales include manifest and pairing messages without incomplete placeholders',async()=>{
  const root=new URL('../extensions/clay-notes/',import.meta.url);
  const manifest=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
  assert.equal(manifest.default_locale,'en');assert.match(manifest.name,/__MSG_extName__/);
  for(const locale of locales){const messages=JSON.parse(await readFile(new URL(`_locales/${locale.id.replace('-','_')}/messages.json`,root),'utf8'));for(const key of ['extName','extDescription','library','saved','needsTranscript','pairingFailed','connected'])assert.ok(messages[key]?.message,`${locale.id}:${key}`);assert.ok(messages.extDescription.message.length<=132,`${locale.id} description exceeds Chrome limit`);}
});
test('UI source translates authored labels while preserving captured/model/personal content',async()=>{
  const source=await readFile(new URL('../src/clay-notes/web/app.mjs',import.meta.url),'utf8');
  assert.match(source,/escape\(n\.title\)/);assert.match(source,/escape\(q\.answer\)/);assert.match(source,/escape\(s\.text\)/);
  assert.doesNotMatch(source,/(?:t|h)\((?:n\.title|q\.answer|s\.text|draft)\)/);
  assert.match(source,/localStorage\?\.setItem\('clay-notes-language'/);
});

test('summary translations preserve original revisions and localize account actions',async()=>{
  const source=await readFile(new URL('../src/clay-notes/web/app.mjs',import.meta.url),'utf8');
  assert.match(source,/session\.user\.languagePreference/);
  assert.match(source,/api\('\/preferences',\{method:'PATCH',data,/);
  assert.match(source,/revision\.translations\?\.\[locale\]/);
  assert.match(source,/resolveLocale\(\[revision\.language\]\)/);
  assert.match(source,/\/translations`\s*,?\{method:'POST',data:\{revisionId:revision\.id,locale:targetLocale,requestId\}\}/);
  assert.match(source,/data-action="show-original-summary"/);
  assert.match(source,/data-action="show-translation-summary"/);
  assert.doesNotMatch(source,/form\.target='_blank'|setAttribute\('rel','noopener'\)/);
  assert.match(source,/window\.addEventListener\('hashchange'.*refresh\(\)/);
  assert.match(source,/escape\(s\.text\)/);
  assert.match(source,/i18n\.mjs\?v=webbook-8/);
  assert.match(source,/collection\.mjs\?v=webbook-8/);
  const html=await readFile(new URL('../src/clay-notes/web/index.html',import.meta.url),'utf8');
  assert.match(html,/style\.css\?v=webbook-8/);
  assert.match(html,/app\.mjs\?v=webbook-8/);
  const css=await readFile(new URL('../src/clay-notes/web/style.css',import.meta.url),'utf8');
  assert.match(css,/html\[data-theme="dark"\] \.citation \{ background:var\(--accent-soft\); color:var\(--accent\); \}/);
  assert.match(css,/\.source-card p,\.source-card \.small,\.source-card \.video-import-state \{ color:var\(--muted\); \}/);
});
