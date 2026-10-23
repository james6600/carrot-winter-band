"use strict";
/* =========================================================
   당근 겨울밴드 매칭소 — 프론트엔드
   ========================================================= */

/* ---------- 데이터 정의 ---------- */
const GENRES = [
  {k:"brit",n:"브리티시락"},{k:"modern",n:"모던락"},{k:"indie",n:"인디락"},{k:"punk",n:"펑크"},
  {k:"emo",n:"이모/팝펑크"},{k:"grunge",n:"그런지"},{k:"hardcore",n:"하드코어"},{k:"metal",n:"메탈"},
  {k:"hardrock",n:"하드록"},{k:"blues",n:"블루스"},{k:"jazz",n:"재즈/펑크"},{k:"ballad",n:"발라드"},
  {k:"kpop",n:"K-pop"},{k:"jrock",n:"J-rock/J-pop"},{k:"citypop",n:"시티팝"},{k:"folk",n:"포크/어쿠스틱"},
];
const GENRE_NAME = Object.fromEntries(GENRES.map(g=>[g.k,g.n]));

const PARTS = [
  {k:"vocal",n:"보컬",e:"🎤"},{k:"guitar",n:"기타",e:"🎸"},{k:"bass",n:"베이스",e:"🎵"},
  {k:"drum",n:"드럼",e:"🥁"},{k:"keys",n:"키보드",e:"🎹"},{k:"etc",n:"그 외 악기",e:"✨"},
];
const PART = Object.fromEntries(PARTS.map(p=>[p.k,p]));
const partLabel = k => PART[k] ? PART[k].e+" "+PART[k].n : k;
const CORE = ["vocal","guitar","bass","drum"];

const GROUP_OF = {
  brit:"brit", modern:"brit",
  punk:"punkish", emo:"punkish", hardcore:"punkish", grunge:"punkish",
  metal:"heavy", hardrock:"heavy",
  indie:"indie", folk:"indie", citypop:"indie",
  jazz:"soul", blues:"soul",
  kpop:"pop", ballad:"pop",
  jrock:"jrockg",
};
const STYLES = {
  brit:   {e:"🎩", n:"눈보라의 브릿팝 마법사", band:"눈보라 브릿 클럽",
    d:"눈 내리는 밤, 원더월을 흥얼거리는 낭만파. 떼창 유발 멜로디에 약한 당신, 합주실의 분위기 메이커예요.", mate:"벽난로의 블루스 현자"},
  punkish:{e:"⚡", n:"얼음폭풍 펑크 폭주족", band:"얼음폭풍 펑크단",
    d:"파워코드 세 개면 겨울도 녹여버리는 에너지! 템포는 빠르게, 고민은 짧게. 무대 위에서 제일 뜨거운 타입이에요.", mate:"서리거인 메탈 기사"},
  heavy:  {e:"🗡️", n:"서리거인 메탈 기사", band:"서리거인 메탈단",
    d:"묵직한 리프와 드라마틱한 전개의 수호자. 한 곡을 파고드는 집요함이 합주 완성도를 끌어올려요.", mate:"얼음폭풍 펑크 폭주족"},
  indie:  {e:"🌲", n:"겨울숲 인디 음유시인", band:"겨울숲 인디밴드",
    d:"조용히 쌓이는 눈처럼 섬세한 사운드를 사랑하는 타입. 디테일에 진심이라 편곡 회의에서 빛나요.", mate:"첫눈의 멜로디 요정"},
  soul:   {e:"🔥", n:"벽난로의 블루스 현자", band:"벽난로 그루브단",
    d:"그루브와 여백을 아는 사람. 즉흥 연주에서 미소 짓는 당신 덕에 합주가 깊어져요.", mate:"눈보라의 브릿팝 마법사"},
  pop:    {e:"🌨️", n:"첫눈의 멜로디 요정", band:"첫눈 멜로디단",
    d:"좋은 멜로디 앞에서 장르 불문 무장해제! 듣는 사람을 먼저 생각하는, 셋리스트의 중심이에요.", mate:"겨울숲 인디 음유시인"},
  jrockg: {e:"☃️", n:"설국의 제이락 여행자", band:"설국 제이락단",
    d:"질주하는 기타와 애절한 멜로디의 공존을 아는 타입. 카피 욕심 많은 당신, 레퍼토리 부자예요.", mate:"얼음폭풍 펑크 폭주족"},
};

/* ---------- 합주 시간 (lib/util.js와 같은 값) ---------- */
const SLOT_HOURS = [10,12,14,16,18,20,22];
const RANGE_START = "2026-11-01";
const RANGE_END = "2026-12-31";
const DOW = ["일","월","화","수","목","금","토"];

function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function pd(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
const inRange = s => s>=RANGE_START && s<=RANGE_END;
const WEEKS = (()=>{
  const start = pd(RANGE_START); start.setDate(start.getDate()-((start.getDay()+6)%7));
  const end = pd(RANGE_END), out = [], d = new Date(start);
  while (d<=end){ const w=[]; for (let i=0;i<7;i++){ w.push(ymd(d)); d.setDate(d.getDate()+1); } out.push(w); }
  return out;
})();
const ALL_DAYS = WEEKS.flat().filter(inRange);
const slotKey = (day,h) => day+"@"+String(h).padStart(2,"0");
function slotLabel(k){
  const [day,h]=k.split("@"); const d=pd(day);
  return (d.getMonth()+1)+"/"+d.getDate()+"("+DOW[d.getDay()]+") "+Number(h)+"–"+(Number(h)+2)+"시";
}
function weekLabel(w){
  const days=w.filter(inRange); const a=pd(days[0]), b=pd(days[days.length-1]);
  return (a.getMonth()+1)+"/"+a.getDate()+" – "+(b.getMonth()+1)+"/"+b.getDate();
}
const weekIndexOf = day => Math.max(0, WEEKS.findIndex(w=>w.includes(day)));
function defaultWeek(){
  const t = ymd(new Date());
  if (t < RANGE_START) return Math.max(0, WEEKS.findIndex(w=>w.filter(inRange).length>=4));
  if (t > RANGE_END) return WEEKS.length-1;
  return weekIndexOf(t);
}
function intersectAll(arrs){
  if (!arrs.length) return [];
  let cur = new Set(arrs[0]);
  for (const a of arrs.slice(1)){ const s=new Set(a); cur = new Set([...cur].filter(x=>s.has(x))); }
  return [...cur].sort();
}

/* ---------- 유틸 ---------- */
const $ = id => document.getElementById(id);
function norm(s){ return (s||"").normalize("NFC").toLowerCase().replace(/[\s\-_.·'’!?&,()\[\]]/g,""); }
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
const isAdminId = id => norm(id)==="admin";
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

async function api(path, body){
  const r = await fetch("/api/"+path, body ? {
    method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body)
  } : undefined);
  let d = {};
  try{ d = await r.json(); }catch(e){}
  if (!r.ok){ d.status = r.status; throw d; }
  return d;
}
function errText(e){
  if (e && (e.error==="wrong_pw"||e.error==="wrong_token")) return "비밀번호가 달라요. 처음이라면 다른 아이디를 써보세요.";
  return "앗, 저장에 실패했어요. 잠시 후 다시 시도해 주세요.";
}
let toastTimer = null;
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.hidden=true; },2400);
}
function memberPartsText(m, sep){
  return (m.parts||[]).map(k=> k==="etc" && m.partEtc ? m.partEtc : (PART[k]?PART[k].n:k)).join(sep||"·");
}

/* ---------- 그림 ---------- */
let svgN = 0;
function carrotSVG(size){
  const u = "c"+(++svgN);
  return '<svg viewBox="0 0 120 140" width="'+size+'" height="'+Math.round(size*140/120)+'" role="img" aria-label="당근 마법사">'
  +'<defs><linearGradient id="cg'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa35c"/><stop offset="1" stop-color="#e5671c"/></linearGradient>'
  +'<linearGradient id="hg'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d5bd0"/><stop offset="1" stop-color="#4636a3"/></linearGradient></defs>'
  +'<path d="M60 38 C84 38 92 58 88 82 C84 108 72 130 60 134 C48 130 36 108 32 82 C28 58 36 38 60 38 Z" fill="url(#cg'+u+')"/>'
  +'<path d="M44 70 q6 4 12 0 M58 92 q6 4 12 0 M46 108 q5 3 10 0" stroke="#c4551a" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
  +'<path d="M38 56 Q60 68 82 56 L80 66 Q60 76 40 66 Z" fill="#c23d35"/>'
  +'<path d="M40 61 Q60 72 80 61" stroke="#f4efe6" stroke-width="2" fill="none" opacity=".8"/>'
  +'<rect x="66" y="62" width="9" height="20" rx="4" fill="#c23d35"/>'
  +'<ellipse cx="60" cy="40" rx="34" ry="8" fill="url(#hg'+u+')"/>'
  +'<path d="M60 0 C74 14 80 28 82 40 L38 40 C40 28 46 14 60 0 Z" fill="url(#hg'+u+')"/>'
  +'<path d="M40 32 L80 32 L82 40 L38 40 Z" fill="#f2c35e"/>'
  +'<circle cx="66" cy="14" r="2.2" fill="#ffd970"/><circle cx="54" cy="24" r="1.6" fill="#ffd970"/>'
  +'<path d="M72 22 l1.4 2.8 3 .4 -2.2 2.1 .6 3 -2.8-1.5 -2.8 1.5 .6-3 -2.2-2.1 3-.4 Z" fill="#ffd970"/>'
  +'<circle cx="50" cy="54" r="3.4" fill="#2b1708"/><circle cx="70" cy="54" r="3.4" fill="#2b1708"/>'
  +'<circle cx="51.2" cy="52.8" r="1.1" fill="#fff"/><circle cx="71.2" cy="52.8" r="1.1" fill="#fff"/>'
  +'<path d="M54 61 Q60 66 66 61" stroke="#2b1708" stroke-width="2.5" fill="none" stroke-linecap="round"/>'
  +'<ellipse cx="43" cy="60" rx="4" ry="2.6" fill="#ff9d7a" opacity=".7"/><ellipse cx="77" cy="60" rx="4" ry="2.6" fill="#ff9d7a" opacity=".7"/>'
  +'<line x1="90" y1="96" x2="106" y2="66" stroke="#8a5a2b" stroke-width="4" stroke-linecap="round"/>'
  +'<path d="M106 58 l2 4.2 4.6.6 -3.4 3.2 .9 4.6 -4.1-2.3 -4.1 2.3 .9-4.6 -3.4-3.2 4.6-.6 Z" fill="#ffd970"/>'
  +'</svg>';
}
function carrotMini(){
  return '<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">'
  +'<path d="M12 7 C16 7 17.5 10 16.8 14 C16.1 18 13.8 21 12 21.6 C10.2 21 7.9 18 7.2 14 C6.5 10 8 7 12 7 Z" fill="#fff"/>'
  +'<path d="M10.5 6.6 C9.8 4.4 10.4 2.8 12 2 C12 4 11.7 5.4 11.3 6.6 Z" fill="#d6f5d6"/>'
  +'<path d="M13 6.8 C13.4 4.9 14.8 3.6 16.2 3.6 C15.5 5.3 14.4 6.2 13.6 7 Z" fill="#b5e8b5"/>'
  +'</svg>';
}
function hollySVG(cls){
  return '<svg class="holly '+cls+'" viewBox="0 0 60 40" aria-hidden="true">'
  +'<path d="M30 20 C20 6 8 10 4 4 C8 14 4 22 10 26 C16 22 24 26 30 20Z" fill="#3f8c63"/>'
  +'<path d="M30 20 C40 6 52 10 56 4 C52 14 56 22 50 26 C44 22 36 26 30 20Z" fill="#2c6b49"/>'
  +'<circle cx="27" cy="24" r="4" fill="#d4483f"/><circle cx="34" cy="25" r="4" fill="#e0574d"/><circle cx="30" cy="30" r="4" fill="#c23d35"/></svg>';
}
const BULBS = ["#ffcf5a","#ff5a4f","#6fd38a","#7ab3ff","#ff9a3c"];
function lightsSVG(){
  const W=2400, n=40, seg=W/n; let wire="M0 5", bulbs="";
  for (let i=0;i<n;i++){
    const x0=i*seg, mx=x0+seg/2;
    wire += " Q"+mx+" 25 "+(x0+seg)+" 5";
    const c = BULBS[i%BULBS.length], dl = ((i*0.43)%2.6).toFixed(2);
    bulbs += '<circle class="bulb-halo" style="animation-delay:'+dl+'s" cx="'+mx+'" cy="24" r="11" fill="'+c+'" filter="url(#lb)"/>'
      +'<rect x="'+(mx-2)+'" y="14" width="4" height="4" rx="1" fill="#4a4236"/>'
      +'<ellipse class="bulb" style="animation-delay:'+dl+'s" cx="'+mx+'" cy="23.5" rx="4" ry="5.6" fill="'+c+'"/>';
  }
  return '<svg viewBox="0 0 '+W+' 42" preserveAspectRatio="xMidYMin slice">'
    +'<defs><filter id="lb" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="4"/></filter></defs>'
    +'<path d="'+wire+'" stroke="#2a3b2c" stroke-width="2" fill="none"/>'+bulbs+'</svg>';
}

