import fs from 'node:fs';
import {runPanel,summarize,runCampaign,createMapCache,SEED_SPLITS,BASELINE_COMMIT} from './runner.js';
const args=Object.fromEntries(process.argv.slice(2).map(s=>{const [k,...v]=s.replace(/^--/,'').split('=');return [k,v.join('=')||true];}));
const split=args.split||'development';
if(!SEED_SPLITS[split])throw Error('Unknown split');
if(split==='holdout'&&!args['unlock-holdout'])throw Error('Holdout sealed. Explicit --unlock-holdout required.');
const [lo,hi]=SEED_SPLITS[split],start=Number(args.start||lo),end=Number(args.end||hi);
if(!Number.isInteger(start)||!Number.isInteger(end)||start<lo||end>hi||end<start)throw Error('seed range outside split');
const maxMonths=Number(args.months||60),out=args.out||'simulation-output';
fs.mkdirSync(out,{recursive:true});
const rows=runPanel({start,end,maxMonths,mapTypes:args.map?[args.map]:undefined,difficulties:args.difficulty?[args.difficulty]:undefined,policies:args.policy?[args.policy]:undefined});
const summary=summarize(rows);
fs.writeFileSync(out+'/campaigns.ndjson',rows.map(r=>JSON.stringify(r)).join('\n')+'\n');
fs.writeFileSync(out+'/summary.json',JSON.stringify({baselineCommit:BASELINE_COMMIT,split,start,end,maxMonths,groups:summary},null,2)+'\n');
if(args.trace){const r=runCampaign({seed:start,difficulty:args.difficulty||'hard',policy:args.policy||'expert',mapType:args.map||'england',neighbors:createMapCache()(args.map||'england',start),maxMonths,trace:true});for(const key of ['monthly','decisions'])fs.writeFileSync(out+'/'+key+'.ndjson',r[key].map(x=>JSON.stringify(x)).join('\n')+'\n');}
console.log(JSON.stringify(summary.all,null,2));if(summary.all.errors)process.exitCode=1;
