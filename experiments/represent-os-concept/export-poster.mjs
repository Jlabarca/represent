import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const svg = await readFile(new URL('./poster.svg', import.meta.url));
const png = await sharp(svg).resize({ width: 2880 }).png({ compressionLevel: 9 }).toBuffer();
await writeFile(new URL('./poster.png', import.meta.url), png);
console.log(JSON.stringify({ input: 'poster.svg', output: 'poster.png', width: 2880, bytes: png.length }));