/* 크리스마스 무대 위 당근 밴드 */
function carrotBody(scarf){
  return '<path d="M30 6 C45 6 52 19 50 34 C48 51 39 70 30 76 C21 70 12 51 10 34 C8 19 15 6 30 6 Z" fill="url(#stg-carrot)"/>'
  +'<path d="M17 46 q5 3 10 0 M33 58 q5 3 9 0 M21 66 q4 2 8 0" stroke="#c4551a" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>'
  +'<circle cx="23" cy="25" r="2.7" fill="#2b1708"/><circle cx="37" cy="25" r="2.7" fill="#2b1708"/>'
  +'<circle cx="24" cy="24" r=".9" fill="#fff"/><circle cx="38" cy="24" r=".9" fill="#fff"/>'
  +'<path d="M26 31 Q30 35 34 31" stroke="#2b1708" stroke-width="2" fill="none" stroke-linecap="round"/>'
  +'<ellipse cx="18.5" cy="30" rx="3.2" ry="2" fill="#ff8e74" opacity=".75"/><ellipse cx="41.5" cy="30" rx="3.2" ry="2" fill="#ff8e74" opacity=".75"/>'
  +'<path d="M12 37 Q30 47 48 37 L47 44 Q30 53 13 44 Z" fill="'+scarf+'"/>'
  +'<path d="M14 41 Q30 49 46 41" stroke="#f4efe6" stroke-width="1.4" fill="none" opacity=".55"/>'
  +'<rect x="35" y="41" width="7" height="15" rx="3" fill="'+scarf+'"/>';
}
const HATS = {
  wizard: '<path d="M30 -32 C36 -20 42 -6 46 8 L14 8 C18 -6 24 -20 30 -32 Z" fill="#5a46c6"/>'
    +'<path d="M30 -32 C34 -35 41 -33 43 -27" stroke="#5a46c6" stroke-width="4" fill="none" stroke-linecap="round"/>'
    +'<ellipse cx="30" cy="9" rx="23" ry="5.5" fill="#3f309a"/>'
    +'<path d="M15.5 3 L44.5 3 L46 8 L14 8 Z" fill="#f2c35e"/>'
    +'<path d="M27 -12 l1.5 3 3.2.4 -2.3 2.2.6 3.2 -3-1.6 -3 1.6.6-3.2 -2.3-2.2 3.2-.4z" fill="#ffd970"/>'
    +'<circle cx="35" cy="-20" r="1.4" fill="#ffd970"/><circle cx="23" cy="-2" r="1.1" fill="#ffd970"/>',
  santa: '<path d="M11 10 Q18 -14 42 -16 Q55 -15 57 -2 L50 9 Z" fill="#d4483f"/>'
    +'<circle cx="57" cy="-2" r="5" fill="#f4efe6"/><rect x="8" y="5" width="46" height="9" rx="4.5" fill="#f4efe6"/>',
  beanie: '<path d="M12 12 Q12 -8 30 -8 Q48 -8 48 12 Z" fill="#3f8c63"/>'
    +'<path d="M17 -1 L43 -1 M14 5 L46 5" stroke="#f4efe6" stroke-width="2" opacity=".6"/>'
    +'<rect x="10" y="7" width="40" height="9" rx="4.5" fill="#2c6b49"/><circle cx="30" cy="-9" r="6" fill="#f4efe6"/>',
  muffs: '<path d="M26 8 C23 -2 26 -9 31 -12 C31 -4 30 2 29 8Z" fill="#7ed37e"/>'
    +'<path d="M33 9 C34 0 39 -5 45 -5 C42 1 38 5 35 10Z" fill="#5cb85c"/>'
    +'<path d="M10 22 Q30 -8 50 22" stroke="#d4483f" stroke-width="4" fill="none" stroke-linecap="round"/>'
    +'<circle cx="10" cy="24" r="7" fill="#f4efe6" stroke="#d4483f" stroke-width="2"/>'
    +'<circle cx="50" cy="24" r="7" fill="#f4efe6" stroke="#d4483f" stroke-width="2"/>',
};
const ARM = 'stroke="#e8772a" stroke-width="5" fill="none" stroke-linecap="round"';
function seeded(n){ let s=n; return ()=>{ s=(s*9301+49297)%233280; return s/233280; }; }
function stageSVG(){
  const qb=(p0,p1,p2,t)=>[(1-t)*(1-t)*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0], (1-t)*(1-t)*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]];
  let lights="", orn="", snow="";
  for (let i=1;i<16;i++){
    const [x,y]=qb([40,146],[210,58],[380,146],i/16); const c=BULBS[i%BULBS.length];
    const dl=((i*0.37)%2.6).toFixed(2);
    lights += '<circle class="bulb-halo" style="animation-delay:'+dl+'s" cx="'+x.toFixed(1)+'" cy="'+(y+7).toFixed(1)+'" r="9" fill="'+c+'" filter="url(#stg-blur)"/>'
      +'<rect x="'+(x-1.8).toFixed(1)+'" y="'+(y-.5).toFixed(1)+'" width="3.6" height="3" rx="1" fill="#3a3428"/>'
      +'<ellipse class="bulb" style="animation-delay:'+dl+'s" cx="'+x.toFixed(1)+'" cy="'+(y+6).toFixed(1)+'" rx="3.2" ry="4.4" fill="'+c+'"/>';
  }
  for (let i=1;i<10;i++){
    const [x,y]=qb([26,134],[210,20],[394,134],i/10);
    const c = i%3===0 ? "#f2c35e" : i%3===1 ? "#d4483f" : "#e9e3d8";
    orn += '<line x1="'+x.toFixed(1)+'" y1="'+(y+3).toFixed(1)+'" x2="'+x.toFixed(1)+'" y2="'+(y+10).toFixed(1)+'" stroke="#c9b48a" stroke-width="1"/>'
      +'<circle cx="'+x.toFixed(1)+'" cy="'+(y+14).toFixed(1)+'" r="4.6" fill="'+c+'"/>'
      +'<circle cx="'+(x-1.5).toFixed(1)+'" cy="'+(y+12.5).toFixed(1)+'" r="1.3" fill="#fff" opacity=".7"/>';
  }
  const rnd = seeded(7);
  for (let i=0;i<46;i++){
    const x=24+rnd()*372, y=60+rnd()*200, r=.6+rnd()*1.5;
    snow += '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r.toFixed(2)+'" fill="#fff" opacity="'+(.25+rnd()*.5).toFixed(2)+'"/>';
  }
  const ch = (x,y,s,inner)=>'<g transform="translate('+x+' '+y+') scale('+s+')">'+inner+'</g>';

  const drummer = ch(238,172,.85,
    '<path d="M13 40 Q2 52 -6 60" '+ARM+'/><path d="M47 40 Q62 46 68 50" '+ARM+'/>'
    + carrotBody("#2c6b49") + HATS.beanie
    + '<line x1="-6" y1="60" x2="-20" y2="74" stroke="#e9d5ad" stroke-width="2.4" stroke-linecap="round"/>'
    + '<line x1="68" y1="50" x2="82" y2="38" stroke="#e9d5ad" stroke-width="2.4" stroke-linecap="round"/>');
  const drums =
    '<line x1="214" y1="214" x2="214" y2="284" stroke="#8d8676" stroke-width="2"/>'
   +'<ellipse cx="214" cy="213" rx="15" ry="3" fill="#e7bf5a"/><ellipse cx="214" cy="216" rx="15" ry="3" fill="#c99b35"/>'
   +'<line x1="306" y1="206" x2="306" y2="284" stroke="#8d8676" stroke-width="2"/>'
   +'<ellipse cx="306" cy="203" rx="18" ry="3.6" fill="#f0c862" transform="rotate(-10 306 203)"/>'
   +'<rect x="211" y="236" width="32" height="11" rx="2" fill="#d4483f"/><ellipse cx="227" cy="236" rx="16" ry="4.5" fill="#efe6d6"/>'
   +'<line x1="227" y1="247" x2="219" y2="284" stroke="#8d8676" stroke-width="2"/><line x1="227" y1="247" x2="235" y2="284" stroke="#8d8676" stroke-width="2"/>'
   +'<rect x="286" y="234" width="24" height="30" rx="3" fill="#d4483f"/><ellipse cx="298" cy="234" rx="12" ry="3.6" fill="#efe6d6"/>'
   +'<circle cx="262" cy="254" r="30" fill="#2a2030" stroke="#e1bd6c" stroke-width="3"/>'
   +'<circle cx="262" cy="254" r="24" fill="#f3ead9"/>'
   +'<path d="M262 241 C268 241 270 246 269 251 C268 257 265 262 262 264 C259 262 256 257 255 251 C254 246 256 241 262 241Z" fill="#ff7a2f"/>'
   +'<path d="M260 240 C259 236 261 233 263 232 C263 235 262 237 262 240Z" fill="#3f8c63"/>'
   +'<text x="262" y="276" text-anchor="middle" font-family="Cinzel,serif" font-weight="700" font-size="6.5" fill="#7d1d22" letter-spacing="1.2">JAM</text>'
   +'<rect x="240" y="221" width="22" height="13" rx="3" fill="#d4483f"/><ellipse cx="251" cy="221" rx="11" ry="3.2" fill="#efe6d6"/>';
  const keyboardist = ch(318,190,.95,
    '<path d="M14 42 Q8 52 10 60" '+ARM+'/><path d="M46 42 Q52 52 50 60" '+ARM+'/>'
    + carrotBody("#5a46c6") + HATS.muffs);
  let keys = '<line x1="310" y1="256" x2="384" y2="292" stroke="#5d5566" stroke-width="3"/>'
    +'<line x1="384" y1="256" x2="310" y2="292" stroke="#5d5566" stroke-width="3"/>'
    +'<rect x="298" y="244" width="96" height="13" rx="3" fill="#1d1822" stroke="#3d3546"/>'
    +'<rect x="302" y="248" width="88" height="6" fill="#f4efe6"/>';
  for (let x=305;x<388;x+=7){ if ((x-305)/7%7!==2 && (x-305)/7%7!==6) keys += '<rect x="'+x+'" y="248" width="3" height="3.6" fill="#1d1822"/>'; }
  keys += '<circle cx="306" cy="246.5" r="1" fill="#ff5a4f"/><circle cx="310" cy="246.5" r="1" fill="#6fd38a"/>';
  const guitarist = ch(60,198,1,
    '<path d="M46 40 Q60 36 66 33" '+ARM+'/>'
    + carrotBody("#d4483f") + HATS.santa
    + '<g transform="rotate(-24 30 54)">'
    + '<rect x="34" y="50" width="38" height="5" rx="1.5" fill="#8a5a2b"/>'
    + '<rect x="70" y="47.5" width="10" height="10" rx="2.5" fill="#2a2030"/>'
    + '<path d="M6 48 C6 39 16 37 22 42 C27 37 36 38 38 45 C42 50 40 61 31 63 C25 67 12 67 8 61 C4 57 4 52 6 48 Z" fill="#f0e6d2" stroke="#7d1d22" stroke-width="1.5"/>'
    + '<path d="M13 50 C17 47 23 48 25 52 C27 57 23 60 17 60 C12 60 10 55 13 50Z" fill="#d4483f"/>'
    + '<rect x="27" y="50" width="2.4" height="9" fill="#2a2030"/>'
    + '<path d="M10 53.5 L78 52.5" stroke="#bfb39b" stroke-width=".7"/></g>'
    + '<path d="M14 40 Q4 50 16 58" '+ARM+'/>');
  const vocalist = ch(138,188,1.15,
    '<path d="M13 40 Q2 32 -2 22" '+ARM+'/>'
    + '<line x1="-2" y1="22" x2="-12" y2="4" stroke="#8a5a2b" stroke-width="2.6" stroke-linecap="round"/>'
    + '<path d="M-12 -4 l2 4.2 4.6.6 -3.4 3.2 .9 4.6 -4.1-2.3 -4.1 2.3 .9-4.6 -3.4-3.2 4.6-.6 Z" fill="#ffd970" class="float"/>'
    + carrotBody("#f2c35e") + HATS.wizard
    + '<path d="M47 40 Q56 34 62 28" '+ARM+'/>');
  const mic = '<line x1="224" y1="296" x2="214" y2="232" stroke="#9a93a3" stroke-width="2.6"/>'
    +'<line x1="214" y1="232" x2="203" y2="219" stroke="#9a93a3" stroke-width="2.4"/>'
    +'<rect x="194" y="210" width="8" height="12" rx="4" fill="#3a3443" transform="rotate(-40 198 216)"/>'
    +'<path d="M216 296 L232 296" stroke="#9a93a3" stroke-width="3" stroke-linecap="round"/>';
  const amp = '<rect x="24" y="246" width="38" height="40" rx="4" fill="#211b27" stroke="#3d3546"/>'
    +'<rect x="29" y="252" width="28" height="22" rx="2" fill="#2f2738"/>'
    +'<circle cx="43" cy="263" r="8" fill="#191520" stroke="#4a4155"/>'
    +'<circle cx="30" cy="279" r="1.4" fill="#f2c35e"/><circle cx="36" cy="279" r="1.4" fill="#f2c35e"/><circle cx="42" cy="279" r="1.4" fill="#f2c35e"/>';
  const gifts = '<rect x="372" y="282" width="20" height="16" rx="2" fill="#3f8c63"/><rect x="380" y="282" width="4" height="16" fill="#f2c35e"/>'
    +'<rect x="370" y="279" width="24" height="5" rx="1.5" fill="#2c6b49"/>'
    +'<path d="M382 279 C376 272 372 276 380 279 M382 279 C388 272 392 276 384 279" stroke="#f2c35e" stroke-width="2" fill="none"/>'
    +'<rect x="392" y="288" width="14" height="10" rx="1.5" fill="#d4483f"/><rect x="397.5" y="288" width="3" height="10" fill="#f4efe6"/>';
  const wreath = '<circle cx="210" cy="150" r="17" fill="none" stroke="#2c6b49" stroke-width="9"/>'
    +'<circle cx="210" cy="150" r="17" fill="none" stroke="#3f8c63" stroke-width="5" stroke-dasharray="4 5"/>'
    +'<circle cx="198" cy="141" r="2.4" fill="#d4483f"/><circle cx="223" cy="145" r="2.4" fill="#d4483f"/><circle cx="214" cy="133" r="2.2" fill="#f2c35e"/><circle cx="201" cy="160" r="2.2" fill="#f2c35e"/>'
    +'<path d="M210 166 C203 160 198 163 202 168 C205 171 208 168 210 166 C212 168 215 171 218 168 C222 163 217 160 210 166Z" fill="#d4483f"/>'
    +'<path d="M208 167 L204 178 M212 167 L216 178" stroke="#d4483f" stroke-width="3" stroke-linecap="round"/>';
  const notes = '<text x="112" y="182" font-size="15" fill="#f2c35e" class="float" style="animation-delay:.4s">♪</text>'
    +'<text x="240" y="150" font-size="13" fill="#f7e4bd" class="float" style="animation-delay:1.1s">♫</text>'
    +'<text x="360" y="176" font-size="14" fill="#f2c35e" class="float" style="animation-delay:1.8s">♪</text>';

  return '<svg viewBox="0 0 420 330" role="img" aria-label="크리스마스 무대 위에서 공연하는 당근 밴드: 마법사 모자 보컬, 산타 모자 기타, 비니 드럼, 귀마개 키보드">'
  +'<defs>'
  +'<linearGradient id="stg-carrot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffa35c"/><stop offset="1" stop-color="#e5671c"/></linearGradient>'
  +'<linearGradient id="stg-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1a22"/><stop offset="1" stop-color="#140f17"/></linearGradient>'
  +'<linearGradient id="stg-cur" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6e171c"/><stop offset=".5" stop-color="#b3312e"/><stop offset="1" stop-color="#6e171c"/></linearGradient>'
  +'<linearGradient id="stg-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a33"/><stop offset="1" stop-color="#3b2416"/></linearGradient>'
  +'<linearGradient id="stg-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3d6" stop-opacity=".22"/><stop offset="1" stop-color="#fff3d6" stop-opacity="0"/></linearGradient>'
  +'<radialGradient id="stg-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb66b" stop-opacity=".45"/><stop offset="1" stop-color="#ffb66b" stop-opacity="0"/></radialGradient>'
  +'<pattern id="stg-brick" width="26" height="13" patternUnits="userSpaceOnUse"><rect width="26" height="13" fill="none" stroke="#ffffff" stroke-opacity=".035"/><path d="M13 6.5 L13 13" stroke="#ffffff" stroke-opacity=".035"/></pattern>'
  +'<filter id="stg-blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>'
  +'</defs>'
  +'<rect width="420" height="330" fill="#120e15"/>'
  +'<path d="M18 330 L18 140 Q210 -2 402 140 L402 330 Z" fill="url(#stg-bg)"/>'
  +'<path d="M18 330 L18 140 Q210 -2 402 140 L402 330 Z" fill="url(#stg-brick)"/>'
  +snow
  +'<polygon points="160,60 112,292 236,292" fill="url(#stg-beam)"/><polygon points="262,60 196,292 330,292" fill="url(#stg-beam)"/>'
  +wreath
  +'<path d="M18 122 C64 114 92 92 104 70 C82 124 62 172 46 214 C40 244 42 270 46 300 L18 300 Z" fill="url(#stg-cur)"/>'
  +'<path d="M30 140 C34 200 30 250 32 300 M40 132 C46 190 42 250 40 300" stroke="#5a1015" stroke-width="2" fill="none" opacity=".6"/>'
  +'<path d="M402 122 C356 114 328 92 316 70 C338 124 358 172 374 214 C380 244 378 270 374 300 L402 300 Z" fill="url(#stg-cur)"/>'
  +'<path d="M390 140 C386 200 390 250 388 300 M380 132 C374 190 378 250 380 300" stroke="#5a1015" stroke-width="2" fill="none" opacity=".6"/>'
  +'<circle cx="46" cy="214" r="5" fill="#f2c35e"/><circle cx="374" cy="214" r="5" fill="#f2c35e"/>'
  +'<path d="M26 134 Q210 20 394 134" stroke="#24563b" stroke-width="12" fill="none" stroke-linecap="round"/>'
  +'<path d="M26 134 Q210 20 394 134" stroke="#3f8c63" stroke-width="6" fill="none" stroke-dasharray="3 6" stroke-linecap="round"/>'
  +orn
  +'<path d="M40 146 Q210 58 380 146" stroke="#2a3b2c" stroke-width="1.5" fill="none"/>'
  +lights
  +'<ellipse cx="210" cy="292" rx="190" ry="34" fill="url(#stg-glow)"/>'
  +'<path d="M14 288 Q210 266 406 288 L406 330 L14 330 Z" fill="url(#stg-floor)"/>'
  +'<path d="M14 288 Q210 266 406 288" stroke="#f2c35e" stroke-opacity=".5" stroke-width="2" fill="none"/>'
  +'<path d="M70 300 Q210 286 350 300 M40 312 Q210 296 380 312" stroke="#2b1a10" stroke-opacity=".5" stroke-width="1.2" fill="none"/>'
  +amp + drummer + drums + keyboardist + keys + guitarist + vocalist + mic + gifts + notes
  +'</svg>';
}

