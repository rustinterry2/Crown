import test from 'node:test';import assert from 'node:assert/strict';
import {runPanel,runCampaign,createMapCache,summarize} from './runner.js';
import {POLICIES} from './player-strategies.js';
import {CrownState,IDS} from './baseline-engine.js';
test('all policies, difficulties, and maps run deterministically',()=>{
 const a=runPanel({start:1,end:2,maxMonths:12}),b=runPanel({start:1,end:2,maxMonths:12});
 assert.equal(a.length,96);assert.deepEqual(a,b);assert.equal(summarize(a).all.errors,0);
});
test('map graph is symmetric and covers all provinces',()=>{const m=createMapCache();for(let seed=1;seed<=5;seed++){const g=m('random',seed);for(const id of IDS){assert.ok(g[id].length);for(const n of g[id])assert.ok(g[n].includes(id));}}});
test('victory requires no living Norman lords, even if other lords captured castles',()=>{const g=new CrownState({seed:5});const n=Object.values(g.lords).filter(p=>p.faction==='Norman');for(const p of n.slice(0,-1))p.alive=false;assert.equal(g.checkEnd(),null);n.at(-1).alive=false;assert.equal(g.checkEnd(),'victory');});
