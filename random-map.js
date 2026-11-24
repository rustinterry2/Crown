// Organic kingdom generator v2. Pure, deterministic; same 4-pixel grid as Crown.
const IDS=[1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19], HOMES=[1,5,9,8,14,19];
const W=213,H=232,N=W*H,S=4;
function rng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let z=Math.imul(t^(t>>>15),t|1);z^=z+Math.imul(z^(z>>>7),z|61);return ((z^(z>>>14))>>>0)/4294967296;};}
const shuffle=(a,r)=>{a=[...a];for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const near=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const directions=[-1,1,-W,W];
class Heap{constructor(){this.a=[];}push(p){let a=this.a,i=a.length;a.push(p);while(i){let j=(i-1)>>1;if(a[j][0]<=p[0])break;a[i]=a[j];i=j;}a[i]=p;}pop(){let a=this.a,t=a[0],p=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1][0]<a[j][0])j++;if(a[j][0]>=p[0])break;a[i]=a[j];i=j;}a[i]=p;}return t;}}
function landMask(r,style){
 const phase=Array.from({length:8},()=>r()*Math.PI*2),bayA=r()*Math.PI*2,bayB=bayA+Math.PI*(.65+.7*r());
 const ratio=style===0?1.42+.13*r():1.15+.27*r(),width=Math.min(157,179/ratio),height=179;
 const diff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const radius=a=>{let v=1+.13*Math.sin(2*a+phase[0])+.16*Math.sin(3*a+phase[1])+.14*Math.sin(5*a+phase[2])+.065*Math.sin(8*a+phase[3])+.037*Math.sin(13*a+phase[4])+.015*Math.sin(25*a+phase[5]);
  v-=(style===2?.35:.19)*Math.exp(-((diff(a,bayA)/.24)**2));v-=(style===3?.32:.16)*Math.exp(-((diff(a,bayB)/.22)**2));
  if(style===1)v+=.29*Math.exp(-((diff(a,phase[6])/.33)**2));if(style===2)v-=.22*Math.exp(-((diff(a,bayA+Math.PI)/.32)**2));return Math.max(.4,v);};
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;for(let i=0;i<720;i++){let a=i*Math.PI/360,k=radius(a),x=k*Math.cos(a),y=k*Math.sin(a);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
 const land=new Uint8Array(N),points=[];let x0=(W-width)/2,y0=44;
 for(let y=44;y<=224;y++)for(let x=23;x<=190;x++){let u=minX+(x-x0)*(maxX-minX)/width,v=minY+(y-y0)*(maxY-minY)/height;if(Math.hypot(u,v)<=radius(Math.atan2(v,u))){land[y*W+x]=1;points.push(y*W+x);}}
 return {land,points};
}
function clearance(cells){const d=new Uint8Array(N);for(let i=0;i<N;i++)if(cells[i])d[i]=99;
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){let i=y*W+x,v=cells[i];if(v)d[i]=Math.min(d[i],1+Math.min(...[-W-1,-W,-W+1,-1].map(k=>cells[i+k]===v?d[i+k]:0)));}
 for(let y=H-2;y>0;y--)for(let x=W-2;x>0;x--){let i=y*W+x,v=cells[i];if(v)d[i]=Math.min(d[i],1+Math.min(...[W+1,W,W-1,1].map(k=>cells[i+k]===v?d[i+k]:0)));}return d;}