/* ---------- 눈 ---------- */
(function snow(){
  const cv=$("snow"), ctx=cv.getContext("2d");
  if (reduceMotion()) return;
  let W,H,flakes;
  function reset(){
    W=cv.width=innerWidth; H=cv.height=innerHeight;
    flakes=Array.from({length:70},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.5,v:Math.random()*.5+.2,d:Math.random()*.6-.3}));
  }
  reset(); addEventListener("resize",reset);
  (function tick(){
    if (!document.hidden){
      ctx.clearRect(0,0,W,H); ctx.fillStyle="#fff6ea";
      for (const f of flakes){
        ctx.globalAlpha=.15+f.r/4; ctx.beginPath(); ctx.arc(f.x,f.y,f.r,0,7); ctx.fill();
        f.y+=f.v; f.x+=f.d; if (f.y>H+4){ f.y=-4; f.x=Math.random()*W; }
      }
      ctx.globalAlpha=1;
    }
    requestAnimationFrame(tick);
  })();
})();

/* ---------- 상태 ---------- */
let me = null;                 // {id, slug, token, data}
let membersCache = [];
let pollTimer = null;
const artistMap = new Map();   // norm(name|alias) -> {name, genres}
let draft = null;
let currentView = "";
let schedDraft = null;
const VIEWS = ["view-offline","view-login","view-onboard","view-result","view-schedule","view-dash","view-admin"];
const isAdmin = () => !!me && isAdminId(me.id);

