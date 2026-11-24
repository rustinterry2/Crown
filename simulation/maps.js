import {IDS,Rng} from './baseline-engine.js';
// Exact map generator extracted from app.js at the frozen baseline commit.
export function randomMap(seed){let rng=new Rng(seed),w=213,h=232,cells=new Uint8Array(w*h),ids=[...IDS],points=[],cx=106,cy=121;
  let inside=(x,y)=>{let a=Math.atan2((y-cy)/85,(x-cx)/79),r=Math.hypot((x-cx)/79,(y-cy)/85),wav=.84+.12*Math.sin(3*a+seed*.001)+.10*Math.sin(5*a+seed*.007)+.08*Math.sin(7*a+seed*.012);return r<wav;};
  for(let min of [23,20,17,14]){for(let tries=0;tries<5000&&points.length<18;tries++){let x=25+Math.floor(rng.random()*164),y=44+Math.floor(rng.random()*155);if(!inside(x,y)||!inside(x-7,y)||!inside(x+7,y)||!inside(x,y-7)||!inside(x,y+7))continue;if(points.some(p=>(p[0]-x)**2+(p[1]-y)**2<min**2))continue;points.push([x,y]);}if(points.length===18)break;}
  if(points.length<18)return null;
  let chosen=[points.reduce((a,b)=>a[0]+a[1]<b[0]+b[1]?a:b)];while(chosen.length<6){let rest=points.filter(p=>!chosen.includes(p));chosen.push(rest.reduce((a,b)=>Math.min(...chosen.map(q=>(q[0]-a[0])**2+(q[1]-a[1])**2))>Math.min(...chosen.map(q=>(q[0]-b[0])**2+(q[1]-b[1])**2))?a:b));}
  let byId={},home=[1,5,9,8,14,19];home.forEach((id,i)=>byId[id]=chosen[i]);let others=rng.shuffle(IDS.filter(id=>!home.includes(id))),rest=points.filter(p=>!chosen.includes(p));others.forEach((id,i)=>byId[id]=rest[i]);
  for(let y=25;y<220;y++)for(let x=15;x<199;x++){if(!inside(x,y))continue;let best=Infinity,choice=0;for(let id of IDS){let [px,py]=byId[id],dx=x-px+3*Math.sin(y*.094+id),dy=y-py+3*Math.sin(x*.082+id),n=dx*dx+dy*dy;if(n<best){best=n;choice=id;}}cells[y*w+x]=choice;}
  let adj=Object.fromEntries(IDS.map(id=>[id,new Set()]));for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){let id=cells[y*w+x];if(!id)continue;for(let n of [cells[y*w+x+1],cells[(y+1)*w+x]])if(n&&n!==id){adj[id].add(n);adj[n].add(id);}}
  let neighbors=Object.fromEntries(IDS.map(id=>[id,[...adj[id]].sort((a,b)=>a-b)]));let anchors=Object.fromEntries(IDS.map(id=>[id,byId[id].map(v=>v*4)]));
  // Keep an accessible Sherwood grove inside each random kingdom.
  let best=null;
  for(let y=235;y<=735;y+=20)for(let x=135;x<=715;x+=20){
    if(!cells[Math.floor(y/4)*w+Math.floor(x/4)])continue;
    if(!cells[Math.floor((y-32)/4)*w+Math.floor((x-47)/4)]||
       !cells[Math.floor((y+32)/4)*w+Math.floor((x+47)/4)])continue;
    const dist=Math.min(...Object.values(anchors).map(pt=>Math.hypot(pt[0]-x,pt[1]-y)));
    if(dist<74)continue;
    const score=Math.hypot(x-474,y-330)+.15*Math.hypot(x-425,y-425);
    if(!best||score<best.score)best={x,y,score};
  }
  const forest=best?[best.x,best.y]:[474,330];
  return{type:'random',seed,w,h,cells:[...cells],neighbors,horses:anchors,castles:anchors,forest};
}
