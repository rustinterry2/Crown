import {randomMap,uploadedMap} from './random-map.js';
import {CrownState,Rng,T,IDS,SAXON,SAXONS,NORMANS,SHORT,TIERS,LEAD,START_RANK,COLORS,HORSES,CASTLE_POS,PRICES,U,SUMMARY,COUNT,MONTH,ENGLAND,CASTLES} from './engine.js?v=1b1f6f28';
const W=852,H=1846,A='assets/';const gameCanvas=document.getElementById('game'),c=gameCanvas.getContext('2d',{alpha:false});
const color=(a)=>`rgb(${a.join(',')})`;const INK='#432018',LIGHT='#663021',BEIGE='#d3ab73';
const img={}, buttons=[];let fontMetrics,atlas,hit,paint,baseData,hitData,paintData,assetMap={};
let mode='splash',state=null,options={character:null,difficulty:'easy',map:'england'},mapInfo=null;
let selected=0,pendingTarget=null,attackingAlly=false,tactic='Stand and Fight',quantity={soldiers:0,knights:0,catapults:0},wantCastle=false,selectedCastle=null;
let transferDraft={soldiers:0,knights:0,catapults:0};
let message='',backMode='orders',scene='',sceneReturn='orders',sceneNotice='',sceneNoticeBack='',sceneOverlay='',story=[],storyEnd='orders',pendingMaiden=null,summary=[],reportScroll=0,flashId=0,flashVisible=false,visualOwners=null,visualHorsePos=null,visualAlive=null,guide='conquest',guideTarget=0,guideTicks=0;
let queue=[],queueIndex=0,aiMessage='',aiRunning=false,pendingHomeAttack=null,pendingHumanFlash=0,lastSceneBefore='';let coloredMap=null,coloredMapKey='',tapActive=false;
let noticePortrait=null,englandSelectionMask=null,horseHitTargets=[];
const outlineCache=new Map();
let visualCastles=null,pressedKey=null,pressedPointer=null,pressedAt=0,reportTurn=0,reportMonth='',historyScroll=0,reportEntries=[];
const homeCastleSprites={};
let uploadLand=null,uploadPreview=null,acceptedUpload=null,uploadError='',uploadBusy=false,uploadTicket=0;
function loadImage(file){return new Promise((resolve,reject)=>{let im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Failed loading '+file));im.src=A+(assetMap[file]||file);});}
async function loadAssets(){let all=['board.png','font_atlas.png','hitmask.png','paint_alpha.png','title_splash.png','robin_sherwood.png','norman_castle.png','saxon_castle.png','maiden_swordfight.png','lady_catherine.png','the_end.png','tournament_joust.png','tournament_trumpets.png','home_castle_under_attack.png','home_castle_fallen.png'];
  all.push(...['wilfred','cedric','geoffrey','wolfric','robin','brian','edmund','philip','roger','reginald'].map(p=>'portrait_'+p+'.png'));
  assetMap=await (await fetch(A+'asset_manifest.json?v=saxon-portraits-33162500')).json();
  await Promise.all(all.map(async f=>{img[f]=await loadImage(f);}));
  fontMetrics=await (await fetch(A+'font_metrics.json')).json();atlas=img['font_atlas.png'];hit=img['hitmask.png'];paint=img['paint_alpha.png'];
  const temp=document.createElement('canvas');temp.width=W;temp.height=H;let ctx=temp.getContext('2d',{willReadFrequently:true});ctx.drawImage(img['board.png'],0,0);baseData=ctx.getImageData(0,0,W,H);ctx.clearRect(0,0,W,H);ctx.drawImage(hit,0,0);hitData=ctx.getImageData(0,0,W,H);ctx.clearRect(0,0,W,H);ctx.drawImage(paint,0,0);paintData=ctx.getImageData(0,0,W,H);englandSelectionMask=buildEnglandSelectionMask(hitData.data);buildHomeCastleSprites();}
const glyphCache=new Map();function glyph(style,ch,ink){let source=style==='report'?'small':style,metric=fontMetrics[source],g=metric.glyphs[ch]||metric.glyphs[' '];let [sx,sy,adv]=g,[tw,th]=metric.tile,key=`${source}/${ch}/${ink}`;if(!glyphCache.has(key)){
  let canvas=document.createElement('canvas');canvas.width=tw;canvas.height=th;let x=canvas.getContext('2d',{willReadFrequently:true});x.drawImage(atlas,sx,sy,tw,th,0,0,tw,th);let data=x.getImageData(0,0,tw,th);let rgb=(ink.match(/[a-f\d]{2}/gi)||[]).map(v=>parseInt(v,16));if(rgb.length!==3)rgb=[67,32,24];for(let i=0;i<data.data.length;i+=4){let alpha=data.data[i];data.data[i]=rgb[0];data.data[i+1]=rgb[1];data.data[i+2]=rgb[2];data.data[i+3]=alpha;}x.putImageData(data,0,0);glyphCache.set(key,canvas);
}return {canvas:glyphCache.get(key),adv:style==='report'?Math.round(adv*.93):adv};}
function width(text,style='body'){return [...String(text)].reduce((n,ch)=>n+glyph(style,ch,INK).adv,0);}
function text(str,x,y,style='body',ink=INK,align='left'){str=String(str);let off=align==='center'?width(str,style)/2:align==='right'?width(str,style):0;for(let ch of str){let g=glyph(style,ch,ink);if(ch!==' ')c.drawImage(g.canvas,Math.round(x-off),Math.round(y));off-=g.adv;}}
function fit(str,x,y,style='small',max=660){let s=String(str);while(width(s,style)>max&&s.length>8)s=s.slice(0,-5)+'...';text(s,x,y,style,INK,'center');}
function wrap(str,style='body',max=610){let lines=[],current='';for(let word of String(str).split(' ')){let candidate=(current+' '+word).trim();if(width(candidate,style)>max&&current){lines.push(current);current=word;}else current=candidate;}if(current)lines.push(current);return lines;}
function lines(items,start=1250,step=72,style='body'){let y=start;for(let line of items){let fragments=wrap(line,style,615);for(let frag of fragments){text(frag,W/2,y,style,LIGHT,'center');y+=step;} } }
function rule(y){c.strokeStyle='#a46a38';c.lineWidth=2;c.beginPath();c.moveTo(117,y);c.lineTo(735,y);c.stroke();c.fillStyle='#8b4f26';c.beginPath();c.moveTo(426,y-8);c.lineTo(435,y);c.lineTo(426,y+8);c.lineTo(418,y);c.fill();}
function buttonFrame(rect,active=false,enabled=true,pressed=false){
  const [x,y,x2,y2]=rect;
  c.fillStyle=!enabled?'#c6a77c':pressed?'#b88b56':active?'#c19562':'#d3ab73';c.fillRect(x,y,x2-x,y2-y);
  c.lineWidth=4;c.strokeStyle=enabled?'#582c18':'#a98b65';c.strokeRect(x+1,y+1,x2-x-2,y2-y-2);
  c.lineWidth=3;c.strokeStyle=!enabled?'#d6b98c':pressed?'#80512d':'#efcc99';
  c.beginPath();c.moveTo(x+7,y2-7);c.lineTo(x+7,y+7);c.lineTo(x2-7,y+7);c.stroke();
  c.strokeStyle=!enabled?'#b39770':pressed?'#efcc99':'#80512d';
  c.beginPath();c.moveTo(x+7,y2-7);c.lineTo(x2-7,y2-7);c.lineTo(x2-7,y+7);c.stroke();
}
function button(key,label,rect,style='body',active=false){
  buttons.push({key,rect});const [x,y,x2,y2]=rect,pressed=pressedKey===key;
  buttonFrame(rect,active,true,pressed);
  text(label,(x+x2)/2+(pressed?2:0),y+Math.max(1,(y2-y-fontMetrics[style].tile[1])/2)+(pressed?4:0),style,INK,'center');
}
function header(title,sub=null){text(title,426,1013,'title',INK,'center');if(sub)text(sub,426,1091,'small',LIGHT,'center');rule(1154);}
function status(){let p=state.lords[state.human];return `${MONTH[state.month-1]} ${state.year}     Gold ${p.treasury}     Income ${state.income(state.human)}`;}
function portraitPath(l){
  // Story characters have dedicated artwork; never silently substitute Robin.
  if(l==='Lady Catherine')return img['lady_catherine.png'];
  if(l==='Robin Hood')return img['portrait_robin.png'];
  const key=SHORT[l]?.toLowerCase();
  if(!key||!img['portrait_'+key+'.png'])throw new Error('Portrait artwork not found for '+l);
  return img['portrait_'+key+'.png'];
}
function drawPortrait(l,[x,y,x2,y2],caption=true){let im=portraitPath(l);c.fillStyle='#754928';c.fillRect(x,y,x2-x,y2-y);c.strokeStyle='#3c2012';c.lineWidth=5;c.strokeRect(x,y,x2-x,y2-y);c.fillStyle='#dfb880';c.fillRect(x+8,y+8,x2-x-16,y2-y-16);let w=x2-x-28,h=y2-y-28;
  // Fit and crop like the Pyto portrait renderer.
  let ratio=Math.max(w/im.width,h/im.height),sw=w/ratio,sh=h/ratio,sx=(im.width-sw)/2,sy=Math.max(0,Math.min(im.height-sh,(im.height-sh)*.24));c.drawImage(im,sx,sy,sw,sh,x+14,y+12,w,h);c.lineWidth=3;c.strokeStyle='#5b301b';c.strokeRect(x+12,y+10,w+4,h+4);if(caption)text(SHORT[l]||l,(x+x2)/2,y2+7,'small',INK,'center');}
// The original parchment contains two different home-castle designs.
// Use the artwork-aware paint mask to lift each silhouette from the board,
// rather than copying its colored territory background.
function extractCastleSprite(rect){
  const [x0,y0,x1,y1]=rect,w=x1-x0,h=y1-y0,n=w*h,solid=new Uint8Array(n),seen=new Uint8Array(n),queue=new Int32Array(n);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const p=((y+y0)*W+x+x0)*4;
    // The surrounding province is paintable; the artwork is not.
    solid[y*w+x]=paintData.data[p]<128?1:0;
  }
  let best=[];
  for(let i=0;i<n;i++){
    if(!solid[i]||seen[i])continue;
    let head=0,tail=1,touchesEdge=false;queue[0]=i;seen[i]=1;
    while(head<tail){
      const j=queue[head++],x=j%w,y=j/w|0;
      if(x===0||y===0||x===w-1||y===h-1)touchesEdge=true;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;
        if(xx<0||xx>=w||yy<0||yy>=h)continue;
        const k=yy*w+xx;if(solid[k]&&!seen[k]){seen[k]=1;queue[tail++]=k;}
      }
    }
    if(!touchesEdge&&tail>best.length)best=Array.from(queue.subarray(0,tail));
  }
  if(best.length<80)return null;
  let l=w,r=0,t=h,b=0;const component=new Uint8Array(n);
  for(const j of best){const x=j%w,y=j/w|0;component[j]=1;l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
  const sprite=document.createElement('canvas');sprite.width=r-l+1;sprite.height=b-t+1;
  const ctx=sprite.getContext('2d'),out=ctx.createImageData(sprite.width,sprite.height);
  for(let y=t;y<=b;y++)for(let x=l;x<=r;x++){
    const j=y*w+x;if(!component[j])continue;
    const src=((y+y0)*W+x+x0)*4,dst=((y-t)*sprite.width+x-l)*4;
    out.data[dst]=baseData.data[src];out.data[dst+1]=baseData.data[src+1];out.data[dst+2]=baseData.data[src+2];out.data[dst+3]=255;
  }
  ctx.putImageData(out,0,0);return sprite;
}
function buildHomeCastleSprites(){
  // Nottingham's tall Saxon keep and Cornwall's Norman twin-towered keep.
  // Alternate crops are other instances of the identical source artwork.
  homeCastleSprites.saxon=extractCastleSprite([445,363,503,416])||extractCastleSprite([334,450,390,504]);
  homeCastleSprites.norman=extractCastleSprite([205,771,265,830])||extractCastleSprite([650,462,711,522]);
}
function genericCastle(ctx,x,y){
  ctx.fillStyle='#c79a5e';ctx.fillRect(x-13,y-3,26,20);ctx.strokeStyle='#22160f';ctx.strokeRect(x-13,y-3,26,20);
  for(let t of [-10,0,10]){ctx.fillStyle='#ebc58b';ctx.fillRect(x+t-3,y-9,7,10);}
  ctx.fillStyle='#4b2919';ctx.fillRect(x-3,y+7,6,10);
}
function fallbackHomeCastle(ctx,x,y,saxon){
  // Distinct pixel-art silhouettes remain available if a future board asset
  // no longer contains an extractable castle.
  ctx.save();ctx.translate(x,y);ctx.fillStyle='#4b2c1c';ctx.fillRect(-17,14,34,3);
  const tower=(tx,ty,w,h)=>{ctx.fillStyle='#4b2c1c';ctx.fillRect(tx,ty,w,h);ctx.fillStyle='#d7ab72';ctx.fillRect(tx+2,ty+2,w-4,h-3);ctx.fillStyle='#f2d5a5';ctx.fillRect(tx+2,ty+2,3,h-3);ctx.fillStyle='#805338';ctx.fillRect(tx+w-4,ty+3,2,h-4);ctx.fillStyle='#4b2c1c';ctx.fillRect(tx+Math.floor(w/2),ty+6,2,5);};
  if(saxon){tower(-12,-17,12,32);tower(-17,1,8,14);tower(1,-2,13,17);}
  else{tower(-16,-10,10,25);tower(5,-16,11,31);tower(-7,-5,13,20);ctx.fillStyle='#4b2c1c';ctx.fillRect(-2,7,5,8);}
  ctx.restore();
}
function drawMapCastle(ctx,id,x,y,home){
  if(!home){genericCastle(ctx,x,y);return;}
  // Architectural identity follows the original home territory, not its
  // current owner (including Saxon lords who turn Norman on harder settings).
  const saxon=SAXON.includes(id),sprite=homeCastleSprites[saxon?'saxon':'norman'];
  if(!sprite){fallbackHomeCastle(ctx,x,y,saxon);return;}
  const scale=Math.min(34/sprite.width,34/sprite.height),w=Math.round(sprite.width*scale),h=Math.round(sprite.height*scale);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,Math.round(x-w/2),Math.round(y+1-h/2),w,h);ctx.restore();
}
// 32x25 pixel-art silhouette rendered at 80% of its previous 64x50 size.
const HORSE_B = ["................................","....#..#........................","....#####.......................",".....#####......................","....#######.....................","...##.######....................","..##########....................",".####..######...................",".###...######...................",".......#######.....#####........",".......####################.....",".......#####################....",".......##################.###...",".......##################..##...","........################...##...","........################...##...","........#######....#####...##...",".......###.##.......#####...##..",".......##..##........#####...#..",".......#....#........#..##......","......##....#........#...#......","......##....#.......##...#......","......#....##.......#....##.....","....###...###......##...###.....",".....#.....##......#....##......"];
const HORSE_SCALE=1.6,HORSE_HALF_W=26,HORSE_HALF_H=20;
function horse(x,y,rgb){
  c.save();c.translate(Math.round(x-25.6),Math.round(y-20));
  c.fillStyle='#14110f';
  for(let py=0;py<HORSE_B.length;py++){
    const row=HORSE_B[py];
    for(let px=0;px<row.length;px++)if(row[px]==='#'){
      const x0=Math.round(px*HORSE_SCALE),y0=Math.round(py*HORSE_SCALE);
      c.fillRect(x0,y0,Math.round((px+1)*HORSE_SCALE)-x0,Math.round((py+1)*HORSE_SCALE)-y0);
    }
  }
  c.restore();
}
const cachedCanvas=document.createElement('canvas');cachedCanvas.width=W;cachedCanvas.height=H;let cachedCtx=cachedCanvas.getContext('2d');
function sherwoodCenter(){return mapInfo?.type==='random'?(mapInfo.forest||[474,330]):[474,330];}
function drawSherwood(ctx,center=sherwoodCenter()){
  const [fx,fy]=center;
  ctx.save();ctx.translate(Math.round(fx),Math.round(fy));
  const px=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};
  px(-45,3,89,9,'#123922');px(-39,12,77,5,'#0c2419');
  for(const [dx,dy] of [[-31,0],[-11,-8],[13,-5],[31,1]]){
    px(dx-3,dy+2,7,21,'#30261a');
    px(dx-17,dy-4,36,14,'#102b1c');
    px(dx-13,dy-13,27,15,'#145032');
    px(dx-7,dy-20,15,14,'#236b41');
    px(dx-13,dy-6,9,6,'#1a623d');
    px(dx+5,dy-11,7,5,'#2b7547');
  }
  ctx.restore();
}
function coloredBoard(){let owners=IDS.map(id=>state.provinces[id].owner),castleIds=IDS.filter(id=>state.provinces[id].secondary_castle),key=JSON.stringify([owners,castleIds,mapInfo?.seed??null]);if(key===coloredMapKey&&coloredMap)return coloredMap;
  let canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;let x=canvas.getContext('2d');
  if(mapInfo?.type==='random'){
    x.drawImage(img['board.png'],0,0);
    // Reuse the complete unmarked lower parchment, including its organic edges.
    // Copy the entire width to avoid a visible rectangular patch or seam.
    x.imageSmoothingEnabled=false;
    x.drawImage(img['board.png'],0,970,W,840,0,104,W,850);
    let px=mapInfo.cells,pw=mapInfo.w,ph=mapInfo.h,scale=4;
    for(let yy=0;yy<ph;yy++)for(let xx=0;xx<pw;xx++){let id=px[yy*pw+xx];if(!id)continue;let edge=(xx===0||yy===0||xx===pw-1||yy===ph-1||px[yy*pw+xx-1]!==id||px[yy*pw+xx+1]!==id||px[(yy-1)*pw+xx]!==id||px[(yy+1)*pw+xx]!==id);x.fillStyle=edge?'#20130f':color(state.colors[state.provinces[id].owner]||[157,119,66]);x.fillRect(xx*scale,yy*scale,scale,scale);}
    for(let id of IDS){let pr=state.provinces[id];if(pr.home_castle||pr.secondary_castle){let [cx,cy]=mapInfo.castles[id];drawMapCastle(x,id,cx,cy,pr.home_castle);}}
  }else{
    let data=new Uint8ClampedArray(baseData.data);for(let i=0;i<data.length;i+=4){let id=hitData.data[i];if(id===11)id=14;if(!T[id])continue;let owner=state.provinces[id].owner,cl=state.colors[owner]||[157,119,66],alpha=paintData.data[i]/255;if(alpha<=.001)continue;for(let z=0;z<3;z++)data[i+z]=Math.round(data[i+z]*(1-alpha)+cl[z]*alpha);}x.putImageData(new ImageData(data,W,H),0,0);
    for(let id of castleIds){if(CASTLES.includes(id))continue;let [cx,cy]=CASTLE_POS[id];x.fillStyle='#c69c65';x.strokeStyle='#2a140e';x.fillRect(cx-13,cy-3,26,19);x.strokeRect(cx-13,cy-3,26,19);for(let dx of [-10,0,10])x.fillRect(cx+dx-4,cy-10,8,13);}
  }
  drawSherwood(x);
  coloredMapKey=key;coloredMap=canvas;return canvas;
}
// The color-paint mask is artwork-aware; selection needs continuous land.
function originalCastleRect(id){
  const [x,y]=CASTLE_POS[id];
  return [x-29,y-30,x+29,y+30];
}
function buildEnglandSelectionMask(rgba){
  const mask=new Uint8Array(W*H);
  for(let i=0;i<mask.length;i++){
    let id=rgba[i*4];if(id===11)id=14;
    mask[i]=T[id]?id:0;
  }
  // Restore pixels omitted by the castle artwork. Never overwrite another
  // province's existing land pixels, and leave the color-paint mask untouched.
  for(const id of CASTLES){
    const [x1,y1,x2,y2]=originalCastleRect(id);
    for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++){
      const i=y*W+x;if(!mask[i])mask[i]=id;
    }
  }
  // Fill enclosed artwork holes (including any remaining castle or forest
  // cutouts) only when they are bounded by one province, not open water.
  const visited=new Uint8Array(mask.length),queue=new Int32Array(mask.length);
  for(let i=0;i<mask.length;i++){
    if(mask[i]||visited[i])continue;
    let head=0,tail=1,border=0,mixed=false,exterior=false;queue[0]=i;visited[i]=1;
    while(head<tail){
      const q=queue[head++],x=q%W,y=Math.floor(q/W);
      if(x===0||x===W-1||y===0||y===H-1)exterior=true;
      for(const n of [x>0?q-1:-1,x<W-1?q+1:-1,y>0?q-W:-1,y<H-1?q+W:-1]){
        if(n<0)continue;
        if(mask[n]){if(border&&border!==mask[n])mixed=true;else border=mask[n];}
        else if(!visited[n]){visited[n]=1;queue[tail++]=n;}
      }
    }
    if(!exterior&&!mixed&&border)for(let k=0;k<tail;k++)mask[queue[k]]=border;
  }
  return mask;
}
function castleHitAt(x,y){
  if(!state)return 0;
  let closest=0,best=Infinity;
  for(const id of IDS){
    const pr=state.provinces[id];if(!pr.home_castle&&!pr.secondary_castle)continue;
    const random=mapInfo?.type==='random';
    const [cx,cy]=random?mapInfo.castles[id]:CASTLE_POS[id];
    const r=!random&&CASTLES.includes(id)?originalCastleRect(id):[cx-20,cy-18,cx+20,cy+24];
    if(x>=r[0]&&x<=r[2]&&y>=r[1]&&y<=r[3]){
      const d=(x-cx)**2+(y-cy)**2;if(d<best){best=d;closest=id;}
    }
  }
  return closest;
}
function horseHitAt(x,y){
  // Reverse draw order: the topmost visible horse wins if sprites overlap.
  for(let i=horseHitTargets.length-1;i>=0;i--){
    const h=horseHitTargets[i],px=Math.floor((x-Math.round(h.x-25.6))/HORSE_SCALE),
      py=Math.floor((y-Math.round(h.y-20))/HORSE_SCALE);
    if(HORSE_B[py]?.[px]==='#')return h.id;
  }
  return 0;
}
function territoryOutline(id){
  const key=(mapInfo?.type==='random'?'r'+mapInfo.seed:'england')+':'+id;
  if(outlineCache.has(key))return outlineCache.get(key);
  const sheet=document.createElement('canvas');sheet.width=W;sheet.height=H;
  const x=sheet.getContext('2d');x.fillStyle='rgba(255,211,80,.98)';
  if(mapInfo?.type==='random'){
    const {cells,w,h}=mapInfo;
    for(let yy=1;yy<h-1;yy++)for(let xx=1;xx<w-1;xx++){
      const i=yy*w+xx;if(cells[i]!==id)continue;const px=xx*4,py=yy*4;
      if(cells[i-1]!==id)x.fillRect(px,py,4,4);
      if(cells[i+1]!==id)x.fillRect(px+2,py,3,4);
      if(cells[i-w]!==id)x.fillRect(px,py,4,3);
      if(cells[i+w]!==id)x.fillRect(px,py+2,4,3);
    }
  }else{
    const maskAt=(px,py)=>{if(px<0||py<0||px>=W||py>=H)return 0;
      return englandSelectionMask[py*W+px];};
    for(let py=140;py<945;py+=2)for(let px=35;px<817;px+=2){
      if(maskAt(px,py)!==id)continue;
      if(maskAt(px-3,py)!==id||maskAt(px+3,py)!==id||maskAt(px,py-3)!==id||maskAt(px,py+3)!==id)x.fillRect(px,py,3,3);
    }
  }
  outlineCache.set(key,sheet);return sheet;
}
function horseOffsets(n){
  if(n<=1)return [[0,0]];
  if(n===2)return [[-23,-12],[23,12]];
  if(n===3)return [[-24,-16],[24,-16],[0,19]];
  return Array.from({length:n},(_,i)=>[(i%3-1)*30,(Math.floor(i/3)-.5)*28]);
}
function horseRect(x,y){return [x-HORSE_HALF_W,y-HORSE_HALF_H,x+HORSE_HALF_W,y+HORSE_HALF_H];}
function overlap(a,b){return Math.max(0,Math.min(a[2],b[2])-Math.max(a[0],b[0]))*Math.max(0,Math.min(a[3],b[3])-Math.max(a[1],b[1]));}
function castleExclusionRects(){
  return IDS.filter(id=>state.provinces[id].home_castle||state.provinces[id].secondary_castle).map(id=>{
    const [x,y]=mapInfo?.type==='random'?mapInfo.castles[id]:CASTLE_POS[id];
    if(mapInfo?.type==='random')return state.provinces[id].home_castle?[x-18,y-18,x+18,y+20]:[x-16,y-12,x+16,y+20];
    if(CASTLES.includes(id))return originalCastleRect(id);
    return [x-20,y-18,x+20,y+24];
  });
}
function placeHorse(id,pt,offset,castles,placed){
  const [ax,ay]=pt,[dx,dy]=offset,tx=ax+dx,ty=ay+dy;
  const [fx,fy]=sherwoodCenter(),forest=[fx-47,fy-30,fx+47,fy+25];
  let best=null;
  const consider=(x,y)=>{
    const box=horseRect(x,y);
    if(box[0]<40||box[2]>812||box[1]<140||box[3]>930||castles.some(b=>overlap(box,b)))return;
    const center=provinceAt(x,y)===id;
    const samples=[[-20,-15],[20,-15],[-20,15],[20,15],[-20,0],[20,0],[0,-15],[0,15]];
    const outside=samples.reduce((n,[sx,sy])=>n+(provinceAt(x+sx,y+sy)!==id),0);
    const horseOverlap=placed.reduce((n,b)=>n+overlap(box,b),0);
    const score=(center?0:25000)+outside*220+horseOverlap*6+overlap(box,forest)*3+Math.hypot(x-tx,y-ty)*5+Math.hypot(x-ax,y-ay)*2;
    if(!best||score<best.score)best={x,y,box,score,center};
  };
  consider(tx,ty);
  for(let oy=-96;oy<=96;oy+=6)for(let ox=-96;ox<=96;ox+=6)consider(ax+ox,ay+oy);
  if(!best||!best.center){
    for(let oy=-156;oy<=156;oy+=6)for(let ox=-156;ox<=156;ox+=6)consider(ax+ox,ay+oy);
  }
  // Never draw a horse over a castle, even on an unusually narrow random map.
  if(!best)for(let y=166;y<=900;y+=12)for(let x=70;x<=780;x+=12)consider(x,y);
  return best;
}
function captureVisualState(){
  return {owners:Object.fromEntries(IDS.map(id=>[id,state.provinces[id].owner])),
    castles:Object.fromEntries(IDS.map(id=>[id,{home_castle:state.provinces[id].home_castle,secondary_castle:state.provinces[id].secondary_castle}])),
    horses:Object.fromEntries(Object.entries(state.lords).map(([n,p])=>[n,p.campaign_province])),
    alive:Object.fromEntries(Object.entries(state.lords).map(([n,p])=>[n,p.alive]))};
}
function holdVisualState(snapshot){
  visualOwners=snapshot.owners;visualCastles=snapshot.castles;visualHorsePos=snapshot.horses;visualAlive=snapshot.alive;coloredMapKey='';
}
function clearVisualState(){
  visualOwners=null;visualCastles=null;visualHorsePos=null;visualAlive=null;coloredMapKey='';
}
function renderMap(){
  horseHitTargets=[];if(!state){c.drawImage(img['board.png'],0,0);return;}
  const hold=visualOwners?captureVisualState():null;
  if(hold)for(const id of IDS)Object.assign(state.provinces[id],visualCastles[id],{owner:visualOwners[id]});
  try{
    if(hold)coloredMapKey='';
    c.drawImage(coloredBoard(),0,0);
  const byTerritory=new Map();
  for(const [l,p] of Object.entries(state.lords)){
    if(!(visualAlive?.[l]??p.alive))continue;
    const id=visualHorsePos?.[l]??p.campaign_province;
    const pt=mapInfo?.type==='random'?mapInfo.horses[id]:HORSES[id];
    if(!pt)continue;
    if(!byTerritory.has(id))byTerritory.set(id,[]);
    byTerritory.get(id).push({l,pt});
  }
  const castleRects=castleExclusionRects(),placed=[];
  for(const [id,group] of byTerritory){
    const spreads=horseOffsets(group.length);
    group.forEach(({l,pt},i)=>{
      const p=placeHorse(id,pt,spreads[i],castleRects,placed);
      if(p){placed.push(p.box);horseHitTargets.push({id,x:p.x,y:p.y});horse(p.x,p.y,state.colors[l]||[120,155,220]);}
    });
  }
  if(selected>0&&['read','move','castle_pick','battle','passage'].includes(mode))c.drawImage(territoryOutline(selected),0,0);
  if(flashVisible&&flashId)c.drawImage(territoryOutline(flashId),0,0);
  }finally{
    if(hold){for(const id of IDS)Object.assign(state.provinces[id],hold.castles[id],{owner:hold.owners[id]});coloredMapKey='';}
  }
}
function fullScreen(file,overlay=''){c.fillStyle='#000';c.fillRect(0,0,W,H);let im=img[file];let ratio=Math.min(W/im.width,(H-220)/im.height),dw=im.width*ratio,dh=im.height*ratio,dx=(W-dw)/2,dy=(H-dh)/2;c.imageSmoothingEnabled=file==='home_castle_under_attack.png'||file==='home_castle_fallen.png'?false:true;c.drawImage(im,dx,dy,dw,dh);c.imageSmoothingEnabled=true;if(overlay==='The End'){text('The End',192,720,'title','#150a07','center');text('The End',188,716,'title','#edcf87','center');}}