/* ---------- 네비게이션 ---------- */
function navItems(){
  if (!me) return [{v:"view-login",ic:"🏠",t:"처음으로"},{v:"view-dash",ic:"🔭",t:"모두의 음악"}];
  if (isAdmin()) return [{v:"view-admin",ic:"🗝️",t:"관리자"},{v:"view-dash",ic:"🔭",t:"모두의 음악"},{v:"logout",ic:"🚪",t:"나가기"}];
  return [{v:"view-result",ic:"🎩",t:"내 결과"},{v:"view-schedule",ic:"🗓️",t:"합주 시간"},{v:"view-dash",ic:"🔭",t:"모두의 음악"},{v:"logout",ic:"🚪",t:"나가기"}];
}
function renderNav(){
  const items = navItems();
  const active = currentView==="view-onboard" ? "view-result" : currentView;
  $("topnav").innerHTML = items.map(i=>'<button data-v="'+i.v+'" class="'+(i.v===active?"on":"")+'">'+esc(i.t)+'</button>').join("");
  $("tabbar").innerHTML = items.map(i=>'<button data-v="'+i.v+'" class="'+(i.v===active?"on":"")+'"><span class="ic">'+i.ic+'</span>'+esc(i.t)+'</button>').join("");
  $("tabbar").hidden = false;
  $("top-user").textContent = me ? me.id : "";
}
for (const id of ["topnav","tabbar"]){
  $(id).addEventListener("click", e=>{ const b=e.target.closest("button[data-v]"); if (b) goTo(b.dataset.v); });
}
function show(view){
  currentView = view;
  for (const v of VIEWS) $(v).hidden = (v!==view);
  renderNav();
  window.scrollTo(0,0);
}
function goTo(v){
  if (v==="logout") return logout();
  if (v==="view-login"){ show("view-login"); return; }
  if (v==="view-dash"){ renderDash(); show("view-dash"); loadMembers(); return; }
  if (v==="view-admin"){ renderAdmin(); show("view-admin"); return; }
  if (v==="view-schedule"){ openSchedule(); return; }
  if (v==="view-result"){
    if (!me) return show("view-login");
    if (!me.data.done) return startOnboarding();
    renderResult(false); show("view-result"); return;
  }
}
$("brand").addEventListener("click", ()=>{ if (!me) goTo("view-login"); else goTo(isAdmin() ? "view-admin" : "view-result"); });
$("cta-start").addEventListener("click", ()=>{ $("login-anchor").scrollIntoView({behavior:reduceMotion()?"auto":"smooth", block:"center"}); setTimeout(()=>$("login-id").focus(), 350); });
$("cta-browse").addEventListener("click", ()=>goTo("view-dash"));

/* ---------- 부팅 ---------- */
(async function boot(){
  $("lights").innerHTML = lightsSVG();
  $("logo-slot").innerHTML = carrotMini();
  $("stage-art").innerHTML = stageSVG();
  $("char-offline").innerHTML = carrotSVG(96);
  show("view-login");
  $("login-err").textContent = "연결 중…";
  try{
    const d = await api("artists");
    for (const a of (d.artists||[])){
      if (!a || !a.name) continue;
      const entry = {name:a.name, genres:(a.genres||[]).filter(k=>GENRE_NAME[k])};
      artistMap.set(norm(a.name), entry);
      for (const al of (a.aliases||[])) if (!artistMap.has(norm(al))) artistMap.set(norm(al), entry);
    }
    $("login-err").textContent = "";
  }catch(e){ show("view-offline"); return; }
  startPolling();
  const saved = lsGet("kw-session");
  if (saved){
    try{
      const {id, token} = JSON.parse(saved);
      const d = await api("login", {id, token});
      if (d.ok){ enterApp(d.member, token); return; }
    }catch(e){}
    lsDel("kw-session");
  }
})();

/* ---------- 로그인 ---------- */
$("btn-login").addEventListener("click", doLogin);
$("login-pw").addEventListener("keydown", e=>{ if (e.key==="Enter") doLogin(); });
$("login-id").addEventListener("keydown", e=>{ if (e.key==="Enter") $("login-pw").focus(); });
async function doLogin(){
  const id = $("login-id").value.trim().normalize("NFC");
  const pw = $("login-pw").value;
  const err = $("login-err");
  err.textContent = "";
  if (id.length<2){ err.textContent = "아이디는 2자 이상으로 지어주세요."; return; }
  if (pw.length<4){ err.textContent = "비밀번호는 4자 이상이면 좋겠어요."; return; }
  $("btn-login").disabled = true;
  try{
    const d = await api("login", {id, pw});
    lsSet("kw-session", JSON.stringify({id:d.member.id, token:d.token}));
    enterApp(d.member, d.token);
  }catch(e){ err.textContent = errText(e); }
  finally{ $("btn-login").disabled = false; }
}
function enterApp(member, token){
  me = {id:member.id, slug:member.slug, token, data:member};
  $("login-pw").value = "";
  loadMembers();
  if (isAdmin()){ renderAdmin(); show("view-admin"); return; }
  if (member.done){ renderResult(false); show("view-result"); }
  else startOnboarding();
}
function logout(){
  lsDel("kw-session"); me = null;
  $("login-id").value = ""; $("login-err").textContent = "";
  show("view-login");
}

/* ---------- 멤버 동기화 ---------- */
function startPolling(){
  loadMembers();
  if (!pollTimer) pollTimer = setInterval(()=>{ if (!document.hidden) loadMembers(); }, 20000);
}
async function loadMembers(){
  try{
    const d = await api("members");
    membersCache = d.members || [];
    if (currentView==="view-dash") renderDash();
    if (currentView==="view-result"){ renderMates(); renderMyBand(); }
    if (currentView==="view-admin") renderAdmin();
  }catch(e){ /* 다음 폴링에서 재시도 */ }
}
function currentMembers(){
  const list = membersCache.filter(m=>!isAdminId(m.id));
  if (!me || isAdmin()) return list;
  const mine = {...me.data, slug:me.slug, id:me.id};
  const i = list.findIndex(m=>m.slug===me.slug);
  if (i>=0) list[i] = mine; else list.push(mine);
  return list;
}

