import {IDS,T,U,COUNT,PRICES,Rng} from './baseline-engine.js';
// Independent scripted player policies: none call aiOne, aiPlan, aiRecruit, etc.
export const POLICIES={
 passive:{passive:true},
 beginner:{reserve:5,threshold:.52,neutral:1.0,castle:1.0,enemy:1.0,recruit:20,cat:1,spend:.65,noise:.65,robin:false},
 expansionist:{reserve:5,threshold:.76,neutral:2.3,castle:.8,enemy:1.0,recruit:28,cat:1,spend:.65,noise:0,robin:true},
 defensive:{defensive:true,reserve:20,robin:false},
 aggressive:{reserve:4,threshold:.48,neutral:.9,castle:1.5,enemy:1.6,recruit:40,cat:2,spend:.85,noise:0,robin:true},
 siege:{reserve:7,threshold:.64,neutral:1.0,castle:2.6,enemy:1.0,recruit:36,cat:5,spend:.9,noise:0,robin:true},
 economic:{reserve:9,threshold:.82,neutral:1.7,castle:1.0,enemy:1.0,recruit:32,cat:3,spend:.65,noise:0,robin:true,economic:true},
 expert:{reserve:8,threshold:.70,neutral:1.5,castle:2.2,enemy:1.4,recruit:45,cat:4,spend:.9,noise:0,robin:true,adaptive:true}
};
const tactics=['Stand and Fight','Outflank','Ferocious Attack','Bombard'];
const bestOdds=(g,h,id)=>tactics.map(t=>[t,g.expectedOdds(h,id,t)]).sort((a,b)=>b[1]-a[1])[0];
function safePaths(g,h,start){
 const paths=new Map([[start,[]]]),q=[start];
 for(let i=0;i<q.length;i++)for(const id of g.neighbors[q[i]]){
  const owner=g.provinces[id].owner;
  if(paths.has(id)||!(owner===h||g.friendly(h,owner)))continue;
  paths.set(id,[...paths.get(q[i]),id]);q.push(id);
 }
 return paths;
}
function buy(g,h,units){if(COUNT({...{soldiers:0,knights:0,catapults:0},...units}))g.purchase(h,units);}
function deploy(g,h,reserve){
 const p=g.lords[h],r=g.castleReserve(h);if(!r)return;
 const units={soldiers:Math.max(0,r.soldiers-reserve),knights:r.knights,catapults:r.catapults};
 if(COUNT(units))g.transfer(h,units);
}
function goals(g,h,c,rng){
 const p=g.lords[h],paths=safePaths(g,h,p.campaign_province),ranked=[];
 if(p.campaign_army.soldiers+p.campaign_army.knights===0)return ranked;
 for(const [from,path] of paths)for(const id of g.neighbors[from]){
  const pr=g.provinces[id],owner=pr.owner,castle=pr.home_castle||pr.secondary_castle;
  if(owner===h||g.friendly(h,owner)||castle&&!p.campaign_army.catapults)continue;
  const [t,prob]=bestOdds(g,h,id);if(owner&&prob<c.threshold)continue;
  let value=owner?(castle?c.castle*(pr.home_castle?34+4*g.territoryCount(owner):16):c.enemy*(10+2*T[id][1])):c.neutral*(8+2.7*T[id][1]+g.remainingVassals(id));
  if(c.economic)value+=3*T[id][1];
  let score=value*prob/(1+.23*path.length)-(1-prob)*COUNT(p.campaign_army)*.35;
  if(c.noise)score*=1-c.noise+2*c.noise*rng.random();
  ranked.push({id,path,t,prob,score});
 }
 return ranked.sort((a,b)=>b.score-a.score||a.id-b.id);
}
export function playerTurn(g,name,rng){
 const c=POLICIES[name];if(!c)throw Error('Unknown player policy '+name);
 const h=g.human,p=g.lords[h],home=p.home_province;
 if(c.passive)return 'pass';
 if(c.defensive){if(p.treasury>=5)buy(g,h,{soldiers:p.treasury});return 'defend';}
 if(name==='beginner'&&rng.random()<.09)return 'pass';
 deploy(g,h,c.reserve);
 let a=p.campaign_army,str=a.soldiers+5*a.knights;
 let options=goals(g,h,c,rng),best=options[0];
 const neutral=best&&!g.provinces[best.id].owner;
 const hasEnemy=IDS.some(id=>{let owner=g.provinces[id].owner;return owner&&owner!==h&&!g.friendly(h,owner);});
 const totalCats=a.catapults+p.home_army.catapults;
 let target=c.recruit;
 if(c.adaptive){
  const reachable=safePaths(g,h,p.campaign_province);
  const threats=IDS.filter(id=>{let pr=g.provinces[id];return pr.owner&&pr.owner!==h&&!g.friendly(h,pr.owner)&&pr.home_castle&&g.neighbors[id].some(n=>reachable.has(n));});
  if(threats.length)target=Math.max(target,Math.ceil(Math.min(...threats.map(id=>g.defensePower(id)))*1.5/g.leadershipValue(h)));
 }
 const funds=p.treasury,reserve=c.economic?18:3,budget=Math.max(0,Math.floor((funds-reserve)*c.spend));
 // Expand first while the economic and vassal benefit is attractive.
 const strongAttack=best&&g.provinces[best.id].owner&&best.prob>=.90;
 const shouldBuild=hasEnemy&&!neutral&&!strongAttack&&(totalCats<c.cat||str+p.home_army.soldiers<target||!best);
 if(shouldBuild&&p.campaign_province!==home&&str>0&&g.legalMove(h,home)[0]){
  g.move(h,home);deploy(g,h,c.reserve);a=p.campaign_army;str=a.soldiers+5*a.knights;options=goals(g,h,c,rng);best=options[0];
 }
 if(p.campaign_province===home&&budget>=5&&(!best||shouldBuild&&!strongAttack)){
  let catapults=hasEnemy?Math.min(Math.max(0,c.cat-(a.catapults+p.home_army.catapults)),Math.floor(budget/15)):0;
  let soldiers=Math.max(0,Math.min(budget-15*catapults,Math.max(0,target-str-Math.max(0,p.home_army.soldiers-c.reserve))));
  if(!best&&catapults===0&&soldiers===0)soldiers=budget;
  if(catapults||soldiers){buy(g,h,{soldiers,catapults});return 'purchase';}
 }
 if(best&&best.score>0){
  for(const id of best.path){if(!g.legalMove(h,id)[0])throw Error('illegal friendly path');g.move(h,id);}
  if(c.robin&&g.provinces[best.id].owner&&!g.robin_pending&&p.robin_uses_remaining>0&&best.prob<.90)g.useRobin();
  if(!g.legalMove(h,best.id)[0])throw Error('illegal planned attack');g.move(h,best.id,best.t,false);return 'conquest';
 }
 if(budget>=5){buy(g,h,{soldiers:budget});return 'purchase';}
 return 'pass';
}
export function invitations(g,name,rng){
 const h=g.human,ally=g.maidenCandidate();
 const accept=name!=='passive'&&(name!=='beginner'||rng.random()>.25);
 if(ally){g.tournament_pending=false;if(accept){g.changeRank(h,1);g.maidenUnion(ally);}else{g.maiden_rescue_done=true;g.changeLeadership(h,-.04);g.changeRank(h,-1);}}
 else if(g.tournament_pending&&!g.tournament_held){g.tournament_pending=false;g.tournament_held=true;g.changeLeadership(h,accept?.04:-.04);g.changeRank(h,accept?1:-1);}
}