// An uploaded drawing is decoded locally. No image data is transmitted.
const mapPicker=document.createElement('input');
mapPicker.type='file';mapPicker.accept='image/*';mapPicker.hidden=true;document.body.appendChild(mapPicker);
function openMapPicker(){mapPicker.value='';mapPicker.click();}
const newMapSeed=()=>Math.floor(Math.random()*4294967296)>>>0;
function readMapImage(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{try{resolve(extractLand(im));}catch(e){reject(e);}finally{URL.revokeObjectURL(url);}};
  im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Could not read this image. Try a PNG or JPEG.'));};
  im.src=url;
 });
}
function extractLand(im){
 const cv=document.createElement('canvas'),ctx=cv.getContext('2d',{willReadFrequently:true});
 const scale=Math.min(1,1100/Math.max(im.naturalWidth,im.naturalHeight));
 cv.width=Math.max(1,Math.round(im.naturalWidth*scale));cv.height=Math.max(1,Math.round(im.naturalHeight*scale));
 ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(im,0,0,cv.width,cv.height);
 const w=cv.width,h=cv.height,data=ctx.getImageData(0,0,w,h).data;
 // Estimate the plain background from small corner patches, robust to a stray mark.
 const samples=[[],[],[]],patch=Math.max(1,Math.min(12,w,h));
 for(const [ox,oy] of [[0,0],[w-patch,0],[0,h-patch],[w-patch,h-patch]])for(let y=oy;y<oy+patch;y++)for(let x=ox;x<ox+patch;x++)for(let ch=0;ch<3;ch++)samples[ch].push(data[(y*w+x)*4+ch]);
 const bg=samples.map(a=>a.sort((a,b)=>a-b)[a.length>>1]);
 const isInk=(d,i)=>Math.max(Math.abs(d[i]-bg[0]),Math.abs(d[i+1]-bg[1]),Math.abs(d[i+2]-bg[2]))>85;
 let x0=w,y0=h,x1=-1,y1=-1;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(isInk(data,(y*w+x)*4)){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1-x0<20||y1-y0<20)throw Error('No clear island outline found. Draw a closed line on a plain background.');
 // Fit proportionally in the same 213 x 232 cell grid used by random maps.
 const sw=x1-x0+1,sh=y1-y0+1,factor=Math.min(164/sw,178/sh),tw=Math.max(1,Math.round(sw*factor)),th=Math.max(1,Math.round(sh*factor));
 const pad=6,gw=tw*3+2*pad,gh=th*3+2*pad,tmp=document.createElement('canvas');
 tmp.width=gw;tmp.height=gh;const tx=tmp.getContext('2d',{willReadFrequently:true});
 tx.fillStyle='rgb('+bg.join(',')+')';tx.fillRect(0,0,gw,gh);tx.drawImage(cv,x0,y0,sw,sh,pad,pad,tw*3,th*3);
 const pixels=tx.getImageData(0,0,gw,gh).data,ink=new Uint8Array(gw*gh);
 for(let i=0;i<ink.length;i++)ink[i]=isInk(pixels,4*i)?1:0;
 // A two-pixel morphological closing at 3x resolution bridges tiny line gaps.
 const steps=[-gw,gw,-1,1];
 function morph(a,dilate){const b=new Uint8Array(a.length);for(let y=1;y<gh-1;y++)for(let x=1;x<gw-1;x++){let i=y*gw+x,v=a[i];for(const d of steps)v=dilate?v|a[i+d]:v&a[i+d];b[i]=v;}return b;}
 const boundary=morph(morph(morph(morph(ink,true),true),false),false);
 // Label all four-connected non-line areas. The largest enclosed area is land;
 // exterior and other enclosed areas (lakes) remain water.
 const labels=new Int32Array(boundary.length),queue=new Int32Array(boundary.length);
 let label=0,best=0,bestSize=0;
 for(let i=0;i<boundary.length;i++){
  if(boundary[i]||labels[i])continue;
  label++;let head=0,tail=1,exterior=false;queue[0]=i;labels[i]=label;
  while(head<tail){const j=queue[head++],x=j%gw,y=j/gw|0;
   if(x===0||x===gw-1||y===0||y===gh-1)exterior=true;
   for(const d of steps){if((d===-1&&x===0)||(d===1&&x===gw-1))continue;const k=j+d;if(k<0||k>=boundary.length||boundary[k]||labels[k])continue;labels[k]=label;queue[tail++]=k;}
  }
  if(!exterior&&tail>bestSize){best=label;bestSize=tail;}
 }
 if(!best)throw Error('The coastline is open. Close all gaps in the outline and try again.');
 const land=new Uint8Array(213*232),left=Math.floor((213-tw)/2),top=44+Math.floor((178-th)/2);
 for(let y=0;y<th;y++)for(let x=0;x<tw;x++)if(labels[(pad+y*3+1)*gw+pad+x*3+1]===best)land[(top+y)*213+left+x]=1;
 // Drop only detached raster fragments caused by downsampling; large disconnected
 // pieces are rejected so the game never creates unreachable territories.
 const seen=new Uint8Array(land.length),q=new Int32Array(land.length);let largest=[],total=0;
 for(let i=0;i<land.length;i++){if(!land[i]||seen[i])continue;let head=0,tail=1;q[0]=i;seen[i]=1;while(head<tail){const j=q[head++];for(const d of [-213,213,-1,1]){const k=j+d;if(k>=0&&k<land.length&&land[k]&&!seen[k]){seen[k]=1;q[tail++]=k;}}}total+=tail;if(tail>largest.length)largest=Array.from(q.subarray(0,tail));}
 if(total-largest.length>Math.max(20,total*.01))throw Error('The island has disconnected land. Widen its narrow passages.');
 land.fill(0);for(const i of largest)land[i]=1;
 if(largest.length<4500)throw Error('The island is too small or narrow. Draw a wider outline with room for territories.');
 return land;
}
function generateUpload(){
 const ticket=++uploadTicket;uploadBusy=true;uploadError='';uploadPreview=null;mode='upload_preview';render();
 // Yield once so the preview can display the generation message.
 setTimeout(()=>{if(ticket!==uploadTicket)return;try{uploadPreview=uploadedMap(newMapSeed(),uploadLand);}catch(e){uploadError=e.message;}finally{uploadBusy=false;render();}},40);
}
mapPicker.addEventListener('change',async()=>{
 const file=mapPicker.files?.[0];if(!file)return;
 const ticket=++uploadTicket;uploadBusy=true;uploadError='';uploadLand=null;uploadPreview=null;mode='upload_preview';render();
 try{const land=await readMapImage(file);if(ticket!==uploadTicket)return;uploadLand=land;generateUpload();}
 catch(e){if(ticket!==uploadTicket)return;uploadError=e.message;uploadBusy=false;render();}
});
function renderUploadPreview(){
 c.drawImage(img['board.png'],0,0);c.fillStyle='#e4bb81';c.fillRect(49,80,754,1692);c.strokeStyle='#61391f';c.lineWidth=9;c.strokeRect(49,80,754,1692);
 text('Thy New Kingdom',426,111,'title',INK,'center');rule(210);
 if(uploadPreview){
  const m=uploadPreview,palette=['#b49b6b','#c9b47b','#aeb382','#c3a27b','#b9bc8e','#d3bc91'];
  // A neutral preview of the actual territory grid; faction colors are assigned in game.
  c.save();c.translate(0,100);for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){
   const i=y*m.w+x,id=m.cells[i];if(!id)continue;
   const edge=m.cells[i-1]!==id||m.cells[i+1]!==id||m.cells[i-m.w]!==id||m.cells[i+m.w]!==id;
   c.fillStyle=edge?'#493323':palette[id%palette.length];c.fillRect(x*4,y*4,4,4);
  }
  for(const id of CASTLES){const [x,y]=m.castles[id];drawMapCastle(c,id,x,y,true);}
  drawSherwood(c,m.forest);c.restore();
  text('18 Territories - 6 Lords',426,1070,'body',INK,'center');
  text('The coastline and lakes are preserved.',426,1140,'small',LIGHT,'center');
  button('upload_accept','Accept Kingdom',[122,1250,730,1332]);
 }else{
  const notice=uploadBusy?'Creating thy kingdom...':(uploadError||'Choose an image of a closed island outline.');
  let y=400;for(const line of wrap(notice,'body',615)){text(line,426,y,'body',INK,'center');y+=72;}
  if(!uploadBusy){let y=850;for(const line of wrap('Use a plain background, a contrasting closed coastline, and optional enclosed lakes.','small',615)){text(line,426,y,'small',LIGHT,'center');y+=54;}}
 }
 if(!uploadBusy&&uploadLand)button('upload_regenerate','Regenerate Territories',[122,1360,730,1442]);
 if(!uploadBusy)button('upload_another','Upload Another Map',[122,1470,730,1552]);
 button('upload_back','Back',[122,1620,730,1702]);
}