/* ---------- 매칭 계산 ---------- */
function tasteScore(a,b){
  const ga=new Set(a.genres||[]), gb=new Set(b.genres||[]);
  const inter=[...ga].filter(x=>gb.has(x)).length, uni=new Set([...ga,...gb]).size||1;
  const aa=new Set((a.artists||[]).map(x=>norm(x.name)));
  const shared=(b.artists||[]).filter(x=>aa.has(norm(x.name)));
  const score = .6*(inter/uni) + .25*Math.min(shared.length,2)/2 + .15*(a.style && a.style===b.style ? 1 : 0);
  return {score, shared};
}
function commonSlots(a,b){
  if (!(a.avail||[]).length || !(b.avail||[]).length) return null;
  const sb = new Set(b.avail);
  return a.avail.filter(k=>sb.has(k));
}
function mateScore(a,b){
  const t = tasteScore(a,b), common = commonSlots(a,b);
  const timeFit = common===null ? null : Math.min(1, common.length/6);
  const total = timeFit===null ? t.score : t.score*.6 + timeFit*.4;
  return {taste:t.score, shared:t.shared, common, total};
}
function teamFit(teamMs, c){
  const taste = teamMs.length ? teamMs.reduce((s,t)=>s+tasteScore(t,c).score,0)/teamMs.length : .5;
  const withA = [...teamMs, c].filter(m=>(m.avail||[]).length);
  let timeFit = (c.avail||[]).length ? .3 : .15;
  if (withA.length>=2) timeFit = Math.min(1, intersectAll(withA.map(m=>m.avail)).length/4);
  return taste*.55 + timeFit*.45;
}
function buildBands(list){
  const pool = list.filter(m=>m.done && !isAdminId(m.id));
  const used = new Set(), bands = [];
  const cand = r => pool.filter(m=>!used.has(m.slug) && (m.parts||[]).includes(r));
  while (bands.length < 12){
    const roles = [...CORE].sort((a,b)=>cand(a).length-cand(b).length);
    const seedRole = roles.find(r=>cand(r).length);
    if (!seedRole) break;
    const seed = cand(seedRole).sort((a,b)=>(b.avail||[]).length-(a.avail||[]).length)[0];
    const team = [{m:seed, role:seedRole}]; used.add(seed.slug);
    for (const r of roles){
      if (r===seedRole) continue;
      const cs = cand(r);
      if (!cs.length){ team.push({m:null, role:r}); continue; }
      const ms = team.filter(t=>t.m).map(t=>t.m);
      let best=null, bs=-1;
      for (const c of cs){ const s=teamFit(ms,c); if (s>bs){ bs=s; best=c; } }
      team.push({m:best, role:r}); used.add(best.slug);
    }
    const ks = cand("keys");
    if (ks.length){
      const ms = team.filter(t=>t.m).map(t=>t.m);
      let best=null, bs=-1;
      for (const c of ks){ const s=teamFit(ms,c); if (s>bs){ bs=s; best=c; } }
      if (bs>=.3){ team.push({m:best, role:"keys"}); used.add(best.slug); }
    }
    const filled = team.filter(t=>t.m);
    if (filled.length<2){ filled.forEach(t=>used.delete(t.m.slug)); break; }
    bands.push(describeBand(team));
    if (team.some(t=>!t.m)) break;
  }
  const seen = {};
  for (const b of bands){
    const base = (STYLES[b.style]||STYLES.pop).band;
    seen[base] = (seen[base]||0)+1;
    b.name = seen[base]>1 ? base+" "+seen[base]+"호" : base;
  }
  return bands;
}
function describeBand(team){
  const ms = team.filter(t=>t.m).map(t=>t.m);
  const withA = ms.filter(m=>(m.avail||[]).length);
  const common = withA.length>=2 ? intersectAll(withA.map(m=>m.avail)) : null;
  let ts=0, c=0;
  for (let i=0;i<ms.length;i++) for (let j=i+1;j<ms.length;j++){ ts+=tasteScore(ms[i],ms[j]).score; c++; }
  const cnt = {}; ms.forEach(m=>{ if (m.style) cnt[m.style]=(cnt[m.style]||0)+1; });
  const top = Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0];
  return { team, common, taste: c ? ts/c : 0, style: top ? top[0] : "pop",
    missing: team.filter(t=>!t.m).map(t=>t.role), unknownTime: ms.length-withA.length };
}
function canFormBand(ms){
  const used = new Set();
  const bt = i => {
    if (i===CORE.length) return true;
    for (const m of ms){
      if (used.has(m.slug) || !(m.parts||[]).includes(CORE[i])) continue;
      used.add(m.slug); if (bt(i+1)) return true; used.delete(m.slug);
    }
    return false;
  };
  return bt(0);
}
const ROLE_ORDER = ["vocal","guitar","bass","drum","keys"];
function bandCard(b){
  const st = STYLES[b.style]||STYLES.pop;
  const mine = me && b.team.some(t=>t.m && t.m.slug===me.slug);
  const rows = b.team.slice().sort((x,y)=>ROLE_ORDER.indexOf(x.role)-ROLE_ORDER.indexOf(y.role)).map(t=> t.m
    ? '<div class="role"><span class="rl">'+partLabel(t.role)+'</span><b>'+esc(t.m.id)+'</b>'+(me && t.m.slug===me.slug?' <span class="tag orange">나</span>':'')+'</div>'
    : '<div class="role need"><span class="rl">'+partLabel(t.role)+'</span><b>구하는 중 🔍</b></div>').join("");
  const timeTxt = b.common===null ? "시간 등록 멤버 부족" : b.common.length ? "다 같이 되는 시간 <b>"+b.common.length+"칸</b>" : "다 같이 되는 시간 <b>0칸</b>";
  const chips = (b.common||[]).slice(0,3).map(k=>'<span class="tag green">'+slotLabel(k)+'</span>').join("");
  return '<div class="band'+(mine?" me":"")+'"><p class="kicker" style="color:var(--gold);margin-top:6px">'+st.e+' '+(b.missing.length?"Forming":"Ready to Jam")+'</p>'
    +'<h4>'+esc(b.name)+'</h4><div class="roles">'+rows+'</div>'
    +'<div class="stats"><span>취향 궁합 <b>'+Math.round(b.taste*100)+'%</b></span><span>'+timeTxt+'</span></div>'
    +(chips?'<div class="tags times">'+chips+'</div>':'')
    +(b.unknownTime?'<p class="sub" style="margin-top:6px">시간 미입력 '+b.unknownTime+'명</p>':'')
    +'</div>';
}

/* ---------- 합주 시간표 컴포넌트 ---------- */
function ScheduleGrid(root, o){
  let week = o.week!=null ? o.week : defaultWeek();
  root.innerHTML = '<div class="sg-head"><button class="sg-nav" data-d="-1" aria-label="이전 주">‹</button><div class="sg-title"></div><button class="sg-nav" data-d="1" aria-label="다음 주">›</button></div>'
    +'<div class="sg-weeks"></div><div class="sg-grid'+(o.mode==="heat"?" heat":"")+'"></div>';
  const title=root.querySelector(".sg-title"), weeksEl=root.querySelector(".sg-weeks"), grid=root.querySelector(".sg-grid");
  const prev=root.querySelector('[data-d="-1"]'), next=root.querySelector('[data-d="1"]');
  prev.onclick=()=>setWeek(week-1); next.onclick=()=>setWeek(week+1);
  weeksEl.onclick=e=>{ const b=e.target.closest("button[data-w]"); if (b) setWeek(Number(b.dataset.w)); };
  function setWeek(i){
    week = Math.max(0, Math.min(WEEKS.length-1, i));
    if (o.onWeek) o.onWeek(week);
    render();
    const a = weeksEl.querySelector(".on");
    if (a) weeksEl.scrollLeft = a.offsetLeft - weeksEl.clientWidth/2 + a.clientWidth/2;
  }
  function weekFill(i){
    let best = 0, c = 0;
    for (const d of WEEKS[i]) if (inRange(d)) for (const h of SLOT_HOURS){
      const k = slotKey(d,h);
      if (o.mode==="edit"){ if (o.set.has(k)) c++; }
      else best = Math.max(best, (o.heat.get(k)||[]).length);
    }
    return o.mode==="edit" ? Math.min(1, c/14) : (o.max ? best/o.max : 0);
  }
  function renderWeeks(){
    weeksEl.innerHTML = WEEKS.map((w,i)=>{
      const d = pd(w.find(inRange));
      return '<button data-w="'+i+'" class="'+(i===week?"on":"")+'">'+(d.getMonth()+1)+'/'+d.getDate()
        +'<span class="dot"><i style="width:'+Math.round(weekFill(i)*100)+'%"></i></span></button>';
    }).join("");
  }
  function render(){
    const w = WEEKS[week], a = pd(w.find(inRange));
    title.innerHTML = '<small>WEEK '+(week+1)+' / '+WEEKS.length+'</small>'+(a.getMonth()+1)+'월 · '+weekLabel(w);
    prev.disabled = week===0; next.disabled = week===WEEKS.length-1;
    renderWeeks();
    let h = '<div></div>';
    for (const d of w){
      const dt=pd(d), dow=dt.getDay();
      h += '<div class="sg-dh'+(dow===6?" sat":dow===0?" sun":"")+(inRange(d)?"":" off")+'">'+DOW[dow]+'<b>'+(dt.getMonth()+1)+'/'+dt.getDate()+'</b></div>';
    }
    SLOT_HOURS.forEach((hr,hi)=>{
      h += '<div class="sg-th">'+hr+'–'+(hr+2)+'</div>';
      w.forEach((d,di)=>{
        const k = slotKey(d,hr);
        if (!inRange(d)){ h += '<span class="sg-cell off" aria-hidden="true"></span>'; return; }
        if (o.mode==="edit"){
          const on = o.set.has(k);
          h += '<button class="sg-cell'+(on?" on":"")+'" data-k="'+k+'" data-d="'+di+'" data-h="'+hi+'" aria-pressed="'+on+'" aria-label="'+slotLabel(k)+'"></button>';
        } else {
          const n = (o.heat.get(k)||[]).length;
          const al = n ? (.16 + .84*n/(o.max||1)).toFixed(2) : 0;
          const pick = o.pick && o.pick()===k;
          h += '<button class="sg-cell'+(pick?" pick":"")+'" data-k="'+k+'" aria-label="'+slotLabel(k)+' '+n+'명 가능"'
            +(n?' style="background:rgba(255,122,47,'+al+');border-color:transparent"':'')+'>'+(n||"")+'</button>';
        }
      });
    });
    grid.innerHTML = h;
  }
  if (o.mode==="edit"){
    // when2meet처럼 누른 칸에서 지금 칸까지의 사각형 전체를 칠한다 (빠른 드래그로 칸을 건너뛰어도 안전).
    let painting=false, paintVal=true, anchor=null, snap=null, last="";
    const cells = () => grid.querySelectorAll(".sg-cell[data-k]");
    const sync = () => { for (const el of cells()){ const on=o.set.has(el.dataset.k); el.classList.toggle("on",on); el.setAttribute("aria-pressed",on); } };
    const paintTo = c => {
      const sig = c.dataset.d+":"+c.dataset.h; if (sig===last) return; last = sig;
      const d1=+anchor.d, h1=+anchor.h, d2=+c.dataset.d, h2=+c.dataset.h;
      o.set.clear(); snap.forEach(k=>o.set.add(k));
      for (const el of cells()){
        const d=+el.dataset.d, h=+el.dataset.h;
        if (d>=Math.min(d1,d2) && d<=Math.max(d1,d2) && h>=Math.min(h1,h2) && h<=Math.max(h1,h2)){
          if (paintVal) o.set.add(el.dataset.k); else o.set.delete(el.dataset.k);
        }
      }
      sync();
    };
    grid.addEventListener("pointerdown", e=>{
      const c = e.target.closest(".sg-cell[data-k]"); if (!c) return;
      e.preventDefault();
      painting = true; paintVal = !o.set.has(c.dataset.k);
      anchor = {d:c.dataset.d, h:c.dataset.h}; snap = new Set(o.set); last = "";
      paintTo(c);
      try{ grid.setPointerCapture(e.pointerId); }catch(_){}
    });
    grid.addEventListener("pointermove", e=>{
      if (!painting) return;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const c = el && el.closest && el.closest(".sg-cell[data-k]");
      if (c && grid.contains(c)) paintTo(c);
    });
    const end = ()=>{ if (!painting) return; painting=false; renderWeeks(); if (o.onChange) o.onChange(); };
    grid.addEventListener("pointerup", end); grid.addEventListener("pointercancel", end);
    grid.addEventListener("click", e=>{
      if (e.detail!==0) return;
      const c = e.target.closest(".sg-cell[data-k]"); if (!c) return;
      const k = c.dataset.k;
      if (o.set.has(k)) o.set.delete(k); else o.set.add(k);
      sync(); renderWeeks(); if (o.onChange) o.onChange();
    });
  } else {
    grid.addEventListener("click", e=>{ const c=e.target.closest(".sg-cell[data-k]"); if (c && o.onPick) o.onPick(c.dataset.k); });
  }
  render();
  return { render, setWeek, get week(){ return week; } };
}
function presetKeys(p){
  const out = [];
  for (const d of ALL_DAYS){
    const dow = pd(d).getDay(), we = dow===0 || dow===6;
    const hours = p==="wkEve" ? (we?[]:[18,20]) : p==="weDay" ? (we?[12,14,16]:[]) : p==="weEve" ? (we?[18,20]:[]) : [];
    for (const h of hours) out.push(slotKey(d,h));
  }
  return out;
}
function mountEditor(root, set){
  root.innerHTML = '<div class="presets">'
    +'<button data-p="wkEve">🌙 평일 저녁 전부</button><button data-p="weDay">☀️ 주말 낮 전부</button>'
    +'<button data-p="weEve">✨ 주말 저녁 전부</button><button data-p="clrWeek" class="warn">이번 주 지우기</button>'
    +'<button data-p="clrAll" class="warn">전체 지우기</button></div><div class="sg-box"></div><div class="sg-sum"></div>';
  const sum = root.querySelector(".sg-sum");
  const upd = ()=>{
    const n = set.size, wk = new Set([...set].map(k=>weekIndexOf(k.split("@")[0]))).size;
    sum.innerHTML = n ? '칠한 시간 <b>'+n+'칸</b> ('+(n*2)+'시간) · '+WEEKS.length+'주 중 <b>'+wk+'주</b>에 걸쳐 있어요'
      : '아직 칠한 칸이 없어요. 칸을 누르거나 드래그해 보세요.';
  };
  const grid = ScheduleGrid(root.querySelector(".sg-box"), {mode:"edit", set, onChange:upd});
  root.querySelector(".presets").addEventListener("click", e=>{
    const b = e.target.closest("button[data-p]"); if (!b) return;
    const p = b.dataset.p;
    if (p==="clrAll") set.clear();
    else if (p==="clrWeek"){ for (const d of WEEKS[grid.week]) for (const h of SLOT_HOURS) set.delete(slotKey(d,h)); }
    else {
      const keys = presetKeys(p), allOn = keys.every(k=>set.has(k));
      for (const k of keys) allOn ? set.delete(k) : set.add(k);
    }
    grid.render(); upd();
  });
  upd();
}

