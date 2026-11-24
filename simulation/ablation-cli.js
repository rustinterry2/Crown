import fs from 'node:fs';
import {runPanel,summarize,createMapCache,runCampaign} from './runner.js';
import {MODELS,modelClass} from './challengers.js';
const args=Object.fromEntries(process.argv.slice(2).map(x=>{const [k,v]=x.replace(/^--/,'').split('=');return [k,v??true];}));
const start=Number(args.start||1),end=Number(args.end||50),model=args.model||'all',out=args.out||'simulation-output/ablation';
if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end>250||end<start)throw Error('Development seeds only');
const names=model==='all'?Object.keys(MODELS):[model];fs.mkdirSync(out,{recursive:true});
for(const name of names){
 const rows=runPanel({start,end,Engine:modelClass(name),mapTypes:args.map?[args.map]:undefined});
 const groups=summarize(rows);
 fs.writeFileSync(out+'/'+name+'.ndjson',rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
 fs.writeFileSync(out+'/'+name+'.json',JSON.stringify(groups,null,2)+'\n');
 console.log(name,groups.all);if(groups.all.errors)process.exitCode=1;
}
