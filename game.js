/* =========================================================
   game.js — 픽셀 아쿠아리움 게임 로직
   같은 레벨 2마리를 합치면 다음 레벨 친구가 랜덤으로!
   ========================================================= */
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const $=id=>document.getElementById(id);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const VAR_MAX=10;                 // 어항에 함께 있을 수 있는 변종 수
const CYCLE=960; // 게임 속 하루 = 16분

/* ---------------- 경제 ---------------- */
const INC=st=>0.3*Math.pow(1.47,st-1);   // 일반 물고기 1마리가 1초에 버는 코인
const SHOP=[
  {id:'tank',name:'어항 넓히기',desc:'어항 자리 +1',base:30,g:1.45,max:28},
  {id:'food',name:'먹이 통',desc:'먹이를 1개 더 모아 둘 수 있어요',base:20,g:1.5,max:20},
  {id:'regen',name:'먹이 충전',desc:'먹이가 0.5초 더 빨리 차요',base:25,g:1.55,max:12},
  {id:'feedUp',name:'먹이 업그레이드',desc:'먹이로 오는 친구가 한 단계 높아져요',base:120,g:1.9,max:44},
  {id:'jump',name:'두 단계 점프',desc:'합칠 때 2단계가 한꺼번에 오를 확률 +2%',base:60,g:1.6,max:20},
  {id:'auto',name:'자동 합치기',desc:'알아서 같은 친구끼리 합쳐 줘요 (Lv마다 1초씩 빨라짐)',base:200,g:1.6,max:20},
  {id:'autofeed',name:'자동 먹이',desc:'알아서 먹이를 줘요 (Lv마다 1초씩 빨라짐)',base:150,g:1.6,max:16},
  {id:'coin',name:'코인 부스트',desc:'버는 코인 +10%',base:100,g:1.8,max:50}
];
let BON={};
function refreshBonus(){
  BON={coin:0,slot:0,disc:0,jump:0,luck:0,up:0,feed:0,cap:0};
  for(const s of DEX) if(s.bonus&&game.owned[s.id]) for(const k in s.bonus) BON[k]+=s.bonus[k];
}
const UP=k=>game.up[k]||0;
const tankMax=()=>12+UP('tank')+BON.slot;
const foodMax=()=>5+UP('food')+BON.cap;
const regenT=()=>Math.max(1.5,8-0.5*UP('regen')-BON.feed);
const feedStage=()=>Math.min(MAX_STAGE,1+UP('feedUp'));
const jumpP=()=>Math.min(0.5,(UP('jump')*2+BON.jump)/100);
const luckP=()=>Math.min(0.3,0.04+BON.luck/100);
const upP=()=>Math.min(0.5,BON.up/100);
const coinMul=()=>1+0.1*UP('coin')+BON.coin/100;
const disc=()=>Math.min(0.5,BON.disc/100);
const autoT=()=>Math.max(6,26-UP('auto'));
const autoFeedT=()=>Math.max(4,21-UP('autofeed'));
const shopCost=it=>Math.round(it.base*Math.pow(it.g,UP(it.id))*(1-disc()));

/* ---------------- 저장 ---------------- */
const SAVE_KEY='pixel-aquarium-v4';
function fresh(){
  const code=String(Math.floor(1000+Math.random()*9000));
  return {coins:0,food:5,owned:{yellow:2},tank:[{id:'yellow'},{id:'yellow'}],up:{},stash:0,ach:{},tips:{},
    lastSeen:Date.now(),clicks:0,tama:0,code,maxStage:1};
}
function load(){
  try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)); if(s&&Array.isArray(s.tank)) return Object.assign(fresh(),s);}catch(e){}
  return fresh();
}
const game=load();
let fishes=[];
function save(){
  refreshBonus();
  game.tank=fishes.filter(f=>!f.gone).map(f=>({id:f.baseId||f.id,name:f.name||''}));
  game.lastSeen=Date.now();
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(game));}catch(e){}
}
refreshBonus();

/* ---------------- 그리기 도구 ---------------- */
function colorOf(sp,ch,c,t){
  if(sp.rainbow&&(ch==='b'||ch==='l'||ch==='f'))
    return `hsl(${Math.floor((t*90+c*24)%360)},85%,${ch==='l'?82:(ch==='f'?55:64)}%)`;
  return (sp.pal&&sp.pal[ch])||BASE[ch]||'#ff00ff';
}
function drawRows(g,sp,rows,x,y,flip,t){
  const w=rows[0].length;
  for(let r=0;r<rows.length;r++){const row=rows[r];
    for(let c=0;c<w;c++){const ch=row[c]; if(ch==='.')continue;
      g.fillStyle=colorOf(sp,ch,c,t); g.fillRect(flip?x+w-1-c:x+c,y+r,1,1);}}
}
const spriteCache=new WeakMap();
function cachedSprite(sp,fr,flip){
  let m=spriteCache.get(sp); if(!m){m={};spriteCache.set(sp,m);}
  const k=fr+(flip?'f':'');
  if(!m[k]){
    const rows=sp.frames[fr],c=document.createElement('canvas');
    c.width=rows[0].length; c.height=rows.length;
    drawRows(c.getContext('2d'),sp,rows,0,0,flip,0); m[k]=c;
  }
  return m[k];
}
function spriteCanvas(sp,sc,sil){
  const rows=sp.frames.A,w=rows[0].length,h=rows.length;
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const g=c.getContext('2d');
  for(let r=0;r<h;r++)for(let x=0;x<w;x++){const ch=rows[r][x]; if(ch==='.')continue;
    g.fillStyle=sil?'#3a3a55':colorOf(sp,ch,x,0); g.fillRect(x,r,1,1);}
  c.style.width=w*sc+'px'; c.style.height=h*sc+'px'; c.style.imageRendering='pixelated';
  return c;
}
function hexMix(a,b,t){
  const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const A=p(a),B=p(b);
  return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');
}
const COIN={pal:{o:'#a06a00',y:'#ffcf3a',Y:'#fff3a0'},frames:{A:[".ooo.","oYyyo","oYyyo","oyyyo",".ooo."]}};
const CHEST={pal:{o:'#3a2414',b:'#8a5a2b',y:'#ffcf3a'},frames:{A:["..ooooooo..",".obbbbbbbo.","obbbbbbbbbo","oyyyyyyyyyo","obbbbybbbbo","obbbbbbbbbo","obbbbbbbbbo","ooooooooooo"]}};
const HEART={pal:{x:'#ff5a7a'},frames:{A:["xx.xx","xxxxx",".xxx.","..x.."]}};
const BOAT={pal:{o:'#3a3f55',R:'#ff5a5a',w:'#ffffff',y:'#ffe14a',b:'#e8eef5'},frames:{A:[
 "..........o.........","..........oRR.......",".......ooooooo......",".......owywywo......",
 "oooooooooooooooooooo",".obbbbbbbbbbbbbbbbo.","..oooooooooooooooo.."]}};
const DUCK={pal:{y:'#ffe14a',k:'#1a1a24',O:'#ff9a2e'},frames:{A:["...yy.","...ykO","yyyyy.",".yyyy."]}};
const UFO={pal:{o:'#3a3f55',G:'#9fffe0',s:'#b8c0d0',y:'#ffe14a'},frames:{A:["...ooooo...","..oGGGGGo..","ossssssssso",".oyoyoyoyo.","..ooooooo.."]}};
const LOG={pal:{n:'#5a3a1a',N:'#8a5a2b',g:'#3bb06a'},frames:{A:["..g.g..",".NNNNN.","nNnNnNn",".nnnnn."]}};

/* ---------------- 화면 ---------------- */
const cv=$('tank'),ctx=cv.getContext('2d');
let Z=3,W=130,H=280,SKY=16,SANDY=250,bg=null,weeds=[],stars=[];
let CHX=4,CHY=0;
let coins=[],pellets=[],bubbles=[],parts=[],rain=[],events=[],props=[];

function resize(){
  const iw=innerWidth,ih=innerHeight;
  Z=Math.max(2,Math.round(Math.min(iw,ih)/135));
  W=Math.ceil(iw/Z); H=Math.ceil(ih/Z);
  cv.width=W; cv.height=H; cv.style.width=W*Z+'px'; cv.style.height=H*Z+'px';
  SKY=Math.max(16,Math.round(H*0.095));
  SANDY=H-(Math.ceil(84/Z)+4);
  CHX=4; CHY=SANDY-5;
  buildBg(); buildWeeds();
  const R=seeded(11); stars=[];
  for(let i=0;i<Math.floor(W/6);i++) stars.push({x:Math.floor(R()*W),y:1+Math.floor(R()*(SKY-4)),p:R()*6});
  for(const f of fishes){f.x=clamp(f.x,0,W-f.w); if(!f.drop&&!f.away) f.y=clamp(f.y,SKY+3,SANDY-f.h-1);}
}
function buildBg(){
  bg=document.createElement('canvas'); bg.width=W; bg.height=H;
  const g=bg.getContext('2d'),R=seeded(7);
  const bands=['#6fd6ec','#56c3e3','#43aed8','#3596c8','#2c7db6','#2667a2','#21558c'];
  const span=SANDY-SKY,bh=span/bands.length;
  for(let y=SKY;y<SANDY+4;y++){
    const yy=y-SKY,i=Math.min(bands.length-1,Math.floor(yy/bh));
    g.fillStyle=bands[i]; g.fillRect(0,y,W,1);
    if(i<bands.length-1&&yy-i*bh>bh-3){g.fillStyle=bands[i+1]; for(let x=(y%2);x<W;x+=2) g.fillRect(x,y,1,1);}
  }
  for(let x=0;x<W;x++){
    const top=SANDY+Math.round(Math.sin(x*0.15)*1.2+Math.sin(x*0.05)*1.5);
    g.fillStyle='#f3dc9e'; g.fillRect(x,top,1,2);
    g.fillStyle='#e6c987'; g.fillRect(x,top+2,1,H-top);
  }
  for(let i=0;i<W*(H-SANDY)/14;i++){
    g.fillStyle=R()<.5?'#d3b06c':'#f6e4b2';
    g.fillRect(Math.floor(R()*W),SANDY+3+Math.floor(R()*(H-SANDY)),1,1);
  }
  for(let k=0;k<3;k++){
    const rx=Math.floor(W*0.35+R()*W*0.6),rw=5+Math.floor(R()*6),rh=3+Math.floor(R()*3);
    for(let dy=-rh;dy<=0;dy++)for(let dx=-rw;dx<=rw;dx++){
      if((dx*dx)/(rw*rw)+(dy*dy)/(rh*rh)>1)continue;
      g.fillStyle=dy<-rh+2?'#a9b3c2':(dx>rw/3?'#6e7788':'#8a94a6');
      g.fillRect(rx+dx,SANDY+1+dy,1,1);
    }
  }
  const sx=Math.floor(W*0.55+R()*W*0.3),sy=SANDY+6;
  g.fillStyle='#ff8a7a';
  [[0,-2],[0,-1],[-2,0],[-1,0],[0,0],[1,0],[2,0],[-1,1],[1,1],[-2,2],[2,2]].forEach(([a,b])=>g.fillRect(sx+a,sy+b,1,1));
  const cx=Math.floor(W*0.25+R()*W*0.2);
  g.fillStyle='#ffd1dc'; g.fillRect(cx-2,SANDY+9,5,2); g.fillRect(cx-1,SANDY+8,3,1);
  g.fillStyle='#e9a2b5'; g.fillRect(cx,SANDY+8,1,3);
}
function buildWeeds(){
  const R=seeded(3); weeds=[];
  const n=Math.max(5,Math.floor(W/22));
  for(let i=0;i<n;i++) weeds.push({x:Math.floor((i+0.3+R()*0.5)*W/n),h:Math.floor((SANDY-SKY)*(0.12+R()*0.18)),ph:R()*6,
    c1:R()<.5?'#3bb06a':'#4cc47a',c2:R()<.5?'#2e8f55':'#2a7d4a'});
}