/* ---------- 온보딩 ---------- */
function startOnboarding(){
  const d = me.data;
  draft = {
    parts:[...(d.parts||[])], partEtc:d.partEtc||"", genres:[...(d.genres||[])],
    artists:(d.artists||[]).map(a=>({name:a.name, genres:[...(a.genres||[])]})),
    avail:new Set(d.avail||[]),
  };
  renderChips("part-chips", PARTS.map(p=>({k:p.k, n:p.e+" "+p.n})), draft.parts, k=>{ if (k==="etc") $("part-etc-fld").hidden = !draft.parts.includes("etc"); });
  renderChips("genre-chips", GENRES, draft.genres);
  renderArtistList();
  $("part-etc").value = draft.partEtc;
  $("part-etc-fld").hidden = !draft.parts.includes("etc");
  $("ob-err").textContent = "";
  obStep(1); show("view-onboard");
}
function renderChips(boxId, items, arr, after){
  const box = $(boxId); box.innerHTML = "";
  for (const it of items){
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip"; b.textContent = it.n;
    b.setAttribute("aria-pressed", arr.includes(it.k));
    b.addEventListener("click", ()=>{
      const i = arr.indexOf(it.k);
      if (i>=0) arr.splice(i,1); else arr.push(it.k);
      b.setAttribute("aria-pressed", arr.includes(it.k));
      if (after) after(it.k);
    });
    box.appendChild(b);
  }
}
function obStep(n){
  ["ob-parts","ob-genres","ob-artists","ob-time"].forEach((id,i)=>{ $(id).hidden = i+1!==n; });
  for (let i=1;i<=4;i++) $("st"+i).className = n>=i ? "on" : "";
  if (n===4) mountEditor($("ob-sched"), draft.avail);
  window.scrollTo(0,0);
}
function nudge(btn, msg){
  const t = btn.textContent; btn.textContent = msg;
  setTimeout(()=>{ btn.textContent = t; }, 1400);
}
$("ob1-next").addEventListener("click", ()=>{
  if (!draft.parts.length) return nudge($("ob1-next"), "하나 이상 골라주세요!");
  draft.partEtc = draft.parts.includes("etc") ? $("part-etc").value.trim() : "";
  obStep(2);
});
$("ob2-back").addEventListener("click", ()=>obStep(1));
$("ob2-next").addEventListener("click", ()=>{
  if (!draft.genres.length) return nudge($("ob2-next"), "하나 이상 골라주세요!");
  obStep(3);
});
$("ob3-back").addEventListener("click", ()=>obStep(2));
$("ob3-next").addEventListener("click", ()=>{
  if (!draft.artists.length){ $("artist-status").textContent = "최애 가수를 한 팀 이상 담아주세요!"; return; }
  obStep(4);
});
$("ob4-back").addEventListener("click", ()=>obStep(3));
$("ob4-done").addEventListener("click", async ()=>{
  const btn = $("ob4-done"); btn.disabled = true; $("ob-err").textContent = "";
  try{
    const d = await api("members", {id:me.id, token:me.token, profile:{
      parts:draft.parts, partEtc:draft.partEtc, genres:draft.genres, artists:draft.artists, avail:[...draft.avail],
    }});
    me.data = d.member;
    loadMembers();
    renderResult(true); show("view-result");
  }catch(e){ $("ob-err").textContent = errText(e); }
  finally{ btn.disabled = false; }
});

/* ---------- 가수 입력 ---------- */
let manualPending = null, manualSel = [];
$("artist-add").addEventListener("click", addArtist);
$("artist-input").addEventListener("keydown", e=>{ if (e.key==="Enter"){ e.preventDefault(); addArtist(); } });
async function addArtist(){
  const name = $("artist-input").value.trim(), st = $("artist-status");
  if (!name) return;
  if (draft.artists.some(a=>norm(a.name)===norm(name))){ st.textContent = "이미 담겨 있어요!"; return; }
  $("artist-input").value = "";
  const hit = artistMap.get(norm(name));
  if (hit && hit.genres.length){
    if (draft.artists.some(a=>norm(a.name)===norm(hit.name))){ st.textContent = "이미 담겨 있어요!"; return; }
    draft.artists.push({name:hit.name, genres:[...hit.genres]});
    st.textContent = ""; renderArtistList(); return;
  }
  st.textContent = "🔮 마법 수정구에 '"+name+"'을(를) 물어보는 중…";
  $("artist-add").disabled = true;
  try{
    const d = await api("artists", {name});
    if (d.known && (d.genres||[]).length){
      const genres = d.genres.filter(k=>GENRE_NAME[k]).slice(0,3);
      draft.artists.push({name:d.name||name, genres});
      st.textContent = "✨ 수정구: "+genres.map(k=>GENRE_NAME[k]).join(", ")+" 느낌이래요!";
      artistMap.set(norm(d.name||name), {name:d.name||name, genres});
      renderArtistList(); return;
    }
  }catch(e){ /* 수동 선택으로 */ }
  finally{ $("artist-add").disabled = false; }
  st.textContent = "";
  openManual(name);
}
function openManual(name){
  manualPending = name; manualSel = [];
  const box = $("manual-chips"); box.innerHTML = "";
  for (const g of GENRES){
    const b = document.createElement("button");
    b.type="button"; b.className="chip"; b.textContent=g.n; b.setAttribute("aria-pressed","false");
    b.addEventListener("click", ()=>{
      const i = manualSel.indexOf(g.k);
      if (i>=0) manualSel.splice(i,1); else if (manualSel.length<3) manualSel.push(g.k);
      b.setAttribute("aria-pressed", manualSel.includes(g.k));
    });
    box.appendChild(b);
  }
  $("manual-pick").hidden = false;
}
$("manual-cancel").addEventListener("click", ()=>{ manualPending=null; $("manual-pick").hidden=true; });
$("manual-ok").addEventListener("click", ()=>{
  if (!manualPending || !manualSel.length) return;
  draft.artists.push({name:manualPending, genres:[...manualSel]});
  manualPending = null; $("manual-pick").hidden = true; renderArtistList();
});
function renderArtistList(){
  const box = $("artist-list"); box.innerHTML = "";
  draft.artists.forEach((a,idx)=>{
    const div = document.createElement("div"); div.className = "aitem";
    div.innerHTML = "<b>"+esc(a.name)+"</b><span class='tags'>"+a.genres.map(k=>"<span class='tag'>"+esc(GENRE_NAME[k]||k)+"</span>").join("")+"</span>";
    const x = document.createElement("button");
    x.className="x"; x.textContent="✕"; x.setAttribute("aria-label", a.name+" 빼기");
    x.addEventListener("click", ()=>{ draft.artists.splice(idx,1); renderArtistList(); });
    div.appendChild(x); box.appendChild(div);
  });
}

