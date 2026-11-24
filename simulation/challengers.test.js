import test from 'node:test';
import assert from 'node:assert/strict';
import {CrownState,IDS} from './baseline-engine.js';
import {MODELS,modelClass,projectedOdds,reinforcement} from './challengers.js';
import {runPanel,summarize} from './runner.js';
test('fortified target prompts affordable adaptive reinforcement beyond old ceiling',()=>{
 const g=new CrownState({seed:42,difficulty:'hard'}),h=g.human,l=Object.keys(g.lords).find(x=>x!==h),p=g.lords[l],hp=g.lords[h];
 for(const id of IDS)if(!g.provinces[id].home_castle)g.provinces[id].owner=l;
 hp.home_army={soldiers:150,knights:0,catapults:0};hp.campaign_army={soldiers:0,knights:0,catapults:0};
 p.campaign_army={soldiers:75,knights:0,catapults:1};p.home_army={soldiers:7,knights:0,catapults:0};p.treasury=500;
 assert.equal(g.aiPlan(l),null);
 for(const name of ['M1','M2','M3']){
  const prep=reinforcement(g,l,MODELS[name],0);
  assert.equal(prep.target,hp.home_province);assert.ok(prep.after>prep.before);assert.ok(prep.cost<=25);
  if(name==='M2')assert.equal(prep.units.soldiers,0);else assert.ok(prep.units.soldiers>0);
 }
 assert.equal(reinforcement(g,l,MODELS.M3,.45),null);
});
test('all four models reproduce development smoke panel without invalid states',()=>{
 for(const name of Object.keys(MODELS)){
  const result=summarize(runPanel({start:1,end:2,Engine:modelClass(name)})).all;
  assert.equal(result.n,96);assert.equal(result.errors,0);assert.equal(result.aiOpeningClaims,480);
 }
});