/* ---------------- 낮과 밤 ---------------- */
function dayPhase(){return (Date.now()/1000+120)%CYCLE;} // 0~600 낮, 600~660 노을, 660~900 밤, 900~960 새벽
function darkness(){const p=dayPhase(); if(p<600)return 0; if(p<660)return (p-600)/60; if(p<900)return 1; return 1-(p-900)/60;}
const isNight=()=>darkness()>0.6;

/* ---------------- 물고기 ---------------- */
function makeFish(id,o={}){
  const f={id,name:o.name||'',vx:0,vy:0,tx:0,ty:0,dir:Math.random()<.5?1:-1,ph:Math.random()*10,wt:0,
    state:'wander',cool:6+Math.random()*8,carry:0,stT:0,act:8+Math.random()*12,bubT:2+Math.random()*3,spkT:1,
    stun:0,drop:!!o.drop,link:null,lead:false,spinT:0,playT:0,charge:null,age:0};
  setSpecies(f,id);
  f.x=o.x??rand(0,W-f.w);
  f.y=o.drop?SKY-f.h-2:(o.y??rand(SKY+6,SANDY-f.h-4));
  if(f.sp.beh==='sink'&&!o.drop) f.y=SANDY-f.h;
  pickWander(f); return f;
}
function setSpecies(f,id){
  const sp=SP[id]; f.id=id; f.sp=sp;
  f.w=sp.frames.A[0].length; f.h=sp.frames.A.length;
  f.spd=(sp.custom?4:9)+Math.random()*5; if(sp.beh==='slow') f.spd=2.5;
  f.skin=null;
}
function pickWander(f){f.tx=rand(f.w/2+2,W-f.w/2-2); f.ty=rand(SKY+6+f.h/2,SANDY-f.h/2-3); f.wt=3+Math.random()*5;}
const center=f=>({x:f.x+f.w/2,y:f.y+f.h/2});
const alive=o=>fishes.includes(o)&&!o.drop&&!o.gone&&!o.away&&!o.hidden;
const mouth=f=>({x:f.dir>0?f.x+f.w:f.x-1,y:f.y+f.sp.topH+4});
const touching=(a,b,r=9)=>dist(center(a),center(b))<r;
const chainCount=()=>fishes.filter(f=>!f.gone&&f.sp.stage).length;
const varCount=()=>fishes.filter(f=>!f.gone&&!f.sp.stage).length;
const tankCount=()=>fishes.filter(f=>!f.gone).length;
const isSharp=f=>f.sp.sharp||(f.sp.beh==='puffer'&&f.puffT>0);
function inFront(src,o,len=18){
  const m=mouth(src),c=center(o);
  return (src.dir>0?c.x>m.x-2&&c.x<m.x+len:c.x<m.x+2&&c.x>m.x-len)&&Math.abs(c.y-m.y)<7;
}

/* ---- 불 · 물 ---- */
function ignite(o,src){
  const b=o.sp.beh;
  if(o.sp.flam&&!o.fireT){o.fireT=25; popText(center(o).x,o.y,'앗 뜨거!','pink'); unlock('fire');}
  if(b==='firework'&&!o.armed){o.armed=true; popText(center(o).x,o.y,'칙칙…','gold');}
  if(b==='moka'&&!(o.brewT>0)){o.brewT=20; popText(center(o).x,o.y,'보글보글','gold');}
  if(b==='cake'&&o.cakeOut){o.cakeOut=false; popText(center(o).x,o.y,'촛불 다시 켜짐');}
}
function douse(o){
  if(o.fireT>0){o.fireT=0; popText(center(o).x,o.y,'휴~'); unlock('water');}
  if(o.scrib>0){o.scrib=0;}
  if(o.sp.beh==='cake'&&!o.cakeOut){
    o.cakeOut=true; const c=center(o); popText(c.x,o.y,'🎂 생일 축하해~♪','gold');
    for(let i=0;i<3;i++) setTimeout(()=>spawnCoin(c.x-2+rand(-4,4),c.y),i*150); unlock('cake');
  }
}

/* ---- 도둑 ---- */
function thiefTarget(f,dt){
  const c=center(f);
  if(fishes.some(o=>o.id==='super'&&alive(o))&&f.state!=='hide'){f.state='hide'; f.carry&&dropCarry(f);}
  switch(f.state){
    case 'hide':{
      if(!fishes.some(o=>o.id==='super'&&alive(o))){f.state='wander';f.cool=10;return null;}
      return {tx:4+f.w/2,ty:SANDY-f.h/2-2,boost:1.8};}
    case 'wander':{
      f.cool-=dt; if(f.cool>0) return null;
      let best=null,bd=1e9;
      for(const k of coins){if(k.dead)continue; const d=dist(k,c); if(d<bd){bd=d;best=k;}}
      if(best){f.state='chase';f.tgt=best;f.stT=14;return null;}
      const pig=fishes.filter(o=>o.sp.beh==='piggy'&&alive(o));
      if(pig.length){f.state='sneak';f.vic=pick(pig);f.stT=16;} else f.cool=10;
      return null;}
    case 'chase':{
      f.stT-=dt;
      if(f.tgt.dead||f.stT<0){f.state='wander';f.cool=5;return null;}
      const tx=f.tgt.x+2.5,ty=f.tgt.y+2.5;
      if(Math.abs(tx-c.x)<5&&Math.abs(ty-c.y)<f.h/2+3){
        f.tgt.dead=true; f.carry=f.tgt.v; f.state='carry'; f.stT=5+Math.random()*4;
        popText(c.x,f.y,'슬쩍!'); unlock('steal');
      }
      return {tx,ty,boost:1.9};}
    case 'sneak':{
      f.stT-=dt;
      if(!alive(f.vic)||f.stT<0){f.state='wander';f.cool=10;return null;}
      const v=center(f.vic);
      if(dist(v,c)<9){
        f.carry=coinValue(); f.state='carry'; f.stT=5+Math.random()*4;
        popText(c.x,f.y,'히히'); popText(v.x,f.vic.y,'짤랑!','pink'); unlock('steal');
      }
      return {tx:v.x,ty:v.y,boost:1.6};}
    case 'carry':{
      f.stT-=dt;
      if(f.stT<=0){const ar=fishes.find(o=>o.sp.beh==='arcade'&&alive(o)&&o.playT<=0); f.state=ar?'arcade':'stash'; f.arc=ar;}
      return {wander:true,boost:1.5};}
    case 'arcade':{
      if(!alive(f.arc)||f.arc.playT>0){f.state='stash';return null;}
      const a=center(f.arc);
      if(dist(a,c)<9){
        f.arc.playT=2.6; f.arc.pay=f.carry; f.carry=0; f.state='wander'; f.cool=18+Math.random()*12;
        popText(a.x,f.arc.y,'띠리링♪','gold');
      }
      return {tx:a.x,ty:a.y,boost:1.5};}
    case 'stash':{
      const tx=CHX+5,ty=CHY-f.h/2;
      if(Math.abs(tx-c.x)<5&&Math.abs(ty-c.y)<6){
        game.stash+=f.carry; f.carry=0; f.state='wander'; f.cool=20+Math.random()*15;
        popText(c.x,f.y,'쏙~'); save();
      }
      return {tx,ty,boost:1.5};}
  }
  return null;
}
function dropCarry(f){const c=center(f); spawnCoin(c.x-2,c.y,f.carry); f.carry=0;}
function arcadePayout(a){
  const c=center(a),r=Math.random(),v=a.pay||coinValue();
  if(r<0.3){popText(c.x,a.y,'꽝!','pink');return;}
  const n=r<0.88?2:5;
  for(let i=0;i<n;i++) setTimeout(()=>{if(alive(a)){const cc=center(a);spawnCoin(cc.x-2+rand(-3,3),cc.y,v);}},i*180);
  if(n===5){popText(c.x,a.y,'잭팟!!','gold'); unlock('jackpot');} else popText(c.x,a.y,'당첨!','gold');
}