function generate(seed,attempt){
 const r=rng((seed+Math.imul(attempt+1,0x9e3779b9))>>>0),style=Math.floor(r()*4),{land,points}=landMask(r,style),ld=clearance(land);
 const pool=points.filter(i=>ld[i]>=7);if(pool.length<100)return null;
 let centers=[pool[Math.floor(r()*pool.length)]];
 for(let k=1;k<18;k++){let best=-1,bestScore=-1;for(let j=0;j<110;j++){let i=pool[Math.floor(r()*pool.length)],x=i%W,y=i/W|0;let dist=Math.min(...centers.map(q=>Math.hypot(x-q%W,y-(q/W|0))));let score=dist*(.85+.30*r());if(dist>=13&&score>bestScore){best=i;bestScore=score;}}if(best<0)return null;centers.push(best);}
 const speeds=centers.map(()=>.88+.24*r()),ph=Array.from({length:4},()=>r()*6.283),noise=new Float32Array(N);
 for(const i of points){let x=i%W,y=i/W|0;noise[i]=1+.30*Math.sin(x*.125+y*.07+ph[0])+.24*Math.sin(y*.19-x*.10+ph[1])+.14*Math.sin(x*.29+y*.23+ph[2])+.08*Math.sin(x*.6-y*.49+ph[3]);}
 // Connected geodesic growth: every assigned pixel has a same-region parent.
 const cells=new Uint8Array(N),dist=new Float32Array(N);dist.fill(Infinity);const heap=new Heap();centers.forEach((i,k)=>{dist[i]=0;heap.push([0,i,k+1]);});
 while(heap.a.length){let [d,i,id]=heap.pop();if(cells[i]||d>dist[i]+.0001)continue;cells[i]=id;for(const delta of directions){const j=i+delta;if(!land[j]||cells[j])continue;let n=d+(noise[i]+noise[j])*.5/speeds[id-1];if(n<dist[j]){dist[j]=n;heap.push([n,j,id]);}}}
 if(points.some(i=>!cells[i]))return null;
 const region=Array.from({length:19},()=>[]),adj=Array.from({length:19},()=>new Set());for(const i of points){let v=cells[i];region[v].push(i);for(const d of [1,W]){let u=cells[i+d];if(u&&u!==v){adj[v].add(u);adj[u].add(v);}}}
 const areas=region.slice(1).map(a=>a.length),ratio=Math.max(...areas)/Math.min(...areas);if(Math.min(...areas)<320||ratio<2.0||ratio>6.5||adj.slice(1).some(a=>a.size<1||a.size>8))return null;
 const clear=clearance(cells),castle={},horse={};
 for(let k=1;k<=18;k++){
  const fits=(i,dx,dy1,dy2)=>{if(clear[i]>Math.max(dx,-dy1,dy2))return true;for(let y=dy1;y<=dy2;y++)for(let x=-dx;x<=dx;x++)if(cells[i+y*W+x]!==k)return false;return true;};
  const cs=region[k].filter(i=>clear[i]>=5&&fits(i,4,-3,5)).sort((a,b)=>clear[b]-clear[a]);
  const hs=region[k].filter(i=>clear[i]>=5&&fits(i,7,-5,5)).sort((a,b)=>clear[b]-clear[a]);
  const options=hs.slice(0,120).concat([...hs].sort((a,b)=>a%W-b%W).slice(0,12),[...hs].sort((a,b)=>b%W-a%W).slice(0,12),[...hs].sort((a,b)=>a-b).slice(0,12),[...hs].sort((a,b)=>b-a).slice(0,12));
  let pair=null,score=-Infinity;for(const c of cs)for(const h of options){
    let dx=Math.abs(c%W-h%W),dy=(h/W|0)-(c/W|0);if(dx<11&&dy>-8&&dy<10)continue;
    let v=2*clear[c]+clear[h]-.08*Math.hypot(dx,dy);if(v>score){pair=[c,h];score=v;}
  }
  if(!pair)return null;castle[k]=[pair[0]%W,pair[0]/W|0];horse[k]=[pair[1]%W,pair[1]/W|0];
 }
 // Disperse six home castles across the landmass, then randomly assign factions.
 let first=1+Math.floor(r()*18),homes=[first];while(homes.length<6){let rest=Array.from({length:18},(_,i)=>i+1).filter(k=>!homes.includes(k));rest.sort((a,b)=>Math.min(...homes.map(k=>near(castle[k],castle[b])))-Math.min(...homes.map(k=>near(castle[k],castle[a]))));homes.push(rest[0]);}
 const labels={},homeIds=shuffle(HOMES,r),others=shuffle(IDS.filter(id=>!HOMES.includes(id)),r);homes.forEach((k,i)=>labels[k]=homeIds[i]);let n=0;for(let k=1;k<=18;k++)if(!labels[k])labels[k]=others[n++];
 // Forest footprint must stay inland and avoid starting castle/horse artwork.
 let forest=null,fs=-Infinity;for(const i of points){let x=i%W,y=i/W|0;if(ld[i]<13||x%3||y%3)continue;let pt=[x,y];if(homes.some(k=>near(pt,castle[k])<20||near(pt,horse[k])<20))continue;let v=Math.min(...Object.values(castle).map(q=>near(pt,q)))-.2*near(pt,[106,115]);if(v>fs){forest=pt;fs=v;}}
 if(!forest)return null;
 const out=new Uint8Array(N),neighbors={},castles={},horses={};for(const i of points)out[i]=labels[cells[i]];for(let k=1;k<=18;k++){let id=labels[k];neighbors[id]=[...adj[k]].map(u=>labels[u]).sort((a,b)=>a-b);castles[id]=castle[k].map(v=>v*S);horses[id]=horse[k].map(v=>v*S);}
 return {type:'random',seed,w:W,h:H,cells:[...out],neighbors,castles,horses,forest:forest.map(v=>v*S),style:['Elongated','Peninsular','Divided','Coastal'][style],attempt:attempt+1};
}
export function randomMap(seed){for(let i=0;i<100;i++){let m=generate(seed>>>0,i);if(m)return m;}throw Error('Organic map generation exhausted retries: '+seed);}
