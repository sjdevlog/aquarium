/* =========================================================
   fish.js — 물고기 도감 데이터 + 픽셀 스프라이트 생성
   모든 물고기는 같은 몸통(14×8)을 쓰고, 색·무늬·소품만 달라요.
   ========================================================= */

// 공통 색 (각 물고기 pal에서 덮어쓸 수 있어요)
const BASE={
  o:'#2a1f3d',k:'#1a1a24',w:'#ffffff',W:'#ffffff',K:'#1a1a24',S:'#111118',T:'#7fd0ff',p:'#ff9fb0',
  R:'#e8394a',D:'#a8202e',Y:'#ffcf3a',A:'#ffe14a',G:'#3bb06a',g:'#2a7d4a',B:'#3a6fe0',Q:'#cfe8ff',
  N:'#8a5a2b',n:'#5a3a1a',P:'#ff8fb8',I:'#ffd6e6',E:'#9aa3b5',e:'#6e7788',O:'#ff9a2e',V:'#9b5de5',
  C:'#5ad0e8',L:'#fff6a0',M:'#7be35a',H:'#f3dfb0',U:'#2a2a6a'
};

// 기본 몸통 (오른쪽이 머리). 눈은 (10,3)
const BODY={
 A:[".....ooooo....","...oobbbbboo..","oo.obbbbbbbbo.","ofoobbbbbbkbbo","offobbbbbbbbbo","ofoollllllllo.","oo..ollllllo..",".....oooooo..."],
 B:[".....ooooo....","...oobbbbboo..","...obbbbbbbbo.","oo.obbbbbbkbbo","ofoobbbbbbbbbo","offollllllllo.","oo..ollllllo..",".....oooooo..."]
};
const JELLY={
 A:["...oooooo...","..obbbbbbo..",".obbllbbbbo.",".obbbbbbbbo.","obbbkbbkbbbo","obbbbxxbbbbo","oooooooooooo",".x.x..x..x..",".x..x.x.x...","..x.x..x.x..",".x..x.x..x..","..x...x...x."],
 B:["...oooooo...","..obbbbbbo..",".obbllbbbbo.",".obbbbbbbbo.","obbbkbbkbbbo","obbbbxxbbbbo","oooooooooooo","..x.x..x..x.","..x..x.x.x..",".x..x.x..x..","..x.x..x.x..",".x...x...x.."]
};
const SLIME={
 A:["...oooo...","..obbbbo..",".oblbbbbo.",".obkbbkbo.","obbbbbbbbo","obbbbbbbbo",".oooooooo."],
 B:["..........","..oooooo..",".oblbbbbo.",".obkbbkbo.","obbbbbbbbo","obbbbbbbbo","oooooooooo"]
};

