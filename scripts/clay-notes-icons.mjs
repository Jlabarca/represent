import {deflateSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve,join} from 'node:path';
import {crc32} from './clay-notes-package.mjs';
function chunk(name,data){const type=Buffer.from(name),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([type,data])));return Buffer.concat([length,type,data,crc]);}
export function renderIcon(size){
  const pixels=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const px=(x+.5)*128/size,py=(y+.5)*128/size,dx=Math.max(33-px,px-95,0),dy=Math.max(33-py,py-95,0);
    const inside=px>=3&&px<=125&&py>=3&&py<=125&&dx*dx+dy*dy<=900;
    const sx=Math.abs(px-64),sy=Math.abs(py-64),star=sx+sy<=44 && Math.min(sx,sy)<=Math.max(0,16-Math.max(sx,sy)/3);
    const offset=y*(size*4+1)+1+x*4;const color=star?[23,62,44]:[221,236,206];
    pixels[offset]=color[0];pixels[offset+1]=color[1];pixels[offset+2]=color[2];pixels[offset+3]=inside?255:0;
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
export async function writeIcons(directory=fileURLToPath(new URL('../extensions/clay-notes/icons/',import.meta.url))){await mkdir(directory,{recursive:true});for(const size of [16,32,48,128])await writeFile(join(directory,`${size}.png`),renderIcon(size));}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await writeIcons();