/* ---- 매 프레임 물고기 ---- */
function updateFish(f,dt,t){
  const sp=f.sp,b=sp.beh;
  if(f.held) return;
  f.age+=dt;
  if(f.gone){f.y-=14*dt; f.alpha=Math.max(0,(f.alpha??1)-dt*0.4); return;}
  if(f.away){f.awayT-=dt; if(f.awayT<=0){f.away=false; f.drop=true; f.y=SKY-f.h-2; f.x=rand(4,W-f.w-4); popText(W/2,SKY+4,(f.name||sp.name)+' 귀가!');} return;}
  if(f.drop){f.y+=48*dt; if(f.y>SKY+1){f.drop=false; splash(f.x+f.w/2);} return;}
  if(f.hidden){f.hideT-=dt; if(f.hideT<=0) reveal(f,false); return;}
  // 타이머들
  if(f.fireT>0){f.fireT-=dt; if(Math.random()<dt*12) parts.push({k:'fire',x:f.x+rand(4,f.w-3),y:f.y+sp.topH,life:0.5});
    if(rainT>0) douse(f);}
  if(f.inkT>0) f.inkT-=dt;
  if(f.scrib>0) f.scrib-=dt;
  if(f.puffT>0) f.puffT-=dt;
  if(f.popT>0){f.popT-=dt; if(f.popT<=0&&f.id==='popped'){setSpecies(f,'balloon'); popText(center(f).x,f.y,'다시 빵빵!');}}
  if(f.copyT>0){f.copyT-=dt; if(f.copyT<=0) f.copyPal=null;}
  if(f.stun>0){
    f.stun-=dt; const k=Math.pow(0.15,dt); f.vx*=k; f.vy*=k;
    f.x=clamp(f.x+f.vx*dt,0,W-f.w); f.y=clamp(f.y+f.vy*dt,SKY+3,SANDY-f.h-1);
    return;
  }
  if(b==='sink'){ // 바닥에 가라앉아요
    f.vx*=0.9; f.y=Math.min(SANDY-f.h,f.y+20*dt); f.x=clamp(f.x+f.vx*dt,0,W-f.w); return;
  }
  // 자석 (따라붙은 쪽)
  if(f.link&&!f.lead){
    const L=f.link;
    if(!alive(L)){f.link=null;}
    else{
      const lc=center(L);
      if(f.spinT>0){f.spinT-=dt; const a=t*7; f.x=lc.x+Math.cos(a)*8-f.w/2; f.y=lc.y+Math.sin(a)*4-f.h/2;}
      else{f.dir=L.dir; f.x=L.dir>0?L.x-f.w+3:L.x+L.w-3; f.y=L.y+1;}
      f.x=clamp(f.x,0,W-f.w); f.y=clamp(f.y,SKY+3,SANDY-f.h-1);
      return;
    }
  }
  if(f.link&&f.lead&&!alive(f.link)){f.link=null;f.lead=false;}
  // 헬리콥터: 날아갔다가 돌아와요
  if(b==='heli'&&f.state==='fly'){
    f.y-=22*dt; f.x+=Math.sin(t*3)*0.3;
    if(f.y<-f.h-2){f.away=true; f.awayT=60+Math.random()*60; f.state='wander'; unlock('escape'); save();}
    return;
  }
  // 아프로: 밤에 디스코볼 근처에서 춤
  if(b==='afro'&&isNight()&&fishes.some(o=>o.sp.beh==='disco'&&alive(o)&&touching(o,f,40))){
    f.vx*=0.9; f.vy*=0.9; if(Math.floor(t*4)%2) f.dir=-f.dir; f.dir=Math.floor(t*4)%2?1:-1;
    if(Math.random()<dt*0.5) parts.push({k:'note',x:center(f).x,y:f.y,life:1});
    return;
  }

  const c=center(f);
  let tgt=null,boost=1,busy=false;

  if(b==='thief'){const r=thiefTarget(f,dt); if(r){boost=r.boost; busy=true; if(!r.wander) tgt={x:r.tx,y:r.ty};}}
  if(b==='bull'){
    if(f.charge){
      const r=f.charge;
      if(!alive(r)) f.charge=null;
      else{
        f.chT-=dt; const rc=center(r);
        if(dist(rc,c)<9){
          r.vx=(rc.x>=c.x?1:-1)*48; r.vy=-22; r.stun=1.3;
          f.vx*=-0.3; f.charge=null; f.cool=20+Math.random()*12;
          popText(rc.x,r.y,'쾅!'); unlock('bull');
        } else if(f.chT<0){f.charge=null; f.cool=12;}
        else {tgt=rc; boost=3.2; busy=true;}
      }
    } else {
      f.cool-=dt;
      if(f.cool<=0){
        let best=null,bd=75;
        for(const o of fishes) if((o.id==='red'||o.id==='ruby')&&alive(o)){const d=dist(center(o),c); if(d<bd){bd=d;best=o;}}
        if(best){f.charge=best; f.chT=5; popText(c.x,f.y,'!!','pink');} else f.cool=5;
      }
    }
  }
  if(sp.magnet){
    const opp=sp.magnet==='N'?'S':'N';
    if(!f.link){
      let best=null,bd=48;
      for(const o of fishes) if(o!==f&&o.sp.magnet===opp&&!o.link&&alive(o)){const d=dist(center(o),c); if(d<bd){bd=d;best=o;}}
      if(best){
        tgt=center(best); boost=1.4; busy=true;
        if(bd<10){
          const N=sp.magnet==='N'?f:best,S=N===f?best:f;
          N.link=S; S.link=N; N.lead=true; S.lead=false; S.spinT=2.2;
          popText(c.x,f.y,'착!'); unlock('magnet');
        }
      }
    }
    for(const o of fishes) if(o!==f&&o.sp.magnet===sp.magnet&&alive(o)){
      const oc=center(o),d=dist(oc,c)||1;
      if(d<16){f.vx+=(c.x-oc.x)/d*40*dt; f.vy+=(c.y-oc.y)/d*25*dt;}
    }
  }
  if(sp.slime){
    let best=null,bd=55;
    for(const o of fishes) if(o!==f&&o.sp.slime&&alive(o)&&![...o.sp.slime].some(ch=>sp.slime.includes(ch))){
      const d=dist(center(o),c); if(d<bd){bd=d;best=o;}
    }
    if(best){tgt=center(best); boost=1.3; busy=true; if(bd<9){mergeSlime(f,best); return;}}
  }
  if(b==='bee'){
    const pot=fishes.find(o=>o.id==='bloomed'&&alive(o));
    if(pot){const pc=center(pot); tgt={x:pc.x+Math.cos(t*2)*12,y:pot.y-4+Math.sin(t*2)*5}; boost=1.5; busy=true;
      if(!f.beeDone&&dist(pc,c)<16){f.beeDone=true; unlock('bee');}}
  }
  if(!tgt&&!busy&&!sp.custom&&pellets.length){
    let best=null,bd=1e9;
    for(const p of pellets){const d=dist(p,c); if(d<bd){bd=d;best=p;}}
    if(best){
      tgt=best; boost=2.2;
      if(Math.abs(best.x-c.x)<4&&Math.abs(best.y-c.y)<f.h/2+2){
        pellets.splice(pellets.indexOf(best),1);
        parts.push({k:'heart',x:c.x-2,y:f.y-4,life:1.2});
      }
    }
  }
  if(f.dashT>0){f.dashT-=dt; boost*=3.5;}
  if(!tgt){
    f.wt-=dt;
    if(f.wt<=0||Math.hypot(f.tx-c.x,f.ty-c.y)<3) pickWander(f);
    tgt={x:f.tx,y:f.ty};
  }
  const dx=tgt.x-c.x,dy=tgt.y-c.y,d=Math.hypot(dx,dy)||1;
  let dvx=dx/d*f.spd*boost,dvy=dy/d*f.spd*boost*0.7;
  if(d<1.5){dvx=0;dvy=0;}
  const k=Math.min(1,dt*1.8);
  f.vx+=(dvx-f.vx)*k; f.vy+=(dvy-f.vy)*k;
  f.x=clamp(f.x+f.vx*dt,0,W-f.w); f.y=clamp(f.y+f.vy*dt,SKY+3,SANDY-f.h-1);
  if(f.vx>0.8)f.dir=1; else if(f.vx<-0.8)f.dir=-1;

  specialTick(f,dt,t,c);
}

