import {CrownState,ENGLAND,IDS,U,Rng,COUNT} from './baseline-engine.js';
import {randomMap} from './maps.js';
import {POLICIES,playerTurn,invitations} from './player-strategies.js';
export const DIFFICULTIES=['easy','medium','hard'],MAP_TYPES=['england','random'];
export const BASELINE_COMMIT='57d8c952028717cdba8ebf96e54692e6fefff97d';
export const SEED_SPLITS={development:[1,250],validation:[10001,10084],holdout:[20001,20084]};
export function checkState(g){
 for(const [l,p] of Object.entries(g.lords)){
  if(!Number.isInteger(p.treasury)||p.treasury<0)throw Error('invalid treasury '+l);
  for(const a of [p.home_army,p.campaign_army])for(const u of U)if(!Number.isInteger(a[u])||a[u]<0)throw Error('invalid troops '+l+' '+u);
  if(!g.provinces[p.campaign_province])throw Error('invalid army location '+l);
  if(p.alive&&g.provinces[p.home_province].owner!==l)throw Error('living lord without capital '+l);
 }
 for(const [id,p] of Object.entries(g.provinces)){
  if(p.owner&&!g.lords[p.owner]?.alive)throw Error('invalid owner '+id);
  if(!Number.isInteger(p.castle_garrison)||p.castle_garrison<0)throw Error('invalid castle garrison '+id);
  for(const u of ['knights','catapults'])if(!Number.isInteger(p.castle_equipment[u])||p.castle_equipment[u]<0)throw Error('invalid castle equipment '+id);
 }
}
export function runCampaign({seed,difficulty,policy,mapType,neighbors,maxMonths=60,trace=false,Engine=CrownState}){
 const g=new Engine({seed,difficulty,neighbors}),rng=new Rng((seed^0x7f4a7c15)>>>0),human=g.human;
 const r={seed,difficulty,policy,mapType,character:human,home:g.lords[human].home_province,outcome:'ongoing',months:0,firstNormanSiege:null,aiSieges:0,normanSieges:0,aiAttacksHuman:0,normanInfighting:0,aiClaims:0,aiGoldSpent:0,aiTroopsLost:0,aiSoldiersBought:0,aiKnightsBought:0,aiCatapultsBought:0,preparationTurns:0,aiTurns:0,guardTurns:0,maxGuardStreak:0,maxNoProgressStreak:0,stalled:false,aiOpeningClaims:0,aiOpeningTurns:0,errors:0,error:null};
 const guard={},idle={};let monthly=[],decisions=[];
 function observe(l,before,msg,castleBefore,ownerBefore){
  const events=g.ledger.slice(before),p=g.lords[l];let progress=false;
  for(const ev of events){
   if(ev.action==='claim'){r.aiClaims++;progress=true;if(r.months===1&&!ev.old_owner)r.aiOpeningClaims++;}
   if(ev.action==='purchase_troops'||ev.action==='build_castle'){progress=true;r.aiGoldSpent+=ev.cost??20;if(ev.action==='purchase_troops'){r.aiSoldiersBought+=ev.units.soldiers||0;r.aiKnightsBought+=ev.units.knights||0;r.aiCatapultsBought+=ev.units.catapults||0;}}
   if(ev.action==='research_preparation')r.preparationTurns++;
   if(ev.action==='battle'||ev.action==='unopposed_capture'){
    const castle=ev.castle||castleBefore.has(ev.province),defender=ev.defender??ownerBefore[ev.province];
    if(castle){r.aiSieges++;if(p.faction==='Norman'){r.normanSieges++;if(r.firstNormanSiege===null)r.firstNormanSiege=r.months;}}
    if(defender===human)r.aiAttacksHuman++;
    if(p.faction==='Norman'&&defender&&g.lords[defender]?.faction==='Norman')r.normanInfighting++;
    if(ev.won||ev.action==='unopposed_capture')progress=true;
   }
  }
  r.aiTurns++;if(r.months===1)r.aiOpeningTurns++;
  guard[l]=msg.includes(': Guarded ')?(guard[l]||0)+1:0;
  idle[l]=progress?0:(idle[l]||0)+1;
  if(guard[l])r.guardTurns++;
  r.maxGuardStreak=Math.max(r.maxGuardStreak,guard[l]);r.maxNoProgressStreak=Math.max(r.maxNoProgressStreak,idle[l]);
  if(trace)decisions.push({seed,month:r.months,lord:l,action:msg,objective:g.ai_goals[l]??null,treasury:p.treasury,location:p.campaign_province,field:{...p.campaign_army},events});
 }
 try{
 checkState(g);
 for(let m=0;m<maxMonths&&!g.outcome;m++){
  r.months=m+1;invitations(g,policy,rng);if(g.outcome)break;
  playerTurn(g,policy,rng);checkState(g);if(g.outcome)break;
  const queue=g.rng.shuffle(Object.keys(g.lords).filter(l=>l!==human&&g.lords[l].alive));
  for(const l of queue){
   if(g.outcome)break;if(!g.lords[l].alive)continue;
   const before=g.ledger.length,castleBefore=new Set(IDS.filter(id=>g.provinces[id].home_castle||g.provinces[id].secondary_castle)),ownerBefore=Object.fromEntries(IDS.map(id=>[id,g.provinces[id].owner]));
   const msg=g.aiOne(l);observe(l,before,msg,castleBefore,ownerBefore);checkState(g);
  }
  if(!g.outcome){g.randomEvent();g.advanceMonth();g.possiblyRivalry();g.checkEnd();if(!g.outcome&&!g.tournament_held&&!g.tournament_pending&&!g.maidenCandidate()&&g.rng.random()<.10)g.tournament_pending=true;checkState(g);}
  if(trace)for(const [lord,p] of Object.entries(g.lords))if(p.alive)monthly.push({seed,month:r.months,lord,faction:p.faction,territories:g.territoryCount(lord),income:g.income(lord),treasury:p.treasury,home:{...p.home_army},field:{...p.campaign_army},location:p.campaign_province,objective:g.ai_goals[lord]??null});
 }
 }catch(e){r.errors=1;r.error=String(e);}
 r.outcome=r.errors?'error':g.outcome||'ongoing';r.stalled=r.outcome==='ongoing'&&r.maxNoProgressStreak>=9;
 r.aiTroopsLost=Object.entries(g.lords).filter(([l])=>l!==human).reduce((n,[l,p])=>n+p.troops_lost_total,0);
 r.humanTerritories=g.territoryCount(human);r.humanTreasury=g.lords[human].treasury;
 if(trace)return {result:r,monthly,decisions};return r;
}
export function createMapCache(){const cache=new Map();return (type,seed)=>{if(type==='england')return ENGLAND;if(!cache.has(seed)){const m=randomMap(seed);if(!m)throw Error('random map generation failed '+seed);cache.set(seed,m.neighbors);}return cache.get(seed);};}
export function runPanel({start=1,end=250,maxMonths=60,mapTypes=MAP_TYPES,difficulties=DIFFICULTIES,policies=Object.keys(POLICIES),Engine=CrownState}={}){
 const maps=createMapCache(),rows=[];
 for(const mapType of mapTypes)for(let seed=start;seed<=end;seed++){const neighbors=maps(mapType,seed);for(const difficulty of difficulties)for(const policy of policies)rows.push(runCampaign({seed,difficulty,policy,mapType,neighbors,maxMonths,Engine}));}
 return rows;
}
export function summarize(rows){
 const groups=new Map();
 const init=()=>({n:0,victory:0,defeat:0,ongoing:0,error:0,months:0,firstSiegeSum:0,firstSiegeN:0,aiSieges:0,normanSieges:0,aiAttacksHuman:0,normanInfighting:0,aiClaims:0,aiGoldSpent:0,aiTroopsLost:0,aiSoldiersBought:0,aiKnightsBought:0,aiCatapultsBought:0,preparationTurns:0,aiTurns:0,guardTurns:0,maxGuardStreakSum:0,maxNoProgressStreakSum:0,stalled:0,aiOpeningClaims:0,aiOpeningTurns:0,errors:0,firstError:null});
 for(const r of rows){
  for(const key of ['all',r.difficulty,r.mapType,r.policy,r.difficulty+'/'+r.mapType+'/'+r.policy]){
   if(!groups.has(key))groups.set(key,init());const a=groups.get(key);a.n++;a[r.outcome]++;a.months+=r.months;
   if(r.firstNormanSiege!==null){a.firstSiegeN++;a.firstSiegeSum+=r.firstNormanSiege;}
   for(const k of ['aiSieges','normanSieges','aiAttacksHuman','normanInfighting','aiClaims','aiGoldSpent','aiTroopsLost','aiSoldiersBought','aiKnightsBought','aiCatapultsBought','preparationTurns','aiTurns','guardTurns','aiOpeningClaims','aiOpeningTurns','errors'])a[k]+=r[k];
   a.maxGuardStreakSum+=r.maxGuardStreak;a.maxNoProgressStreakSum+=r.maxNoProgressStreak;a.stalled+=+r.stalled;if(r.error&&!a.firstError)a.firstError=r.error;
  }
 }
 return Object.fromEntries(groups);
}
