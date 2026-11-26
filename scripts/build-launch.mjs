import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const out=path.join(root,'dist-launch');fs.mkdirSync(out,{recursive:true});for(const file of ['index.html','launch.css','launch.js','_headers'])fs.copyFileSync(path.join(root,'launch',file),path.join(out,file));fs.copyFileSync(path.join(root,'public/assets/forme-studio-hero.webp'),path.join(out,'launch-hero.webp'));console.log('Launch page built in dist-launch. No store data or secrets included.');