/* ---- 특수 행동들 ---- */
function specialTick(f,dt,t,c){
  const sp=f.sp,b=sp.beh;
  f.act-=dt;
  const ready=f.act<=0;
  const others=()=>fishes.filter(o=>o!==f&&alive(o));
  if(sp.sparkle){f.spkT-=dt; if(f.spkT<=0){f.spkT=(isNight()?0.25:0.6)+Math.random()*0.8;
    parts.push({k:'spark',x:f.x+rand(2,f.w-2),y:f.y+rand(sp.topH,f.h),life:0.7});}}
  if(b==='tears'&&Math.random()<dt*0.8){const m=mouth(f); parts.push({k:'tear',x:f.dir>0?f.x+10:f.x+f.w-11,y:f.y+sp.topH+5,life:0.8});}
  if(b==='heli'&&ready){f.act=70+Math.random()*80; if(Math.random()<0.5){f.state='fly'; popText(c.x,f.y,'부웅~');}}
  if(b==='dash'&&ready){f.act=15+Math.random()*15; f.dashT=1.2; popText(c.x,f.y,sp.say||'쌩!');}
  if(b==='dragon'&&ready){
    f.act=14+Math.random()*10; const m=mouth(f);
    for(let i=0;i<14;i++) parts.push({k:'fire',x:m.x,y:m.y,vx:f.dir*rand(18,34),vy:rand(-6,6),life:0.7});
    for(const o of others()) if(inFront(f,o,20)) ignite(o,f);
  }
  if(b==='water'&&ready){
    f.act=14+Math.random()*12; const m=mouth(f);
    for(let i=0;i<12;i++) parts.push({k:'water',x:m.x,y:m.y,vx:f.dir*rand(22,38),vy:rand(-4,4),life:0.6});
    for(const o of others()) if(inFront(f,o,20)){o.vx+=f.dir*30; o.stun=0.6; douse(o);}
    f.vx-=f.dir*20; f.stun=0.4;
  }
  if((b==='hot'||b==='dragon'||b==='hot')&&Math.random()<dt*4) for(const o of others()) if(touching(f,o)) ignite(o,f);
  if(b==='hot'&&Math.random()<dt*2) parts.push({k:'fire',x:f.x+rand(3,f.w-3),y:f.y+sp.topH,life:0.4});
  if(f.fireT>0&&Math.random()<dt*2) for(const o of others()) if(touching(f,o)) ignite(o,f);
  if(b==='chameleon') for(const o of others()) if(touching(f,o)&&!o.sp.custom&&o.sp.beh!=='chameleon'){f.copyPal={b:o.sp.pal.b,l:o.sp.pal.l,f:o.sp.pal.f}; f.copyT=40; break;}
  if(b==='juice') for(const o of others()) if(o.sp.fruit&&touching(f,o)&&f.juiceOf!==o.id){f.juiceOf=o.id; f.copyPal={b:o.sp.fruit}; f.copyT=1e9; popText(c.x,f.y,o.sp.name+' 맛!','pink'); unlock('juice');}
  if(b==='puffer'&&!(f.puffT>0)&&(f.pcool=(f.pcool||0)-dt)<=0)
    for(const o of others()) if(touching(f,o)){f.puffT=3; f.pcool=8; popText(c.x,f.y,'폭!');
      for(const q of others()) if(touching(f,q,16)){const qc=center(q),d=dist(qc,c)||1; q.vx+=(qc.x-c.x)/d*40; q.vy+=(qc.y-c.y)/d*25; q.stun=0.6;} break;}
  if(isSharp(f)) for(const o of others()) if(touching(f,o)) pierce(o,f);
  if(b==='matry'&&!f.sisDone&&f.age>100+(f.ph*8)&&varCount()<VAR_MAX){
    f.sisDone=true; const {f:s,isNew}=addFish(sp.sis,{x:c.x,drop:false,y:f.y}); s.x=clamp(c.x,0,W-s.w);
    popText(c.x,f.y,'뽁!','gold'); if(isNew) toast(`새 친구! ${SP[sp.sis].name} ✨`);
  }
  if(b==='ninja'&&ready){f.act=60+Math.random()*60; hideNinja(f);}
  if(b==='pot'&&f.id==='flowerpot'&&rainT>0){setSpecies(f,'bloomed'); f.baseId='flowerpot'; popText(c.x,f.y,'방긋!','pink'); unlock('bloom');}
  if(b==='firework'&&f.armed&&isNight()){f.armed=false; launchFirework(c.x); unlock('fireworks');}
  if(b==='spark'&&Math.random()<dt*1.5) parts.push({k:'zap',x:c.x+rand(-3,3),y:f.y+rand(0,3),life:0.25});
  if(b==='ink'&&ready){f.act=18+Math.random()*14; const m=mouth(f);
    for(let i=0;i<10;i++) parts.push({k:'ink',x:m.x,y:m.y,vx:f.dir*rand(10,24),vy:rand(-5,5),life:0.9});
    for(const o of others()) if(inFront(f,o,18)){o.inkT=15; popText(center(o).x,o.y,'앗 까매!','pink'); unlock('ink');}}
  if(b==='scribble') for(const o of others()) if(touching(f,o)&&!(o.scrib>0)){o.scrib=60; popText(center(o).x,o.y,'슥슥');}
  if(b==='punch'&&ready){f.act=12+Math.random()*10;
    for(const o of others()) if(inFront(f,o,14)){o.vx+=f.dir*45; o.stun=0.8; popText(center(o).x,o.y,'퍽!'); if(o.sp.beh==='bottle') breakBottle(o); break;}}
  if(b==='mecha'&&ready){f.act=30+Math.random()*20; const m=mouth(f); props.push({k:'minibot',x:m.x,y:m.y,dir:f.dir,t:2.5}); popText(c.x,f.y,'출동!');}
  if(b==='gum'&&ready){f.act=18+Math.random()*12; f.gumT=2.2;}
  if(f.gumT>0){f.gumT-=dt; if(f.gumT<=0){const m=mouth(f); for(let i=0;i<6;i++) parts.push({k:'drop',x:m.x,y:m.y,vx:rand(-14,14),vy:rand(-14,6),life:0.5,col:'#ff8fb8'}); popText(m.x,f.y,'펑!','pink');}}
  if(b==='apple'&&f.age>180+f.ph*6){setSpecies(f,'butterfly'); f.baseId='butterfly'; game.owned.butterfly=(game.owned.butterfly||0)+1; popText(c.x,f.y,'나비가 됐어요!','pink'); toast('새 친구! 나비 사과 ✨'); save();}
  if(b==='peacock'&&ready){f.act=22+Math.random()*12; popText(c.x,f.y,'촤악!','gold'); for(let i=0;i<10;i++) parts.push({k:'spark',x:f.x+rand(0,6),y:f.y+rand(0,f.h),life:1});}
  if(b==='tick'&&ready){f.act=6; popText(c.x,f.y,'똑딱');}
  if(b==='witch'&&isNight()&&ready){f.act=25+Math.random()*15; popText(c.x,f.y,'히히히!','pink'); for(let i=0;i<8;i++) parts.push({k:'spark',x:c.x+rand(-8,8),y:c.y+rand(-6,6),life:1});}
  if(b==='tv'&&(f.tvc=(f.tvc||0)-dt)<=0) for(const o of others()) if(touching(f,o)){f.tvc=6; popText(c.x,f.y,pick(['(^o^)','(-_-)','(ㅠㅠ)','(*ㅁ*)','(>_<)']));break;}
  if(f.brewT>0){f.brewT-=dt; if(Math.random()<dt*4) bubbles.push({x:c.x,y:f.y,r:2,vy:-rand(8,12),ph:0});}
  if(sp.say&&!b&&Math.random()<dt*0.01) popText(c.x,f.y,sp.say);
  if(f.id==='nerd'&&isNight()&&fishes.some(o=>o.sp.beh==='thief'&&alive(o))){
    f.baseId='nerd'; setSpecies(f,'super'); game.owned.super=(game.owned.super||0)+1;
    popText(c.x,f.y,'변신!','gold'); toast('너드가 슈퍼 너드로 변신했어요! 🦸'); unlock('super'); save();
  }
  if(f.id==='super'&&!isNight()&&f.baseId==='nerd'){setSpecies(f,'nerd'); popText(c.x,f.y,'휴, 출근해야지');}
  if(b==='arcade'&&f.playT>0){f.playT-=dt; if(f.playT<=0&&f.pay){arcadePayout(f); f.pay=0;}}
  if(f.id==='cow'&&isNight()&&!events.some(e=>e.k==='ufo')&&Math.random()<dt/90&&tankCount()>=4) startUfo(f);
}
function pierce(o,src){
  const c=center(o),b=o.sp.beh;
  if(b==='balloon'){setSpecies(o,'popped'); o.baseId='balloon'; o.popT=60; popText(c.x,o.y,'펑!','pink'); unlock('pop');}
  else if(b==='flamballoon'&&!(o.popT>0)){o.popT=60; popText(c.x,o.y,'풍선이… 흑흑','pink'); for(let i=0;i<5;i++) parts.push({k:'tear',x:c.x,y:o.y+3,life:0.8});}
  else if(b==='pinata'&&!(o.pinT>0)){o.pinT=1; setTimeout(()=>o.pinT=0,60000); popText(c.x,o.y,'와르르!','gold'); for(let i=0;i<3;i++) setTimeout(()=>spawnCoin(c.x-2+rand(-5,5),c.y),i*150); unlock('pinata');}
}
function breakBottle(o){
  const c=center(o); popText(c.x,o.y,'쨍그랑!','pink');
  for(let i=0;i<8;i++) parts.push({k:'drop',x:c.x,y:c.y,vx:rand(-20,20),vy:rand(-20,5),life:0.6,col:'#bfe8e0'});
  setSpecies(o,'ship'); o.baseId=null; game.owned.ship=(game.owned.ship||0)+1; toast('새 친구! 병 속의 배 ✨'); unlock('sail'); save();
}
function hideNinja(f){
  f.hidden=true; f.hideT=30; f.hidePos=center(f);
  props.push({k:'log',x:Math.round(f.x+f.w/2-3),y:Math.round(f.y+f.h/2-2),t:4});
  const wd=pick(weeds); if(wd){f.x=clamp(wd.x-f.w/2,0,W-f.w); f.y=SANDY-f.h-2;}
  popText(f.hidePos.x,f.hidePos.y-6,'펑!');
}
function reveal(f,found){
  f.hidden=false; const c=center(f);
  popText(c.x,f.y,found?'들켰다…!':'짠!');
  if(found) unlock('ninja');
}
function launchFirework(x){
  popText(x,SKY+4,'피융~','gold');
  setTimeout(()=>{
    const cx=rand(W*0.2,W*0.8),cy=rand(3,SKY-3),col=`hsl(${Math.floor(Math.random()*360)},90%,65%)`;
    for(let i=0;i<24;i++){const a=i/24*Math.PI*2; parts.push({k:'fw',x:cx,y:cy,vx:Math.cos(a)*rand(14,24),vy:Math.sin(a)*rand(8,16),life:1.2,col});}
  },800);
}
function mergeSlime(a,b){
  const set=[...new Set((a.sp.slime+b.sp.slime).split(''))].sort((x,y)=>'RYB'.indexOf(x)-'RYB'.indexOf(y)).join('');
  const id=set==='RYB'?'kingslime':'slime'+set; if(!SP[id]) return;
  fishes.splice(fishes.indexOf(b),1);
  const c=center(a); setSpecies(a,id); a.baseId=null;
  a.x=clamp(c.x-a.w/2,0,W-a.w); a.y=clamp(c.y-a.h/2,SKY+3,SANDY-a.h-1);
  popText(c.x,a.y,'뿅!');
  for(let i=0;i<6;i++) parts.push({k:'spark',x:c.x+rand(-6,6),y:c.y+rand(-5,5),life:0.8});
  const isNew=!game.owned[id]; game.owned[id]=(game.owned[id]||0)+1;
  if(id==='kingslime'){unlock('slime'); if(isNew) showReveal(SP[id],true);}
  save();
}
function skinOf(f){
  if(f.inkT>0){if(!f._ink||f._ink.base!==f.sp) f._ink={base:f.sp,sp:Object.assign({},f.sp,{pal:Object.assign({},f.sp.pal,{b:'#2a2a3a',l:'#3a3a4a',f:'#1a1a2a'}),rainbow:false})}; return f._ink.sp;}
  if(f.copyPal){const key=f.sp.id+JSON.stringify(f.copyPal); if(!f._cp||f._cp.key!==key) f._cp={key,sp:Object.assign({},f.sp,{pal:Object.assign({},f.sp.pal,f.copyPal),rainbow:false})}; return f._cp.sp;}
  return f.sp;
}
function drawFish(f,t){
  if(f.hidden||f.away) return;
  const sp=skinOf(f),fr=(Math.floor(t*(sp.custom?2:5)+f.ph)%2)?'B':'A';
  const x=Math.round(f.x),y=Math.round(f.y+(f.sp.id==='jelly'?Math.sin(t*2+f.ph)*1.5:0));
  const flip=!sp.custom&&f.dir<0;
  let a=1;
  if(f.gone) a=f.alpha??1;
  else if(sp.beh==='ghost') a=0.22;
  else if(sp.beh==='holo') a=Math.random()<0.1?0.3:0.75;
  else if(sp.slime) a=0.9;
  ctx.globalAlpha=a;
  if(sp.rainbow) drawRows(ctx,sp,sp.frames[fr],x,y,flip,t);
  else ctx.drawImage(cachedSprite(sp,fr,flip),x,y);
  if(f.puffT>0){
    ctx.fillStyle='#c8a850';
    for(const [px,py] of [[-1,4],[f.w,4],[4,-1],[8,-1],[4,f.h],[8,f.h],[1,1],[f.w-2,1],[1,f.h-2],[f.w-2,f.h-2]]) ctx.fillRect(x+px,y+py,1,1);
  }
  if(f.scrib>0){ctx.fillStyle='#3a6fe0'; const R=seeded(Math.floor(f.ph*1000)); for(let i=0;i<6;i++) ctx.fillRect(x+4+Math.floor(R()*8),y+sp.topH+1+Math.floor(R()*5),1,1);}
  if(f.gumT>0){const m=mouth(f),r=Math.round((2.2-f.gumT)*2); ctx.fillStyle='#ff8fb8'; ctx.fillRect(Math.round(m.x)-(f.dir<0?r:0),Math.round(m.y)-r/2,r+1,r+1);}
  ctx.globalAlpha=1;
  if(f.carry){
    const mx=flip?x-2:x+f.w-1,my=y+sp.topH+4;
    ctx.fillStyle='#ffcf3a'; ctx.fillRect(mx,my,3,3);
    ctx.fillStyle='#fff3a0'; ctx.fillRect(mx,my,1,1);
    ctx.fillStyle='#b87a0c'; ctx.fillRect(mx+2,my+2,1,1);
  }
}
function drawGlow(f,t,dk){
  if(f.hidden||f.away||f.gone) return;
  const sp=f.sp,x=Math.round(f.x),y=Math.round(f.y),flip=f.dir<0,cx=x+f.w/2,cy=y+sp.topH+4;
  const ell=(rx,ry,a,col)=>{ctx.fillStyle=col; ctx.globalAlpha=a; for(let dy=-ry;dy<=ry;dy++){const hw=Math.round(rx*Math.sqrt(1-(dy*dy)/(ry*ry))); ctx.fillRect(cx-hw,cy+dy,hw*2,1);}};
  if(sp.glow&&dk>0.2){ell(11,7,0.10*dk,sp.glow); ell(8,5,0.14*dk,sp.glow); ctx.globalAlpha=0.5*dk; ctx.drawImage(cachedSprite(sp,'A',flip),x,y);}
  if(sp.beh==='disco'&&dk>0.3){
    for(let i=0;i<8;i++){
      const a=t*1.5+i*Math.PI/4,r=11+4*Math.sin(t*2+i);
      ctx.globalAlpha=0.75*dk; ctx.fillStyle=`hsl(${(i*45+t*80)%360},90%,65%)`;
      ctx.fillRect(Math.round(cx+Math.cos(a)*r*1.5),Math.round(cy+Math.sin(a)*r*0.8),2,1);
    }
  }
  if(sp.lights&&dk>0.3){ctx.fillStyle='#fff6a0'; ctx.globalAlpha=0.25*dk; const m=mouth(f); for(let i=0;i<12;i++) ctx.fillRect(Math.round(m.x+f.dir*i),Math.round(m.y-i/4),1,Math.ceil(i/2)+1);}
  if(sp.beh==='arcade'&&(f.playT>0||dk>0.5)){
    const rows=sp.frames.A,w=rows[0].length;
    for(let r=0;r<rows.length;r++)for(let c=0;c<w;c++){
      const ch=rows[r][c]; if(ch!=='s'&&!(ch==='K'&&f.playT>0&&r<sp.topH+5&&c>=8))continue;
      ctx.globalAlpha=1; ctx.fillStyle=f.playT>0?`hsl(${(t*400+c*40+r*60)%360},90%,60%)`:'#6fffb0';
      ctx.fillRect(flip?x+w-1-c:x+c,y+r,1,1);
    }
  }
  if(sp.beh==='cake'&&!f.cakeOut){const fx=x+(flip?f.w-1-8:8); ctx.globalAlpha=0.8+0.2*Math.sin(t*12); ctx.fillStyle='#ffb040'; ctx.fillRect(fx,y-1,1,1); ctx.globalAlpha=0.25*Math.max(dk,0.3); ctx.fillRect(fx-2,y-3,5,4);}
  ctx.globalAlpha=1;
}

