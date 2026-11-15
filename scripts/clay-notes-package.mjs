import {readFile,readdir,lstat,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

export function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function zipFiles(files){
  const parts=[],central=[];let offset=0;
  for(const [name,bytes] of files){
    if(!/^[A-Za-z0-9_.\/-]+$/.test(name)||name.startsWith('/')||name.split('/').includes('..'))throw new Error('Unsafe ZIP member');
    const filename=Buffer.from(name),crc=crc32(bytes),local=Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(bytes.length,18);local.writeUInt32LE(bytes.length,22);local.writeUInt16LE(filename.length,26);
    parts.push(local,filename,bytes);
    const entry=Buffer.alloc(46);entry.writeUInt32LE(0x02014b50);entry.writeUInt16LE(20,4);entry.writeUInt16LE(20,6);entry.writeUInt16LE(0x800,8);entry.writeUInt16LE(33,14);entry.writeUInt32LE(crc,16);entry.writeUInt32LE(bytes.length,20);entry.writeUInt32LE(bytes.length,24);entry.writeUInt16LE(filename.length,28);entry.writeUInt32LE(offset,42);central.push(entry,filename);offset+=local.length+filename.length+bytes.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...parts,directory,end]);
}
export async function buildPackage({source=fileURLToPath(new URL('../extensions/clay-notes/',import.meta.url)),output=fileURLToPath(new URL('../dist/clay-notes/',import.meta.url))}={}){
  source=resolve(source);output=resolve(output);
  if((await lstat(source)).isSymbolicLink())throw new Error('Extension source cannot be a symlink');
  const base=['manifest.json','background.js','content.js','content.css','options.html','options.js','options.css'];
  async function safeRead(name){
    if(name.split('/').some(part=>!part||part==='.'||part==='..')||!base.includes(name)&&!/^_locales\/[A-Za-z_]+\/messages\.json$/.test(name)&&!/^icons\/(16|32|48|128)\.png$/.test(name))throw new Error(`Unapproved extension resource: ${name}`);
    let cursor=source;for(const part of name.split('/')){cursor=join(cursor,part);if((await lstat(cursor)).isSymbolicLink())throw new Error('Symlink in extension resources');}
    const stat=await lstat(cursor);if(!stat.isFile()||stat.size>1_000_000)throw new Error(`Invalid resource: ${name}`);return readFile(cursor);
  }
  const manifest=JSON.parse((await safeRead('manifest.json')).toString('utf8'));
  if(manifest.manifest_version!==3||!/^\d+\.\d+\.\d+$/.test(manifest.version)||!manifest.default_locale)throw new Error('Expected versioned localized MV3 manifest');
  const referenced=[manifest.background?.service_worker,manifest.options_page,...(manifest.content_scripts||[]).flatMap(script=>[...(script.js||[]),...(script.css||[])])];
  if(referenced.some(name=>!base.includes(name)))throw new Error('Manifest references a resource outside the package allow-list');
  const localeNames=(await readdir(join(source,'_locales'))).sort();
  if(!localeNames.includes(manifest.default_locale))throw new Error('Default locale is missing');
  const localeFiles=localeNames.map(name=>`_locales/${name}/messages.json`);
  for(const name of localeFiles){const messages=JSON.parse((await safeRead(name)).toString('utf8'));for(const key of ['extName','extDescription','library'])if(!messages[key]?.message)throw new Error(`${name} missing ${key}`);if(messages.extDescription.message.length>132)throw new Error('Chrome description exceeds132 characters');}
  const icons=Object.values(manifest.icons || {});if(!icons.length)throw new Error('Release icons are missing');
  const names=[...new Set([...base,...localeFiles,...icons])].sort();const files=[];
  for(const name of names){const bytes=await safeRead(name);if(name.endsWith('.png')&&(bytes.readUInt32BE(0)!==0x89504e47||bytes.readUInt32BE(16)!==Number(name.match(/(\d+)\.png$/)[1])))throw new Error(`Invalid PNG icon: ${name}`);files.push([name,bytes]);}
  const archive=zipFiles(files),sha256=createHash('sha256').update(archive).digest('hex');await mkdir(output,{recursive:true});
  const filename=`clay-notes-${manifest.version}.zip`;await writeFile(join(output,filename),archive);
  const report={version:manifest.version,filename,sha256,bytes:archive.length,members:names,locales:localeNames,credentialValuesIncluded:false,publicationStatus:'not submitted; operator installation/store review pending'};
  await writeFile(join(output,'package.json'),JSON.stringify(report,null,2)+'\n');return {...report,path:join(output,filename)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){try{console.log(JSON.stringify(await buildPackage(),null,2));}catch(error){console.error(error.message);process.exitCode=1;}}
