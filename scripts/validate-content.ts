import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { seedItems } from '../src/content';
import { buildPack, validatePack } from '../src/content/pipeline';

const args=process.argv.slice(2);
const inputIndex=args.indexOf('--input');
try {
  if(inputIndex>=0 && !args[inputIndex+1]) throw new Error('--input requires a JSON pack path');
  const packs=inputIndex>=0 ? [validatePack(JSON.parse(readFileSync(resolve(args[inputIndex+1]),'utf8')))] : (['en','ko'] as const).map(targetLanguage=>{
    const sourceLanguage=targetLanguage==='en'?'ko':'en';
    return validatePack(buildPack({id:`${sourceLanguage}-${targetLanguage}-core`,version:1,sourceLanguage,targetLanguage},seedItems.filter(item=>item.targetLanguage===targetLanguage)));
  });
  if(args.includes('--write')) {
    if(inputIndex>=0) throw new Error('External packs require a reviewed attribution record before writing a distribution bundle');
    const directory=resolve('content/packs');mkdirSync(directory,{recursive:true});
    for(const pack of packs) writeFileSync(resolve(directory,`${pack.manifest.id}.v${pack.manifest.version}.json`),`${JSON.stringify(pack,null,2)}\n`);
    writeFileSync(resolve(directory,'sources.json'),`${JSON.stringify({schemaVersion:1,sources:[{name:'KeyLingo original engineering seed',source:'content/seed.ts',license:'0BSD',externalDataset:false,attributionRequired:false,transformation:'Original pairs expanded into both directions; NFC, case-aware aliases, deduplication and SHA-256 validation.',packs:packs.map(p=>p.manifest.id)}]},null,2)}\n`);
  }
  for(const pack of packs) console.log(`${pack.manifest.id} v${pack.manifest.version}: ${pack.items.length} verified items; SHA-256 ${pack.manifest.checksum}`);
} catch(error) { console.error(error instanceof Error?error.message:String(error));process.exitCode=1; }