/* ---------------- 동전 · 먹이 · 물보라 ---------------- */
const coinValue=()=>Math.max(5,Math.round(incomeRate()*6));
function spawnCoin(x,y,v){coins.push({x,y,vy:14,restY:SANDY-3+Math.floor(Math.random()*3),v:v||coinValue(),dead:false});}
function feed(x,y){
  if(pellets.length>30)return;
  for(let i=0;i<3;i++) pellets.push({x:x+rand(-3,3),y:y+rand(-1,1),vy:rand(7,10),ph:Math.random()*6,life:10});
}
function splash(x){for(let i=0;i<7;i++) parts.push({k:'drop',x,y:SKY,vx:rand(-14,14),vy:rand(-26,-12),life:0.6});}

/* ---------------- 부르기 · 합치기 ---------------- */
function addFish(id,opt={}){
  const f=makeFish(id,Object.assign({drop:true,x:rand(4,W-20)},opt));
  fishes.push(f);
  const isNew=!game.owned[id];
  game.owned[id]=(game.owned[id]||0)+1;
  checkCounts(); save();
  return {f,isNew};
}
function feedOne(auto){
  if(game.food<1){if(!auto) toast('먹이가 충전 중이에요 🍤');return;}
  if(chainCount()>=tankMax()){if(!auto) toast('어항이 꽉 찼어요. 같은 친구끼리 합쳐 보세요!');return;}
  game.food-=1;
  let st=feedStage(); if(Math.random()<upP()) st=Math.min(MAX_STAGE,st+1);
  const id=pick(STAGE_IDS[st]);
  const {f,isNew}=addFish(id);
  setTimeout(()=>popText(f.x+f.w/2,SKY+2,isNew?'NEW!':'퐁당!',isNew?'gold':''),400);
  if(isNew&&st>1) toast(`새 친구! ${SP[id].name} ✨`);
  updateHud();
}
$('sumBtn').onclick=()=>feedOne(false);
function mergeFish(a,b,auto){
  const st=a.sp.stage;
  if(st>=MAX_STAGE){toast('마지막 단계예요! 두 번째 바다는 곧 열려요 🌊');return;}
  const c=center(b);
  for(const o of [a,b]){
    if(o.carry) dropCarry(o);
    fishes.splice(fishes.indexOf(o),1);
  }
  let ns=st+1,jumped=false;
  if(ns<MAX_STAGE&&Math.random()<jumpP()){ns++; jumped=true;}
  const id=pick(STAGE_IDS[ns]),sp=SP[id];
  const isNew=!game.owned[id];
  game.owned[id]=(game.owned[id]||0)+1;
  const f=makeFish(id,{});
  f.x=clamp(c.x-f.w/2,0,W-f.w); f.y=clamp(c.y-f.h/2,SKY+3,SANDY-f.h-1);
  fishes.push(f);
  for(let i=0;i<12;i++) parts.push({k:'spark',x:c.x+rand(-8,8),y:c.y+rand(-6,6),life:0.6+Math.random()*0.5});
  parts.push({k:'heart',x:c.x-2,y:c.y-10,life:1.2});
  popText(c.x,c.y-6,jumped?'두 단계 점프!':auto?'쪽!':'뿅!','gold');
  unlock('merge'); if(jumped) unlock('jump');
  if(ns>game.maxStage) game.maxStage=ns;
  if(ns>=10) unlock('s10'); if(ns>=30) unlock('s30'); if(ns>=MAX_STAGE) unlock('s60');
  // 변종이 튀어나올 수도!
  if(Math.random()<luckP()) setTimeout(()=>spawnVariant(c.x),500);
  checkCounts(); save(); updateHud();
  if(isNew) showReveal(sp,true);
}
function spawnVariant(x){
  const un=VAR_POOL.filter(s=>!game.owned[s.id]);
  const sp=un.length&&Math.random()<0.75?pick(un):pick(VAR_POOL);
  const isNew=!game.owned[sp.id];
  if(varCount()<VAR_MAX){const {f}=addFish(sp.id,{x:clamp(x-7,0,W-14)}); setTimeout(()=>popText(f.x+f.w/2,SKY+2,'변종 등장!','gold'),400);}
  else{game.owned[sp.id]=(game.owned[sp.id]||0)+1; toast(`변종 ${sp.name}을(를) 만났어요! (어항이 붐벼서 도감에 보관)`,2800);}
  refreshBonus(); unlock('var1');
  if(DEX_VAR.filter(s=>game.owned[s.id]).length>=10) unlock('var10');
  save();
  if(isNew) showReveal(sp,true);
}
function autoMergeOnce(){
  const by={};
  for(const f of fishes) if(alive(f)&&f.sp.stage&&f.sp.stage<MAX_STAGE&&!f.held) (by[f.id]=by[f.id]||[]).push(f);
  const id=Object.keys(by).filter(k=>by[k].length>=2).sort((a,b)=>SP[a].stage-SP[b].stage)[0];
  if(!id) return;
  const [a,b]=by[id];
  mergeFish(a,b,true);
}
const kindLabel=sp=>sp.stage?'일반 바다':sp.secret?'비밀 변종':'변종';
const kindCls=sp=>sp.stage?(sp.stage<20?'r0':sp.stage<40?'r1':'r3'):sp.secret?'r3':'r2';
function bonusText(b){
  if(!b) return '';
  const T={coin:v=>`버는 코인 +${v}%`,slot:v=>`어항 자리 +${v}`,disc:v=>`상점 할인 ${v}%`,jump:v=>`두 단계 점프 +${v}%`,
    luck:v=>`변종 등장 확률 +${v}%`,up:v=>`먹이로 한 단계 위 친구가 올 확률 +${v}%`,feed:v=>`먹이 충전 ${v}초 빨라짐`,cap:v=>`먹이 통 +${v}`};
  return Object.entries(b).map(([k,v])=>T[k]?T[k](v):'').join(', ');
}
function showReveal(sp,isNew,fromDex){
  const m=$('revealModal'),body=$('revealBody');
  const st=sp.stage?Math.min(3,Math.floor((sp.stage-1)/15)):sp.secret?3:2;
  const show=()=>{
    body.innerHTML=`<div class="stage st${st}" id="stage"></div>
      <div class="${kindCls(sp)}">★ ${kindLabel(sp)} ★</div>
      <h3>${sp.name} ${isNew?'<span class="new">NEW!</span>':''}</h3>
      <p>${sp.desc}</p>
      ${sp.stage?`<p style="font-size:12px;opacity:.7">한 마리가 1초에 코인 ${fmtN2(INC(sp.stage))}개를 벌어요</p>`:''}
      ${sp.bonus?`<p class="r2" style="font-size:13px">✦ 보너스: ${bonusText(sp.bonus)}</p>`:''}
      <button class="btn primary" id="rvOk">${fromDex?'닫기':'좋아!'}</button>`;
    $('stage').appendChild(spriteCanvas(sp,8,false));
    $('rvOk').onclick=()=>m.classList.remove('open');
  };
  m.classList.add('open');
  if(fromDex){show();return;}
  body.innerHTML=`<div class="stage shake st0" id="stage"></div><p>두근두근… 누가 나올까?</p>`;
  $('stage').appendChild(spriteCanvas(sp,8,true));
  setTimeout(show,1100);
}