/* ---------- 내 결과 ---------- */
function renderResult(animate){
  const st = STYLES[me.data.style] || STYLES.pop;
  const card = $("style-card");
  const fill = ()=>{
    const parts = (me.data.parts||[]).map(k=> k==="etc" && me.data.partEtc ? "✨ "+me.data.partEtc : partLabel(k)).join(" · ");
    card.innerHTML = hollySVG("l") + hollySVG("")
      +'<div class="hatwrap">'+carrotSVG(96)+'</div>'
      +'<p class="kicker" style="color:var(--gold);margin-top:8px">Sorting Hat Says</p>'
      +'<h2 class="reveal">'+st.e+' '+esc(st.n)+'</h2>'
      +'<p style="font-size:.9rem;color:#d3c8bb;max-width:36ch;margin:0 auto">'+esc(st.d)+'</p>'
      +'<p class="sub" style="margin-top:8px">잘 맞는 유형 · <b style="color:var(--fg)">'+esc(st.mate)+'</b></p>'
      +'<div class="chips"><span class="tag orange">'+esc(parts)+'</span>'
      +(me.data.genres||[]).slice(0,6).map(k=>'<span class="tag">'+esc(GENRE_NAME[k]||k)+'</span>').join("")+'</div>';
  };
  if (animate && !reduceMotion()){
    card.innerHTML = '<div class="hatwrap" style="margin-top:20px">'+carrotSVG(110)+'</div>'
      +'<p class="kicker" style="color:var(--gold);margin-top:12px">Sorting…</p><h2>마법의 모자가 고민 중…</h2>';
    card.querySelector("svg").classList.add("hat-shake");
    setTimeout(fill, 1600);
  } else fill();
  renderTimeCallout(); renderMyBand(); renderMates();
}
function renderTimeCallout(){
  const n = (me.data.avail||[]).length;
  $("time-callout").innerHTML = n
    ? '<div class="callout"><span style="font-size:1.6rem">🗓️</span><div><b>합주 가능 시간 '+n+'칸 ('+(n*2)+'시간) 등록됨</b><span class="sub">시간이 바뀌면 언제든 다시 칠할 수 있어요.</span></div><button class="btn btn-ghost btn-sm" data-go="view-schedule">시간 수정</button></div>'
    : '<div class="callout"><span style="font-size:1.6rem">🎄</span><div><b>아직 합주 시간을 칠하지 않았어요</b><span class="sub">시간을 칠하면 겹치는 사람끼리 밴드를 더 정확히 묶어드려요.</span></div><button class="btn btn-primary btn-sm" data-go="view-schedule">시간 칠하기</button></div>';
}
$("time-callout").addEventListener("click", e=>{ const b=e.target.closest("[data-go]"); if (b) goTo(b.dataset.go); });
function renderMyBand(){
  if (!me || !me.data.done) return;
  const bands = buildBands(currentMembers());
  const mine = bands.find(b=>b.team.some(t=>t.m && t.m.slug===me.slug));
  const box = $("my-band");
  if (mine){ box.innerHTML = bandCard(mine); return; }
  const others = currentMembers().filter(m=>m.done && m.slug!==me.slug);
  const have = new Set(others.flatMap(m=>m.parts||[]));
  const need = CORE.filter(r=>!have.has(r) && !(me.data.parts||[]).includes(r));
  box.innerHTML = '<p class="empty">아직 밴드를 짤 만큼 멤버가 모이지 않았어요.'
    +(need.length ? '<br>지금 필요한 파트: <b style="color:var(--gold)">'+need.map(partLabel).join(", ")+'</b>' : '')
    +'<br>링크를 모임방에 공유해 보세요 🥕</p>';
}
function renderMates(){
  if (!me || !me.data.done) return;
  const others = currentMembers().filter(m=>m.done && m.slug!==me.slug);
  const box = $("mates");
  if (!others.length){ box.innerHTML = '<p class="empty">아직 나 혼자예요. 멤버들에게 링크를 돌려볼까요? 🥕</p>'; return; }
  const myParts = new Set(me.data.parts||[]);
  const rows = others.map(m=>({m, s:mateScore(me.data, m)})).sort((a,b)=>b.s.total-a.s.total).slice(0,8);
  box.innerHTML = rows.map(({m,s})=>{
    const st = STYLES[m.style]||STYLES.pop;
    const timeTxt = s.common===null ? "시간 미입력" : s.common.length ? "겹치는 시간 "+s.common.length+"칸" : "겹치는 시간 없음";
    const chips = (s.common||[]).slice(0,3).map(k=>'<span class="tag green">'+slotLabel(k)+'</span>').join("")
      + (s.shared.length ? '<span class="tag orange">같이 좋아해요: '+esc(s.shared.slice(0,3).map(a=>a.name).join(", "))+'</span>' : '')
      + (()=>{ const lack=(m.parts||[]).filter(p=>CORE.includes(p) && !myParts.has(p)); return lack.length ? '<span class="tag red">내게 없는 파트: '+lack.map(p=>PART[p].n).join("·")+'</span>' : ''; })();
    return '<div class="mate"><span class="pct">'+Math.min(99,Math.round(s.total*100))+'%<small>매칭</small></span>'
      +'<span class="who"><b>'+esc(m.id)+'</b> <span class="tag">'+st.e+' '+esc(st.n)+'</span>'
      +'<span class="meta">'+esc(memberPartsText(m))+' · 취향 '+Math.round(s.taste*100)+'% · '+timeTxt+'</span>'
      +(chips?'<span class="tags">'+chips+'</span>':'')+'</span></div>';
  }).join("");
}
$("btn-edit").addEventListener("click", startOnboarding);
$("btn-time").addEventListener("click", ()=>goTo("view-schedule"));
$("btn-godash").addEventListener("click", ()=>goTo("view-dash"));

/* ---------- 내 합주 시간 ---------- */
function openSchedule(){
  if (!me) return show("view-login");
  schedDraft = new Set(me.data.avail||[]);
  $("sched-err").textContent = "";
  mountEditor($("my-sched"), schedDraft);
  show("view-schedule");
}
$("sched-cancel").addEventListener("click", ()=>goTo("view-result"));
$("sched-save").addEventListener("click", async ()=>{
  const btn = $("sched-save"); btn.disabled = true; $("sched-err").textContent = "";
  try{
    const d = await api("members", {id:me.id, token:me.token, avail:[...schedDraft]});
    me.data = d.member;
    toast("합주 시간을 저장했어요 🎄");
    loadMembers();
    goTo("view-result");
  }catch(e){ $("sched-err").textContent = errText(e); }
  finally{ btn.disabled = false; }
});