function renderSetup(){c.drawImage(img['board.png'],0,0);c.fillStyle='#e4bb81';c.fillRect(49,80,754,1692);c.strokeStyle='#61391f';c.lineWidth=9;c.strokeRect(49,80,754,1692);text('A Kingdom Awaits',426,111,'title',INK,'center');text('Choose thy lord and destiny',426,183,'small',LIGHT,'center');rule(232);text('I. Choose Thy Saxon Lord',426,252,'name',INK,'center');let lords=['Wolfric the Wild','Geoffrey Longsword','Cedric of Rotherwood','Wilfred of Ivanhoe'];lords.forEach((l,i)=>{let x=65+188*i,y=315,im=portraitPath(l),w=161,h=199,active=options.character===l;c.fillStyle=active?'#e0aa55':'#855632';c.fillRect(x-8,y-8,w+16,h+16);c.drawImage(im,x,y,w,h);c.lineWidth=active?6:4;c.strokeStyle=active?'#ffe088':'#4d2714';c.strokeRect(x,y,w,h);buttons.push({key:'setup_lord:'+l,rect:[x-8,y-8,x+w+8,651]});text(SHORT[l],x+w/2,530,'small',INK,'center');text(START_RANK[l],x+w/2,578,'small',LIGHT,'center');});button('setup_lord:random','Random Lord',[122,670,730,742],'body',options.character===null);rule(772);text('II. Choose Thy Challenge',426,796,'name',INK,'center');[['easy','Noble Quest','Two Saxon allies; rescue available'],['medium','Norman Peril','One Saxon ally; one lord turns Norman'],['hard','The Last Saxon','No Saxon allies; no maiden rescue']].forEach(([key,title,desc],i)=>{let y=854+i*116;button('setup_difficulty:'+key,title,[122,y,730,y+72],'body',options.difficulty===key);text(desc,426,y+76,'small',LIGHT,'center');});rule(1215);text('III. Choose Thy Kingdom',426,1236,'name',INK,'center');button('setup_map:england','England - Original Map',[122,1323,730,1395],'body',options.map==='england');button('setup_map:random','Random Kingdom',[122,1420,730,1492],'body',options.map==='random');button('setup_map:upload','Upload Map',[122,1510,730,1582],'body',options.map==='upload');rule(1610);button('setup_begin','Begin Campaign',[122,1646,730,1720]);}
function drawOrders(){header('Your orders?',status());[['conquest','Seek Conquest',1186],['army','Build Army',1284],['read','Read Map',1382],['end','End Month',1484],['history','Chronicle',1570]].forEach(([k,s,y])=>button(k,s,[85,y,505,y+82]));drawPortrait(state.human,[565,1140,751,1350]);text('Leadership',658,1396,'small',LIGHT,'center');text(state.rank(state.human),658,1450,'small',INK,'center');let p=state.lords[state.human];if(p.spouse){drawPortrait('Lady Catherine',[565,1494,751,1704]);text(`${SHORT[state.human]} of ${T[p.home_province][0]}`,285,1697,'small',INK,'center');}else fit(`${SHORT[state.human]} of ${T[p.home_province][0]}  /  Robin: ${p.robin_uses_remaining}`,426,1690);}
function drawRead(){
  header('Read Map','Tap any territory above');
  if(selected===-1){
    text('Sherwood Forest',426,1210,'name',INK,'center');
    lines(['Robin Hood dwells beneath the trees.','Seek his help in thy next enemy battle.'],1320,70,'small');
  }else if(selected&&T[selected]){
    const id=selected,pr=state.provinces[id],owner=pr.owner,portrait=owner&&state.lords[owner].home_province===id;
    text(T[id][0],426,1194,'name',INK,'center');rule(1280);
    [['Owner',owner?SHORT[owner]:'Unclaimed'],['Gold / month',T[id][1]],['Vassals left',state.remainingVassals(id)],['Castle',pr.home_castle?'Home':pr.secondary_castle?'Built':'None']].forEach(([k,v],i)=>{
      text(k,115,1310+i*61,'small',LIGHT);text(v,portrait?515:705,1310+i*61,'small',INK,'right');
    });
    if(portrait)drawPortrait(owner,[550,1304,740,1545]);
  }else lines(['Touch a province to learn its','owner, income, vassals and lord.','Read Map costs no turn.'],1250,90);
  button('back','Back to Orders',[165,1644,687,1716]);
}
function drawConquest(){let p=state.lords[state.human],r=state.castleReserve(state.human);header('Seek Conquest',status());lines([`At: ${T[p.campaign_province][0]}`,`Castle: ${SUMMARY(r||p.home_army)}`,`Field: ${SUMMARY(p.campaign_army)}`,`Robin: ${p.robin_uses_remaining} times left${state.robin_pending?' - Pledged':''}`],1188,63,'small');button('transfer','Transfer Troops',[165,1460,687,1532]);button('move','Move Army',[165,1540,687,1612]);button('robin','See Robin',[165,1620,687,1692]);button('back','Back',[165,1700,687,1772]);}
function drawArmy(){let p=state.lords[state.human];header('Build Army',`Treasury: ${p.treasury} gold  /  Income: ${state.income(state.human)}`);[['soldiers','Soldiers',1],['knights','Knights',8],['catapults','Catapults',15],['castle','Castle',20]].forEach(([u,label,cost],i)=>{let y=1180+i*74;text(`${label}  ${cost} g`,123,y+6,'body',INK);text(u==='castle'?+(wantCastle):quantity[u],550,y+7,'body',INK,'right');button('minus:'+u,'-',[577,y,638,y+62]);button('plus:'+u,'+',[662,y,724,y+62]);});text('Field troops: '+SUMMARY(p.campaign_army),426,1474,'small',INK,'center');text('Home castle: '+SUMMARY(p.home_army),426,1528,'small',INK,'center');let cost=costOf();text(`Total: ${cost}   Remaining: ${Math.max(0,p.treasury-cost)}`,426,1582,'small',INK,'center');button('buy','Confirm Purchase',[165,1634,687,1699]);button('back','Back',[165,1710,687,1775]);}
function drawCastlePick(){header('Place Thy Castle','Tap an owned province without a castle');text(selectedCastle?T[selectedCastle][0]:'None selected',426,1262,'name',INK,'center');lines(['Castle cost: 20 gold','Includes a 10 soldier garrison','This purchase ends your turn'],1382,70,'small');button('build_confirm','Confirm Purchase',[165,1598,687,1670]);button('back','Cancel',[165,1678,687,1750]);}
// A signed draft represents the net number moving from castle to field.
// Positive values go right; negative values go left. No engine state is
// changed until the player confirms.
function resetTransferDraft(){transferDraft=Object.fromEntries(U.map(u=>[u,0]));}
function transferAmounts(reserve,field,draft,u){
  return [reserve[u]-draft[u],field[u]+draft[u]];
}
function changeTransferDraft(reserve,field,draft,u,dir){
  const [castle,army]=transferAmounts(reserve,field,draft,u);
  const step=u==='soldiers'?5:1;
  draft[u]+=dir*Math.min(step,dir>0?castle:army);
}
function confirmTransfer(game,l,draft){
  const reserve=game.castleReserve(l),field=game.lords[l].campaign_army;
  if(!reserve)throw Error('Stand within one of thy castles to transfer troops');
  // Validate every troop type before applying either direction.
  for(const u of U)if(!Number.isInteger(draft[u])||draft[u]>reserve[u]||draft[u]<-field[u])throw Error('Not enough '+u+' to transfer');
  const out=Object.fromEntries(U.map(u=>[u,Math.max(0,draft[u])]));
  const into=Object.fromEntries(U.map(u=>[u,Math.max(0,-draft[u])]));
  if(U.some(u=>out[u]))game.transfer(l,out,'out');
  if(U.some(u=>into[u]))game.transfer(l,into,'in');
}
function transferArrow(key,rect,dir,enabled){
  const [x,y,x2,y2]=rect;
  const pressed=enabled&&pressedKey===key;buttonFrame(rect,false,enabled,pressed);
  if(enabled)buttons.push({key,rect});
  // Draw arrows directly; the original bitmap font has no arrow glyphs.
  const cx=(x+x2)/2+(pressed?2:0),cy=(y+y2)/2+(pressed?4:0);
  c.save();c.translate(cx,cy);c.scale(dir,1);
  c.fillStyle=enabled?INK:'#a98b65';c.beginPath();
  c.moveTo(-17,-5);c.lineTo(2,-5);c.lineTo(2,-13);c.lineTo(18,0);
  c.lineTo(2,13);c.lineTo(2,5);c.lineTo(-17,5);c.closePath();c.fill();c.restore();
}
function drawTransfer(){
  const p=state.lords[state.human],r=state.castleReserve(state.human);
  header('Transfer Troops',`At: ${T[p.campaign_province][0]} castle`);
  if(!r){lines(['Thy field army must be at one of','thy castles to transfer troops.'],1310,70);button('back','Back',[165,1668,687,1740]);return;}
  U.forEach((u,i)=>{
    const y=1250+i*120,[castle,field]=transferAmounts(r,p.campaign_army,transferDraft,u);
    text(u[0].toUpperCase()+u.slice(1),85,y,'small');
    text('Castle:'+castle,430,y,'small',INK,'right');
    transferArrow('transfer_left:'+u,[442,y-7,504,y+57],-1,field>0);
    transferArrow('transfer_right:'+u,[518,y-7,580,y+57],1,castle>0);
    text('Field:'+field,594,y,'small');
  });
  button('transfer_confirm','Confirm',[165,1581,687,1653]);
  button('back','Back',[165,1668,687,1740]);
}
function drawMove(){let p=state.lords[state.human];header('Move Army','Tap a bordering province above');text('From: '+T[p.campaign_province][0],426,1196,'name',INK,'center');lines(['Field army: '+SUMMARY(p.campaign_army),'Neutral or enemy attack ends the turn','Friendly travel is free','Tap Sherwood to request Robin'],1313,72,'small');button('back','Back to Conquest',[165,1622,687,1694]);}
function drawBattle(){
  const id=pendingTarget,pr=state.provinces[id],owner=pr.owner;
  const ally=owner&&state.lords[owner]?.faction==='Saxon'&&owner!==state.human;
  header('Battle Orders',T[id][0]+'  /  '+(pr.home_castle||pr.secondary_castle?'Siege':'Field battle'));
  const ours=SUMMARY(state.lords[state.human].campaign_army),theirs=SUMMARY(state.defenders(id));
  if(ally){
    drawPortrait(owner,[550,1175,735,1336]);
    ['Your army',ours,'Defenders',theirs].forEach((line,i)=>text(line,305,1176+i*54,'small',LIGHT,'center'));
  }else lines(['Your army: '+ours,'Defenders: '+theirs],1183,64,'small');
  const shift=ally?53:0;
  [['Stand and Fight',88,1347],['Ferocious Attack',438,1347],['Outflank',88,1438],['Bombard',438,1438]].forEach(([t,x,y])=>button('tactic:'+t,t,[x,y+shift,x+326,y+78+shift],'small',t===tactic));
  const chance=Math.round(state.expectedOdds(state.human,id,tactic)*100);
  text(state.robin_pending?'Win chance: '+chance+' percent - Robin pledged':'Estimated win chance: '+chance+' percent',426,1533+shift,'small',LIGHT,'center');
  button('fight','Attack',[165,1598+shift,687,1670+shift]);
  button('back','Cancel',[165,1678+shift,687,1750+shift]);
}
function drawPassage(){
  const id=pendingTarget,owner=state.provinces[id].owner;
  header('An Allied Province',T[id][0]);
  if(owner)drawPortrait(owner,[545,1180,745,1407]);
  const copy=['A fellow Saxon lord','holds this land.','Wilt thou seek passage','or attack thine ally?'];
  copy.forEach((line,i)=>text(line,305,1208+i*65,'small',LIGHT,'center'));
  button('pass_safe','Request Passage',[165,1510,687,1582]);
  button('pass_attack','Attack Ally',[165,1590,687,1662]);
  button('back','Cancel',[165,1670,687,1742]);
}
function lordForLog(line){const match=String(line).match(/^([A-Za-z]+):/);return match?Object.keys(state.lords).find(l=>SHORT[l]===match[1]):null;}
function lordSquare(l,x,y,size=18){const rgb=state.colors[l];if(!rgb)return;c.fillStyle=color(rgb);c.fillRect(x,y,size,size);c.strokeStyle='#4c2a18';c.lineWidth=2;c.strokeRect(x,y,size,size);}
// The ledger is the source of truth for both reports and campaign history.
const unitList=units=>U.filter(u=>(units?.[u]||0)>0).map(u=>units[u]+' '+u).join(', ');
function ledgerEntry(r,chronicle=false){
  const n=SHORT[r.lord]||'Kingdom',p=T[r.province]?.[0]||'',enemy=SHORT[r.defender]||'the enemy';
  let text='';
  switch(r.action){
    case 'game_started':text='Began the campaign in '+p+'.';break;
    case 'claim':text=(r.old_owner?'Captured ':'Claimed ')+p+(r.vassals_added?' and recruited '+r.vassals_added+' vassals':'')+'.';break;
    case 'unopposed_capture':text='Took '+p+' without resistance.';break;
    case 'battle':text=(r.won?'Defeated ':'Was repelled by ')+enemy+' at '+p+'. '+n+' lost '+r.losses+'; '+enemy+' lost '+r.defenders_lost+'.';break;
    case 'casualties':if(!unitList(r.loss))return null;text='Lost '+unitList(r.loss)+' ('+r.kind+').';break;
    case 'lord_defeated':text='Defeated '+SHORT[r.defeated]+' at '+p+'. Remaining lands abandoned.';break;
    case 'army_retreated':text='Withdrew from '+(T[r.from_province]?.[0]||'the field')+' to '+p+'.';break;
    case 'march':text='Marched to '+p+'.';break;
    case 'safe_passage':text='Passed safely through '+p+'.';break;
    case 'purchase_troops':text='Recruited '+unitList(r.units)+' for '+r.cost+' gold.';break;
    case 'transfer':if(chronicle)return null;text='Moved '+unitList(r.units)+(r.direction==='out'?' to the field':' into the castle')+' at '+p+'.';break;
    case 'build_castle':text='Built a castle at '+p+'.';break;
    case 'monthly_tax':if(chronicle&&r.lord!==state.human)return null;text='Received '+r.received+' gold in taxes (treasury '+r.balance+').';break;
    case 'alliance_broken':text='Broke alliance with '+SHORT[r.enemy]+'.';break;
    case 'maiden_union':text='United with '+SHORT[r.ally]+'; gained '+r.territories+' territories'+(r.garrison_added?' and '+r.garrison_added+' soldiers at '+p:'')+'.';break;
    case 'robin_pledged':text='Won Robin Hood\'s pledge.';break;
    case 'robin_aid':text='Received Robin Hood\'s aid in battle.';break;
    case 'leadership_rank_changed':text='Leadership rank changed.';break;
    case 'leadership_adjusted':return null;
    case 'tax_robbery':text='Lost gold to robbers.';break;
    case 'province_revolt':text='Lost '+p+' to revolt.';break;
    case 'sabotage':text='A catapult was sabotaged.';break;
    case 'research_preparation':if(r.reason)text='Saved gold for a siege at '+p+'.';else return null;break;
    case 'turn_passed':text='Passed the month.';break;
    case 'guarded':text='Guarded '+p+'.';break;
    case 'campaign_note':text=r.text;break;
    default:return null;
  }
  return {lord:r.lord,text:n+': '+text,date:MONTH[r.month-1]+' '+r.year};
}
function ledgerEntries(records,chronicle=false){
  // A claim accompanying an actual battle or unopposed capture is described
  // by the more specific event instead of showing two copies of the capture.
  const detailed=new Set(records.filter(r=>r.action==='battle'||r.action==='unopposed_capture').map(r=>r.turn+'/'+r.lord+'/'+r.province));
  return records.filter(r=>!(r.action==='claim'&&r.old_owner&&detailed.has(r.turn+'/'+r.lord+'/'+r.province))).map(r=>ledgerEntry(r,chronicle)).filter(Boolean);
}
function paginateEvents(entries,dated=false){
  const pages=[];let page=[],used=0,lastDate='';
  for(const entry of entries){
    const lines=wrap(entry.text,'report',615),date=dated&&entry.date!==lastDate?entry.date:'';
    let need=lines.length+(date?1:0);
    if(used&&used+need>7){pages.push(page);page=[];used=0;lastDate='';}
    const heading=dated&&entry.date!==lastDate?entry.date:'';
    if(heading){page.push({line:heading,heading:true});used++;}
    lines.forEach((line,i)=>page.push({line,lord:i===0?entry.lord:null}));used+=lines.length;lastDate=entry.date;
  }
  if(page.length||!pages.length)pages.push(page);return pages;
}
function drawEventPage(page){
  page.forEach(({line,lord,heading},i)=>{
    const y=1180+i*51;text(line,426,y,'report',heading?LIGHT:INK,'center');
    if(lord)lordSquare(lord,426-width(line,'report')/2-25,y+12);
  });
}
// Monthly report is a continuous, clipped scroll area. Chronicle retains paging.
const REPORT_VIEW={left:75,right:778,top:1168,bottom:1648};
let reportDrag=null;
function reportLayout(entries){
  const rows=[];let y=6,lastDate='';
  for(const entry of entries){
    if(entry.date!==lastDate){if(rows.length)y+=10;rows.push({y,line:entry.date,heading:true});y+=51;lastDate=entry.date;}
    wrap(entry.text,'report',610).forEach((line,i)=>{rows.push({y,line,lord:i===0?entry.lord:null});y+=49;});
    y+=10;
  }
  return {rows,height:y+5};
}
function reportScrollLimit(layout){return Math.max(0,layout.height-(REPORT_VIEW.bottom-REPORT_VIEW.top));}
function setReportScroll(value){
  const next=Math.max(0,Math.min(value,reportScrollLimit(reportLayout(reportEntries))));
  if(next!==reportScroll){reportScroll=next;render();}
}
function reportHit(x,y){return mode==='report'&&x>=REPORT_VIEW.left&&x<=REPORT_VIEW.right&&y>=REPORT_VIEW.top&&y<=REPORT_VIEW.bottom;}
function drawReport(){
  const layout=reportLayout(reportEntries),v=REPORT_VIEW,viewHeight=v.bottom-v.top,max=reportScrollLimit(layout);
  reportScroll=Math.max(0,Math.min(reportScroll,max));
  header(state.outcome==='victory'?'The Crown Is Thine':state.outcome==='defeat'?'Thy Castle Is Lost':'The Month Passes',reportMonth);
  c.save();c.beginPath();c.rect(v.left,v.top,v.right-v.left-20,viewHeight);c.clip();
  for(const row of layout.rows){
    const y=v.top+row.y-reportScroll;if(y+52<v.top||y>v.bottom)continue;
    text(row.line,417,y,'report',row.heading?LIGHT:INK,'center');
    if(row.lord)lordSquare(row.lord,417-width(row.line,'report')/2-25,y+12);
  }
  c.restore();
  if(max>0){
    const x=v.right-13,trackTop=v.top+8,trackHeight=viewHeight-16,thumb=Math.max(35,trackHeight*viewHeight/layout.height);
    c.fillStyle='#b68b59';c.fillRect(x,trackTop,7,trackHeight);
    c.fillStyle='#704326';c.fillRect(x-2,trackTop+(trackHeight-thumb)*reportScroll/max,11,thumb);
  }
  button('report_ok','Continue',[165,1664,687,1736]);
}
function drawHistory(){
  const pages=paginateEvents(ledgerEntries(state.ledger,true).reverse(),true);
  historyScroll=Math.max(0,Math.min(historyScroll,pages.length-1));
  header('Chronicle',status());drawEventPage(pages[historyScroll]);
  if(historyScroll>0)button('history_newer','Newer',[85,1552,255,1614],'small');
  text((historyScroll+1)+' / '+pages.length,426,1556,'small',LIGHT,'center');
  if(historyScroll+1<pages.length)button('history_older','Older',[597,1552,767,1614],'small');
  button('accounts','Royal Accounts',[90,1640,500,1712],'small');button('back','Back',[530,1640,762,1712]);
}
function drawAccounts(){let p=state.lords[state.human];header('Royal Accounts',status());let rows=[['Provinces',`${state.territoryCount(state.human)} of 18`],['Treasury',`${p.treasury} gold`],['Gold earned',p.gold_earned_total],['Gold spent',p.gold_spent_total],['Monthly income',state.income(state.human)],['Vassals recruited',p.vassals_recruited_total],['Troops lost',p.troops_lost_total],['Castles built',IDS.filter(id=>state.provinces[id].owner===state.human&&state.provinces[id].secondary_castle).length],['Leadership',state.rank(state.human)]];rows.forEach(([k,v],i)=>{text(k,132,1177+i*47,'small',LIGHT);text(v,705,1177+i*47,'small',INK,'right');});text('Home '+SUMMARY(p.home_army),426,1602,'small',INK,'center');text('Field '+SUMMARY(p.campaign_army),426,1644,'small',INK,'center');button('back_history','Back to Chronicle',[165,1678,687,1750]);}
// Fit the entire royal message into a reserved area above Continue.
// Prefer normal-sized type, then compact type, then proportional scaling.
// Never truncate dialogue, including notices displayed beside a portrait.
function noticeLayout(value,areaWidth,areaHeight){
  let fallback=null;
  for(const style of ['body','small']){
    const tile=fontMetrics[style].tile[1],rows=wrap(value,style,areaWidth),step=tile+5;
    const height=tile+Math.max(0,rows.length-1)*step;
    const longest=Math.max(1,...rows.map(line=>width(line,style)));
    const scale=Math.min(1,areaHeight/height,areaWidth/longest);
    const layout={style,rows,step,height,scale};
    if(scale===1)return layout;
    if(!fallback||scale*tile>fallback.scale*fontMetrics[fallback.style].tile[1])fallback=layout;
  }
  return fallback;
}
function drawNotice(){
  header('A Royal Message',status());
  const hasPortrait=noticePortrait==='Robin Hood';
  if(hasPortrait)drawPortrait('Robin Hood',[540,1177,753,1440]);
  const x=hasPortrait?298:426,top=1180,bottom=1600,areaWidth=hasPortrait?390:650;
  const layout=noticeLayout(message,areaWidth,bottom-top);
  const y=top+(bottom-top-layout.height*layout.scale)/2;
  c.save();
  c.translate(x,y);c.scale(layout.scale,layout.scale);
  layout.rows.forEach((line,i)=>text(line,0,i*layout.step,layout.style,LIGHT,'center'));
  c.restore();
  button('notice_ok','Continue',[165,1626,687,1698]);
}
function drawInvitation(maiden){
  header(maiden?'A Saxon Lady in Peril':'A Tournament',status());
  if(maiden){
    drawPortrait(pendingMaiden,[540,1207,740,1436]);
    const paragraphs=[
      'Word comes from the house of '+SHORT[pendingMaiden]+'.',
      'Lady Catherine is held by the Normans.',
      'Wilt thou ride to her aid?'
    ];
    let y=1194;
    for(const phrase of paragraphs){
      for(const sentence of wrap(phrase,'small',380)){
        text(sentence,291,y,'small',LIGHT,'center');
        y+=52;
      }
      y+=6;
    }
  }else{
    lines(['A tournament has been called.','All the lords gather to joust.','Fame awaits the bold of heart.','Wilt thou ride in the lists?'],1220,70);
  }
  button(maiden?'maiden_yes':'tournament_yes',maiden?'Ride to her aid':'Enter Tournament',[112,1538,740,1618]);
  button(maiden?'maiden_no':'tournament_no',maiden?'Refuse the plea':'Decline Invitation',[112,1630,740,1710]);
}
function drawAi(){header('The Lords\' Turns',status());lines([aiMessage||'The other lords prepare their orders.'],1260,70,'small');}
function drawGuide(){if(guide==='off'||!['orders','conquest','transfer','move'].includes(mode))return;let target={conquest:'conquest',transfer:'transfer',plus:'transfer_right:soldiers',confirm:'transfer_confirm',move:'move'}[guide],btn=buttons.find(b=>b.key===target);let x,y;if(guide==='province'){let pt=mapInfo?.type==='random'?mapInfo.horses[guideTarget]:HORSES[guideTarget];if(!pt)return;[x,y]=pt;y-=37;}else if(btn){x=(btn.rect[0]+btn.rect[2])/2;y=btn.rect[1]-23;}else return;c.fillStyle='#ffd34f';c.strokeStyle='#5e3513';c.lineWidth=4;let dy=Math.sin(guideTicks/3)*8;c.beginPath();c.moveTo(x-18,y-35+dy);c.lineTo(x+18,y-35+dy);c.lineTo(x+18,y-10+dy);c.lineTo(x+29,y-10+dy);c.lineTo(x,y+17+dy);c.lineTo(x-29,y-10+dy);c.lineTo(x-18,y-10+dy);c.closePath();c.fill();c.stroke();}
function render(){if(!fontMetrics)return;gameCanvas.style.touchAction=mode==='report'?'none':'manipulation';buttons.length=0;c.clearRect(0,0,W,H);if(mode==='splash'){fullScreen('title_splash.png');return;}if(mode==='scene'){fullScreen(scene,sceneOverlay);return;}if(mode==='setup'){renderSetup();return;}if(mode==='upload_preview'){renderUploadPreview();return;}renderMap();switch(mode){case 'orders':drawOrders();break;case 'read':drawRead();break;case 'conquest':drawConquest();break;case 'army':drawArmy();break;case 'castle_pick':drawCastlePick();break;case 'transfer':drawTransfer();break;case 'move':drawMove();break;case 'battle':drawBattle();break;case 'passage':drawPassage();break;case 'report':drawReport();break;case 'history':drawHistory();break;case 'accounts':drawAccounts();break;case 'notice':drawNotice();break;case 'tournament_offer':drawInvitation(false);break;case 'maiden_offer':drawInvitation(true);break;case 'ai_phase':drawAi();break;}drawGuide();}
function alertText(s,back=mode,face=null){message=s;backMode=back;noticePortrait=face;mode='notice';render();}
function sceneShow(file,returnMode=mode,notice='',noticeBack=returnMode,overlay=''){scene=file;sceneReturn=returnMode;sceneNotice=notice;sceneNoticeBack=noticeBack;sceneOverlay=overlay;mode='scene';render();}
function showEnding(){
  if(state.outcome==='victory'){
    storyBegin([
      ['text','The last Norman lord has fallen! England is freed from Norman rule, and the crown is thine.'],
      ['scene','the_end.png'],
      ['text','Thy conquest is complete. A new reign begins.']
    ],'setup');
  }else if(state.outcome==='defeat'){
    sceneShow('home_castle_fallen.png','__new_campaign__','','','The End');
  }
}
function storyBegin(steps,ending='orders'){story=steps;storyEnd=ending;storyNext();}
function storyNext(){if(!story.length){if(storyEnd==='orders'){enterOrders(false);return;}mode=storyEnd;render();return;}let [kind,payload]=story.shift();if(kind==='text')alertText(payload,'__story__');else if(kind==='scene')sceneShow(payload,'__story__');else if(kind==='action'){if(payload==='union'){state.maidenUnion(pendingMaiden);pendingMaiden=null;}storyNext();}}
function enterOrders(begin=false){if(state.checkEnd()){showEnding();return;}mode='orders';selected=0;if(begin){const ally=state.maidenCandidate();if(ally){pendingMaiden=ally;mode='maiden_offer';state.tournament_pending=false;}else if(state.tournament_pending&&!state.tournament_held){mode='tournament_offer';}}render();}
function startCampaign(){let seed=(Math.random()*4294967296)>>>0;mapInfo=options.map==='upload'?acceptedUpload:options.map==='random'?randomMap(seed):null;if(options.map==='upload'&&!mapInfo)throw Error('Choose an uploaded kingdom first.');outlineCache.clear();state=new CrownState({seed,difficulty:options.difficulty,humanChoice:options.character,neighbors:mapInfo?.neighbors||ENGLAND});mode='orders';clearVisualState();reportTurn=0;reportEntries=[];historyScroll=0;reportMonth='';guide='conquest';guideTarget=0;guideTicks=0;quantity={soldiers:0,knights:0,catapults:0};wantCastle=false;pendingTarget=null;pendingMaiden=null;queue=[];summary=[];reportScroll=0;enterOrders(true);}
function costOf(){return U.reduce((n,u)=>n+quantity[u]*PRICES[u],0)+(wantCastle?20:0);}
function clearQty(){quantity={soldiers:0,knights:0,catapults:0};wantCastle=false;}
function finishTurn(msg,defer=false){
  state.checkEnd();
  summary=[SHORT[state.human]+': '+msg];
  reportTurn=state.turn;reportMonth=MONTH[state.month-1]+' '+state.year;
  queue=Object.keys(state.lords).filter(l=>l!==state.human&&state.lords[l].alive);
  state.rng.shuffle(queue);queueIndex=0;
  aiMessage='The other lords prepare their orders.';mode='ai_phase';render();
  if(!defer)setTimeout(nextAiStep,state.outcome?200:350);
}
function showFlash(id,onDone){
  flashId=id;flashVisible=true;render();let ticks=0;
  const interval=setInterval(()=>{
    if(++ticks>=6){clearInterval(interval);flashId=0;flashVisible=false;clearVisualState();render();onDone?.();return;}
    flashVisible=!flashVisible;render();
  },160);
}
function monthReportRecords(ledger,turn){
  const current=ledger.filter(r=>r.turn===turn);
  return [...current.filter(r=>r.action==='monthly_tax'),...current.filter(r=>r.action!=='monthly_tax')];
}
function finishReport(){
  reportEntries=ledgerEntries(monthReportRecords(state.ledger,reportTurn));
  mode='report';reportScroll=0;aiRunning=false;render();
}
function nextAiStep(){
  if(mode!=='ai_phase'||aiRunning)return;
  if(pendingHumanFlash){const id=pendingHumanFlash;pendingHumanFlash=0;showFlash(id,()=>setTimeout(nextAiStep,250));return;}
  if(state.outcome){finishReport();return;}
  aiRunning=true;
  const loop=()=>{
    if(mode!=='ai_phase'){aiRunning=false;return;}
    if(queueIndex>=queue.length||state.outcome){
      if(!state.outcome){
        state.randomEvent();state.advanceMonth();
        const rivalry=state.possiblyRivalry();if(rivalry)state.event('campaign_note',null,null,{text:rivalry});
        state.checkEnd();
        if(!state.outcome&&!state.tournament_held&&!state.tournament_pending&&!state.maidenCandidate()&&state.rng.random()<.10)state.tournament_pending=true;
      }
      finishReport();return;
    }
    const l=queue[queueIndex++],home=state.lords[state.human].home_province;
    if(!state.lords[l].alive){setTimeout(loop,0);return;}
    const before=captureVisualState(),offset=state.ledger.length;
    const msg=state.aiOne(l),events=state.ledger.slice(offset);
    const attack=events.find(e=>e.action==='battle'||e.action==='unopposed_capture');
    const target=attack?.province;
    if(!events.some(e=>e.action!=='transfer')&&msg)state.event('guarded',l,state.lords[l].campaign_province);
    if(target&&before.owners[target]){
      holdVisualState(before);
      aiMessage=SHORT[l]+': Attacking '+T[target][0]+'.';
      if(target===home&&before.owners[home]===state.human){
        pendingHomeAttack={attacker:l,target,won:state.provinces[home].owner===state.human};
        aiRunning=false;sceneShow('home_castle_under_attack.png','__home_attack_intro__');return;
      }
      showFlash(target,()=>{aiMessage=msg;render();setTimeout(loop,300);});
    }else{aiMessage=msg;render();setTimeout(loop,300);}
  };
  loop();
}
function resumeAi(){mode='ai_phase';render();setTimeout(nextAiStep,260);}
function afterHomeIntro(){let e=pendingHomeAttack;alertText(`${SHORT[e.attacker]} has reached ${T[e.target][0]}. Thy home castle is under attack! Man the walls and beat back the invader.`,'__home_flash__');}
function afterHomeFlash(){mode='ai_phase';render();showFlash(pendingHomeAttack.target,()=>{if(pendingHomeAttack.won)alertText('Thy men have held the castle. The invader is thrown back from thy gates.','__home_resume__');else alertText('Thy home castle has fallen. With its loss, thy cause in England is ended.','__home_defeat__');});}
function provinceAt(x,y){if(y<120||y>950||x<15||x>838)return 0;if(mapInfo?.type==='random'){let lx=Math.floor(x/4),ly=Math.floor(y/4);return mapInfo.cells[ly*mapInfo.w+lx]||0;}return englandSelectionMask?.[Math.floor(y)*W+Math.floor(x)]||0;}
function isSherwood(x,y){
  const [fx,fy]=sherwoodCenter();
  return Math.abs(x-fx)<=47&&Math.abs(y-fy)<=32;
}
function guideTap(key){
  if(guide==='off')return;
  // Keep guiding toward confirmation while the player adjusts the draft.
  if(mode==='transfer'&&key.startsWith('transfer_')&&key!=='transfer_confirm'){
    if(guide==='confirm'||(guide==='plus'&&key==='transfer_right:soldiers')){
      const r=state.castleReserve(state.human);
      const threshold=Math.min(5,r?.soldiers||0);
      guide=threshold>0&&transferDraft.soldiers>=threshold?'confirm':'plus';
      return;
    }
  }
  const expected={conquest:'conquest',transfer:'transfer',plus:'transfer_right:soldiers',confirm:'transfer_confirm',move:'move'}[guide];
  if(expected!==key){guide='off';return;}
  guide={conquest:'transfer',transfer:'plus',plus:'confirm',confirm:'move',move:'province'}[guide];
  if(guide==='province'){
    const p=state.lords[state.human];
    guideTarget=(state.neighbors[p.campaign_province]||[])
      .filter(id=>!state.provinces[id].owner)
      .sort((a,b)=>T[b][2]-T[a][2])[0]||0;
  }
}
function visitRobin(returnTo){
  if(state.robin_pending){
    sceneShow('robin_sherwood.png',returnTo,'Robin pledges aid already: My men stand ready, my lord. We shall aid thee in thy next battle.',returnTo);
    return;
  }
  try{
    state.useRobin();
    sceneShow('robin_sherwood.png',returnTo,'Robin pledges aid: My archers shall join thee, my lord, and weaken thy foes in thy next battle.',returnTo);
  }catch(e){alertText(e.message,returnTo,'Robin Hood');}
}
// A home castle always deserves Battle Orders, even when its garrison is empty.
function needsBattleOrders(game,id){
  const pr=game.provinces[id];
  return Boolean(pr.home_castle||COUNT(game.defenders(id))>0);
}
function handleClick(x,y){if(mode==='splash'){mode='setup';render();return;}if(mode==='scene'){let back=sceneReturn;if(sceneNotice){let n=sceneNotice,b=sceneNoticeBack;sceneNotice='';alertText(n,b,/Robin pledges/.test(n)?'Robin Hood':null);return;}if(back==='__story__')storyNext();else if(back==='__new_campaign__'){mode='setup';render();}else if(back==='__home_attack_intro__')afterHomeIntro();else if(back==='__resume_ai__')resumeAi();else{mode=back;render();}return;}if(mode==='ai_phase')return;
  let key=buttons.slice().reverse().find(b=>x>=b.rect[0]&&y>=b.rect[1]&&x<=b.rect[2]&&y<=b.rect[3])?.key;
  if(key){try{action(key);}catch(e){console.error(e);if(mode==='setup'||mode==='upload_preview'){uploadError=e.message;uploadBusy=false;mode='upload_preview';}else alertText(e.message);}render();if(!['ai_phase'].includes(mode))return;}
  if(mode==='setup'||mode==='upload_preview')return;
  const artworkTarget=castleHitAt(x,y)||horseHitAt(x,y);
  if(!artworkTarget&&isSherwood(x,y)){
    const returnTo=mode;
    if(mode==='read')selected=-1;
    if(['move','battle','conquest'].includes(mode))visitRobin(returnTo);
    else sceneShow('robin_sherwood.png',returnTo);
    return;
  }
  let id=artworkTarget||provinceAt(x,y);if(!id)return;
  if(mode==='read'){selected=id;render();return;}
  if(mode==='castle_pick'){selected=id;selectedCastle=id;render();return;}
  if(mode==='move'){
    let [ok,why]=state.legalMove(state.human,id);if(!ok){alertText(why,'move');return;}guide=guide==='province'&&guideTarget===id?'off':guide;
    pendingTarget=id;selected=id;attackingAlly=false;
    const pr=state.provinces[id],owner=pr.owner;
    if(owner===state.human){state.move(state.human,id);render();return;}
    if(state.friendly(state.human,owner)){mode='passage';render();return;}
    if(needsBattleOrders(state,id)){mode='battle';tactic='Stand and Fight';render();return;}
    if(owner){humanAttack(id,'Stand and Fight',true,false);return;}
    const result=state.move(state.human,id);clearVisualState();pendingHumanFlash=0;
    finishTurn(result.text);
  }
}
function action(k){if(mode==='setup'){if(k.startsWith('setup_lord:'))options.character=k.endsWith(':random')?null:k.split(':').slice(1).join(':');else if(k.startsWith('setup_difficulty:'))options.difficulty=k.split(':')[1];else if(k==='setup_map:upload'){openMapPicker();}else if(k.startsWith('setup_map:'))options.map=k.split(':')[1];else if(k==='setup_begin')startCampaign();return;}
  if(mode==='upload_preview'){if(k==='upload_back'){uploadTicket++;uploadBusy=false;mode='setup';}else if(k==='upload_another')openMapPicker();else if(k==='upload_regenerate'&&uploadLand&&!uploadBusy)generateUpload();else if(k==='upload_accept'&&uploadPreview&&!uploadBusy){acceptedUpload=uploadPreview;options.map='upload';mode='setup';}return;}
  if(k==='notice_ok'){let back=backMode;if(back==='__story__')storyNext();else if(back==='__home_flash__')afterHomeFlash();else if(back==='__home_resume__'){pendingHomeAttack=null;resumeAi();}else if(back==='__home_defeat__'){pendingHomeAttack=null;finishReport();}else{mode=back;}return;}
  if(k==='history_newer'){historyScroll=Math.max(0,historyScroll-1);return;}if(k==='history_older'){historyScroll++;return;}
  if(k==='report_ok'){if(state.outcome)showEnding();else enterOrders(true);return;}
  if(k==='tournament_yes'){state.tournament_pending=false;state.tournament_held=true;state.changeLeadership(state.human,.04);let r=state.changeRank(state.human,1);storyBegin([['scene','tournament_trumpets.png'],['text','Heralds sound their trumpets, and the lords gather before the lists.'],['scene','tournament_joust.png'],['text',`Before the assembled court, thou hast ridden with courage and won new renown. Thy leadership is now ${r}.`]]);return;}
  if(k==='tournament_no'){state.tournament_pending=false;state.tournament_held=true;state.changeLeadership(state.human,-.04);let r=state.changeRank(state.human,-1);alertText(`Thou hast declined the tournament. Thy leadership is now ${r}.`,'orders');return;}
  if(k==='maiden_yes'){let r=state.changeRank(state.human,1),ally=pendingMaiden;storyBegin([['text','By night thou dost approach the Norman stronghold. Steel must decide whether Lady Catherine shall be freed.'],['scene','maiden_swordfight.png'],['text','The Norman guards are overcome, and Lady Catherine is safely freed from the keep.'],['scene','lady_catherine.png'],['action','union'],['text',`Lady Catherine thanks thee for her rescue. The lands of ${SHORT[ally]} now stand with thine. Thirty soldiers await thee at ${T[state.lords[ally].home_province][0]} castle. Thy leadership is now ${r}.`]]);return;}
  if(k==='maiden_no'){state.maiden_rescue_done=true;state.changeLeadership(state.human,-.04);let r=state.changeRank(state.human,-1);pendingMaiden=null;alertText(`Thou hast refused the plea. Thy leadership is now ${r}.`,'orders');return;}
  if(k==='back'||k==='back_history'){if(k==='back_history')mode='history';else if(mode==='transfer'){resetTransferDraft();guideTap(k);mode='conquest';}else if(mode==='move')mode='conquest';else if(['battle','passage'].includes(mode)){mode='move';pendingTarget=null;attackingAlly=false;}else if(mode==='castle_pick')mode='army';else mode='orders';return;}
  if(k==='read'){mode='read';selected=0;return;}if(k==='conquest'){guideTap(k);mode='conquest';return;}if(k==='army'){clearQty();mode='army';return;}if(k==='end'){state.event('turn_passed',state.human,state.lords[state.human].campaign_province);finishTurn('Thy lord passed this month.');return;}if(k==='history'){historyScroll=0;mode='history';return;}if(k==='accounts'){mode='accounts';return;}
  if(mode==='transfer'&&(k.startsWith('transfer_left:')||k.startsWith('transfer_right:'))){
    const r=state.castleReserve(state.human),u=k.split(':')[1];
    if(!r||!U.includes(u))return;
    changeTransferDraft(r,state.lords[state.human].campaign_army,transferDraft,u,k.startsWith('transfer_right:')?1:-1);
    guideTap(k);return;
  }
  if(k.startsWith('minus:')||k.startsWith('plus:')){let sign=k.startsWith('plus:')?1:-1,u=k.split(':')[1];if(u==='castle'){if(sign<0)wantCastle=false;else if(state.lords[state.human].treasury>=costOf()+20)wantCastle=true;return;}let step=u==='soldiers'?5:1;if(mode==='army'){let available=state.lords[state.human].treasury-costOf();if(sign>0)quantity[u]+=Math.max(0,Math.min(step,Math.floor(available/PRICES[u])));else quantity[u]=Math.max(0,quantity[u]-step);}return;}
  if(k==='buy'){if(costOf()<=0)throw Error('Choose soldiers, knights, catapults or a castle');if(costOf()>state.lords[state.human].treasury)throw Error('Not enough gold');if(wantCastle){mode='castle_pick';selectedCastle=null;return;}completePurchase();return;}
  if(k==='build_confirm'){completePurchase();return;}
  if(k==='transfer'){guideTap(k);if(!state.transferHere(state.human))throw Error('Stand within one of thy castles to transfer troops');mode='transfer';resetTransferDraft();return;}
  if(k==='transfer_confirm'&&mode==='transfer'){confirmTransfer(state,state.human,transferDraft);guideTap(k);resetTransferDraft();mode='conquest';return;}
  if(k==='move'){guideTap(k);mode='move';selected=0;return;}
  if(k==='robin'){visitRobin('conquest');return;}
  if(k.startsWith('tactic:')){tactic=k.split(':').slice(1).join(':');return;}
  if(k==='pass_safe'){state.move(state.human,pendingTarget,'Stand and Fight',true);mode='move';selected=pendingTarget;pendingTarget=null;return;}
  if(k==='pass_attack'){attackingAlly=true;if(!needsBattleOrders(state,pendingTarget)){humanAttack(pendingTarget,'Stand and Fight',false,false);return;}mode='battle';tactic='Stand and Fight';return;}
  if(k==='fight'){humanAttack(pendingTarget,tactic,!attackingAlly,true);return;}
}
function humanAttack(id,tactic,passage,showSiege){
  const before=captureVisualState(),pr=state.provinces[id],castle=pr.home_castle||pr.secondary_castle,fac=state.lords[pr.owner]?.faction;
  const r=state.move(state.human,id,tactic,passage);
  if(before.owners[id]){holdVisualState(before);pendingHumanFlash=id;}else{clearVisualState();pendingHumanFlash=0;}
  attackingAlly=false;pendingTarget=null;selected=0;
  const scene=Boolean(pr.home_castle||(castle&&showSiege)); // Empty secondary castles retain the quick capture path.
  finishTurn(r.text,scene);if(scene)sceneShow((fac==='Norman'||(!fac&&!SAXON.includes(id)))?'norman_castle.png':'saxon_castle.png','__resume_ai__');
}
function completePurchase(){if(costOf()>state.lords[state.human].treasury)throw Error('Not enough gold');if(wantCastle){let id=selectedCastle,pr=state.provinces[id];if(!id||pr.owner!==state.human||pr.home_castle||pr.secondary_castle)throw Error('Choose an owned province without a castle');}let cost=costOf();if(COUNT(quantity))state.purchase(state.human,quantity);if(wantCastle)state.purchaseCastle(state.human,selectedCastle,true);clearQty();finishTurn(`Army purchased for ${cost} gold.`);}
function pointerPosition(ev){const r=gameCanvas.getBoundingClientRect();return [(ev.clientX-r.left)*W/r.width,(ev.clientY-r.top)*H/r.height];}
function buttonAt(x,y){return buttons.slice().reverse().find(b=>x>=b.rect[0]&&y>=b.rect[1]&&x<=b.rect[2]&&y<=b.rect[3])?.key||null;}
gameCanvas.addEventListener('pointerdown',ev=>{
  if(tapActive||mode==='ai_phase'||pressedPointer!==null||reportDrag)return;
  const [x,y]=pointerPosition(ev);
  if(reportHit(x,y)){reportDrag={id:ev.pointerId,y,scroll:reportScroll};gameCanvas.setPointerCapture?.(ev.pointerId);return;}
  pressedKey=buttonAt(x,y);pressedPointer=ev.pointerId;pressedAt=Date.now();
  if(pressedKey)render();
});
gameCanvas.addEventListener('pointermove',ev=>{
  if(!reportDrag||reportDrag.id!==ev.pointerId)return;
  if(mode!=='report'){reportDrag=null;return;}
  const [,y]=pointerPosition(ev);setReportScroll(reportDrag.scroll+reportDrag.y-y);
});
gameCanvas.addEventListener('wheel',ev=>{
  const [x,y]=pointerPosition(ev);if(!reportHit(x,y))return;
  ev.preventDefault();const r=gameCanvas.getBoundingClientRect();
  const delta=ev.deltaMode===1?ev.deltaY*18:ev.deltaMode===2?ev.deltaY*r.height:ev.deltaY;
  setReportScroll(reportScroll+delta*H/r.height);
},{passive:false});
gameCanvas.addEventListener('pointercancel',()=>{reportDrag=null;pressedKey=null;pressedPointer=null;render();});
gameCanvas.addEventListener('pointerleave',()=>{if(pressedPointer!==null){pressedKey=null;pressedPointer=null;render();}});
gameCanvas.addEventListener('pointerup',ev=>{
  if(reportDrag){if(reportDrag.id===ev.pointerId){reportDrag=null;if(gameCanvas.hasPointerCapture?.(ev.pointerId))gameCanvas.releasePointerCapture(ev.pointerId);}return;}
  if(tapActive)return;
  const [x,y]=pointerPosition(ev),key=pressedKey,wasPointer=pressedPointer;
  if(wasPointer!==null&&wasPointer!==ev.pointerId)return;
  pressedPointer=null;
  if(key&&key!==buttonAt(x,y)){pressedKey=null;render();return;}
  tapActive=true;
  // File picker must run synchronously inside the user gesture on iOS.
  const immediate=key==='setup_map:upload'||key==='upload_another';
  const execute=()=>{pressedKey=null;try{handleClick(x,y);}finally{render();setTimeout(()=>tapActive=false,45);}};
  if(immediate||!key)execute();else setTimeout(execute,Math.max(0,85-(Date.now()-pressedAt)));
});
setInterval(()=>{if(['orders','conquest','transfer','move'].includes(mode)&&guide!=='off'){guideTicks++;render();}},460);
loadAssets().then(()=>{render();}).catch(err=>{console.error(err);document.getElementById('status').textContent=err.message;alert('Unable to load Crown assets: '+err.message);});