/* ---------------- 배경 이벤트 ---------------- */
let evT=50+Math.random()*40,rainT=0;
function startUfo(target){
  const tgt=target||pick(fishes.filter(f=>f.sp.stage&&f.sp.stage<=5&&alive(f)));
  if(!tgt) return;
  events.push({k:'ufo',tgt,x:center(tgt).x-5,y:-6,ph:'in',t:0});
}
function startEvent(){
  const night=isNight(),opts=[['boat',22],['ducks',18],['whale',20]];
  if(rainT<=0) opts.push(['rain',16]);
  if(night) opts.push(['meteor',22]);
  if(fishes.filter(f=>f.sp.stage&&f.sp.stage<=5&&alive(f)).length&&tankCount()>=5&&!events.some(e=>e.k==='ufo')) opts.push(['ufo',4]);
  let tot=opts.reduce((a,o)=>a+o[1],0),r=Math.random()*tot,k='boat';
  for(const [n,w] of opts){if(r<w){k=n;break;} r-=w;}
  const dir=Math.random()<.5?1:-1;
  if(k==='boat') events.push({k,dir,x:dir>0?-22:W+2,spd:6});
  if(k==='ducks'){events.push({k,dir,x:dir>0?-26:W+2,spd:5}); unlock('ducks');}
  if(k==='whale') events.push({k,dir,x:dir>0?-60:W+10,y:rand(SKY+20,SANDY-30),spd:5});
  if(k==='meteor'){events.push({k,x:rand(W*0.4,W),y:1,life:0.9}); unlock('star');}
  if(k==='rain'){rainT=60+Math.random()*30; unlock('rain'); toast('비가 내려요 ☔');}
  if(k==='ufo') startUfo();
}
function updateEvents(dt){
  evT-=dt; if(evT<=0){evT=70+Math.random()*90; startEvent();}
  if(rainT>0){
    rainT-=dt;
    for(let i=0;i<Math.ceil(dt*40);i++) rain.push({x:rand(0,W),y:rand(-4,SKY-2)});
    if(Math.random()<dt) for(const f of fishes){if(f.scrib>0) f.scrib=0; if(f.sp.beh==='cake'&&!f.cakeOut&&Math.random()<0.3) douse(f);}
  }
  for(const r of rain) r.y+=110*dt;
  rain=rain.filter(r=>{if(r.y>SKY+5) return false; if(r.y>SKY&&Math.random()<0.08) parts.push({k:'ripple',x:r.x,y:SKY,life:0.3}); return true;});
  for(const e of events){
    if(e.k==='boat'||e.k==='ducks'||e.k==='whale'){e.x+=e.dir*e.spd*dt; if(e.x<-80||e.x>W+80) e.done=true;}
    if(e.k==='meteor'){e.x-=70*dt; e.y+=18*dt; e.life-=dt; if(e.life<=0) e.done=true;}
    if(e.k==='ufo'){
      e.t+=dt;
      if(e.ph==='in'){e.y+=8*dt; if(e.y>=SKY-9){e.y=SKY-9; e.ph='beam'; e.t=0; toast('하늘에 뭔가가…! 🛸');}}
      else if(e.ph==='beam'){
        if(alive(e.tgt)){const f=e.tgt; f.stun=0.2; f.vx=0; f.vy=0; f.x+=((e.x+5-f.w/2)-f.x)*Math.min(1,dt*2); f.y-=18*dt;
          if(f.y<SKY+2){f.gone=true; f.alpha=1; setTimeout(()=>{const i=fishes.indexOf(f); if(i>=0)fishes.splice(i,1); save();},1500);}}
        if(e.t>4.5){e.ph='drop'; e.t=0; const {isNew}=addFish('alien',{x:e.x-2}); unlock('ufo'); if(isNew) toast('새 친구! 외계 물고기 ✨');}
      }
      else if(e.ph==='drop'){if(e.t>1.5) e.ph='out';}
      else {e.y-=14*dt; if(e.y<-10) e.done=true;}
    }
  }
  events=events.filter(e=>!e.done);
  for(const p of props){
    p.t-=dt;
    if(p.k==='minibot'){p.x+=p.dir*10*dt; if(p.t<=0){
      popText(p.x,p.y-4,'펑!','pink');
      for(let i=0;i<10;i++) parts.push({k:'fire',x:p.x,y:p.y,vx:rand(-20,20),vy:rand(-20,10),life:0.5});
      for(const f of fishes) if(alive(f)){const c=center(f),d=dist(c,p)||1; if(d<14){f.vx+=(c.x-p.x)/d*40; f.vy+=(c.y-p.y)/d*25; f.stun=0.6;}}
      unlock('boom');
    }}
  }
  props=props.filter(p=>p.t>0);
}
function drawWhales(){
  for(const e of events){if(e.k!=='whale')continue;
    ctx.fillStyle='#06203a'; ctx.globalAlpha=0.13;
    const cx=Math.round(e.x),cy=Math.round(e.y);
    for(let dy=-7;dy<=7;dy++){const hw=Math.round(24*Math.sqrt(1-(dy*dy)/49)); ctx.fillRect(cx-hw,cy+dy,hw*2,1);}
    const tx=e.dir>0?cx-26:cx+22;
    for(let i=0;i<6;i++) ctx.fillRect(e.dir>0?tx-i:tx+i,cy-i,4,i*2+1);
    ctx.globalAlpha=1;
  }
  for(const e of events){if(e.k!=='boat')continue;
    ctx.fillStyle='#06203a'; ctx.globalAlpha=0.16; ctx.fillRect(Math.round(e.x)+1,SKY+1,18,5); ctx.globalAlpha=1;}
}
function drawSky(t,dk){
  const raining=rainT>0;
  let top=hexMix('#8fd6ff','#0d1030',dk),bot=hexMix('#d8f3ff','#2a2e66',dk);
  const p=dayPhase();
  if(p>=590&&p<700){const u=1-Math.abs((p-640)/50); top=hexMix(top,'#ff9a7a',u*0.6); bot=hexMix(bot,'#ffd08a',u*0.6);}
  if(raining){top=hexMix(top,'#7a8494',0.5); bot=hexMix(bot,'#a9b3c2',0.5);}
  for(let y=0;y<SKY;y++){ctx.fillStyle=hexMix(top,bot,y/SKY); ctx.fillRect(0,y,W,1);}
  if(dk>0.2) for(const s of stars){ctx.globalAlpha=dk*(0.5+0.5*Math.sin(t*2+s.p)); ctx.fillStyle='#fff8d0'; ctx.fillRect(s.x,s.y,1,1);}
  ctx.globalAlpha=1;
  if(!raining){
    if(p<620){const sx=Math.round(p/620*(W+10))-5; ctx.fillStyle='#ffe680'; ctx.globalAlpha=1-dk; ctx.fillRect(sx,2,4,4); ctx.fillRect(sx-1,3,6,2); ctx.fillRect(sx+1,1,2,6);}
    if(p>=640&&p<920){const mx=Math.round((p-640)/280*(W+10))-5; ctx.globalAlpha=dk; ctx.fillStyle='#f4f1d0'; ctx.fillRect(mx,2,4,4); ctx.fillStyle=top; ctx.fillRect(mx+2,2,2,2);}
    ctx.globalAlpha=1;
  }
  for(const e of events){
    if(e.k==='meteor'){for(let i=0;i<7;i++){ctx.globalAlpha=Math.min(1,e.life*1.5)*(1-i/7); ctx.fillStyle='#ffffff'; ctx.fillRect(Math.round(e.x+i*2),Math.round(e.y-i*0.5),1,1);} ctx.globalAlpha=1;}
    if(e.k==='boat'){drawRows(ctx,BOAT,BOAT.frames.A,Math.round(e.x),SKY-5,e.dir<0,t);
      if(dk>0.4){ctx.fillStyle='#fff3a0'; ctx.globalAlpha=0.5*dk; ctx.fillRect(Math.round(e.x)+7,SKY-3,7,2); ctx.globalAlpha=1;}}
    if(e.k==='ducks') for(let i=0;i<3;i++){const bx=Math.round(e.x+i*9*-e.dir),by=SKY-3+Math.round(Math.sin(t*2+i)*0.6); drawRows(ctx,DUCK,DUCK.frames.A,bx,by,e.dir<0,t);}
    if(e.k==='ufo'){
      if(e.ph==='beam'||e.ph==='drop'){ctx.fillStyle='#fff6a0'; ctx.globalAlpha=0.25+0.1*Math.sin(t*10);
        const bx=Math.round(e.x); for(let y=Math.round(e.y)+5;y<SANDY;y++){const hw=2+Math.floor((y-e.y)/6); ctx.fillRect(bx+5-hw,y,hw*2+1,1);} ctx.globalAlpha=1;}
      drawRows(ctx,UFO,UFO.frames.A,Math.round(e.x),Math.round(e.y),false,t);
      if(Math.floor(t*6)%2){ctx.fillStyle='#ff5af0'; ctx.fillRect(Math.round(e.x)+5,Math.round(e.y)-1,1,1);}
    }
  }
  ctx.fillStyle='#cfefff';
  for(const r of rain) ctx.fillRect(Math.round(r.x),Math.round(r.y),1,2);
  ctx.fillStyle=hexMix('#e8fbff','#5a6aa0',dk);
  for(let x=0;x<W;x++) if((x+Math.floor(t*4))%7<4) ctx.fillRect(x,SKY,1,1);
}

/* ---------------- 메인 루프 ---------------- */
let last=performance.now(),hudT=0,saveT=0,autoTimer=20,autoFeedTimer=20;
const incomeRate=()=>fishes.reduce((a,f)=>a+(f.gone||!f.sp.stage?0:INC(f.sp.stage)),0)*coinMul();
function frame(now){
  const dt=Math.min(0.05,(now-last)/1000); last=now; const t=now/1000,dk=darkness();
  game.coins+=incomeRate()*dt;
  game.food=Math.min(foodMax(),game.food+dt/regenT());
  if(UP('autofeed')>0){autoFeedTimer-=dt; if(autoFeedTimer<=0){autoFeedTimer=autoFeedT(); feedOne(true);}}
  if(UP('auto')>0){autoTimer-=dt; if(autoTimer<=0){autoTimer=autoT(); autoMergeOnce();}}
  for(const f of [...fishes]) if(fishes.includes(f)) updateFish(f,dt,t);
  for(const k of coins) if(k.y<k.restY) k.y=Math.min(k.restY,k.y+k.vy*dt);
  coins=coins.filter(k=>!k.dead);
  for(const p of pellets){ if(p.y<SANDY+1){p.y+=p.vy*dt; p.x+=Math.sin(t*3+p.ph)*0.08;} else p.life-=dt; }
  pellets=pellets.filter(p=>p.life>0);
  for(const b of bubbles){b.y+=b.vy*dt; b.x+=Math.sin(t*4+b.ph)*0.12;}
  bubbles=bubbles.filter(b=>b.y>SKY);
  if(Math.random()<dt*0.9){const wd=pick(weeds); if(wd) bubbles.push({x:wd.x,y:SANDY,r:Math.random()<.6?1:2,vy:-rand(9,15),ph:Math.random()*6});}
  for(const p of parts){
    p.life-=dt;
    if(p.k==='heart'||p.k==='note') p.y-=8*dt;
    if(p.k==='tear'){p.y+=10*dt;}
    if(p.vx!==undefined){p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.k==='drop'||p.k==='fw') p.vy+=(p.k==='fw'?20:90)*dt; if(p.k==='fire'||p.k==='water'||p.k==='ink'){p.vx*=0.95;}}
    else if(p.k==='fire') p.y-=12*dt;
  }
  parts=parts.filter(p=>p.life>0);
  updateEvents(dt);

  // --- 물속 ---
  ctx.drawImage(bg,0,0);
  drawWhales();
  if(dk<1){
    ctx.fillStyle='#ffffff';
    for(let i=0;i<4;i++){
      ctx.globalAlpha=(0.05+0.03*Math.sin(t*0.7+i*1.7))*(1-dk)*(rainT>0?0.4:1);
      const bx=((i*W/3.3+t*2.5)%(W+60))-40,wid=5+(i%2)*4;
      for(let y=SKY;y<SANDY;y++) ctx.fillRect(Math.round(bx+(y-SKY)*0.35),y,wid,1);
    }
    ctx.globalAlpha=1;
  }
  for(const wd of weeds) for(let i=0;i<wd.h;i++){
    const off=Math.round(Math.sin(t*1.4+wd.ph+i*0.3)*(i/wd.h)*2.5);
    ctx.fillStyle=(Math.floor(i/3)%2)?wd.c1:wd.c2; ctx.fillRect(wd.x+off,SANDY+2-i,2,1);
  }
  if(chestVisible()){
    drawRows(ctx,CHEST,CHEST.frames.A,CHX,CHY,false,t);
    if(game.stash>0&&Math.floor(t*2)%2){ctx.fillStyle='#fff7b0';ctx.fillRect(CHX+8,CHY-2,1,1);ctx.fillRect(CHX+2,CHY-1,1,1);}
  }
  for(const p of props){
    if(p.k==='log') drawRows(ctx,LOG,LOG.frames.A,p.x,p.y,false,t);
    if(p.k==='minibot'){ctx.fillStyle=Math.floor(t*8)%2?'#e8394a':'#ffe14a'; ctx.fillRect(Math.round(p.x),Math.round(p.y),3,2); ctx.fillStyle='#3a6fe0'; ctx.fillRect(Math.round(p.x)+1,Math.round(p.y)-1,1,1);}
  }
  for(const k of coins){
    drawRows(ctx,COIN,COIN.frames.A,Math.round(k.x),Math.round(k.y),false,t);
    if(Math.floor(t*1.5+k.x)%4===0){ctx.fillStyle='#ffffff';ctx.fillRect(Math.round(k.x)+1,Math.round(k.y)+1,1,1);}
  }
  ctx.fillStyle='#b86b2e';
  for(const p of pellets) ctx.fillRect(Math.round(p.x),Math.round(p.y),2,1);
  for(const f of fishes) if(!f.drop&&!f.held) drawFish(f,t);
  ctx.fillStyle='#e0f8ff';
  for(const b of bubbles){
    const x=Math.round(b.x),y=Math.round(b.y);
    if(b.r===1) ctx.fillRect(x,y,1,1);
    else{ctx.fillRect(x,y-1,1,1);ctx.fillRect(x-1,y,1,1);ctx.fillRect(x+1,y,1,1);ctx.fillRect(x,y+1,1,1);}
  }
  // 밤 어둠 + 빛나는 친구들
  if(dk>0){ctx.fillStyle='#0a1030'; ctx.globalAlpha=0.55*dk; ctx.fillRect(0,SKY,W,H-SKY); ctx.globalAlpha=1;}
  if(rainT>0){ctx.fillStyle='#3a4660'; ctx.globalAlpha=0.12; ctx.fillRect(0,SKY,W,H-SKY); ctx.globalAlpha=1;}
  for(const f of fishes) if(!f.drop) drawGlow(f,t,dk);
  for(const p of parts){
    const x=Math.round(p.x),y=Math.round(p.y);
    if(p.k==='heart'){ctx.globalAlpha=Math.min(1,p.life*1.5); drawRows(ctx,HEART,HEART.frames.A,x,y,false,t);}
    else if(p.k==='spark'){ctx.globalAlpha=Math.min(1,p.life*2); ctx.fillStyle='#fff7b0'; ctx.fillRect(x,y,1,1);
      if(p.life>0.35){ctx.fillRect(x-1,y,1,1);ctx.fillRect(x+1,y,1,1);ctx.fillRect(x,y-1,1,1);ctx.fillRect(x,y+1,1,1);}}
    else if(p.k==='fire'){ctx.globalAlpha=Math.min(1,p.life*2.5); ctx.fillStyle=p.life>0.3?'#ffe14a':'#ff5a1a'; ctx.fillRect(x,y,1,1);}
    else if(p.k==='water'){ctx.globalAlpha=Math.min(1,p.life*2.5); ctx.fillStyle='#e0f8ff'; ctx.fillRect(x,y,1,1);}
    else if(p.k==='ink'){ctx.globalAlpha=Math.min(1,p.life*1.5); ctx.fillStyle='#1a1a2a'; ctx.fillRect(x,y,2,2);}
    else if(p.k==='tear'){ctx.globalAlpha=Math.min(1,p.life*2); ctx.fillStyle='#7fd0ff'; ctx.fillRect(x,y,1,1);}
    else if(p.k==='zap'){ctx.globalAlpha=1; ctx.fillStyle='#fff6a0'; ctx.fillRect(x,y,1,1); ctx.fillRect(x+1,y-1,1,1);}
    else if(p.k==='note'){ctx.globalAlpha=Math.min(1,p.life*2); ctx.fillStyle='#ffb3cc'; ctx.fillRect(x,y,1,3); ctx.fillRect(x-1,y+2,1,1); ctx.fillRect(x+1,y,1,1);}
  }
  ctx.globalAlpha=1;
  // 끌고 있는 물고기 + 합칠 수 있는 짝 표시
  if(drag&&drag.moved&&fishes.includes(drag.f)){
    const g=drag.f;
    if(Math.floor(t*4)%2) for(const o of fishes) if(o!==g&&canMerge(g,o)){
      const ax=Math.round(o.x+o.w/2),ay=Math.round(o.y)-5;
      ctx.fillStyle='#ffe14a'; ctx.fillRect(ax-2,ay,5,1); ctx.fillRect(ax-1,ay+1,3,1); ctx.fillRect(ax,ay+2,1,1);
    }
    ctx.fillStyle='#000'; ctx.globalAlpha=0.2; ctx.fillRect(Math.round(g.x)+2,Math.round(g.y+g.h)+2,g.w-4,2); ctx.globalAlpha=1;
    drawFish(g,t);
  }
  // --- 하늘 ---
  drawSky(t,dk);
  for(const f of fishes) if(f.drop||(f.state==='fly'&&f.y<SKY+2)) drawFish(f,t);
  for(const p of parts){
    if(p.k==='drop'){ctx.globalAlpha=Math.min(1,p.life*2); ctx.fillStyle=p.col||'#e8fbff'; ctx.fillRect(Math.round(p.x),Math.round(p.y),1,1);}
    if(p.k==='ripple'){ctx.globalAlpha=p.life*3; ctx.fillStyle='#ffffff'; ctx.fillRect(Math.round(p.x)-1,SKY,3,1);}
    if(p.k==='fw'){ctx.globalAlpha=Math.min(1,p.life); ctx.fillStyle=p.col; ctx.fillRect(Math.round(p.x),Math.round(p.y),1,1);}
  }
  ctx.globalAlpha=1;

  hudT-=dt; if(hudT<=0){hudT=0.25; updateHud();}
  saveT-=dt; if(saveT<=0){saveT=5; save();}
  requestAnimationFrame(frame);
}
const chestVisible=()=>game.stash>0||fishes.some(f=>f.sp.beh==='thief');
const canMerge=(a,o)=>o!==a&&alive(o)&&!!a.sp.stage&&a.id===o.id;