/* ---------- 모두의 음악 ---------- */
const dashOpen = new Set();
let heatWeek = null, heatPick = null;
function renderDash(){
  const all = currentMembers();
  const done = all.filter(m=>m.done);
  const n = done.length;
  const bands = buildBands(all);
  const full = bands.filter(b=>!b.missing.length).length;
  const timed = all.filter(m=>(m.avail||[]).length).length;
  const artistAgg = {};
  for (const m of done) for (const a of (m.artists||[])){
    const k = norm(a.name);
    if (!artistAgg[k]) artistAgg[k] = {name:a.name, count:0, who:[]};
    artistAgg[k].count++; artistAgg[k].who.push(m.id);
  }
  const open = dashOpen.has("stat:members");
  $("dash-stats").innerHTML =
    '<button class="stat big" data-wk="stat:members" aria-expanded="'+open+'"><p class="kicker">참여 완료 · 눌러보기</p><div class="n">'+n+'<small>명</small></div>'
      +(open ? '<div class="whorow">'+whoChips(done.map(m=>m.id))+'</div>' : '<span class="sub">'+(n ? "이번 겨울 함께하는 마법사들" : "첫 번째 밴드 메이트를 기다리고 있어요")+'</span>')+'</button>'
    +'<div class="stat"><p class="kicker">Bands</p><div class="n">'+full+'<small>팀</small></div><span class="sub">바로 꾸릴 수 있는 밴드</span></div>'
    +'<div class="stat"><p class="kicker">Jam Time</p><div class="n">'+timed+'<small>명</small></div><span class="sub">시간을 칠한 멤버</span></div>'
    +'<div class="stat"><p class="kicker">Artists</p><div class="n">'+Object.keys(artistAgg).length+'<small>팀</small></div><span class="sub">모인 최애 가수</span></div>';

  $("dash-bands").innerHTML = bands.length ? bands.map(bandCard).join("")
    : '<p class="empty">멤버가 2명 이상 모이면 파트를 맞춰 밴드를 짜드려요 🎩</p>';

  renderHeat(all);

  const partCount={}, partWho={};
  for (const p of PARTS){ partCount[p.k]=0; partWho[p.k]=[]; }
  for (const m of done) for (const k of (m.parts||[])) if (k in partCount){ partCount[k]++; partWho[k].push(m.id); }
  const maxP = Math.max(1, ...Object.values(partCount));
  $("dash-parts").innerHTML = PARTS.map(p=>bar("part:"+p.k, partLabel(p.k), partCount[p.k], maxP, partWho[p.k])).join("");
  const rare = CORE.slice().sort((a,b)=>partCount[a]-partCount[b])[0];
  $("dash-need").textContent = n ? "지금 제일 귀한 파트: "+partLabel(rare)+" — 주변에 연주자가 있다면 모셔와요!" : "";

  const gCount={}, gWho={};
  for (const m of done) for (const k of (m.genres||[])){ gCount[k]=(gCount[k]||0)+1; (gWho[k]=gWho[k]||[]).push(m.id); }
  const gSorted = Object.entries(gCount).sort((a,b)=>b[1]-a[1]);
  const maxG = Math.max(1, ...gSorted.map(e=>e[1]));
  $("dash-genres").innerHTML = gSorted.length ? gSorted.map(([k,c])=>bar("genre:"+k, GENRE_NAME[k]||k, c, maxG, gWho[k])).join("") : '<p class="empty">아직 장르 데이터가 없어요.</p>';

  const sCount={}, sWho={};
  for (const m of done){ sCount[m.style]=(sCount[m.style]||0)+1; (sWho[m.style]=sWho[m.style]||[]).push(m.id); }
  $("dash-styles").innerHTML = Object.entries(STYLES).map(([k,s])=>{
    const o = dashOpen.has("style:"+k);
    return '<button class="stylecell" data-wk="style:'+k+'" aria-expanded="'+o+'"><div class="e">'+s.e+'</div><div class="ct">'+(sCount[k]||0)+'명</div><div class="nm">'+esc(s.n)+'</div>'
      +(o ? '<div class="whorow" style="justify-content:center">'+whoChips(sWho[k]||[])+'</div>' : '')+'</button>';
  }).join("");

  const aSorted = Object.values(artistAgg).sort((a,b)=>b.count-a.count).slice(0,24);
  const openA = [...dashOpen].find(x=>x.startsWith("artist:"));
  $("dash-artists").innerHTML = aSorted.length ? aSorted.map(a=>{
    const id = "artist:"+norm(a.name);
    return '<button class="w" data-wk="'+esc(id)+'" aria-pressed="'+(openA===id)+'" style="font-size:'+(0.8+Math.min(a.count,5)*0.12).toFixed(2)+'rem">'+esc(a.name)+' <small>'+a.count+'</small></button>';
  }).join("") : '<p class="empty">취향 등록에서 좋아하는 아티스트를 골라주세요.</p>';
  const da = openA ? artistAgg[openA.slice(7)] : null;
  $("dash-artist-detail").innerHTML = da ? '<div class="whorow"><span class="sub" style="margin-right:4px">'+esc(da.name)+' 좋아하는 멤버 →</span>'+whoChips(da.who)+'</div>' : "";

  $("dash-members").innerHTML = done.length ? done.map(m=>{
    const st = STYLES[m.style]||STYLES.pop, o = dashOpen.has("mem:"+m.slug);
    const nA = (m.avail||[]).length;
    return '<button class="mem" data-wk="mem:'+esc(m.slug)+'" aria-expanded="'+o+'"><span class="av">'+st.e+'</span>'
      +'<span class="mi"><b>'+esc(m.id)+'</b><span class="sub2">'+esc(memberPartsText(m))+' · '+esc(st.n)+'</span>'
      +'<span class="tags">'+(m.genres||[]).slice(0,4).map(k=>'<span class="tag">'+esc(GENRE_NAME[k]||k)+'</span>').join("")+'</span>'
      +(o ? '<span class="tags">'+(m.artists||[]).map(a=>'<span class="tag orange">'+esc(a.name)+'</span>').join("")
        +'<span class="tag green">합주 시간 '+nA+'칸</span></span>' : '')
      +'</span></button>';
  }).join("") : '<p class="empty">아직 아무도 없어요.</p>';

  document.querySelectorAll("#view-dash [data-wk]").forEach(el=>{
    el.onclick = ()=>{
      const id = el.getAttribute("data-wk");
      if (id.startsWith("artist:")){
        const had = dashOpen.has(id);
        for (const x of [...dashOpen]) if (x.startsWith("artist:")) dashOpen.delete(x);
        if (!had) dashOpen.add(id);
      } else if (dashOpen.has(id)) dashOpen.delete(id); else dashOpen.add(id);
      renderDash();
    };
  });
}
function renderHeat(all){
  all = all || currentMembers();
  const heat = new Map();
  for (const m of all) for (const k of (m.avail||[])){ if (!heat.has(k)) heat.set(k, []); heat.get(k).push(m); }
  let max = 0; heat.forEach(v=>{ if (v.length>max) max=v.length; });
  if (heatWeek===null) heatWeek = defaultWeek();
  ScheduleGrid($("dash-heat"), {
    mode:"heat", heat, max, week:heatWeek,
    onWeek:w=>{ heatWeek=w; }, pick:()=>heatPick,
    onPick:k=>{ heatPick = heatPick===k ? null : k; renderHeat(); },
  });
  const det = $("slot-detail");
  if (heatPick){
    const ms = heat.get(heatPick)||[];
    const cover = ["vocal","guitar","bass","drum","keys"].map(r=>{
      const c = ms.filter(m=>(m.parts||[]).includes(r)).length;
      return '<span class="tag '+(c?"green":"red")+'">'+partLabel(r)+' '+c+'</span>';
    }).join("");
    det.innerHTML = '<div class="slot-detail"><h4>'+slotLabel(heatPick)+' · '+ms.length+'명 가능</h4>'
      +(ms.length ? '<div class="whorow">'+whoChips(ms.map(m=>m.id))+'</div>' : '<p class="sub">이 시간엔 아직 아무도 없어요.</p>')
      +'<div class="cover">'+cover+'</div>'
      +(ms.length && canFormBand(ms) ? '<p class="hand" style="margin-top:8px">🎉 이 시간엔 풀밴드 합주가 가능해요!</p>' : '')
      +'</div>';
  } else det.innerHTML = max ? '<p class="sub" style="margin-top:12px">칸을 눌러 누가 되는지 확인해 보세요.</p>' : '<p class="sub" style="margin-top:12px">아직 시간을 칠한 멤버가 없어요.</p>';
  const top = [...heat.entries()].filter(([,v])=>v.length>=2).sort((a,b)=>b[1].length-a[1].length || (a[0]<b[0]?-1:1)).slice(0,6);
  $("dash-top").innerHTML = top.length ? top.map(([k,v])=>{
    const full = canFormBand(v);
    return '<button data-top="'+k+'"><span class="n">'+v.length+'명</span><span style="flex:1">'+slotLabel(k)
      +'<span class="sub" style="display:block;font-size:.74rem">'+esc(v.map(m=>m.id).slice(0,4).join(", "))+(v.length>4?" 외":"")+'</span></span>'
      +(full?'<span class="tag green">풀밴드</span>':'')+'</button>';
  }).join("") : '<p class="empty">두 명 이상 겹치는 시간이 생기면 여기에 떠요.</p>';
}
$("dash-top").addEventListener("click", e=>{
  const b = e.target.closest("button[data-top]"); if (!b) return;
  heatPick = b.dataset.top; heatWeek = weekIndexOf(heatPick.split("@")[0]);
  renderHeat();
  $("dash-heat").scrollIntoView({behavior:reduceMotion()?"auto":"smooth", block:"center"});
});
function whoChips(list){
  return list.length ? list.map(x=>'<span class="who-chip">'+esc(x)+'</span>').join("") : '<span class="sub">아직 없어요</span>';
}
function bar(wk,label,c,max,who){
  const o = dashOpen.has(wk);
  return '<button class="bar" data-wk="'+esc(wk)+'" aria-expanded="'+o+'"><span>'+esc(label)+'</span><span class="track"><span class="fill" style="width:'
    +Math.round(c/max*100)+'%"></span></span><span class="num">'+c+'</span></button>'
    +(o ? '<div class="whorow">'+whoChips(who||[])+'</div>' : '');
}

/* ---------- 관리자 ---------- */
let adminTarget = null;
function renderAdmin(){
  if (!isAdmin()) return;
  const rows = $("admin-rows");
  const list = [...membersCache].sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""));
  rows.innerHTML = list.length ? "" : '<tr><td colspan="7" class="sub">아직 멤버가 없어요.</td></tr>';
  for (const m of list){
    const tr = document.createElement("tr"), st = STYLES[m.style];
    tr.innerHTML = '<td><b>'+esc(m.id||"?")+'</b>'+(isAdminId(m.id||"")?" 🗝️":"")+'</td>'
      +'<td>'+esc(memberPartsText(m, ", "))+'</td>'
      +'<td>'+esc((m.genres||[]).map(k=>GENRE_NAME[k]||k).join(", "))+'</td>'
      +'<td>'+esc((m.artists||[]).map(a=>a.name).join(", "))+'</td>'
      +'<td>'+(m.avail||[]).length+'칸</td>'
      +'<td>'+(st && m.done ? st.e+" "+esc(st.n) : '<span class="sub">미완료</span>')+'</td>';
    const td = document.createElement("td");
    for (const [label,act] of [["이름 변경","rename"],["비번 재설정","resetpw"],["삭제","delete"]]){
      const b = document.createElement("button");
      b.className = "mini"+(act==="delete"?" warn":""); b.textContent = label;
      b.addEventListener("click", ()=>openAdminEditor(m, act));
      td.appendChild(b); td.appendChild(document.createTextNode(" "));
    }
    tr.appendChild(td); rows.appendChild(tr);
  }
}
function openAdminEditor(m, act){
  adminTarget = {m, act};
  const ed = $("admin-editor"); ed.hidden = false; $("admin-err").textContent = "";
  const btns = (go, cls, txt)=>'<div class="btnrow"><button class="btn btn-ghost" id="admin-cancel">취소</button><button class="btn btn-primary" id="admin-go"'+(cls?' style="'+cls+'"':'')+'>'+txt+'</button></div>';
  if (act==="rename"){
    ed.innerHTML = '<div class="rowedit"><b>\''+esc(m.id)+'\' 이름 변경 / 합치기</b>'
      +'<p class="sub">새 이름이 이미 있는 계정이면 두 계정을 하나로 합쳐요 (파트·장르·가수·합주 시간 합집합, 비밀번호는 기존 계정 것 유지).</p>'
      +'<input type="text" id="admin-input" maxlength="20" placeholder="새 아이디">'+btns(0,"","변경하기")+'</div>';
  } else if (act==="resetpw"){
    ed.innerHTML = '<div class="rowedit"><b>\''+esc(m.id)+'\' 비밀번호 재설정</b>'
      +'<input type="text" id="admin-input" maxlength="40" placeholder="새 비밀번호 (본인에게 전달하세요)">'+btns(0,"","재설정")+'</div>';
  } else {
    ed.innerHTML = '<div class="rowedit"><b>\''+esc(m.id)+'\' 계정을 삭제할까요?</b>'
      +'<p class="sub">프로필, 취향, 합주 시간이 모두 지워지고 되돌릴 수 없어요.</p>'+btns(0,"background:#d4483f;color:#fff","삭제하기")+'</div>';
  }
  $("admin-cancel").addEventListener("click", ()=>{ ed.hidden=true; adminTarget=null; });
  $("admin-go").addEventListener("click", runAdminAction);
}
async function runAdminAction(){
  if (!adminTarget) return;
  const {m, act} = adminTarget, err = $("admin-err");
  const input = $("admin-input") ? $("admin-input").value.trim() : "";
  if (act==="resetpw" && input.length<4){ err.textContent = "비밀번호는 4자 이상!"; return; }
  if (act==="rename" && input.length<2){ err.textContent = "새 아이디는 2자 이상!"; return; }
  try{
    await api("admin", {id:me.id, token:me.token, action:act, target:m.slug, value:input});
    $("admin-editor").hidden = true; adminTarget = null;
    toast("처리했어요");
    await loadMembers();
  }catch(e){ err.textContent = errText(e); }
}
