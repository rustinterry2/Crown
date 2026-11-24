import {CrownState,IDS,U,T,SHORT,PRICES,COUNT,odds} from './baseline-engine.js';
const TACTICS=['Stand and Fight','Outflank','Ferocious Attack','Bombard'];
export const MODELS={
 M0:{adaptive:false,mix:false},
 M1:{adaptive:true,mix:false},
 M2:{adaptive:false,mix:true},
 M3:{adaptive:true,mix:true}
};
const cost=a=>U.reduce((n,u)=>n+a[u]*PRICES[u],0);
const add=(a,b)=>Object.fromEntries(U.map(u=>[u,a[u]+b[u]]));
const zero=()=>({soldiers:0,knights:0,catapults:0});
// Use actual defense and the unchanged combat formula, without mutating the board.
export function projectedOdds(g,l,id,army){
 const pr=g.provinces[id],castle=pr.home_castle||pr.secondary_castle;
 if(army.soldiers+army.knights===0||castle&&army.catapults===0)return 0;
 if(!COUNT(g.defenders(id)))return 1;
 let defense=g.defensePower(id);
 if(castle)defense*=Math.max(1.10,1.85-.16*army.catapults);
 return Math.max(...TACTICS.map(t=>odds(g.strength(army,l,t),Math.max(defense,castle?4:.01))));
}
function reachableTargets(g,l){
 const home=g.lords[l].home_province,dist=new Map([[home,0]]),queue=[home],targets=new Map();
 for(let i=0;i<queue.length;i++){
  const from=queue[i],d=dist.get(from)+1;
  for(const id of g.neighbors[from]){
   const pr=g.provinces[id],owner=pr.owner,castle=pr.home_castle||pr.secondary_castle;
   if(owner===l||g.friendly(l,owner)||!owner&&!castle){
    if(!dist.has(id)){dist.set(id,d);queue.push(id);}continue;
   }
   if(owner&&(!targets.has(id)||targets.get(id)>d))targets.set(id,d);
  }
 }
 return [...targets].map(([id,distance])=>({id,distance,value:g.aiGoal(l,id)}))
  .filter(t=>t.value>0).sort((a,b)=>b.value/(1+.43*(b.distance-1))-a.value/(1+.43*(a.distance-1))||a.distance-b.distance||a.id-b.id);
}
export function reinforcement(g,l,config,danger){
 const p=g.lords[l],a=p.campaign_army;
 if(p.campaign_province!==p.home_province||danger>=.45||p.home_army.soldiers<7)return null;
 const budget=Math.min(25,Math.max(0,p.treasury-3));if(budget<5)return null;
 const candidates=reachableTargets(g,l);
 // A goal is reachable through owned/allied/unfortified neutral land; hostile
 // blocking provinces appear as intermediate objectives rather than being skipped.
 const target=candidates.find(t=>projectedOdds(g,l,t.id,a)<Math.min(.90,g.aiFloor(l,t.id)+.08));
 if(!target)return null;
 const id=target.id,castle=g.provinces[id].home_castle||g.provinces[id].secondary_castle;
 const desired=Math.min(.90,g.aiFloor(l,id)+.08),before=projectedOdds(g,l,id,a);
 if(castle&&!a.catapults){
  if(budget<15)return {target:id,desired,before,save:true};
  const units={soldiers:0,knights:0,catapults:1};
  return {target:id,desired,before,units,after:projectedOdds(g,l,id,add(a,units)),cost:15};
 }
 const cap=config.adaptive?Infinity:(p.faction==='Norman'?75:34);
 const field=a.soldiers+5*a.knights;
 let best=null;
 // M1: soldiers only, no fixed total recruitment ceiling.
 // M2: fixed soldier-equivalent ceiling; optimize mix, at most 5 siege engines.
 // M3: adaptive ceiling plus mix optimization. No artificial total troop cap.
 // Shared incremental budget (25 gold), same treasury reserve, same readiness odds.
 for(let catapults=0;catapults<=(config.mix&&castle?Math.min(Math.floor(budget/15),config.adaptive?Infinity:Math.max(0,5-a.catapults)):0);catapults++){
  for(let knights=0;knights<=(config.mix?Math.floor((budget-15*catapults)/8):0);knights++){
   for(let soldiers=0;soldiers<=budget-15*catapults-8*knights;soldiers++){
    if(field+soldiers+5*knights>cap&&(soldiers||knights))continue;
    const units={soldiers,knights,catapults},spent=cost(units);
    if(spent<5)continue;
    const after=projectedOdds(g,l,id,add(a,units));
    if(after<=before+1e-10)continue;
    const met=after>=desired;
    const choice={target:id,desired,before,after,units,cost:spent,met};
    if(!best||met&&!best.met||
      met===best.met&&(met?(spent<best.cost||spent===best.cost&&after>best.after):
      (after>best.after+1e-10||Math.abs(after-best.after)<1e-10&&spent<best.cost)))best=choice;
   }
  }
 }
 // If M2 has reached its fixed ceiling, it may still be unable to break the siege.
 return best;
}
export function modelClass(name){
 if(!MODELS[name])throw Error('Unknown model '+name);
 if(name==='M0')return CrownState;
 const config=MODELS[name];
 return class Challenger extends CrownState{
  aiOne(l){let p=this.lords[l];if(!p.alive)return '';let home=p.home_province,location=p.campaign_province,funds=p.treasury,danger=this.aiHomeDanger(l);let name=SHORT[l];
    if(danger>=.50&&location!==home&&COUNT(p.campaign_army)>0){this.move(l,home);delete this.ai_goals[l];return `${name}: Returned home to defend the castle.`;}
    if(location===home){let reserve=danger>=.45?11:7,units={soldiers:Math.max(0,p.home_army.soldiers-reserve),knights:p.home_army.knights,catapults:p.home_army.catapults};if(COUNT(units))this.transfer(l,units);}
    let plan=this.aiPlan(l);
    if(location===home&&funds>=15&&this.aiNeedSiege(l)&&(p.faction==='Norman'&&this.aiAccessible(l,3)||!plan)&&p.campaign_army.soldiers+5*p.campaign_army.knights>=12){this.purchase(l,{catapults:1});return `${name}: Recruited a catapult for a planned siege.`;}
    // Isolated research intervention: only blocked conquest, only at home.
    // The existing first-catapult purchase, defense, opening expansion and
    // all currently viable conquest plans take precedence.
    if(location===home&&!plan){
      const prep=reinforcement(this,l,config,danger);
      if(prep){
        this.ai_goals[l]=prep.target;
        if(prep.save){
          this.event('research_preparation',l,prep.target,{model:config.adaptive?(config.mix?'M3':'M1'):'M2',reason:'save for first siege engine',before:prep.before,desired:prep.desired});
          return `${SHORT[l]}: Saved gold for a planned siege.`;
        }
        this.purchase(l,prep.units);
        this.event('research_preparation',l,prep.target,{model:config.adaptive?(config.mix?'M3':'M1'):'M2',before:prep.before,after:prep.after,desired:prep.desired,units:prep.units,cost:prep.cost});
        return `${SHORT[l]}: Recruited for ${T[prep.target][0]}.`;
      }
    }
    if(location===home&&funds>=8){
      const need=this.aiRecruit(l,plan,danger),n=Math.min(need,Math.max(0,funds-(danger>=.6?0:3)));
      if(need>=5&&n>=5){
        const expansion=this.aiExpansion(l,plan,danger,n);
        if(expansion){
          const result=this.move(l,expansion.id);
          delete this.ai_goals[l];
          return `${name}: ${result.text}`;
        }
        this.purchase(l,{soldiers:n});return `${name}: Recruited ${n} soldiers for the campaign.`;
      }
    }
    if(location===home&&p.treasury>=15&&this.aiNeedSiege(l)){this.purchase(l,{catapults:1});return `${name}: Recruited a catapult for a planned siege.`;}
    let castle=this.aiFortress(l);if(castle!==null&&(danger>=.45||!plan||plan.score<16)){this.purchaseCastle(l,castle);return `${name}: Fortified ${T[castle][0]}.`;}
    if(plan){let dest=plan.path[0],owner=this.provinces[dest].owner;if(owner===l||this.friendly(l,owner)){let r=this.move(l,dest);this.ai_goals[l]=plan.goal;return `${name}: ${r.text.replace(/\.$/,'')} toward ${T[plan.goal][0]}.`;}let [t,od]=this.aiTactic(l,dest);if(!owner||od>=this.aiFloor(l,dest)){let r=this.move(l,dest,t,false);if(r.win&&dest!==plan.goal)this.ai_goals[l]=plan.goal;else delete this.ai_goals[l];return `${name}: ${r.text}`;}delete this.ai_goals[l];}
    if(location!==home&&(funds>=8||COUNT(p.home_army)>7)){this.retreat(l);delete this.ai_goals[l];return `${name}: Withdrew to regroup at the home castle.`;}
    if(location===home&&p.treasury>=8&&p.home_army.soldiers<7){let n=Math.min(12,p.treasury);this.purchase(l,{soldiers:n});return `${name}: Reinforced the home garrison with ${n} soldiers.`;}
    return `${name}: Guarded ${T[p.campaign_province][0]}.`;
  }

 };
}