/* ---------------- 터치 ---------------- */
let lastTap={f:null,t:0},drag=null;
const PARROT=['안녕!','물고기!','배고파','뻐끔뻐끔','사랑해~','코인 줘!','꽥?','오늘 뭐 해?'];
function tapFish(f){
  const c=center(f),now=performance.now(),b=f.sp.beh;
  if(lastTap.f===f&&now-lastTap.t<450){lastTap.f=null; openRename(f); return;}
  lastTap={f,t:now};
  if(b==='thief'&&f.carry){dropCarry(f); f.state='wander'; f.cool=12; popText(c.x,f.y,'앗!','pink'); return;}
  parts.push({k:'heart',x:c.x-2,y:f.y-4,life:1.2});
  let say=f.sp.say||'';
  if(b==='parrot') say=pick(PARROT);
  if(b==='musicbox'){say='♪ 딩동댕~'; for(let i=0;i<6;i++) setTimeout(()=>parts.push({k:'note',x:c.x+rand(-6,6),y:f.y,life:1.2}),i*300);}
  if(b==='tama'){game.tama++; say=game.tama>=20?'다 컸어요! ♥':'냠냠 ('+game.tama+'/20)'; if(game.tama>=20) unlock('tama');}
  if(b==='clicker'){game.clicks++; say=String(game.clicks); if(game.clicks>=100) unlock('click');}
  if(b==='mine'){if(Math.random()<0.3){game.coins+=1; say='+1 ⛏';} else say='채굴 중…';}
  if(f.id==='chalkboard') say=`첫 번째 숫자는 ${game.code[0]}`;
  if(f.id==='crossword') say=`두 번째 칸: ${game.code[1]}`;
  if(f.id==='mailbox'||f.id==='postcard') say=`소인 속 숫자 ${game.code[2]}`;
  if(f.id==='milk') say=`유통기한 끝자리 ${game.code[3]}`;
  if(f.sp.id==='heart'||f.id==='whiteheart') parts.push({k:'heart',x:c.x+3,y:f.y-7,life:1.2});
  popText(c.x,f.y-4,(f.name||f.sp.name)+(say?' · '+say:''));
  if(!game.tips.name){game.tips.name=1; setTimeout(()=>toast('물고기를 톡톡 두 번 누르면 이름을 지어 줄 수 있어요'),900);}
}
cv.addEventListener('pointermove',e=>{
  if(!drag) return;
  const lx=e.clientX/Z,ly=e.clientY/Z,f=drag.f;
  if(!drag.moved&&Math.hypot(lx-drag.sx,ly-drag.sy)>3){
    drag.moved=true; f.held=true; f.vx=0; f.vy=0;
    if(f.link){f.link.link=null; f.link.lead=false; f.link=null; f.lead=false;}
    if(f.carry) dropCarry(f);
  }
  if(drag.moved){f.x=clamp(lx-drag.ox,0,W-f.w); f.y=clamp(ly-drag.oy,SKY+3,SANDY-f.h-1);}
});
function endDrag(){
  if(!drag) return;
  const f=drag.f,moved=drag.moved; drag=null;
  if(!fishes.includes(f)) return;
  if(!moved){tapFish(f); return;}
  f.held=false; pickWander(f);
  const c=center(f);
  let best=null,bd=1e9;
  for(const o of fishes) if(canMerge(f,o)){const d=dist(center(o),c); if(d<bd){bd=d;best=o;}}
  if(best&&bd<(f.w+best.w)/2.5) mergeFish(f,best);
}
cv.addEventListener('pointerup',endDrag);
cv.addEventListener('pointercancel',endDrag);
cv.addEventListener('pointerdown',e=>{
  const lx=e.clientX/Z,ly=e.clientY/Z;
  for(const k of coins) if(!k.dead&&Math.hypot(k.x+2.5-lx,k.y+2.5-ly)<6){
    k.dead=true; game.coins+=k.v; popText(k.x+2.5,k.y,'+'+k.v,'gold'); save(); updateHud(); return;
  }
  if(chestVisible()&&lx>=CHX-2&&lx<=CHX+13&&ly>=CHY-3&&ly<=CHY+10){
    if(game.stash>0){
      popText(CHX+5,CHY-2,'도둑 금고 털기! +'+game.stash,'gold');
      game.coins+=game.stash; game.stash=0; save(); updateHud();
      const th=fishes.find(f=>f.sp.beh==='thief'&&alive(f)); if(th) popText(center(th).x,th.y,'헉!','pink');
    } else toast('좀도둑의 비밀 금고예요. 아직 텅 비었어요.');
    return;
  }
  for(const f of fishes) if(f.hidden&&f.hidePos&&Math.hypot(center(f).x-lx,center(f).y-ly)<12){reveal(f,true); return;}
  for(let i=fishes.length-1;i>=0;i--){const f=fishes[i];
    if(f.drop||f.gone||f.hidden||f.away) continue;
    if(lx>=f.x-2&&lx<=f.x+f.w+2&&ly>=f.y-2&&ly<=f.y+f.h+2){
      drag={f,sx:lx,sy:ly,ox:lx-f.x,oy:ly-f.y,moved:false};
      try{cv.setPointerCapture(e.pointerId);}catch(err){}
      return;
    }
  }
  if(ly>SKY&&ly<SANDY) feed(lx,ly);
});

/* ---------------- UI ---------------- */
let toastQ=[],toastBusy=false;
function toast(msg,ms=2300){toastQ.push([msg,ms]); if(!toastBusy) nextToast();}
function nextToast(){
  const n=toastQ.shift(),el=$('toast');
  if(!n){toastBusy=false;return;}
  toastBusy=true; el.textContent=n[0]; el.classList.add('show');
  setTimeout(()=>{el.classList.remove('show'); setTimeout(nextToast,320);},n[1]);
}
function popText(lx,ly,txt,cls=''){
  const d=document.createElement('div'); d.className='pop '+cls; d.textContent=txt;
  d.style.left=clamp(lx*Z,40,innerWidth-40)+'px'; d.style.top=Math.max(30,ly*Z)+'px'; document.body.appendChild(d);
  setTimeout(()=>d.remove(),1150);
}
$('coinIco').appendChild(spriteCanvas(COIN,3));
const fmtN=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?(n/1e3).toFixed(1)+'k':String(Math.floor(n));
function fmtN2(n){return n<10?(Math.round(n*10)/10).toString():fmtN(n);}
function updateHud(){
  $('coinTxt').textContent=fmtN(game.coins);
  $('rateTxt').textContent='+'+fmtN2(incomeRate())+'/초';
  $('tankTxt').textContent=chainCount()+'/'+tankMax();
  const fm=foodMax(),fl=Math.floor(game.food);
  $('foodTxt').textContent=fl+'/'+fm;
  $('gfill').style.width=(fl>=fm?100:(game.food-fl)*100)+'%';
  $('sumBtn').textContent='먹이 🍤'+fl;
  $('sumBtn').disabled=fl<1||chainCount()>=tankMax();
  if($('shopModal').classList.contains('open')) renderShop(true);
}
$('sumChip').onclick=()=>toast(`먹이 ${Math.floor(game.food)}/${foodMax()} · ${regenT().toFixed(1)}초마다 1개씩 차요 · 어항 ${chainCount()}/${tankMax()}`);