function hashStr(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function seeded(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

// 무늬 그리기 도구
function decoApi(g,top,R){
  const H=g.length,Wd=g[0].length;
  const inG=(x,y)=>y>=0&&y<H&&x>=0&&x<Wd;
  const isB=(x,y)=>inG(x,y)&&(g[y][x]==='b'||g[y][x]==='l');
  const d={
    R,
    set(x,y,ch){if(inG(x,y))g[y][x]=ch;return d;},
    on(x,y,ch){if(isB(x,y))g[y][x]=ch;return d;},
    pts(list,ch,dx=0,dy=0){for(const [x,y] of list)d.on(x+dx,y+dy,ch);return d;},
    force(list,ch){for(const [x,y] of list)d.set(x,y,ch);return d;},
    vs(cols,ch){for(const x of cols)for(let y=0;y<H;y++)d.on(x,y,ch);return d;},
    hs(rows,ch){for(const y of rows)for(let x=0;x<Wd;x++)d.on(x,y,ch);return d;},
    checker(par,ch){for(let y=0;y<H;y++)for(let x=0;x<Wd;x++)if((x+y)%2===par)d.on(x,y,ch);return d;},
    grid(ch){for(let y=0;y<H;y++)for(let x=0;x<Wd;x++)if(x%3===0||y%3===0)d.on(x,y,ch);return d;},
    spots(n,ch){let k=0,t=0;while(k<n&&t++<400){const x=4+Math.floor(R()*9),y=1+Math.floor(R()*6);if(isB(x,y)&&!(x===10&&y===3)){g[y][x]=ch;k++;}}return d;},
    blobs(n,ch){let k=0,t=0;while(k<n&&t++<400){const x=4+Math.floor(R()*8),y=1+Math.floor(R()*6);if(isB(x,y)&&isB(x+1,y)&&!(y===3&&(x===9||x===10))){g[y][x]=ch;g[y][x+1]=ch;k++;}}return d;},
    map(from,to){for(let y=0;y<H;y++)for(let x=0;x<Wd;x++)if(g[y][x]===from)g[y][x]=to;return d;},
    grad(chars){for(let y=0;y<H;y++)for(let x=0;x<Wd;x++)if(isB(x,y))g[y][x]=chars[Math.min(chars.length-1,Math.floor((x-4)/9*chars.length))];return d;},
    gradV(chars){for(let y=0;y<H;y++)for(let x=0;x<Wd;x++)if(isB(x,y))g[y][x]=chars[Math.min(chars.length-1,Math.floor((y-1)/6*chars.length))];return d;},
    eye(ch){g[3][10]=ch;return d;},
    top(strs){const off=top.length-strs.length;strs.forEach((s,i)=>{for(let x=0;x<Wd&&x<s.length;x++)if(s[x]!=='.')top[off+i][x]=s[x];});return d;}
  };
  return d;
}
function makeFrames(id,deco,custom){
  const base=custom||BODY;
  const mk=rows=>{
    const g=rows.map(r=>r.split(''));
    const top=[0,1,2,3].map(()=>Array(g[0].length).fill('.'));
    if(deco) deco(decoApi(g,top,seeded(hashStr(id))));
    const i=top.findIndex(r=>r.some(c=>c!=='.'));
    const t=i<0?[]:top.slice(i);
    return t.map(r=>r.join('')).concat(g.map(r=>r.join('')));
  };
  return {A:mk(base.A),B:mk(base.B)};
}

// 자주 쓰는 모양
const SH={
  heart:[[5,2],[6,2],[8,2],[9,2],[5,3],[6,3],[7,3],[8,3],[9,3],[6,4],[7,4],[8,4],[7,5]],
  star:[[7,2],[5,3],[6,3],[7,3],[8,3],[9,3],[6,4],[7,4],[8,4],[6,5],[8,5]],
  bolt:[[8,1],[7,2],[6,3],[7,3],[8,3],[7,4],[6,5]],
  plus:[[7,2],[6,3],[7,3],[8,3],[7,4]],
  minus:[[6,3],[7,3],[8,3]],
  ring:[[6,2],[7,2],[5,3],[8,3],[5,4],[8,4],[6,5],[7,5]],
  flower:[[6,2],[5,3],[7,3],[6,4]],
  shades:[[8,3],[9,3],[10,3],[11,3],[12,3],[9,2],[11,2]],
  bigeye:[[10,2],[11,2]],
  brow:[[9,1],[10,1],[11,2]]
};
const HAT={
  propeller:[".....RYR......","...BB.Y.......",".....BRRB....."],
  crown:["......A.A.A...","......AAAAA..."],
  horns:[".........W.W..","........WW.WW."],
  devil:[".......R..R...",".......RR.RR.."],
  antenna:["...........P..","..........K..."],
  unicorn:["..........A...","..........AA..",".........AA..."],
  fedora:["......KKKK....","....KKKKKKKK.."],
  nightcap:["....W.........",".....BB.......","......BBBB...."],
  cone:["........A.....",".......PP.....","......PAPA...."],
  afro:["....KKKKKK....","...KKKKKKKK...","...KKKKKKKKK.."],
  shark:["........E.....",".......EE.....","......EEE....."],
  cat:["......E...E...","......EE.EE..."],
  bunny:["......I.I.....","......I.I.....","......P.P....."],
  frog:[".......MM.MM..","......MKMMKM.."],
  raccoon:["......e...e...","......ee.ee..."],
  plume:["......R.......",".....RR.......","......EEEE...."],
  egg:[".....WWAAW....","....WWWWWWW..."],
  eggshell:["......W.W.W...",".....WWWWWWW.."],
  pizza:[".....AAA......","....OARAO....."],
  sprout:[".......G......","......GG......",".....NNNN....."],
  bloom:[".....PAP......","......G.......",".....NNNN....."],
  beeAnt:["........K.K...","........K.K..."],
  rocket:["...R..........","..RWR.........","..WWW........."],
  santa:["....W.........",".....RR.......","....WWWWWW...."],
  witch:[".......V......","......VVV.....","....VVVVVVV..."],
  stem:[".......g......","......gg......"],
  mohawk:[".......K......","......KKK....."],
  headset:["......KKKK....","......K..K...."],
  leaf:[".......G......","......GG......"],
  cherry:["......G.......",".......G......"],
  caterpillar:["......GGGGK..."],
  butterfly:["......P.P.....","......PKP....."],
  snail:["......PPP.....",".....PPKPP...."],
  cloud:["......WWW.....","....WWWWWWW..."],
  toast:["......NNNN....",".....NHHHHN..."],
  icecream:["......PWC.....",".......NN.....","........N....."],
  moka:["......EEE.....",".....EeeeE...."],
  tesla:["........C.....",".......CCC....","........E....."],
  mushroom:["......RRRR....",".....RWRRWR..."],
  antlers:["......N.N.N...",".......NNN...."],
  elf:["......G.......",".......GG.....","......GGGG...."],
  nutcracker:["......KKKK....","......KKKK....","......RRRR...."],
  ornament:["........A....."],
  partyhat:["........A.....",".......IP.....","......PIPI...."],
  candle:["........A.....","........W.....",".....PPPPPP..."],
  bow:[".......P.P....","........P....."],
  helmet:["......EEEE....",".....ECCCCE..."],
  astronaut:["......WWWW....",".....WQQQQW..."],
  cap:["......BBBB....",".....BBBBBBB.."],
  yellowcap:["......AAAA....",".....AAAAAAA.."],
  headband:[],
  bun:[".......n......","......nnn....."],
  hairpin:["........P....."],
  beret:["......RRRR....",".....RRRRRR..."],
  hood:["......KKKK....",".....KKKKKK..."],
  chef:["......WWWW....","......WWWW....","......EEEE...."],
  gradcap:[".....KKKKKK...","......KKKK...."],
  tophat:["......KKKK....","......KKKK....",".....KKKKKK..."],
  halo:["......AAAA...."],
  pot:[".......GG.....","......NNNN...."],
  needle:[".........E....",".........E...."],
  balloonTop:["..........R...",".........RRR..","..........E..."],
  flamingo:["..PP..........",".P.P..........","..P..........."],
  sprouts:["......G.G.G..."],
  lantern:["............L.","...........o..","..........o..."],
  goggles:[],
  periscope:[".........EE...",".........E...."],
  fin:["......RRR....."],
  ufo:["......QQQ.....","....EEEEEEE..."]
};

/* ---------------- 물고기 목록 ----------------
   lv: 1~5 (같은 레벨 2마리를 합치면 다음 레벨 중 랜덤)
   beh: 특수 행동 표시 / secret: 특별한 조건으로만 만나요 */
const FISH=[];
function F(id,name,lv,cols,deco,desc,o={}){
  const [b,l,f]=cols;
  const {pal,...rest}=o;
  FISH.push(Object.assign({id,name,lv,pal:Object.assign({b,l,f},pal||{}),deco,desc},rest));
}

/* ======== Lv1 — 기본 친구들 ======== */
F('yellow','노랑이',1,['#ffd93a','#fff3a8','#f2b51f'],null,'모든 이야기의 시작. 제일 흔하지만 제일 사랑받아요.');
F('red','빨강이',1,['#e8394a','#ff9a9a','#b8202e'],null,'새빨간 물고기. 어디선가 거친 콧김이 느껴진대요.');
F('black','까망이',1,['#2b2b36','#44445a','#1a1a22'],d=>d.eye('W'),'까만 물고기. 밤에는 눈만 보여요.',{pal:{o:'#0d0d12'}});
F('gray','회색이',1,['#9aa3b5','#d4d9e2','#6e7788'],d=>d.spots(4,'w'),'조용하고 차분한 성격.');
F('mint','민트',1,['#7fe0c0','#dafff1','#4fbf9f'],null,'상쾌한 민트색. 호불호는 안 갈려요(아마도).');
F('pink','핑크',1,['#ff9cc2','#ffe0ec','#f06a9a'],d=>d.set(11,4,'p'),'볼이 늘 발그레해요.');
F('dots','점박이',1,['#2a2a3a','#45455a','#1b1b28'],d=>{d.spots(6,'W');d.eye('W');},'까만 몸에 하얀 점. 점을 세다 보면 잠이 와요.',{pal:{o:'#0f0f18'}});
F('shades','선글라스',1,['#ffd93a','#fff3a8','#f2b51f'],d=>{d.force(SH.shades,'S');d.set(11,3,'W');},'8비트 선글라스를 꼈어요. 밤에도 벗지 않아요.');
F('brows','눈썹이',1,['#ffd93a','#fff3a8','#f2b51f'],d=>d.force([[9,2],[10,1],[11,2]],'K'),'누가 연필로 꼬불꼬불 눈썹을 그려 줬어요.');
F('bigeye','왕눈이',1,['#9fd8ff','#e0f4ff','#6fb0e0'],d=>{d.force(SH.bigeye,'W');d.force([[10,3],[11,3]],'K');d.set(10,4,'T');},'눈이 너무 커서 늘 울먹여 보여요.');
F('bandage','반창고',1,['#ffd93a','#fff3a8','#f2b51f'],d=>{d.force([[6,1],[8,1],[7,2]],'I');d.set(7,1,'P');d.force([[5,4],[6,4]],'I');},'이마와 등에 아기 반창고를 붙였어요. 이제 안 아파요.');
F('crybaby','울보',1,['#3a4a9a','#6a7ac8','#2a3070'],d=>{d.eye('W');d.force([[10,4],[10,5]],'T');},'늘 눈물을 뚝뚝. 그래도 착해요.',{beh:'tears'});
F('pastel','파스텔',1,['#ffb3d0','#ffe6f0','#c8b3ff'],d=>d.grad(['P','I','Q','C','M']),'파스텔 그라데이션. 보고 있으면 마음이 말랑해져요.',{pal:{P:'#ffb3d0',I:'#ffd6e6',Q:'#cfe8ff',C:'#a8e6ff',M:'#b8f2d0'}});
F('baby','아기 물고기',1,['#fff08a','#fffbd6','#ffd84a'],d=>d.set(11,4,'p'),'아직 아기예요. 엄마를 졸졸 따라다니는 게 꿈.');
F('eggshell','계란껍질',1,['#ffd93a','#fff3a8','#f2b51f'],d=>d.top(HAT.eggshell),'머리에 계란 껍질을 아직 쓰고 있어요. 방금 태어났나 봐요.');
F('fishtee','물고기 티셔츠',1,['#ffffff','#f2f2f2','#3a6fe0'],d=>d.pts([[6,2],[9,4],[6,5]],'B'),'물고기 로고가 그려진 옷을 입은 물고기. 물고기가 물고기를…');
F('whiteheart','하얀 하트',1,['#ffffff','#f4f4f4','#ffb3c7'],d=>d.pts(SH.heart,'P'),'하얀 몸에 분홍 하트. 고백할 때 데려가세요.');
F('solar','태양전지',1,['#1a2a6a','#24387a','#4a5ab0'],d=>d.grid('C'),'태양전지판 무늬. 햇빛을 받으면 기분이 좋아져요.',{pal:{C:'#5a7ad8'}});
F('ladybug','무당벌레',1,['#e8394a','#ff8a8a','#1a1a24'],d=>{d.spots(5,'K');d.vs([11,12],'K');d.eye('W');},'빨간 등에 까만 점. 행운을 가져다준대요.');
F('toy','삑삑이',1,['#ff9a2e','#ffe14a','#3a6fe0'],d=>{d.hs([5,6],'A');d.pts([[6,2],[7,2]],'B');},'아기들이 갖고 노는 장난감. 누르면 삑!',{say:'삑!'});
F('kinder','유치원생',1,['#2b2b36','#44445a','#1a1a22'],d=>{d.top(HAT.yellowcap);d.eye('W');},'노란 모자를 쓰고 유치원에 가요.');
F('cherrylet','앵두',1,['#e8394a','#ff7a8a','#b8202e'],d=>{d.top(HAT.cherry);d.set(6,2,'W');},'동글동글 앵두. 꼭지가 귀여워요.');
F('toast','식빵',1,['#f3dfb0','#fff3d6','#c8a060'],d=>d.top(HAT.toast),'머리에 식빵을 썼어요. 고소한 냄새가 나요.',{flam:true});
F('pinkbolt','핑크썬더',1,['#ff8fb8','#ffd0e0','#e05a8a'],d=>d.pts(SH.bolt,'W'),'분홍 몸에 하얀 번개. 무늬가 살짝 삐뚤어요.');
F('storm','폭풍',1,['#ffd93a','#fff3a8','#f2b51f'],d=>d.pts(SH.bolt,'K'),'번개 무늬가 있지만 전기는 안 나와요.');
F('cactus','선인장',1,['#b07a4a','#d8a878','#8a5a2b'],d=>{d.vs([6,9],'G');d.pts([[5,3],[7,2],[8,4],[10,5]],'G');},'갈색 몸에 선인장 무늬. 찔리진 않아요.');
F('camo','밀리터리',1,['#6a7a3a','#8a9a5a','#4a5a2a'],d=>{d.blobs(4,'n');d.blobs(3,'g');},'얼룩덜룩 위장 무늬. 수초 사이에 숨으면 아무도 몰라요.');
F('flowery','꽃무늬',1,['#8fd6ff','#d8f3ff','#5ab0e0'],d=>{d.pts(SH.flower,'W');d.set(6,3,'A');d.pts([[9,5],[10,4],[11,5],[10,6]],'W');d.set(10,5,'A');},'하늘색 몸에 꽃이 피었어요.');
F('leopard','표범',1,['#f0c060','#fff0c8','#c89030'],d=>{d.spots(7,'n');},'표범 무늬. 우아하게 헤엄쳐요.');
F('tiger','호랑이',1,['#ff9a2e','#ffe3b8','#e07a10'],d=>d.force([[5,1],[5,2],[6,3],[7,1],[7,2],[8,3],[8,4],[11,2]].filter(([x,y])=>!(x===10&&y===3)),'K'),'어흥 하고 싶지만 뻐끔밖에 못 해요.');
F('panda','판다',1,['#ffffff','#ffffff','#1a1a24'],d=>{d.force([[9,2],[10,2],[11,2],[9,3],[11,3],[9,4],[10,4],[11,4],[6,1],[7,1]],'K');d.eye('W');},'대나무는 못 먹지만 판다예요.');
F('hypno','최면',1,['#ffffff','#ffffff','#1a1a24'],d=>{d.pts(SH.ring,'K');d.set(6,3,'K');d.set(7,4,'K');d.vs([11,12],'K');d.eye('W');},'몸의 회오리를 오래 보면… 졸려요…');

/* ======== Lv2 — 음식 · 동물 · 옷 ======== */
F('melon','수박',2,['#4fb84f','#ff6f7d','#2d7a2d'],d=>{d.vs([5,7,9],'g');d.pts([[6,5],[9,5],[8,6]],'K');},'여름 냄새가 나요. 씨는 뱉지 마세요.',{fruit:'#ff6f7d'});
F('berry','딸기',2,['#ff4d5e','#ff8a95','#d83040'],d=>{d.top(HAT.leaf);d.pts([[5,2],[8,2],[11,2],[6,4],[9,4],[5,5],[8,5]],'A');},'새콤달콤 딸기.',{fruit:'#ff4d5e'});
F('pineapple','파인애플',2,['#f5c542','#ffe48a','#d8a020'],d=>{d.top(["......G.G.G...",".......GGG...."]);d.checker(0,'O');},'왕관 같은 잎사귀. 피자 위엔 올라가지 않을 거래요.',{fruit:'#f5c542'});
F('orange','오렌지',2,['#ff9a2e','#ffd08a','#e07a10'],d=>{d.top(HAT.leaf);d.spots(4,'A');},'껍질을 까면 상큼한 향.',{fruit:'#ff9a2e'});
F('ruby','루비',2,['#d01030','#ff5a70','#901020'],d=>d.pts([[6,1],[7,1],[5,2]],'W'),'반짝반짝 유광 빨강. 보석처럼 빛나요.');
F('donut','도넛',2,['#c88a50','#e8b880','#a06a30'],d=>{d.pts([[5,1],[6,1],[7,1],[8,1],[9,1],[4,2],[5,2],[6,2],[7,2],[8,2],[9,2],[10,2],[11,2]],'P');d.pts([[5,1],[8,2],[6,2],[10,2]],'A');d.set(7,1,'B');d.set(9,2,'W');},'딸기 크림에 스프링클. 경찰 물고기들이 좋아해요.');
F('pizza','피자',2,['#ffd93a','#fff3a8','#f2b51f'],d=>d.top(HAT.pizza),'뒤통수에 피자를 썼어요. 마르게리타래요.');
F('sushi','초밥',2,['#ffffff','#f4f4f4','#e0e0e0'],d=>{d.top(["......OOOO....",".....OWOWOO..."]);d.vs([7,8],'K');},'흰 밥 몸에 연어를 얹고 김 띠를 둘렀어요.');
F('pancake','팬케이크',2,['#fff08a','#fffbd6','#ffd84a'],d=>d.top(["......AA......","....NNNNNN....","....HHHHHH...."]),'머리에 팬케이크를 얹었어요. 시럽이 똑.');
F('icecream','아이스크림',2,['#ffd6e6','#fff0f6','#ff9cc2'],d=>d.top(HAT.icecream),'머리에 삼색 아이스크림 콘을 거꾸로 썼어요. 차가워!');
F('cheesemoon','치즈 달',2,['#ffb84a','#ffd890','#e09020'],d=>d.spots(7,'O'),'치즈 같기도 하고 달 같기도 한 구멍 숭숭 물고기.',{pal:{O:'#d88a20'}});
F('egghat','계란 모자',2,['#9fd8ff','#e0f4ff','#6fb0e0'],d=>d.top(HAT.egg),'계란 프라이 모자. 반숙이에요.');
F('cow','젖소',2,['#ffffff','#ffe0ea','#1a1a24'],d=>{d.blobs(4,'K');d.set(12,4,'P');d.set(13,4,'P');},'음머~ 어쩐지 밤하늘이 신경 쓰여요.',{cow:true});
F('cat','고양이',2,['#9aa3b5','#d4d9e2','#6e7788'],d=>{d.top(HAT.cat);d.vs([5,7],'e');},'고등어 태비 줄무늬. 물고기인데 고양이예요.',{say:'야옹'});
F('frogsuit','개구리 탈',2,['#5ac85a','#c8f0a0','#3a9a3a'],d=>d.top(HAT.frog),'개구리 인형탈을 썼어요. 개굴!',{say:'개굴'});
F('bunnysuit','토끼 탈',2,['#f4f4f4','#ffffff','#ffc0d0'],d=>{d.top(HAT.bunny);d.force([[12,5],[13,5]],'O');},'토끼 인형탈을 쓰고 당근을 물었어요.');
F('raccoon','라쿤 탈',2,['#8a8f9a','#d4d9e2','#4a4f5a'],d=>{d.top(HAT.raccoon);d.force([[9,3],[11,3],[9,2],[11,2]],'K');d.eye('W');},'라쿤 인형탈. 쓰레기통은 뒤지지 않아요.');
F('bee','꿀벌',2,['#ffd93a','#fff3a8','#1a1a24'],d=>{d.top(HAT.beeAnt);d.vs([5,7,9],'K');},'꽃을 정말 좋아해요. 화분 친구에 꽃이 피면…',{beh:'bee'});
F('parrot','앵무새',2,['#3bb06a','#ffe14a','#e8394a'],d=>{d.force([[12,4],[13,4],[12,5]],'O');d.hs([1],'R');},'말을 따라 해요. 누르면 무슨 말을 할까?',{beh:'parrot'});
F('dove','흰비둘기',2,['#ffffff','#f4f4f4','#d4d9e2'],d=>d.force([[12,4],[13,4]],'O'),'평화를 사랑하는 하얀 물고기.');
F('pigeon','비둘기',2,['#8a93a6','#c4cad6','#5a6370'],d=>d.hs([2],'M'),'구구. 목덜미가 반짝여요.',{pal:{M:'#7ad0a0'}});
F('snail','달팽이',2,['#7ad05a','#c8f0a0','#4a9a3a'],d=>{d.top(HAT.snail);d.pts([[5,4],[6,5],[8,5]],'W');},'머리에 달팽이가 타고 있어요. 그래서 엄청 느려요.',{beh:'slow'});
F('mushroom','버섯',2,['#fff3d6','#ffffff','#e8d0a0'],d=>d.top(HAT.mushroom),'빨간 갓에 하얀 점. 먹으면 안 돼요!');
F('sweater','스웨터',2,['#e8394a','#ff8a8a','#2a7d4a'],d=>{d.hs([2],'W');d.pts([[5,4],[7,4],[9,4],[11,4]],'G');d.hs([5],'W');},'화려한 털 스웨터. 라스트 크리스마스를 흥얼거려요.');
F('student','학생',2,['#ffd93a','#fff3a8','#f2b51f'],d=>{d.top(HAT.gradcap);d.pts([[5,5],[6,5],[8,5]],'K');},'고깔모자를 쓰고 수학 공부 중. 1+1=물고기?');
F('martial','무예 학생',2,['#ffffff','#f4f4f4','#d4d9e2'],d=>{d.hs([1],'R');d.vs([7],'K');},'하얀 도복에 빨간 머리띠. 기합!',{say:'얍!'});
F('recorder','리코더',2,['#ffd93a','#fff3a8','#f2b51f'],d=>d.force([[12,4],[13,4],[13,5]],'H'),'리코더를 물고 다녀요. 삐리리~',{say:'삐리리~'});
F('rookie','락 연습생',2,['#ffffff','#f4f4f4','#d4d9e2'],d=>{d.force([[9,2],[11,2],[9,4],[11,4]],'E');d.top(HAT.mohawk);},'아직 연습생이지만 꿈은 록스타.',{say:'지잉~'});
F('wrestler','레슬러',2,['#3a6fe0','#8ab4ff','#e8394a'],d=>{d.force([[9,2],[10,2],[11,2],[9,3],[11,3],[12,3],[9,4],[10,4],[11,4]],'R');d.eye('W');},'루차 마스크를 쓴 레슬러.');
F('athlete','체육복',2,['#9b5de5','#c8a8ff','#6a3ab0'],d=>d.vs([6],'W'),'보라색 트레이닝복. 오늘도 운동!');
F('agent','요원',2,['#2b2b36','#ffffff','#1a1a22'],d=>{d.force(SH.shades,'S');d.pts([[7,4],[7,5]],'R');},'검은 정장에 선글라스. 임무 중이라 말을 안 해요.');
F('gingerbread','진저쿠키',2,['#c07a3a','#d89a5a','#8a5020'],d=>{d.pts([[6,4],[8,4]],'W');d.hs([6],'W');d.set(11,4,'R');},'달콤한 진저쿠키. 버튼이 사탕이에요.');
F('elf','엘프',2,['#3bb06a','#8ae0a0','#e8394a'],d=>d.top(HAT.elf),'산타를 돕는 요정. 선물 포장 전문.');
F('reindeer','순록',2,['#a87040','#e0c090','#6a4020'],d=>{d.top(HAT.antlers);d.hs([4],'A');},'뿔에 방울 목걸이. 코는 안 빨개요.',{say:'딸랑딸랑'});
F('pumpkin','잭오랜턴',2,['#ff8a1a','#ffb060','#2a7d4a'],d=>{d.top(HAT.stem);d.force([[9,2],[11,2],[9,4],[10,5],[11,4],[12,5]],'K');d.eye('K');},'호박 물고기. 밤이 되면 얼굴에 불이 켜져요.',{glow:'#ffb040'});
F('zombie','좀비',2,['#9ac87a','#c8e0a8','#5a7a3a'],d=>{d.set(10,3,'W');d.set(11,3,'K');d.spots(3,'g');},'한쪽 눈이 튀어나왔지만 친절해요.',{say:'으어어'});
F('mummy','미라',2,['#f3e8c8','#fff8e0','#c8b890'],d=>{d.hs([2,4,6],'H');d.eye('K');},'붕대를 칭칭. 풀어 보면 수줍은 물고기.',{say:'우우…'});

/* ======== Lv3 — 재질 · 직업 · 물건 ======== */
F('wood','나무',3,['#a8703a','#c8905a','#7a4a20'],d=>{d.hs([2,4],'n');},'나무로 만든 물고기. 불을 조심해야 해요!',{flam:true});
F('plaid','체크무늬',3,['#d03030','#e86060','#8a1a1a'],d=>{d.vs([5,8,11],'K');d.hs([2,5],'K');},'빨간 체크. 나무처럼 불에 약해요.',{flam:true});
F('stone','돌',3,['#8a8f9a','#a8adb8','#6a6f7a'],d=>d.spots(5,'e'),'너무 무거워서 바닥에 가라앉아 있어요. 그래도 행복해요.',{beh:'sink'});
F('marble','대리석',3,['#f0f0f4','#ffffff','#c8ccd8'],d=>{d.force([[5,2],[6,3],[7,3],[8,4],[9,5],[6,5]],'E');},'대리석 물고기. 돌처럼 가라앉아요.',{beh:'sink'});
F('brick','벽돌',3,['#c0603a','#d88060','#8a3a1a'],d=>{d.hs([2,4],'H');d.pts([[6,1],[9,3],[6,3],[8,5],[11,4]],'H');},'벽돌로 지었어요. 쿵 하고 가라앉아요.',{beh:'sink'});
F('porcelain','백자',3,['#ffffff','#f4f8ff','#3a6fe0'],d=>{d.force([[5,2],[6,2],[7,3],[8,2],[6,4],[9,4]],'B');d.set(8,5,'E');},'청화백자 도자기. 배 쪽이 조금 깨졌어요.');
F('crystal','수정',3,['#8ab4ff','#cfe8ff','#3a5ab0'],d=>{d.checker(0,'U');d.eye('C');},'수정 결정으로 된 물고기. 어딘가 다른 세계의 냄새가 나요.',{pal:{U:'#5a7ad8',C:'#cfe8ff'}});
F('bottle','유리병',3,['#bfe8e0','#e8fff8','#8ac8c0'],d=>{d.force([[6,3],[7,3],[8,3],[7,2]],'N');d.set(7,4,'W');},'병 속에 작은 배가 들어 있어요. 깨지기 쉬워요!',{beh:'bottle'});
F('stained','스테인드글라스',3,['#3a6fe0','#e8394a','#ffcf3a'],d=>{d.checker(0,'R');d.spots(5,'A');d.spots(3,'G');},'조각조각 유리 타일. 빛이 통과하면 예뻐요.');
F('pixel','픽셀',3,['#5a5af0','#8a8aff','#3a3ac0'],d=>d.checker(1,'C'),'아무리 봐도 픽셀이에요. (모두 픽셀이지만요)');
F('graffiti','그래피티',3,['#ffffff','#f4f4f4','#ff5af0'],d=>{d.spots(4,'R');d.spots(4,'B');d.spots(3,'A');d.spots(3,'M');},'온몸에 스프레이 낙서. 누가 그랬는지 아무도 몰라요.');
F('fluid','플루이드 아트',3,['#9b5de5','#ff8fb8','#5ad0e8'],d=>{d.blobs(3,'C');d.blobs(3,'A');d.blobs(2,'P');},'물감이 흘러내린 무늬. 꾸르륵 소리를 내요.',{say:'꾸르륵'});
F('popart','팝아트',3,['#ffe14a','#ffffff','#e8394a'],d=>{d.pts([[5,2],[6,3],[7,2],[8,3],[9,2],[5,5],[7,5],[9,5]],'K');},'세모세모 90년대 팝아트 무늬.');
F('cubist','입체파',3,['#ff9a2e','#5ad0e8','#9b5de5'],d=>{d.grad(['C','O','P','A','G']);d.set(11,3,'K');d.set(9,2,'W');},'눈이 이상한 데 붙어 있어요. 예술이래요.');
F('kiddraw','어린이 그림',3,['#ffffff','#f4f4ff','#8ab4ff'],d=>{d.hs([2,5],'Q');d.pts([[6,3],[8,3],[7,4]],'R');d.set(5,4,'A');},'아이가 크레용으로 그린 가족 그림. 종이라서 불에 약해요.',{flam:true});
F('postcard','엽서',3,['#f3e8c8','#fff8e0','#c8b890'],d=>{d.pts([[5,2],[6,2],[5,3],[6,3]],'R');d.hs([5],'B');},'우표와 소인이 잔뜩. 어디로 배달되는 걸까요?',{flam:true});
F('crossword','낱말퍼즐',3,['#ffffff','#ffffff','#1a1a24'],d=>d.checker(0,'K').eye('R'),'몸에 낱말퍼즐이 있어요. 한국어 칸도 있대요.',{flam:true});
F('chalkboard','칠판',3,['#2a4a3a','#3a5a4a','#1a2a20'],d=>{d.pts([[5,2],[6,2],[8,2],[5,4],[6,4],[7,4],[9,5]],'W');d.eye('W');},'"문은 ○를 찾으면 열린다." 몸에 수상한 글씨가 적혀 있어요.');
F('queen','트럼프 퀸',3,['#ffffff','#ffffff','#e8394a'],d=>{d.top(HAT.crown);d.pts(SH.heart,'R');},'하트 퀸. 우아하게 헤엄쳐요.');
F('king','트럼프 킹',3,['#ffffff','#ffffff','#1a1a24'],d=>{d.top(HAT.crown);d.pts([[7,2],[6,3],[7,3],[8,3],[7,4],[7,5]],'K');},'스페이드 킹. 퀸을 찾아다녀요.');
F('baseball','야구공',3,['#ffffff','#f4f4f4','#e8394a'],d=>{d.force([[5,1],[5,2],[6,3],[6,4],[5,5]],'R');d.force([[9,1],[9,2],[8,3]],'R');},'빨간 실밥. 누군가의 사인이 있어요.');
F('billiard','8번 당구공',3,['#1a1a24','#2b2b36','#1a1a24'],d=>{d.force([[6,2],[7,2],[6,3],[7,3]],'W');d.set(6,3,'K');d.eye('W');},'까만 8번 공. 마지막에 넣어야 해요.',{pal:{o:'#0d0d12'}});
F('milk','우유곽',3,['#ffffff','#ffffff','#3a6fe0'],d=>{d.hs([1],'B');d.force([[6,3],[7,3],[6,4],[7,4]],'E');},'옆면에 "물고기를 찾습니다" 포스터가 붙어 있어요.');
F('juice','주스팩',3,['#9b5de5','#c8a8ff','#6a3ab0'],d=>{d.top([".......W......",".......W......"]);d.pts([[6,3],[7,4]],'P');},'포도 주스팩. 과일 친구랑 닿으면 그 맛으로 바뀌어요!',{beh:'juice'});
F('moka','모카포트',3,['#b8c0d0','#d8dee8','#6e7788'],d=>{d.top(HAT.moka);d.vs([7],'e');},'모카포트 물고기. 불이 닿으면 커피가 끓어요.',{beh:'moka'});
F('clay','토우',3,['#c88a5a','#e0a878','#8a5a2b'],d=>{d.pts([[6,2],[8,2]],'n');d.eye('n');},'흙으로 빚은 토우. 오래된 박물관 출신.');
F('skeleton','해골',3,['#2a2a36','#3a3a48','#e8e8f0'],d=>{d.hs([2,4],'W');d.vs([6,8],'W');d.eye('W');d.set(10,2,'K');},'뼈만 남았어요. 근데 엄청 건강해요.',{pal:{o:'#0d0d12'}});
F('calavera','칼라베라',3,['#ffffff','#ffffff','#ff8fb8'],d=>{d.force([[9,2],[10,2],[11,2],[9,4],[11,4]],'K');d.pts([[5,2],[7,2],[5,5]],'P');d.pts([[6,4],[8,5]],'C');},'설탕 해골 분장을 한 예술가.');
F('whiteglow','백색',3,['#fffbe8','#ffffff','#f4ead0'],null,'우유처럼 하얀 물고기. 밤이 되면 무드등처럼 빛나요.',{glow:'#ffffff'});
F('glowy','야광',3,['#b8ff8a','#e8ffd0','#7ad05a'],d=>d.checker(0,'M'),'각진 야광 물고기. 밤에 환하게 빛나요.',{glow:'#b8ff8a'});
F('neon','네온사인',3,['#2a1a4a','#3a2a5a','#ff5af0'],d=>{d.vs([4,12],'P');d.hs([1,6],'C');d.eye('P');},'네온사인으로 만든 물고기. 밤이 되면 지잉 켜져요.',{glow:'#ff5af0',pal:{P:'#ff5af0',C:'#5af0ff'}});
F('hologram','홀로그램',3,['#8af0ff','#c8faff','#5ab0ff'],d=>d.hs([2,4,6],'Q'),'지지직… 반투명한 홀로그램이에요.',{beh:'holo'});
F('gamer','프로게이머',3,['#2b2b36','#e8394a','#1a1a22'],d=>{d.top(HAT.headset);d.pts([[6,3],[7,3]],'R');d.eye('W');},'헤드셋을 쓰고 팀 티셔츠를 입었어요.',{say:'GG'});
F('mouse','게이밍 마우스',3,['#2b2b36','#3a3a48','#9b5de5'],d=>{d.vs([7],'C');d.eye('P');},'RGB로 빛나는 마우스 물고기. 딸깍딸깍.',{glow:'#9b5de5',say:'딸깍'});
F('pc','게이밍 PC',3,['#3a3a48','#4a4a5a','#5ad0e8'],d=>{d.force([[5,2],[6,3],[7,2],[5,4],[7,4],[6,5]],'R');d.set(6,3,'A');d.set(5,4,'M');d.set(7,4,'C');},'몸속에서 무지개 팬이 돌아가요. 낮에도 번쩍!',{glow:'#ff5af0'});
F('astronaut','우주비행사',3,['#ffffff','#f4f4f4','#d4d9e2'],d=>{d.top(HAT.astronaut);d.pts([[6,3],[7,3]],'R');},'우주복을 입었어요. 치익… 여기는 어항, 응답하라.',{say:'치익…'});
F('snowboard','스노보더',3,['#ffd93a','#fff3a8','#3a6fe0'],d=>{d.force([[9,2],[10,2],[11,2],[12,2],[9,3],[11,3],[12,3]],'B');d.eye('Q');},'고글을 쓴 스노보더. 원래 얼음 속에 있었대요.');
F('watchman','파수꾼',3,['#c03030','#e86060','#5a3a1a'],d=>{d.top(["......EEEE....",".....EnnnnE..."]);d.force([[12,5],[13,5],[13,6]],'E');},'털모자에 도끼. 어항을 지켜요.');
F('rescuedog','구조견',3,['#c8905a','#f0d8b0','#8a5a2b'],d=>{d.top(HAT.cat);d.force([[11,5],[12,5]],'R');d.force([[9,3],[11,3]],'n');},'세인트 버나드. 길 잃은 물고기를 데려와요.',{say:'멍!'});
F('cleaner','창문닦이',3,['#ff9a2e','#ffd08a','#3a6fe0'],d=>{d.top(HAT.cap);d.vs([6],'B');},'창문을 닦는 물고기. 어항 유리도 닦아 줘요.');
F('concierge','컨시어지',3,['#e8394a','#ff8a8a','#ffcf3a'],d=>{d.top(["......RRRR....","......AAAA...."]);d.pts([[7,2],[7,4]],'A');},'엘리베이터 안내원. 몇 층 가세요?');
F('manager','매니저',3,['#3a4a9a','#6a7ac8','#ff9a2e'],d=>{d.top(["......OOO.....",".....OOOOO...."]);d.force([[9,3],[11,3]],'K');d.eye('W');},'뿔테 안경에 주황 머리. 회의는 짧게!');
F('ceo','CEO',3,['#2b2b36','#ffffff','#1a1a22'],d=>{d.top(HAT.bun);d.pts([[7,4],[7,5]],'R');d.eye('W');},'바쁜 대표님. 오늘도 휴가 결재 중.');
F('vacation','휴가',3,['#5ad0e8','#c8f6ff','#ffcf3a'],d=>{d.spots(4,'P');d.spots(3,'A');d.force(SH.shades,'S');},'하와이안 셔츠에 선글라스. 휴가 중!');
F('drunk','넥타이 직장인',3,['#ffffff','#f4f4f4','#3a6fe0'],d=>{d.top(["......RRRR....","........R....."]);d.set(11,4,'p');},'넥타이를 머리에 맸어요. 회식 다음 날.',{say:'딸꾹'});
F('cutline','절취선',3,['#f3e8c8','#fff8e0','#c8b890'],d=>{d.force([[4,2],[6,2],[8,2],[10,2]],'K');d.force([[5,5],[7,5],[9,5]],'K');},'여기를 자르시오. (자르지 마세요)');
F('plush','털인형',3,['#c8905a','#e0b080','#8a5a2b'],d=>{d.force([[10,2],[11,3],[11,2],[10,4]],'K');d.eye('n');d.pts([[6,3],[7,4]],'n');},'눈을 꿰맨 봉제 인형. 꼭 안아 주세요.');
F('candymachine','사탕 자판기',3,['#e8394a','#ff8a8a','#b8202e'],d=>{d.force([[5,1],[6,1],[7,1],[8,1],[9,1],[5,2],[6,2],[7,2],[8,2]],'Q');d.pts([[6,1],[8,2],[5,2]],'A');d.set(7,1,'P');},'동전을 넣으면 사탕이… 안 나와요.',{say:'짤그랑'});
F('nametag','이름표',3,['#ffd93a','#fff3a8','#f2b51f'],d=>{d.force([[7,4],[8,4],[9,4],[7,5],[8,5],[9,5]],'W');d.set(8,4,'K');},'목에 이름표를 달았어요. 이름을 지어 주면 더 좋아해요.');
F('victim','KICK ME',3,['#9b5de5','#c8a8ff','#6a3ab0'],d=>{d.force([[5,1],[6,1],[7,1],[5,2],[6,2],[7,2]],'W');d.set(6,2,'K');},'등에 "KICK ME" 쪽지가 붙었어요. 아무도 안 알려 줬대요.');
F('pincushion','바늘꽂이',3,['#e8394a','#ff8a8a','#3bb06a'],d=>{d.top(HAT.needle);d.spots(4,'E');},'바늘이 잔뜩 꽂혔어요. 풍선 친구를 조심!',{sharp:true});
F('santa','산타',3,['#e8394a','#ffffff','#b8202e'],d=>{d.top(HAT.santa);d.force([[11,4],[12,4],[11,5],[12,5],[10,5]],'W');},'호호호! 수염이 덥수룩해요.',{say:'호호호!'});
F('nutcracker','호두까기',3,['#e8394a','#ff8a8a','#2a2a6a'],d=>{d.top(HAT.nutcracker);d.force([[11,4],[12,4]],'K');d.force([[11,5],[12,5]],'W');d.pts([[6,3],[7,3],[8,3]],'A');},'콧수염과 턱수염. 사탕요정의 춤을 틀어 줘요.',{say:'♪'});
F('ornament','방울장식',3,['#ffcf3a','#fff3a0','#e0a020'],d=>{d.top(HAT.ornament);d.pts([[6,1],[5,2]],'W');d.hs([4],'R');},'트리에 매다는 반짝이 방울.');
F('plague','역병 의사',3,['#2b2b36','#3a3a48','#1a1a22'],d=>{d.top(HAT.tophat);d.force([[12,4],[13,4],[13,5]],'H');d.eye('A');},'새부리 마스크를 썼어요. 꽥꽥 소리가 울려요.',{pal:{o:'#0d0d12'}});
F('mailbox','우표 엽서',3,['#c8e0ff','#e8f2ff','#3a6fe0'],d=>{d.pts([[5,2],[6,2],[8,4],[9,4]],'R');d.pts([[6,5],[7,5]],'A');},'좌표가 적힌 소인. 이탈리아 어딘가래요.',{flam:true});
F('pigbank','저금통 복어',3,['#ffb3c7','#ffe0ea','#ff8fae'],d=>{d.top(["......P..P...."]);d.force([[6,1],[7,1],[8,1]],'K');d.set(7,2,'Y');d.force([[12,4],[13,4]],'P');},'등에 동전 구멍. 누르면 짤랑짤랑. 누군가 노리고 있대요.',{beh:'piggy',say:'짤랑짤랑'});

/* ======== Lv4 — 특별한 능력이 있는 친구들 ======== */
F('magma','마그마',4,['#ff5a1a','#ffb040','#c02a00'],d=>{d.spots(5,'K');d.spots(3,'A');},'몸이 뜨거운 용암이에요. 닿으면 불이 붙어요!',{beh:'hot',glow:'#ff7a2a'});
F('firefighter','소방관',4,['#ffd93a','#fff3a8','#e8394a'],d=>{d.top(["......RRRR....",".....RRARRR..."]);d.hs([5],'A');},'불이 나면 출동! 가끔 물대포를 쏴요.',{beh:'water'});
F('clown','광대',4,['#ffffff','#ffffff','#e8394a'],d=>{d.top(["......R.G.B..."]);d.force([[12,4],[13,4]],'R');d.force([[9,2],[11,2]],'B');d.pts([[6,3],[7,4]],'A');},'빠라빠라~ 꽃에서 물을 찍 뿜어요.',{beh:'water',say:'빠앙!'});
F('watergun','물총',4,['#5ad0e8','#c8f6ff','#ff9a2e'],d=>{d.force([[12,5],[13,5],[13,4]],'O');d.top(HAT.cap);},'물총을 들었어요. 쏘는 게 너무 재밌어요.',{beh:'water'});
F('heli','헬리콥터 모자',4,['#ffd93a','#fff3a8','#f2b51f'],d=>d.top(HAT.propeller),'모자의 프로펠러로 날 수 있어요. 가끔 탈출해서 놀다 와요.',{beh:'heli',say:'부웅~'});
F('sub','잠수정',4,['#ffd93a','#fff3a8','#e0a020'],d=>{d.top(HAT.periscope);d.force([[6,3],[8,3]],'Q');d.pts([[6,4],[8,4]],'e');},'꼬리 프로펠러로 쌩! 가끔 엄청 빨라져요.',{beh:'dash'});
F('magP','양극',4,['#e8394a','#ff8a8a','#3a6fe0'],d=>d.pts(SH.plus,'W'),'음극 친구를 만나면 착 붙어요. 같은 양극끼리는 밀어내요.',{magnet:'N'});
F('magM','음극',4,['#3a6fe0','#8ab4ff','#e8394a'],d=>d.pts(SH.minus,'W'),'양극 친구를 만나면 착 붙어요.',{magnet:'S'});
F('bull','황소',4,['#2a2a33','#4a4a55','#1a1a22'],d=>{d.top(HAT.horns);d.set(10,3,'R');d.set(13,4,'Y');},'빨간색만 보면 참을 수가 없어요. 돌진!',{beh:'bull',pal:{o:'#0b0b10',W:'#f4efe0'},say:'음머!'});
F('thief','좀도둑',4,['#7d8a99','#d2d9e0','#5c6775'],d=>{d.top(["......KKKK...."]);d.force([[8,2],[9,2],[10,2],[11,2],[8,3],[9,3],[11,3],[12,3]],'K');d.eye('W');},'복면 쓴 좀도둑. 저금통에서 동전을 슬쩍! 물고 있을 때 누르면 "앗!"',{beh:'thief',say:'히히'});
F('arcade','오락기',4,['#5a5af0','#9a9aff','#3a3ac0'],d=>{d.force([[8,2],[9,2],[10,2],[11,2],[8,3],[11,3],[8,4],[9,4],[10,4],[11,4]],'K');d.force([[9,3],[10,3]],'s');d.force([[5,4],[5,5]],'Y');},'동전 투입구가 있어요. 누가 동전을 넣어 주면 띠리링♪',{beh:'arcade',pal:{s:'#6fffb0'},say:'삐빅'});
F('nerd','너드',4,['#ffd93a','#fff3a8','#3a6fe0'],d=>{d.force([[9,3],[11,3],[9,2],[11,2],[12,3]],'K');d.eye('W');d.set(12,5,'W');d.hs([5,6],'B');},'안경에 뻐드렁니. 좀도둑이 나타나면… 밤에 무언가로 변신해요!',{beh:'nerd'});
F('chameleon','카멜레온',4,['#c8f04a','#e8ffa0','#9ac020'],d=>d.spots(3,'W'),'다른 친구와 닿으면 그 색으로 변해요. 모자는 못 따라 해요.',{beh:'chameleon'});
F('puffer','가시복',4,['#f0d890','#fff4c8','#c8a850'],d=>{d.spots(6,'n');},'누가 닿으면 "폭!" 하고 부풀어요. 부푼 동안은 가시가 뾰족!',{beh:'puffer'});
F('slimeR','빨강 슬라임',4,['#ff6b7a','#ffffff','#ff6b7a'],null,'말랑말랑. 다른 색 슬라임과 부딪히면 합체!',{custom:SLIME,slime:'R',pal:{o:'#5a2030',l:'#ffffff'}});
F('slimeY','노랑 슬라임',4,['#ffd84a','#ffffff','#ffd84a'],null,'말랑말랑. 다른 색 슬라임과 부딪히면 합체!',{custom:SLIME,slime:'Y',pal:{o:'#6a5010',l:'#ffffff'}});
F('slimeB','파랑 슬라임',4,['#5aa9ff','#ffffff','#5aa9ff'],null,'말랑말랑. 다른 색 슬라임과 부딪히면 합체!',{custom:SLIME,slime:'B',pal:{o:'#1a3060',l:'#ffffff'}});
F('matry','마트료시카',4,['#ff9a2e','#ffe3b8','#3a6fe0'],d=>{d.top(["......OOOO...."]);d.force([[9,2],[10,2],[11,2],[11,3],[9,4],[10,4],[11,4],[9,3]],'H');d.pts([[5,3],[6,4],[5,5]],'B');d.set(11,4,'p');},'시간이 지나면 "뽁!" 하고 동생이 튀어나와요.',{beh:'matry',sis:'sis2'});
F('ninja','닌자',4,['#2b2b36','#3a3a48','#1a1a22'],d=>{d.force([[9,3],[11,3],[12,3]],'H');d.eye('K');d.hs([4],'R');},'말이 없어요. 가끔 수초만 남기고 사라져요. 찾아서 눌러 주세요!',{beh:'ninja',pal:{o:'#0d0d12'}});
F('disco','디스코볼',4,['#d4d9e2','#eef1f6','#9aa3b5'],d=>d.checker(1,'E'),'밤이 되면 빙글빙글 오색 빛을 뿌려요.',{beh:'disco'});
F('afro','아프로',4,['#ffd93a','#fff3a8','#e8394a'],d=>{d.top(HAT.afro);d.force(SH.shades,'S');},'디스코볼 근처에서 밤이 되면 제자리에서 빙글빙글 춤춰요.',{beh:'afro',say:'예~'});
F('flowerpot','화분',4,['#b8f0a0','#e0ffd0','#7ad05a'],d=>d.top(HAT.sprout),'머리에 새싹 화분. 비가 오면 방긋 꽃이 피어요.',{beh:'pot'});
F('firework','폭죽',4,['#1a1a2a','#2a2a40','#e8394a'],d=>{d.top(HAT.rocket);d.spots(5,'W');d.eye('W');},'등에 폭죽을 멨어요. 불이 닿으면 밤하늘에 펑펑!',{beh:'firework',pal:{o:'#0d0d12'}});
F('tesla','테슬라 코일',4,['#b8c0d0','#d8dee8','#6e7788'],d=>{d.top(HAT.tesla);d.vs([6,8],'e');},'머리가 테슬라 코일. 지지직 작은 번개가 튀어요.',{beh:'spark'});
F('knight','창기사',4,['#b8c0d0','#d8dee8','#3a6fe0'],d=>{d.top(HAT.plume);d.force([[9,3],[11,3],[12,3]],'e');d.eye('K');d.force([[12,5],[13,5]],'E');},'중세 기사. 창 끝이 뾰족해요.',{sharp:true});
F('knife','칼잡이',4,['#ffd93a','#fff3a8','#f2b51f'],d=>d.force([[12,5],[13,5],[13,4]],'E'),'날개에 칼을 들었지만 아무도 해치지 않아요. 풍선만 빼고요.',{sharp:true});
F('pinata','피냐타',4,['#ff8fb8','#ffe14a','#5ad0e8'],d=>{d.hs([1],'C');d.hs([2],'A');d.hs([4],'M');d.hs([6],'P');},'뾰족한 친구가 찌르면 사탕(코인)이 쏟아져요!',{beh:'pinata',pal:{M:'#9be07a'}});
F('balloon','풍선',4,['#ff6b7a','#ffb0b8','#ff6b7a'],d=>d.pts([[6,1],[5,2]],'W'),'오리 모양… 아니 물고기 모양 풍선. 뾰족한 건 무서워요!',{beh:'balloon',say:'뽀득'});
F('flamballoon','플라밍고 풍선',4,['#ffd93a','#fff3a8','#f2b51f'],d=>d.top(HAT.flamingo),'플라밍고 풍선을 들었어요. 터지면 울어요…',{beh:'flamballoon'});
F('cake','생일 케이크',4,['#8a5020','#ffd6e6','#5a3010'],d=>{d.top(HAT.candle);d.hs([3],'P');d.eye('W');},'촛불이 켜진 케이크. 촛불이 꺼지면 생일 축하 노래가!',{beh:'cake'});
F('party','파티 고깔',4,['#ff8fb8','#ffd6e6','#e05a8a'],d=>{d.top(HAT.partyhat);d.force([[12,4],[13,4]],'A');},'막대 폭죽을 들었어요. 불을 붙일 수 있어요!',{beh:'hot'});
F('octopus','문어',4,['#3a6fe0','#8ab4ff','#e8394a'],d=>{d.top(["......RRRR....",".....RRRRRR..."]);},'가끔 먹물을 뿜어요. 맞은 친구는 잠깐 까매져요.',{beh:'ink'});
F('scribbler','낙서쟁이',4,['#ffffff','#f4f4f4','#3a6fe0'],d=>{d.spots(5,'B');d.force([[12,5],[13,5]],'R');},'수성펜을 들었어요. 닿는 친구에게 낙서를 해요. 물이 닿으면 지워져요.',{beh:'scribble'});
F('boxer','권투선수',4,['#e8394a','#ff8a8a','#ffcf3a'],d=>{d.force([[12,5],[13,5],[12,6],[13,6]],'R');d.force([[9,3]],'V');},'한쪽 눈에 멍. 가끔 주먹을 휙!',{beh:'punch'});
F('shark','상어',4,['#8a9ab0','#e8eef5','#6a7a90'],d=>{d.top(HAT.shark);d.force([[11,5],[12,5]],'W');},'머리에 상어 지느러미. 가끔 엄청 빨리 헤엄쳐요. 두둥…',{beh:'dash',say:'두둥…'});
F('cyborg','사이보그',4,['#8ad0ff','#c8ecff','#9b5de5'],d=>{d.force([[9,3],[10,3],[11,3],[12,3]],'V');d.pts([[5,2],[6,2],[5,4]],'V');},'보라 바이저. 밤에 네온처럼 빛나요.',{glow:'#c88aff',pal:{V:'#b07aff'},say:'꽥.exe'});
F('mecha','폭발 로봇',4,['#e8394a','#ffe14a','#3a6fe0'],d=>{d.force([[9,2],[11,2]],'A');d.hs([5],'B');d.pts([[6,3],[7,3]],'W');},'배에서 태엽 미니 로봇을 꺼내요. 그런데 걔가 터져요!',{beh:'mecha'});
F('ghost','유령',4,['#ffffff','#ffffff','#e8e8f8'],d=>{d.force([[9,3],[11,3]],'K');d.eye('K');d.set(10,4,'T');},'투명해서 잘 안 보여요. 우는 소리가 나요.',{beh:'ghost',say:'우우~'});
F('gum','멜빵',4,['#ffffff','#3a6fe0','#3a6fe0'],d=>{d.vs([6,9],'B');},'풍선껌을 불다가 펑! 얼굴에 붙어요.',{beh:'gum'});
F('apple','사과',4,['#e8394a','#ff8a8a','#b8202e'],d=>{d.top(HAT.caterpillar);d.set(6,3,'n');},'머리 위 애벌레가 자라면… 나비가 돼요!',{beh:'apple',fruit:'#e8394a'});
F('musicbox','오르골',4,['#ff9cc2','#ffe0ec','#ffcf3a'],d=>{d.hs([1],'A');d.pts([[6,3],[8,3]],'A');},'누르면 뚜껑이 열리고 작은 공주가 빙글빙글 춤춰요.',{beh:'musicbox'});
F('tamagotchi','다마고치',4,['#ff9cc2','#ffe0ec','#e05a8a'],d=>{d.force([[8,2],[9,2],[10,2],[11,2],[8,3],[11,3],[8,4],[9,4],[10,4],[11,4]],'Q');d.force([[9,3],[10,3]],'K');},'머리가 다마고치예요. 자주 눌러서 키워 주세요.',{beh:'tama'});
F('clicker','클릭',4,['#ffd93a','#fff3a8','#f2b51f'],d=>d.pts([[6,2],[7,2],[6,3],[7,3]],'W'),'누를수록 숫자가 올라가요. 그게 다예요. 근데 재밌어요.',{beh:'clicker'});
F('crypto','암호화폐',4,['#ffcf3a','#fff3a0','#e0a020'],d=>{d.pts([[6,2],[7,2],[6,3],[8,3],[6,4],[8,4],[6,5],[7,5]],'n');},'몸에 D 로고. 누르면 코인을 채굴해요(조금).',{beh:'mine'});
F('racer','레이서',4,['#e8394a','#ff8a8a','#ffcf3a'],d=>{d.force([[5,4],[6,3],[7,4],[6,5]],'A');d.top(HAT.cap);},'불꽃 무늬 레이싱카. 가끔 부앙! 밤엔 헤드라이트가 켜져요.',{beh:'dash',lights:true,say:'빠앙!'});
F('peacock','공작',4,['#2a7ad0','#5ad0e8','#2a9a5a'],d=>{d.top(["....G.C.G.....","...GCGCGCG...."]);},'가끔 꼬리 깃을 활짝 펼쳐요.',{beh:'peacock',say:'꾸엥'});
F('window','창문',4,['#2b2b36','#3a3a48','#1a1a22'],d=>{d.force([[5,2],[6,2],[7,2],[5,3],[6,3],[7,3],[5,4],[6,4],[7,4]],'L');d.set(6,3,'K');d.eye('W');},'가슴에 창문. 안에서 누가 책을 읽고 있어요.',{pal:{o:'#0d0d12'},glow:'#fff6a0'});
F('bomb','폭탄',4,['#2b2b36','#3a3a48','#1a1a22'],d=>{d.top(["........A.....","........E....."]);d.force([[6,3],[7,3]],'R');d.eye('W');},'가슴의 타이머가 똑딱똑딱. 근데 안 터져요(아마도).',{beh:'tick',pal:{o:'#0d0d12'}});
F('diver','잠수부',4,['#c88a3a','#e0b070','#8a5a2b'],d=>{d.top(HAT.helmet);},'머구리 잠수복. 꽥꽥 소리가 헬멧에 울려요.',{say:'(꾸르륵)'});
F('ink2','먹물 오징어',4,['#ffe0ea','#fff4f8','#ff9cc2'],d=>d.spots(4,'P'),'문어의 사촌. 먹물은 안 쏘고 수줍어해요.');
F('tv','TV',4,['#6e7788','#9aa3b5','#3a3f55'],d=>{d.force([[8,1],[9,1],[10,1],[11,1],[8,2],[11,2],[8,3],[8,4],[11,4],[9,4],[10,4]],'K');d.force([[9,2],[10,2],[9,3],[11,3]],'Q');d.eye('K');},'머리가 TV. 친구랑 닿으면 화면 표정이 바뀌어요.',{beh:'tv'});

/* ======== Lv5 — 전설 ======== */
F('gold','황금',5,['#ffcf3a','#fff3a0','#e0a020'],d=>d.pts([[6,1],[5,2],[7,2]],'W'),'온몸이 황금. 도금이라는 소문이 있어요.',{sparkle:true});
F('rainbow','무지개',5,['#ff0000','#ffffff','#ffffff'],null,'비늘 색이 계속 바뀌는 전설의 물고기. 본 사람에게 행운이 온대요.',{rainbow:true,sparkle:true});
F('constellation','별자리',5,['#1a1a4a','#2a2a6a','#4a4a9a'],d=>{d.pts([[5,2],[7,1],[8,3],[6,4],[9,5],[11,4],[5,5]],'A');d.set(9,2,'W');d.eye('W');},'몸에 별자리가 그려졌어요. 밤에 별빛처럼 반짝여요.',{glow:'#fff6a0',sparkle:true,pal:{o:'#0d0d22'}});
F('secretbox','비밀상자',5,['#8a5a2b','#c8905a','#5a3a1a'],d=>{d.force([[5,2],[6,2],[7,2],[8,2]],'K');d.pts([[5,2],[6,2],[7,2],[8,2]],'A');d.force([[5,4],[6,4],[7,4]],'n');},'네 자리 숫자 자물쇠. 맞는 숫자를 이름으로 지어 주면…?',{beh:'secret'});
F('ufofish','UFO',5,['#b8c0d0','#d8dee8','#6e7788'],d=>{d.top(HAT.ufo);d.hs([4],'A');},'비행접시 물고기. 프로펠러 모자처럼 날 수 있어요.',{beh:'heli',glow:'#9fffe0',say:'삐릭삐릭'});
F('dragon','드래곤',5,['#3bb06a','#c8f0a0','#2a7d4a'],d=>{d.checker(0,'g');d.top([".........D.D..","........DD.DD."]);d.set(10,3,'R');},'비늘에 세로 동공. 가끔 불을 뿜어요. 나무 친구들 조심!',{beh:'dragon'});
F('unicorn','유니콘',5,['#ffffff','#ffe6f6','#c8a8ff'],d=>{d.top(HAT.unicorn);d.pts([[5,1],[6,2],[5,3]],'P');d.pts([[7,1],[8,2]],'C');},'반짝이는 뿔. 뾰족해서 풍선은 조심!',{sharp:true,sparkle:true});
F('witch','마녀',5,['#9b5de5','#c8a8ff','#3a1a5a'],d=>{d.top(HAT.witch);d.set(11,4,'M');},'밤이 되면 히히히 웃으며 마법 가루를 뿌려요.',{beh:'witch',sparkle:true,say:'히히히!'});

/* ======== 비밀 (특별한 조건으로만) ======== */
F('alien','외계 물고기',4,['#7be35a','#c8ff9a','#4fb83a'],d=>{d.top(HAT.antenna);d.force([[10,2],[11,3]],'K');},'어느 날 UFO가 두고 간 친구. 고향 별 얘기는 비밀이래요.',{secret:true,hint:'밤하늘에서 무언가가 내려올 때…',say:'뀨?'});
F('super','슈퍼 너드',4,['#3a6fe0','#e8394a','#e8394a'],d=>{d.force([[9,2],[10,2],[11,2],[9,3],[11,3],[12,3]],'R');d.eye('W');d.pts(SH.star,'A');},'좀도둑이 있으면 밤에 변신하는 정의의 물고기!',{secret:true,hint:'너드와 좀도둑이 함께 밤을 맞으면…'});
F('sis2','둘째 자매',4,['#5ad0e8','#c8f6ff','#e8394a'],d=>{d.force([[9,2],[10,2],[11,2],[11,3],[9,4],[10,4],[11,4],[9,3]],'H');d.pts([[5,3],[6,4],[5,5]],'R');d.set(11,4,'p');},'마트료시카에서 튀어나온 둘째. 언니보다 조금 작은 기분.',{secret:true,hint:'마트료시카를 기다려 보세요.',beh:'matry',sis:'sis3'});
F('sis3','셋째 자매',4,['#ff8fb8','#ffe0ec','#3bb06a'],d=>{d.force([[9,2],[10,2],[11,2],[11,3],[9,4],[10,4],[11,4],[9,3]],'H');d.pts([[5,3],[6,4],[5,5]],'G');d.set(11,4,'p');},'막내. 더 이상은 안 나와요(진짜로).',{secret:true,hint:'둘째 자매도 기다려 보세요.'});
F('butterfly','나비 사과',4,['#e8394a','#ff8a8a','#b8202e'],d=>{d.top(HAT.butterfly);d.set(6,3,'n');},'애벌레가 나비가 됐어요!',{secret:true,hint:'사과의 애벌레가 자라면…'});
F('ship','병 속의 배',4,['#a87040','#d8a878','#ffffff'],d=>{d.top(["........W.....","........WW....","........K....."]);d.hs([5,6],'N');},'유리병이 깨지면서 나온 작은 배. 선장님도 타고 있어요.',{secret:true,hint:'유리병이 깨지면…'});
F('kingslime','왕 슬라임',5,['#ffffff','#e0f4ff','#ffffff'],null,'세 슬라임이 하나로! 하얗고 말랑해요.',{secret:true,custom:SLIME,slime:'RYB',hint:'슬라임 셋이 힘을 합치면…',pal:{o:'#7a8aa0',l:'#e0f4ff'}});
F('slimeRY','주황 슬라임',4,['#ff9f4a','#ffffff','#ff9f4a'],null,'',{hidden:true,custom:SLIME,slime:'RY',pal:{o:'#6a3010'}});
F('slimeYB','초록 슬라임',4,['#6fd36f','#ffffff','#6fd36f'],null,'',{hidden:true,custom:SLIME,slime:'YB',pal:{o:'#1a5020'}});
F('slimeRB','보라 슬라임',4,['#b07aff','#ffffff','#b07aff'],null,'',{hidden:true,custom:SLIME,slime:'RB',pal:{o:'#3a2060'}});
F('bloomed','꽃 핀 화분',4,['#b8f0a0','#e0ffd0','#7ad05a'],d=>d.top(HAT.bloom),'',{hidden:true,beh:'pot'});
F('popped','터진 풍선',4,['#ff6b7a','#ffb0b8','#ff6b7a'],d=>{d.hs([1,2],'.');d.eye('T');},'',{hidden:true});

// 준비
const SP={};
for(const s of FISH){
  s.frames=makeFrames(s.id,s.deco,s.custom);
  s.topH=s.frames.A.length-(s.custom?s.custom.A.length:8);
  if(s.slime==='RYB') s.scale=1; // 크기는 모두 같아요
  SP[s.id]=s;
}
const DEX=FISH.filter(s=>!s.hidden);
const BY_LV=lv=>FISH.filter(s=>s.lv===lv&&!s.secret&&!s.hidden);