/* ---------- 상점 ---------- */
function renderShop(soft){
  const html=SHOP.map(it=>{
    const lv=UP(it.id),max=lv>=it.max,cost=shopCost(it);
    return `<div class="zone"><div class="info"><b>${it.name}</b> <small style="display:inline">Lv${lv}</small><small>${it.desc}</small></div>
      <button class="btn ${max?'':'primary'}" data-buy="${it.id}" ${max||game.coins<cost?'disabled':''}>${max?'최대':'🪙'+fmtN(cost)}</button></div>`;
  }).join('')+`<small>변종 보너스: ${bonusText(Object.fromEntries(Object.entries(BON).filter(([k,v])=>v)))||'아직 없어요'}</small>`;
  const el=$('shopBody');
  if(soft&&el.dataset.h===html) return;
  el.dataset.h=html; el.innerHTML=html;
  el.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{
    const it=SHOP.find(x=>x.id===b.dataset.buy),cost=shopCost(it);
    if(game.coins<cost||UP(it.id)>=it.max) return;
    game.coins-=cost; game.up[it.id]=UP(it.id)+1; unlock('shop'); if(it.id==='auto') unlock('auto');
    save(); updateHud(); renderShop();
    toast(`${it.name} Lv${UP(it.id)}!`);
  });
}
$('shopBtn').onclick=()=>{renderShop(); $('shopModal').classList.add('open');};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('open'));
document.querySelectorAll('.modal').forEach(m=>m.addEventListener('pointerdown',e=>{if(e.target===m)m.classList.remove('open');}));

/* ---------- 이름 짓기 ---------- */
let renaming=null;
function openRename(f){
  renaming=f;
  $('nameWho').innerHTML=`<span class="${kindCls(f.sp)}">${f.sp.name}</span>의 이름을 지어 주세요.`;
  $('nameInput').value=f.name||'';
  $('nameModal').classList.add('open');
  setTimeout(()=>$('nameInput').focus(),50);
}
$('nameOk').onclick=()=>{
  if(renaming&&fishes.includes(renaming)){
    renaming.name=$('nameInput').value.trim().slice(0,8);
    const c=center(renaming);
    if(renaming.name){unlock('name'); popText(c.x,renaming.y,'안녕, '+renaming.name+'!','pink');}
    if(renaming.sp.beh==='secret'&&renaming.name===game.code&&!game.ach.door){
      popText(c.x,renaming.y-8,'딸깍! 서랍이 열렸어요','gold'); game.coins+=300; unlock('door');
      toast('비밀상자에서 코인 300개가 나왔어요! 🗝️',3000);
    }
    save();
  }
  $('nameModal').classList.remove('open');
};
$('nameInput').addEventListener('keydown',e=>{if(e.key==='Enter')$('nameOk').click();});

/* ---------- 도감 ---------- */
function renderDex(){
  const got=DEX.filter(s=>game.owned[s.id]).length;
  $('dexCount').textContent=` ${got}/${DEX.length}`;
  const body=$('dexBody'); body.innerHTML='';
  const groups=[{t:'일반 바다',cls:'r1',list:DEX_CHAIN},{t:'변종',cls:'r2',list:DEX_VAR},{t:'비밀 친구',cls:'r3',list:DEX_SECRET}];
  for(const g of groups){
    const n=g.list.filter(s=>game.owned[s.id]).length;
    body.insertAdjacentHTML('beforeend',`<div class="dexh"><span class="${g.cls}">${g.t}</span><small>${n}/${g.list.length}</small></div>`);
    const grid=document.createElement('div'); grid.className='dex'; body.appendChild(grid);
    for(const s of g.list){
      const has=!!game.owned[s.id],card=document.createElement('div');
      card.className='card';
      const pic=document.createElement('div'); pic.className='pic'; pic.appendChild(spriteCanvas(s,2.5,!has)); card.appendChild(pic);
      const cnt=fishes.filter(f=>f.id===s.id&&!f.gone).length;
      card.insertAdjacentHTML('beforeend',`<div>${has?s.name:'???'}</div>${has&&cnt?`<div class="${g.cls}">${cnt}마리</div>`:''}`);
      card.onclick=()=>{
        if(has){showReveal(s,false,true);return;}
        const where=s.secret?(s.hint||'비밀 조건으로 만날 수 있어요.'):s.stage===1?'먹이를 주면 와요.':s.stage?'바로 앞 친구 둘을 합치면 만날 수 있어요.':'친구들을 합칠 때 가끔 튀어나와요.';
        $('dexInfo').innerHTML=`<b>???</b> · <span class="${g.cls}">${g.t}</span><br>아직 못 만났어요. ${where}`;
      };
      grid.appendChild(card);
    }
  }
  $('dexInfo').textContent='만난 물고기를 누르면 소개 카드를 다시 볼 수 있어요.';
}
$('dexBtn').onclick=()=>{renderDex(); $('dexModal').classList.add('open');};

/* ---------- 도전 과제 ---------- */
const ACH=[
  ['merge','뿅!','처음으로 물고기 합치기'],
  ['s10','쑥쑥','일반 바다 10단계 친구 만나기'],
  ['s30','반환점','일반 바다 30단계 친구 만나기'],
  ['s60','무지개 너머','일반 바다 마지막 친구 만나기'],
  ['jump','점프!','두 단계 점프 성공'],
  ['var1','변종이다!','처음으로 변종 만나기'],
  ['var10','변종 수집가','변종 10종 만나기'],
  ['shop','첫 쇼핑','상점에서 처음 업그레이드하기'],
  ['auto','큐피드','자동 합치기 사기'],
  ['full','만석입니다','어항을 가득 채우기'],
  ['name','이름을 불러 줘','물고기에게 이름 지어 주기'],
  ['rain','비 오는 날','바다에 비가 내리는 걸 보기'],
  ['star','소원을 빌어 봐','밤하늘의 별똥별 보기'],
  ['ducks','오리 표류기','수면 위를 지나가는 오리 떼 보기'],
  ['fire','불타오르다','불에 약한 친구에게 불이 붙었다'],
  ['water','물의 도움','불붙은 친구의 불을 껐다'],
  ['steal','범인은 이 안에','좀도둑이 동전을 훔쳤다'],
  ['jackpot','잭팟!','오락기에서 잭팟 터뜨리기'],
  ['super','정의는 승리한다','너드가 변신했다'],
  ['bull','쾅!','황소가 빨간 친구를 들이받았다'],
  ['magnet','자석 같은 느낌','양극과 음극이 하나가 되었다'],
  ['slime','큰 젤리 프로젝트','슬라임 셋을 하나로 합치기'],
  ['bloom','방긋','비가 와서 화분에 꽃이 피었다'],
  ['bee','일직선','꿀벌이 꽃 핀 화분을 찾아갔다'],
  ['fireworks','불꽃놀이','밤하늘에 폭죽 쏘아 올리기'],
  ['pop','펑!','뾰족한 친구가 풍선을 터뜨렸다'],
  ['pinata','와르르','피냐타에서 코인이 쏟아졌다'],
  ['cake','생일 축하해','케이크 촛불이 꺼졌다'],
  ['ink','먹물 세례','문어가 먹물을 뿜었다'],
  ['sail','항해 중','유리병이 깨지고 배가 나왔다'],
  ['ninja','숨바꼭질','숨은 닌자를 찾아냈다'],
  ['escape','잠깐 둘러보고 올게요','누군가 하늘로 날아갔다'],
  ['juice','무슨 맛?','주스팩이 과일 맛으로 변했다'],
  ['boom','큰 소리의 폭발','미니 로봇이 펑!'],
  ['tama','다 키웠다','다마고치를 끝까지 키우기'],
  ['click','클릭 중독','클릭 물고기를 100번 누르기'],
  ['ufo','유괴','하늘에서 무언가가 찾아왔다'],
  ['door','문이 열렸다','비밀상자의 비밀번호 맞히기'],
  ['all','그게 다란다, 물고기들아!','도감 완성하기']
];
const SECRET_ACH=new Set(['ufo','door','super','sail','ninja']);
function unlock(id){
  if(game.ach[id]) return;
  game.ach[id]=Date.now();
  const a=ACH.find(x=>x[0]===id); if(a) toast('🏆 도전 과제: '+a[1]);
  save();
}
function checkCounts(){
  if(chainCount()>=tankMax()) unlock('full');
  if(DEX.every(s=>game.owned[s.id])) unlock('all');
  if(!game.tips.merge){
    const ids=fishes.filter(f=>alive(f)&&f.sp.stage).map(f=>f.id);
    if(ids.some((l,i)=>ids.indexOf(l)!==i)){game.tips.merge=1; toast('똑같은 친구 둘을 끌어다 겹쳐 보세요 👆');}
  }
}
function renderAch(){
  const got=ACH.filter(a=>game.ach[a[0]]).length;
  $('achCount').textContent=` ${got}/${ACH.length}`;
  $('achList').innerHTML=ACH.map(([id,n,d])=>{
    const on=!!game.ach[id];
    return `<div class="ach ${on?'':'off'}">${on?'🏆':'🔒'} <b>${n}</b><br>${on||!SECRET_ACH.has(id)?d:'???'}</div>`;
  }).join('');
}
$('achBtn').onclick=()=>{renderAch(); $('achModal').classList.add('open');};

/* ---------------- 시작 ---------------- */
addEventListener('resize',resize);
resize();
fishes=game.tank.filter(o=>SP[o.id]&&(!SP[o.id].hidden||SP[o.id].slime)).map(o=>makeFish(o.id,{name:o.name}));
// 자리 비운 동안 번 코인 (최대 4시간, 절반)
{
  const away=clamp((Date.now()-(game.lastSeen||Date.now()))/1000,0,4*3600);
  const gain=Math.floor(incomeRate()*away*0.5);
  game.food=Math.min(foodMax(),game.food+away/regenT());
  if(away>60&&gain>0){game.coins+=gain; setTimeout(()=>toast(`자리 비운 동안 코인 ${fmtN(gain)}개가 쌓였어요 🪙`,3000),600);}
}
updateHud();
requestAnimationFrame(frame);
if(!game.tips.start){
  game.tips.start=1;
  setTimeout(()=>toast('똑같은 친구 둘을 끌어다 겹치면 다음 친구로 합쳐져요!',3000),500);
  setTimeout(()=>toast('먹이 🍤로 친구를 부르고, 쌓인 코인으로 상점에서 업그레이드해요',3000),600);
  setTimeout(()=>toast('물을 톡 치면 먹이가 떨어져요 🍤',2600),700);
  save();
}
