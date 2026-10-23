"use strict";
/* =========================================================
   당근 밴드 메이커 — 프론트엔드
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
  brit:"brit", modern:"brit", punk:"punkish", emo:"punkish", hardcore:"punkish", grunge:"punkish",
  metal:"heavy", hardrock:"heavy", indie:"indie", folk:"indie", citypop:"indie",
  jazz:"soul", blues:"soul", kpop:"pop", ballad:"pop", jrock:"jrockg",
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
const AV = Object.fromEntries(["vocal","guitar","bass","drum","keys","etc"].map(k=>[k,"/assets/av-"+k+".webp?v=2"]));
function avatarUrl(m){
  const p = ((m && m.parts) || [])[0];
  return AV[m && m.main] || AV[p] || AV.vocal;
}
const avatarHTML = m => '<span class="avatar" style="background-image:url('+avatarUrl(m)+')"></span>';

/* ---------- 합주 시간 (lib/util.js와 같은 값) ---------- */
const SLOT_HOURS = [10,12,14,16,18,20,22];
const GLOBAL_START = "2026-10-01";
const GLOBAL_END = "2027-12-31";
const DOW = ["일","월","화","수","목","금","토"];
function ymd(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function pd(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
const TODAY = ymd(new Date());
// 이번 달부터 3개월만 열린다 (10~12월, 11~1월, 12~2월 …). 지난 날짜는 고를 수 없다.
const WINDOW = (()=>{
  const now = new Date();
  const first = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
  const last = ymd(new Date(now.getFullYear(), now.getMonth()+3, 0));
  const start = first < GLOBAL_START ? GLOBAL_START : first;
  const end = last > GLOBAL_END ? GLOBAL_END : last;
  return {start, end, open: TODAY > start ? TODAY : start};
})();
const RANGE_START = WINDOW.open;
const RANGE_END = WINDOW.end;
const inRange = s => s>=RANGE_START && s<=RANGE_END;
const WINDOW_LABEL = (()=>{
  const a = pd(WINDOW.start), b = pd(WINDOW.end);
  return (a.getMonth()+1)+"월~"+(b.getFullYear()!==a.getFullYear() ? String(b.getFullYear()).slice(2)+"년 " : "")+(b.getMonth()+1)+"월";
})();
const WEEKS = (()=>{
  if (RANGE_START > RANGE_END) return [];
  const start = pd(RANGE_START); start.setDate(start.getDate()-((start.getDay()+6)%7));
  const end = pd(RANGE_END), out = [], d = new Date(start);
  while (d<=end){ const w=[]; for (let i=0;i<7;i++){ w.push(ymd(d)); d.setDate(d.getDate()+1); } out.push(w); }
  return out;
})();
const ALL_DAYS = WEEKS.flat().filter(inRange);
const activeAvail = list => (list||[]).filter(k=>inRange(String(k).slice(0,10)));
const slotKey = (day,h) => day+"@"+String(h).padStart(2,"0");
function slotLabel(k){
  const [day,h]=k.split("@"); const d=pd(day);
  return (d.getMonth()+1)+"/"+d.getDate()+"("+DOW[d.getDay()]+") "+Number(h)+"–"+(Number(h)+2)+"시";
}
function dayLabel(day){ const d=pd(day); return (d.getMonth()+1)+"/"+d.getDate()+"("+DOW[d.getDay()]+")"; }
function weekLabel(w){
  const days=w.filter(inRange); const a=pd(days[0]), b=pd(days[days.length-1]);
  return (a.getMonth()+1)+"/"+a.getDate()+" – "+(b.getMonth()+1)+"/"+b.getDate();
}
const weekIndexOf = day => Math.max(0, WEEKS.findIndex(w=>w.includes(day)));
function defaultWeek(){ return weekIndexOf(RANGE_START); }
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
const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

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
  if (e && (e.error==="wrong_pw"||e.error==="wrong_token")) return "비밀번호가 맞지 않아요. 같은 닉네임의 기존 참가자가 있어요.";
  if (e && e.error==="incomplete") return "파트·장르·아티스트를 하나 이상씩 골라주세요.";
  return "저장 중 오류가 났어요. 잠시 후 다시 시도해 주세요.";
}
let toastTimer = null;
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.hidden=false;
  clearTimeout(toastTimer); toastTimer=setTimeout(()=>{ t.hidden=true; },2600);
}
const lvlOf = (m,p) => { const v = m && m.levels && m.levels[p]; return v ? v : 100; };
const lvlWord = v => v>=100 ? "메인으로 맡을래요" : v>=70 ? "자신 있어요" : v>=40 ? "필요하면 할 수 있어요" : "조금 해봤어요";
function memberPartsText(m, sep){
  const parts = m.parts||[];
  const showLv = parts.length>1 && m.levels && Object.keys(m.levels).length;
  return parts.map(k=>(k==="etc" && m.partEtc ? m.partEtc : (PART[k]?PART[k].n:k))+(showLv ? " "+lvlOf(m,k)+"%" : "")).join(sep||" · ") || "파트 미정";
}
function countUp(el, to){
  const from = Number(el.dataset.v || 0);
  el.dataset.v = to;
  if (from===to || reduceMotion()){ el.textContent = to; return; }
  const t0 = performance.now(), dur = 700;
  const step = now => {
    const p = Math.min(1, (now-t0)/dur), e = 1-Math.pow(1-p,3);
    el.textContent = Math.round(from + (to-from)*e);
    if (p<1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- 상태 ---------- */
let me = null;                 // {id, slug, token, data}
let membersCache = [];
let pollTimer = null;
const artistMap = new Map();   // norm(name|alias) -> {name, genres}
let artistIndex = [];          // [{name, genres, aliases, keys}]
let draft = null;
let currentView = "";
let schedDraft = null;
let sel = null;                // 대시보드 선택: {type, key}
const VIEWS = ["view-offline","view-home","view-login","view-onboard","view-result","view-schedule","view-dash","view-admin"];
const isAdmin = () => !!me && isAdminId(me.id);

/* ---------- 네비게이션 ---------- */
function navItems(){
  if (!me) return [{v:"view-home",ic:"✦",t:"홈"},{v:"view-login",ic:"🎸",t:"취향 등록"},{v:"view-dash",ic:"📊",t:"대시보드"}];
  if (isAdmin()) return [{v:"view-admin",ic:"⚙",t:"관리자"},{v:"view-dash",ic:"📊",t:"대시보드"},{v:"logout",ic:"🚪",t:"나가기"}];
  return [{v:"view-result",ic:"🎩",t:"내 결과"},{v:"view-onboard",ic:"🎸",t:"취향 등록"},{v:"view-schedule",ic:"🗓️",t:"합주 시간"},{v:"view-dash",ic:"📊",t:"대시보드"},{v:"logout",ic:"🚪",t:"나가기"}];
}
function renderNav(){
  const items = navItems();
  $("topnav").innerHTML = items.map(i=>'<button data-v="'+i.v+'" class="'+(i.v===currentView?"on":"")+'">'+esc(i.t)+'</button>').join("")
    + (me ? '<span class="nav-user">🥕 '+esc(me.id)+'</span>' : '');
  $("mobilenav").innerHTML = items.map(i=>'<button data-v="'+i.v+'" class="'+(i.v===currentView?"on":"")+'"><span>'+i.ic+'</span>'+esc(i.t)+'</button>').join("");
}
for (const id of ["topnav","mobilenav"]){
  $(id).addEventListener("click", e=>{ const b=e.target.closest("button[data-v]"); if (b) goTo(b.dataset.v); });
}
function show(view){
  currentView = view;
  for (const v of VIEWS) $(v).hidden = (v!==view);
  renderNav();
  window.scrollTo(0,0);
  revealIn($(view));
}
function goTo(v){
  if (v==="logout") return logout();
  if (v==="view-home"){ refreshHomeCta(); return show("view-home"); }
  if (v==="view-login"){ if (me) return goTo(isAdmin() ? "view-admin" : "view-onboard"); show("view-login"); setTimeout(()=>$("login-id").focus(), 200); return; }
  if (v==="view-dash"){ show("view-dash"); renderDash(true); loadMembers(); return; }
  if (v==="view-admin"){ renderAdmin(); return show("view-admin"); }
  if (!me) return goTo("view-login");
  if (v==="view-onboard") return startOnboarding();
  if (v==="view-schedule") return openSchedule();
  if (v==="view-result"){
    if (!me.data.done) return startOnboarding();
    renderResult(false); return show("view-result");
  }
}
function refreshHomeCta(){
  $("cta-start-label").textContent = !me ? "나의 밴드 취향 찾기" : isAdmin() ? "관리자의 방으로" : me.data.done ? "내 결과 보기" : "취향 등록 이어하기";
}
$("brand").addEventListener("click", ()=>goTo("view-home"));
$("cta-start").addEventListener("click", ()=>goTo(!me ? "view-login" : isAdmin() ? "view-admin" : "view-result"));
$("cta-browse").addEventListener("click", ()=>goTo("view-dash"));
$("part-quick").addEventListener("click", e=>{
  const b = e.target.closest("button[data-part]"); if (!b) return;
  sel = {type:"part", key:b.dataset.part};
  goTo("view-dash");
  setTimeout(()=>{ const d=$("selection-detail"); if (d) d.scrollIntoView({behavior:reduceMotion()?"auto":"smooth", block:"start"}); }, 120);
});

/* ---------- 부팅 (파일 맨 끝에서 실행) ---------- */
async function boot(){
  document.querySelectorAll(".win-label").forEach(el=>{ el.textContent = WINDOW_LABEL; });
  show("view-home");
  initStage(); initTilt();
  try{
    const d = await api("artists");
    for (const a of (d.artists||[])){
      if (!a || !a.name) continue;
      const genres = (a.genres||[]).filter(k=>GENRE_NAME[k]);
      const entry = {name:a.name, genres};
      const keys = [norm(a.name), ...(a.aliases||[]).map(norm)].filter(Boolean);
      artistIndex.push({name:a.name, genres, aliases:a.aliases||[], keys});
      for (const k of keys) if (!artistMap.has(k)) artistMap.set(k, entry);
    }
  }catch(e){ show("view-offline"); return; }
  startPolling();
  const saved = lsGet("kw-session");
  if (saved){
    try{
      const {id, token} = JSON.parse(saved);
      const d = await api("login", {id, token});
      if (d.ok){ setMe(d.member, token); refreshHomeCta(); renderNav(); return; }
    }catch(e){}
    lsDel("kw-session");
  }
}

/* ---------- 로그인 ---------- */
$("btn-login").addEventListener("click", doLogin);
$("login-pw").addEventListener("keydown", e=>{ if (e.key==="Enter") doLogin(); });
$("login-id").addEventListener("keydown", e=>{ if (e.key==="Enter") $("login-pw").focus(); });
async function doLogin(){
  const id = $("login-id").value.trim().normalize("NFC");
  const pw = $("login-pw").value;
  const err = $("login-err");
  err.hidden = true;
  const fail = m => { err.textContent = m; err.hidden = false; };
  if (id.length<2) return fail("닉네임은 2자 이상 입력해 주세요.");
  if (pw.length<4) return fail("비밀번호는 4자 이상 입력해 주세요.");
  $("btn-login").disabled = true;
  try{
    const d = await api("login", {id, pw});
    lsSet("kw-session", JSON.stringify({id:d.member.id, token:d.token}));
    setMe(d.member, d.token);
    $("login-pw").value = "";
    loadMembers();
    if (isAdmin()) goTo("view-admin");
    else if (d.member.done) goTo("view-result");
    else startOnboarding();
  }catch(e){ fail(errText(e)); }
  finally{ $("btn-login").disabled = false; }
}
function setMe(member, token){ me = {id:member.id, slug:member.slug, token, data:member}; }
function logout(){
  lsDel("kw-session"); me = null;
  $("login-id").value = "";
  toast("로그아웃했어요");
  goTo("view-home");
}
$("ob-logout").addEventListener("click", logout);

/* ---------- 멤버 동기화 ---------- */
function startPolling(){
  loadMembers();
  if (!pollTimer) pollTimer = setInterval(()=>{ if (!document.hidden) loadMembers(); }, 20000);
}
async function loadMembers(){
  try{
    const d = await api("members");
    membersCache = d.members || [];
    if (currentView==="view-dash") renderDash(false);
    if (currentView==="view-result"){ renderMates(); renderMyBand(); }
    if (currentView==="view-admin") renderAdmin();
  }catch(e){ /* 다음 폴링에서 재시도 */ }
}
function currentMembers(){
  const list = membersCache.filter(m=>!isAdminId(m.id)).map(m=>({...m, avail:activeAvail(m.avail)}));
  if (!me || isAdmin()) return list;
  const mine = {...me.data, slug:me.slug, id:me.id, avail:activeAvail(me.data.avail)};
  const i = list.findIndex(m=>m.slug===me.slug);
  if (i>=0) list[i] = mine; else list.push(mine);
  return list;
}

/* ---------- 매칭 계산 ---------- */
function tasteScore(a,b){
  const ga=new Set(a.genres||[]), gb=new Set(b.genres||[]);
  const sharedGenres=[...ga].filter(x=>gb.has(x)), uni=new Set([...ga,...gb]).size||1;
  const aa=new Set((a.artists||[]).map(x=>norm(x.name)));
  const shared=(b.artists||[]).filter(x=>aa.has(norm(x.name)));
  const score = .6*(sharedGenres.length/uni) + .25*Math.min(shared.length,2)/2 + .15*(a.style && a.style===b.style ? 1 : 0);
  return {score, shared, sharedGenres};
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
  return {...t, taste:t.score, common, total};
}
// 파트 비중이 낮을수록 그 파트 배정 점수를 깎는다 (100% → 그대로, 50% → 0.78배, 10% → 0.6배).
function teamFit(teamMs, c, role){
  const taste = teamMs.length ? teamMs.reduce((s,t)=>s+tasteScore(t,c).score,0)/teamMs.length : .5;
  const withA = [...teamMs, c].filter(m=>(m.avail||[]).length);
  let timeFit = (c.avail||[]).length ? .3 : .15;
  if (withA.length>=2) timeFit = Math.min(1, intersectAll(withA.map(m=>m.avail)).length/4);
  return (taste*.55 + timeFit*.45) * (.55 + .45*lvlOf(c, role)/100);
}
// 밴드 한 팀씩: 파트마다 비중·시간 순 상위 후보를 추린 뒤 조합을 모두 비교해
// (빈 자리 수 → 비중 × (취향 궁합·다 같이 되는 시간)) 가장 좋은 팀을 고른다.
const lvlFactor = (m, r) => .55 + .45*lvlOf(m, r)/100;
function teamScore(assign){
  const ms = assign.filter(t=>t.m).map(t=>t.m);
  let ts=0, c=0;
  for (let i=0;i<ms.length;i++) for (let j=i+1;j<ms.length;j++){ ts+=tasteScore(ms[i],ms[j]).score; c++; }
  const taste = c ? ts/c : .3;
  const withA = ms.filter(m=>(m.avail||[]).length);
  const time = withA.length>=2 ? Math.min(1, intersectAll(withA.map(m=>m.avail)).length/4) : .25;
  const lv = ms.reduce((s,m,i)=>s+lvlFactor(m, assign.filter(t=>t.m)[i].role),0)/(ms.length||1);
  return ms.length*10 + (taste*.55 + time*.45)*lv*3 + lv;
}
function buildBands(list){
  const pool = list.filter(m=>m.done && !isAdminId(m.id));
  const used = new Set(), bands = [];
  const cand = r => pool.filter(m=>!used.has(m.slug) && (m.parts||[]).includes(r))
    .sort((x,y)=>lvlOf(y,r)-lvlOf(x,r) || (y.avail||[]).length-(x.avail||[]).length).slice(0,6);
  while (bands.length < 12){
    const lists = CORE.map(r=>{ const cs = cand(r); return cs.length ? cs : [null]; });
    if (lists.every(l=>l[0]===null)) break;
    let best = null, bestScore = -1;
    const pick = (i, chosen, seen) => {
      if (i===CORE.length){
        const assign = chosen.map((m,k)=>({m, role:CORE[k]}));
        const sc = teamScore(assign);
        if (sc>bestScore){ bestScore = sc; best = assign; }
        return;
      }
      for (const m of lists[i]){
        if (m && seen.has(m.slug)) continue;
        if (m) seen.add(m.slug);
        pick(i+1, [...chosen, m], seen);
        if (m) seen.delete(m.slug);
      }
      if (lists[i][0]!==null) pick(i+1, [...chosen, null], seen);
    };
    pick(0, [], new Set());
    const team = best.map(t=>({m:t.m, role:t.role}));
    const filled = team.filter(t=>t.m);
    if (filled.length<2) break;
    filled.forEach(t=>used.add(t.m.slug));
    const ks = pool.filter(m=>!used.has(m.slug) && (m.parts||[]).includes("keys"));
    if (ks.length){
      let kb=null, kbs=-1;
      for (const c of ks){ const sc = teamFit(filled.map(t=>t.m), c, "keys"); if (sc>kbs){ kbs=sc; kb=c; } }
      if (kbs>=.3){ team.push({m:kb, role:"keys"}); used.add(kb.slug); }
    }
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
    ? '<div class="role">'+avatarHTML(t.m)+'<span class="rl">'+partLabel(t.role)+'</span><b>'+esc(t.m.id)+'</b>'+((t.m.parts||[]).length>1 && t.m.levels && t.m.levels[t.role] ? '<span class="lv-tag">'+t.m.levels[t.role]+'%</span>' : '')+(me && t.m.slug===me.slug?' <span class="pill orange">나</span>':'')+'</div>'
    : '<div class="role need"><span class="avatar">🔍</span><span class="rl">'+partLabel(t.role)+'</span><b>구하는 중</b></div>').join("");
  const timeTxt = b.common===null ? "시간 등록 멤버 부족" : "다 같이 되는 시간 <b>"+b.common.length+"칸</b>";
  const chips = (b.common||[]).slice(0,3).map(k=>'<span class="pill ok">'+slotLabel(k)+'</span>').join("");
  return '<article class="band'+(b.missing.length?"":" ready")+(mine?" me":"")+'" data-tilt>'
    +'<small class="k">'+st.e+' '+(b.missing.length?"FORMING":"READY TO JAM")+'</small>'
    +'<h4>'+esc(b.name)+'</h4><div class="roles">'+rows+'</div>'
    +'<div class="stats"><span>취향 궁합 <b>'+Math.round(b.taste*100)+'%</b></span><span>'+timeTxt+'</span>'
    +(b.unknownTime?'<span>시간 미입력 '+b.unknownTime+'명</span>':'')+'</div>'
    +(chips?'<div class="pills">'+chips+'</div>':'')+'</article>';
}

/* ---------- 합주 시간표 컴포넌트 ---------- */
function ScheduleGrid(root, o){
  if (!WEEKS.length){
    root.innerHTML = '<div class="empty-state"><span>☾</span><p>지금은 열린 합주 기간이 없어요.</p></div>';
    return { render(){}, setWeek(){}, week:0 };
  }
  let week = Math.min(o.week!=null ? o.week : defaultWeek(), WEEKS.length-1);
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
    title.innerHTML = '<small>WEEK '+(week+1)+' / '+WEEKS.length+' · '+a.getFullYear()+'</small>'+(a.getMonth()+1)+'월 · '+weekLabel(w);
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
            +(n?' style="background:rgba(255,123,44,'+al+');border-color:transparent"':'')+'>'+(n||"")+'</button>';
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
function availSummary(set){
  const n = set.size, wk = new Set([...set].map(k=>weekIndexOf(k.split("@")[0]))).size;
  return n ? '칠한 시간 <b>'+n+'칸</b> ('+(n*2)+'시간) · '+WEEKS.length+'주 중 <b>'+wk+'주</b>' : '아직 칠한 칸이 없어요. 칸을 누르거나 드래그해 보세요.';
}
function mountEditor(root, set, onChange){
  root.innerHTML = '<div class="presets">'
    +'<button data-p="wkEve">🌙 평일 저녁 전부</button><button data-p="weDay">☀️ 주말 낮 전부</button>'
    +'<button data-p="weEve">✨ 주말 저녁 전부</button><button data-p="clrWeek" class="warn">이번 주 지우기</button>'
    +'<button data-p="clrAll" class="warn">전체 지우기</button></div><div class="sg-box"></div><div class="sg-sum"></div>';
  const sum = root.querySelector(".sg-sum");
  const upd = ()=>{ sum.innerHTML = availSummary(set); if (onChange) onChange(); };
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

/* ---------- 취향 등록 ---------- */
function startOnboarding(){
  const d = me.data;
  draft = {
    parts:[...(d.parts||[])], partEtc:d.partEtc||"", genres:[...(d.genres||[])],
    artists:(d.artists||[]).map(a=>({name:a.name, genres:[...(a.genres||[])]})),
    avail:new Set(activeAvail(d.avail)),
    main:(d.parts||[])[0] || null,
    levels:Object.fromEntries((d.parts||[]).map(p=>[p, lvlOf(d,p)])),
  };
  $("ob-name").textContent = me.id;
  $("ob-avatar").style.backgroundImage = "url("+avatarUrl(draft)+")";
  renderPartChoices(); renderGenreChoices(); renderArtistList();
  $("part-etc").value = draft.partEtc;
  $("part-etc-fld").hidden = !draft.parts.includes("etc");
  $("artist-input").value = ""; $("artist-results").innerHTML = ""; $("artist-status").textContent = "";
  $("manual-pick").hidden = true;
  mountEditor($("ob-sched"), draft.avail, updateSaveSummary);
  obMax = d.done ? 4 : 1;
  show("view-onboard");
  setStep(1, 0);
}
function renderPartChoices(){
  $("part-choices").innerHTML = PARTS.map(p=>{
    const on = draft.parts.includes(p.k);
    return '<button type="button" class="choice-card" data-k="'+p.k+'" aria-pressed="'+on+'" data-tilt>'
      +'<span class="choice-av" style="background-image:url('+AV[p.k]+')"></span>'
      +'<b>'+p.e+' '+p.n+'</b><small>'+(on?"선택됨":"선택하기")+'</small></button>';
  }).join("");
  renderMainPick();
}
function fixMain(){
  if (!draft.parts.length) draft.main = null;
  else if (!draft.main || !draft.parts.includes(draft.main)) draft.main = draft.parts[0];
}
function partName(k){ return k==="etc" && $("part-etc").value.trim() ? $("part-etc").value.trim() : PART[k].n; }
function renderLevels(){
  const box = $("level-pick");
  box.hidden = draft.parts.length < 2;
  if (box.hidden) return;
  $("level-list").innerHTML = draft.parts.map(k=>{
    const v = draft.levels[k] || 100;
    return '<div class="level-row"><span class="avatar" style="background-image:url('+AV[k]+')"></span>'
      +'<b>'+PART[k].e+' '+esc(partName(k))+'</b>'
      +'<input type="range" min="10" max="100" step="10" value="'+v+'" data-k="'+k+'" style="--v:'+v+'%" aria-label="'+esc(partName(k))+' 비중">'
      +'<span class="lv-val"><span data-v="'+k+'">'+v+'%</span><small data-w="'+k+'">'+lvlWord(v)+'</small></span></div>';
  }).join("");
}
function renderMainPick(){
  fixMain();
  renderLevels();
  const box = $("main-pick");
  box.hidden = draft.parts.length < 2;
  $("ob-avatar").style.backgroundImage = "url("+avatarUrl(draft)+")";
  if (box.hidden) return;
  $("main-choices").innerHTML = draft.parts.map(k=>
    '<button type="button" class="main-card" data-k="'+k+'" aria-pressed="'+(draft.main===k)+'" data-tilt>'
    +'<span class="main-av" style="background-image:url('+AV[k]+')"></span>'
    +'<b>'+PART[k].e+' '+(k==="etc" && $("part-etc").value.trim() ? esc($("part-etc").value.trim()) : PART[k].n)+'</b>'
    +'<small>'+(draft.main===k ? "메인 캐릭터 ✦" : "이걸로 할래요")+'</small></button>').join("");
}
$("part-choices").addEventListener("click", e=>{
  const b = e.target.closest(".choice-card"); if (!b) return;
  const k = b.dataset.k, i = draft.parts.indexOf(k);
  if (i>=0){ draft.parts.splice(i,1); delete draft.levels[k]; }
  else { draft.parts.push(k); if (!draft.levels[k]) draft.levels[k] = draft.parts.length===1 ? 100 : 60; }
  const on = draft.parts.includes(k);
  b.setAttribute("aria-pressed", on); b.querySelector("small").textContent = on ? "선택됨" : "선택하기";
  if (k==="etc") $("part-etc-fld").hidden = !on;
  renderMainPick();
  updateSaveSummary();
});
$("part-etc").addEventListener("input", ()=>{ if (draft) renderMainPick(); });
$("level-list").addEventListener("input", e=>{
  const r = e.target.closest("input[type=range]"); if (!r) return;
  const k = r.dataset.k, v = Number(r.value);
  draft.levels[k] = v;
  r.style.setProperty("--v", v+"%");
  document.querySelector('[data-v="'+k+'"]').textContent = v+"%";
  document.querySelector('[data-w="'+k+'"]').textContent = lvlWord(v);
  updateSaveSummary();
});
$("main-choices").addEventListener("click", e=>{
  const b = e.target.closest(".main-card"); if (!b) return;
  draft.main = b.dataset.k;
  renderMainPick(); updateSaveSummary();
});
function renderGenreChoices(){
  $("genre-choices").innerHTML = GENRES.map(g=>'<button type="button" class="genre-chip" data-k="'+g.k+'" aria-pressed="'+draft.genres.includes(g.k)+'">'+g.n+'</button>').join("");
}
$("genre-choices").addEventListener("click", e=>{
  const b = e.target.closest(".genre-chip"); if (!b) return;
  const k = b.dataset.k, i = draft.genres.indexOf(k);
  if (i>=0) draft.genres.splice(i,1); else draft.genres.push(k);
  b.setAttribute("aria-pressed", draft.genres.includes(k));
  updateSaveSummary();
});
/* 단계 이동 */
const STEP_INFO = {
  1:{title:"맡고 싶은 파트를 골라주세요", need:"파트를 하나 이상 골라주세요."},
  2:{title:"좋아하는 장르를 골라주세요", need:"장르를 하나 이상 골라주세요."},
  3:{title:"좋아하는 아티스트를 담아주세요", need:"좋아하는 아티스트를 한 팀 이상 담아주세요."},
  4:{title:"합주 가능한 시간을 칠해주세요", need:""},
};
let obStep = 1, obMax = 1;
const stepOk = n => n===1 ? draft.parts.length>0 : n===2 ? draft.genres.length>0 : n===3 ? draft.artists.length>0 : true;
function setStep(n, dir){
  obStep = n; obMax = Math.max(obMax, n);
  document.querySelectorAll(".ob-step").forEach(s=>{
    const on = Number(s.dataset.step)===n;
    s.hidden = !on;
    s.classList.remove("from-left","from-right","nope");
    if (on && dir){ void s.offsetWidth; s.classList.add(dir<0 ? "from-left" : "from-right"); }
  });
  document.querySelectorAll("#ob-steps li").forEach((li,i)=>{
    const k = i+1;
    li.classList.toggle("cur", k===n);
    li.classList.toggle("done", k<n || (k!==n && k<=obMax && stepOk(k) && k<4));
    li.querySelector("button").disabled = k>obMax;
    li.querySelector("button").setAttribute("aria-current", k===n ? "step" : "false");
  });
  $("ob-step-label").textContent = "STEP "+n+" / 4 · "+["파트","장르","아티스트","합주 시간"][n-1];
  $("ob-step-pct").textContent = Math.round((n-1)/4*100)+"%";
  $("ob-prev").hidden = n===1;
  $("ob-next").innerHTML = n<4 ? '다음 <span>→</span>' : '완료하기 <span>✦</span>';
  $("ob-nav-title").textContent = STEP_INFO[n].title;
  updateSaveSummary();
  const top = $("view-onboard").querySelector(".member-banner").getBoundingClientRect().top + scrollY - 12;
  if (dir) window.scrollTo({top, behavior:reduceMotion()?"auto":"smooth"});
  if (n===3 && finePointer()) setTimeout(()=>$("artist-input").focus(), 300);
}
function updateSaveSummary(){
  if (!draft) return;
  const s = $("save-summary"); s.classList.remove("err");
  const n = obStep;
  s.innerHTML = n===1 ? (draft.parts.length ? "선택한 파트: "+esc(memberPartsText({...draft, levels:draft.parts.length>1 ? draft.levels : {}}))+(draft.parts.length>1 && draft.main ? " · 메인 캐릭터: "+PART[draft.main].e+" "+PART[draft.main].n : "") : "여러 개 골라도 좋아요.")
    : n===2 ? (draft.genres.length ? "선택한 장르 "+draft.genres.length+"개" : "끌리는 장르를 여러 개 골라주세요.")
    : n===3 ? (draft.artists.length ? "담은 아티스트 "+draft.artists.length+"팀 · "+esc(draft.artists.slice(0,3).map(a=>a.name).join(", ")) : "검색해서 한 팀 이상 담아주세요.")
    : availSummary(draft.avail);
}
function nope(n, msg){
  const s = $("save-summary"); s.textContent = msg; s.classList.add("err");
  const card = document.querySelector('.ob-step[data-step="'+n+'"]');
  card.classList.remove("nope","from-left","from-right"); void card.offsetWidth; card.classList.add("nope");
}
$("ob-prev").addEventListener("click", ()=>{ if (obStep>1) setStep(obStep-1, -1); });
$("ob-next").addEventListener("click", ()=>{
  if (obStep===1) draft.partEtc = draft.parts.includes("etc") ? $("part-etc").value.trim() : "";
  if (!stepOk(obStep)) return nope(obStep, STEP_INFO[obStep].need);
  if (obStep<4) return setStep(obStep+1, 1);
  completeOnboarding();
});
$("ob-steps").addEventListener("click", e=>{
  const b = e.target.closest("button[data-step]"); if (!b || b.disabled) return;
  const t = Number(b.dataset.step);
  if (t===obStep) return;
  if (t>obStep){
    for (let k=obStep; k<t; k++) if (!stepOk(k)){ if (k!==obStep) setStep(k, -1); return nope(k, STEP_INFO[k].need); }
  }
  setStep(t, t>obStep ? 1 : -1);
});
async function completeOnboarding(){
  draft.partEtc = draft.parts.includes("etc") ? $("part-etc").value.trim() : "";
  for (let k=1;k<=3;k++) if (!stepOk(k)){ setStep(k, -1); return nope(k, STEP_INFO[k].need); }
  const audio = prepareAudio();
  const btn = $("ob-next"); btn.disabled = true;
  try{
    const d = await api("members", {id:me.id, token:me.token, profile:{
      parts:[draft.main, ...draft.parts.filter(p=>p!==draft.main)].filter(Boolean), partEtc:draft.partEtc, genres:draft.genres, artists:draft.artists, avail:[...draft.avail], levels:draft.levels,
    }});
    me.data = d.member;
    loadMembers();
    $("ob-step-pct").textContent = "100%";
    document.querySelectorAll("#ob-steps li").forEach(li=>{ li.classList.remove("cur"); li.classList.add("done"); });
    celebrate(audio);
  }catch(e){ const s=$("save-summary"); s.textContent = errText(e); s.classList.add("err"); if (audio) audio.close(); }
  finally{ btn.disabled = false; }
}

/* ---------- 완료 축하: 팡파레 + 폭죽 ---------- */
function prepareAudio(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ac = new AC(); if (ac.state==="suspended") ac.resume();
    return ac;
  }catch(e){ return null; }
}
function playFanfare(ac){
  if (!ac) return;
  try{
    const master = ac.createGain(); master.gain.value = .14; master.connect(ac.destination);
    const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400; lp.connect(master);
    const t0 = ac.currentTime + .05;
    // 빰-빰-빰 빠아~ 빰 빠아아~ (C5 E5 G5 C6 ... G5 C6)
    const notes = [[523.25,0,.13],[659.25,.15,.13],[783.99,.30,.13],[1046.5,.45,.5],[783.99,.82,.12],[1046.5,.98,.85]];
    for (const [f,t,d] of notes){
      for (const [type,vol,det] of [["sawtooth",.32,1],["square",.14,1.004],["triangle",.22,.5]]){
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = f*det;
        const st = t0+t;
        g.gain.setValueAtTime(0, st);
        g.gain.linearRampToValueAtTime(vol, st+.025);
        g.gain.setValueAtTime(vol*.8, st+d);
        g.gain.exponentialRampToValueAtTime(.0008, st+d+.25);
        o.connect(g); g.connect(lp); o.start(st); o.stop(st+d+.3);
      }
    }
    for (const [f,t] of [[2093,1.05],[2637,1.15],[3136,1.25]]){
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0+t); g.gain.linearRampToValueAtTime(.12, t0+t+.01); g.gain.exponentialRampToValueAtTime(.0008, t0+t+.6);
      o.connect(g); g.connect(master); o.start(t0+t); o.stop(t0+t+.65);
    }
    setTimeout(()=>{ try{ ac.close(); }catch(e){} }, 3200);
  }catch(e){}
}
function fireConfetti(){
  if (reduceMotion()) return;
  const cv = $("confetti"), ctx = cv.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio||1), W = innerWidth, H = innerHeight;
  cv.width = W*dpr; cv.height = H*dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
  const colors = ["#ff7b2c","#ff9a53","#f5d58b","#d8b764","#c26c8c","#76c08f","#fff1c9","#9f8cf5"];
  const emojis = ["🥕","✨","🎸","🎵","⭐","🥁","🎤","❄️","🎹"];
  const parts = [];
  const add = (x,y,ang,spread,speed,n) => {
    for (let i=0;i<n;i++){
      const a = ang + (Math.random()-.5)*spread, s = speed*(.55+Math.random()*.6);
      const emoji = Math.random()<.16;
      parts.push({x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, g:.16+Math.random()*.1, r:Math.random()*6.28, vr:(Math.random()-.5)*.3,
        w:6+Math.random()*6, h:9+Math.random()*9, c:colors[i%colors.length], e: emoji ? emojis[(Math.random()*emojis.length)|0] : null,
        sz:18+Math.random()*12, life:0, max:150+Math.random()*90, wob:Math.random()*6.28});
    }
  };
  add(W*.08, H*.98, -Math.PI/2+.42, .8, 19, 70);
  add(W*.92, H*.98, -Math.PI/2-.42, .8, 19, 70);
  setTimeout(()=>add(W*.5, H*.3, -Math.PI/2, 6.28, 11, 80), 350);
  setTimeout(()=>{ for (let i=0;i<50;i++) add(Math.random()*W, -20, Math.PI/2, .5, 3, 1); }, 700);
  let raf = 0;
  const loop = ()=>{
    ctx.clearRect(0,0,W,H);
    for (let i=parts.length-1;i>=0;i--){
      const p = parts[i];
      p.life++; p.vy += p.g; p.vx *= .985; p.vy *= .985; p.wob += .1;
      p.x += p.vx + Math.sin(p.wob)*.6; p.y += p.vy; p.r += p.vr;
      const fade = p.life>p.max-40 ? Math.max(0,(p.max-p.life)/40) : 1;
      if (p.life>p.max || p.y>H+60){ parts.splice(i,1); continue; }
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x,p.y); ctx.rotate(p.r);
      if (p.e){ ctx.font = p.sz+"px serif"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText(p.e,0,0); }
      else { ctx.fillStyle = p.c; ctx.scale(1, Math.cos(p.wob)); ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); }
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop); else { ctx.clearRect(0,0,W,H); raf = 0; }
  };
  raf = requestAnimationFrame(loop);
}
function celebrate(audio){
  const d = me.data, st = STYLES[d.style]||STYLES.pop;
  $("cel-avatar").style.backgroundImage = "url("+avatarUrl(d)+")";
  $("cel-sub").innerHTML = esc(me.id)+"님은 <b style=\"color:#fff\">"+st.e+" "+esc(st.n)+"</b>!<br>마법의 모자가 맞는 메이트와 밴드를 찾아뒀어요.";
  $("cel-stats").innerHTML = '<span class="pill orange">'+esc(memberPartsText(d))+'</span>'
    +'<span class="pill gold">장르 '+(d.genres||[]).length+'</span><span class="pill gold">아티스트 '+(d.artists||[]).length+'</span>'
    +'<span class="pill '+(activeAvail(d.avail).length?"ok":"")+'">합주 시간 '+activeAvail(d.avail).length+'칸</span>';
  $("celebrate").hidden = false;
  fireConfetti(); playFanfare(audio);
  setTimeout(()=>$("cel-go").focus(), 400);
}
function closeCelebrate(){
  if ($("celebrate").hidden) return;
  $("celebrate").hidden = true;
  renderResult(true); show("view-result");
}
$("cel-go").addEventListener("click", closeCelebrate);
$("celebrate").addEventListener("click", e=>{ if (e.target.id==="celebrate") closeCelebrate(); });
document.addEventListener("keydown", e=>{ if (e.key==="Escape") closeCelebrate(); });

/* ---------- 아티스트 검색 ---------- */
let manualPending = null, manualSel = [];
function searchArtists(q){
  const n = norm(q); if (!n) return [];
  const chosen = new Set(draft.artists.map(a=>norm(a.name)));
  const starts = [], has = [];
  for (const a of artistIndex){
    if (chosen.has(norm(a.name))) continue;
    if (a.keys.some(k=>k.startsWith(n))) starts.push(a);
    else if (n.length>=2 && a.keys.some(k=>k.includes(n))) has.push(a);
    if (starts.length>=9) break;
  }
  return [...starts, ...has].slice(0,9);
}
function renderResults(){
  const q = $("artist-input").value.trim();
  const box = $("artist-results");
  if (!q){ box.innerHTML = ""; box._res = []; return; }
  const res = searchArtists(q);
  const exact = res.some(a=>a.keys.includes(norm(q)));
  box.innerHTML = res.map((a,i)=>'<button type="button" data-i="'+i+'"><b>'+esc(a.name)+'</b><small>'+esc(a.genres.map(g=>GENRE_NAME[g]).join(" · "))+(a.aliases.length?' · '+esc(a.aliases[0]):'')+'</small></button>').join("")
    + (exact ? "" : '<button type="button" class="ai" data-ai="1"><b>🔮 \''+esc(q)+'\' 추가</b><small>마법 수정구가 장르를 맞혀요</small></button>');
  box._res = res;
}
$("artist-input").addEventListener("input", renderResults);
$("artist-input").addEventListener("keydown", e=>{
  if (e.key!=="Enter") return;
  e.preventDefault();
  const q = $("artist-input").value.trim(); if (!q) return;
  const res = $("artist-results")._res || searchArtists(q);
  const exact = res.find(a=>a.keys.includes(norm(q)));
  if (exact) pickArtist(exact); else if (res.length===1) pickArtist(res[0]); else askCrystal(q);
});
$("artist-results").addEventListener("click", e=>{
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.ai) return askCrystal($("artist-input").value.trim());
  const a = ($("artist-results")._res||[])[Number(b.dataset.i)]; if (a) pickArtist(a);
});
function pickArtist(a){
  if (draft.artists.some(x=>norm(x.name)===norm(a.name))){ $("artist-status").textContent = "이미 담겨 있어요!"; return; }
  draft.artists.push({name:a.name, genres:[...a.genres]});
  $("artist-input").value = ""; renderResults(); $("artist-status").textContent = "";
  renderArtistList(); updateSaveSummary(); $("artist-input").focus();
}
async function askCrystal(name){
  if (!name) return;
  const st = $("artist-status");
  if (draft.artists.some(a=>norm(a.name)===norm(name))){ st.textContent = "이미 담겨 있어요!"; return; }
  st.textContent = "🔮 마법 수정구에 '"+name+"'을(를) 물어보는 중…";
  try{
    const d = await api("artists", {name});
    if (d.known && (d.genres||[]).length){
      const genres = d.genres.filter(k=>GENRE_NAME[k]).slice(0,3);
      const nm = d.name || name;
      artistMap.set(norm(nm), {name:nm, genres});
      artistIndex.push({name:nm, genres, aliases:[], keys:[norm(nm)]});
      draft.artists.push({name:nm, genres});
      st.textContent = "✨ 수정구: "+genres.map(k=>GENRE_NAME[k]).join(", ")+" 느낌이래요!";
      $("artist-input").value = ""; renderResults(); renderArtistList(); updateSaveSummary();
      return;
    }
  }catch(e){ /* 수동 선택으로 */ }
  st.textContent = "";
  openManual(name);
}
function openManual(name){
  manualPending = name; manualSel = [];
  $("manual-msg").textContent = "수정구가 '"+name+"'은(는) 잘 모르겠대요. 장르를 직접 1~3개 골라주세요.";
  $("manual-chips").innerHTML = GENRES.map(g=>'<button type="button" class="genre-chip" data-k="'+g.k+'" aria-pressed="false">'+g.n+'</button>').join("");
  $("manual-pick").hidden = false;
}
$("manual-chips").addEventListener("click", e=>{
  const b = e.target.closest(".genre-chip"); if (!b) return;
  const k = b.dataset.k, i = manualSel.indexOf(k);
  if (i>=0) manualSel.splice(i,1); else if (manualSel.length<3) manualSel.push(k);
  b.setAttribute("aria-pressed", manualSel.includes(k));
});
$("manual-cancel").addEventListener("click", ()=>{ manualPending=null; $("manual-pick").hidden=true; });
$("manual-ok").addEventListener("click", ()=>{
  if (!manualPending || !manualSel.length) return;
  draft.artists.push({name:manualPending, genres:[...manualSel]});
  manualPending = null; $("manual-pick").hidden = true; $("artist-input").value = ""; renderResults();
  renderArtistList(); updateSaveSummary();
});
function renderArtistList(){
  const box = $("artist-list");
  box.innerHTML = draft.artists.map((a,i)=>'<div class="artist-rank-row"><span class="artist-rank">'+(i+1)+'</span>'
    +'<div><b>'+esc(a.name)+'</b><small>'+esc(a.genres.map(k=>GENRE_NAME[k]||k).join(" · "))+'</small></div>'
    +'<div class="artist-rank-actions"><button type="button" data-a="up" data-i="'+i+'" aria-label="위로"'+(i===0?" disabled":"")+'>↑</button>'
    +'<button type="button" data-a="down" data-i="'+i+'" aria-label="아래로"'+(i===draft.artists.length-1?" disabled":"")+'>↓</button>'
    +'<button type="button" data-a="del" data-i="'+i+'" aria-label="'+esc(a.name)+' 빼기">✕</button></div></div>').join("");
}
$("artist-list").addEventListener("click", e=>{
  const b = e.target.closest("button[data-a]"); if (!b) return;
  const i = Number(b.dataset.i), arr = draft.artists;
  if (b.dataset.a==="del") arr.splice(i,1);
  else { const j = b.dataset.a==="up" ? i-1 : i+1; if (j<0||j>=arr.length) return; [arr[i],arr[j]]=[arr[j],arr[i]]; }
  renderArtistList(); updateSaveSummary();
});

/* ---------- 내 결과 ---------- */
function renderResult(animate){
  const st = STYLES[me.data.style] || STYLES.pop;
  const card = $("sorting-card");
  const fill = ()=>{
    $("result-title").innerHTML = esc(me.id)+'님은<br><em>'+esc(st.n)+'</em>';
    $("result-desc").textContent = st.d;
    const parts = (me.data.parts||[]).map(k=> k==="etc" && me.data.partEtc ? "✨ "+me.data.partEtc : partLabel(k));
    card.innerHTML = '<div class="hat-avatar" style="background-image:url('+avatarUrl(me.data)+')"></div>'
      +'<div><div class="section-label">SORTING HAT SAYS</div><h2>'+st.e+' '+esc(st.n)+'</h2>'
      +'<p>잘 맞는 유형은 <b style="color:#fff">'+esc(st.mate)+'</b>예요.</p>'
      +'<div class="pills">'+parts.map(p=>'<span class="pill orange">'+esc(p)+'</span>').join("")
      +(me.data.genres||[]).slice(0,5).map(k=>'<span class="pill gold">'+esc(GENRE_NAME[k]||k)+'</span>').join("")+'</div></div>';
  };
  if (animate && !reduceMotion()){
    $("result-title").innerHTML = '마법의 모자가<br><em>고민 중이에요…</em>';
    $("result-desc").textContent = "파트와 취향, 합주 시간을 섞어보는 중이에요.";
    card.innerHTML = '<div class="hat-avatar thinking" style="background-image:url('+AV.vocal+')"></div><div><div class="section-label">SORTING…</div><h2>음… 어디 보자…</h2><p>당신의 플레이리스트에서 겨울 냄새가 나요.</p></div>';
    setTimeout(fill, 1700);
  } else fill();
  renderTimeCallout(); renderMyBand(); renderMates();
}
function renderTimeCallout(){
  const n = activeAvail(me.data.avail).length;
  $("time-callout").innerHTML = n
    ? '<section class="coming-card"><span>🗓️</span><div><b>합주 가능 시간 '+n+'칸 ('+(n*2)+'시간) 등록됨</b><p>시간이 바뀌면 언제든 다시 칠할 수 있어요.</p></div><button class="button small ghost" data-go="view-schedule">시간 수정</button></section>'
    : '<section class="coming-card"><span>🎄</span><div><b>아직 합주 시간을 칠하지 않았어요</b><p>시간을 칠하면 다 같이 되는 시간이 맞는 사람끼리 밴드를 더 정확히 묶어드려요.</p></div><button class="button small primary" data-go="view-schedule">시간 칠하기 →</button></section>';
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
  box.innerHTML = '<div class="empty-state"><span>☾</span><p>아직 밴드를 짤 만큼 멤버가 모이지 않았어요.'
    +(need.length ? '<br>지금 필요한 파트: <b style="color:#f2cf79">'+need.map(partLabel).join(", ")+'</b>' : '')+'<br>링크를 모임방에 공유해 보세요 🥕</p></div>';
}
let mateMode = "both";
const timeOpen = new Set();
const MODE_DESC = {
  both:"취향(장르·아티스트·마법 모자 유형) 60% + 겹치는 합주 시간 40%",
  taste:"합주 시간은 빼고 음악 취향만 비교했어요. 같이 좋아하는 아티스트가 많을수록 위로 와요.",
  time:"취향은 빼고 합주 가능한 시간이 많이 겹치는 순서예요. 다 같이 되는 날짜와 시간을 확인해 보세요.",
};
function groupByDay(slots){
  const by = new Map();
  for (const k of slots.slice().sort()){ const [d,h] = k.split("@"); if (!by.has(d)) by.set(d, []); by.get(d).push(Number(h)); }
  return [...by.entries()];
}
function renderMates(){
  if (!me || !me.data.done) return;
  document.querySelectorAll("#mate-mode button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.mode===mateMode));
  $("mates-desc").textContent = MODE_DESC[mateMode];
  $("mates-title").textContent = mateMode==="time" ? me.id+"님과 합주 시간이 맞는 메이트"
    : mateMode==="taste" ? me.id+"님과 취향이 맞는 메이트" : me.id+"님과 취향·시간이 가까운 메이트";
  const meNow = currentMembers().find(m=>m.slug===me.slug) || me.data;
  const others = currentMembers().filter(m=>m.done && m.slug!==me.slug);
  const box = $("mates");
  if (!others.length){ box.innerHTML = '<div class="empty-state"><span>☾</span><p>다른 참여자가 취향을 저장하면 매칭 카드가 나타나요.</p></div>'; return; }
  const myParts = new Set(meNow.parts||[]);
  const scored = others.map(m=>({m, s:mateScore(meNow, m)}));

  if (mateMode==="time"){
    if (!(meNow.avail||[]).length){
      box.innerHTML = '<div class="empty-state"><span>🗓️</span><p>내 합주 시간을 먼저 칠해야 시간이 맞는 사람을 찾을 수 있어요.</p>'
        +'<button class="button small primary" data-go="view-schedule" style="margin-top:8px">시간 칠하기 →</button></div>';
      return;
    }
    const hit = scored.filter(x=>x.s.common && x.s.common.length).sort((a,b)=>b.s.common.length-a.s.common.length || b.s.taste-a.s.taste);
    const none = scored.filter(x=>x.s.common && !x.s.common.length).map(x=>x.m.id);
    const unknown = scored.filter(x=>x.s.common===null).map(x=>x.m.id);
    box.innerHTML = '<div class="mates-in">'
      +(hit.length ? '<div class="time-list">'+hit.map(({m,s})=>{
        const st = STYLES[m.style]||STYLES.pop;
        const days = groupByDay(s.common), open = timeOpen.has(m.slug), shown = open ? days : days.slice(0,5);
        return '<article class="time-row">'+avatarHTML(m)
          +'<div><h3>'+esc(m.id)+'</h3><p class="sub">'+esc(memberPartsText(m))+' · '+st.e+' '+esc(st.n)+'</p></div>'
          +'<div class="big"><strong>'+s.common.length+'</strong>칸<small>'+days.length+'일 · '+(s.common.length*2)+'시간</small></div>'
          +'<div class="tdays">'+shown.map(([d,hs])=>'<div class="tday"><b>'+dayLabel(d)+'</b>'
            +hs.map(h=>'<span class="pill ok">'+h+'–'+(h+2)+'시</span>').join("")+'</div>').join("")+'</div>'
          +(days.length>5 ? '<button type="button" class="tmore" data-more="'+esc(m.slug)+'">'+(open ? "접기 ▲" : "+ "+(days.length-5)+"일 더 보기 ▼")+'</button>' : '')
          +'</article>';
      }).join("")+'</div>' : '<div class="empty-state"><span>☾</span><p>아직 나와 겹치는 합주 시간이 있는 멤버가 없어요.</p></div>')
      +(none.length ? '<p class="tnote">🕰️ 겹치는 시간이 없는 멤버 · '+esc(none.join(", "))+'</p>' : '')
      +(unknown.length ? '<p class="tnote">✏️ 아직 시간을 안 칠한 멤버 · '+esc(unknown.join(", "))+'</p>' : '')
      +'</div>';
    return;
  }

  const key = mateMode==="taste" ? (x=>x.s.taste) : (x=>x.s.total);
  const rows = scored.sort((a,b)=>key(b)-key(a)).slice(0,8);
  box.innerHTML = '<div class="match-grid mates-in">'+rows.map(({m,s},idx)=>{
    const st = STYLES[m.style]||STYLES.pop;
    const lack = (m.parts||[]).filter(p=>CORE.includes(p) && !myParts.has(p));
    const pct = Math.min(99, Math.round((mateMode==="taste" ? s.taste : s.total)*100));
    const time = s.common===null ? '<span>🗓️ 합주 시간 · 아직 미입력</span>'
      : s.common.length ? '<span class="time">🗓️ 겹치는 시간 '+s.common.length+'칸 · '+slotLabel(s.common[0])+'</span>'
      : '<span>🗓️ 겹치는 시간 없음</span>';
    return '<article class="match-card" data-tilt><div class="match-rank">#'+(idx+1)+(mateMode==="taste"?" · 취향":"")+'</div><div class="match-score"><strong>'+pct+'</strong><span>%</span></div>'
      +'<div class="match-who">'+avatarHTML(m)+'<div><h3>'+esc(m.id)+'</h3><p class="match-title" style="margin:2px 0 0">'+st.e+' '+esc(st.n)+'</p></div></div>'
      +'<div class="match-reasons" style="margin-top:14px">'
      +(s.shared.length ? '<span>🎧 같이 좋아함 · '+esc(s.shared.slice(0,3).map(a=>a.name).join(" · "))+'</span>' : '')
      +(s.sharedGenres.length ? '<span>✦ 취향 결 · '+esc(s.sharedGenres.slice(0,3).map(g=>GENRE_NAME[g]).join(" · "))+'</span>' : '')
      +(mateMode==="taste" && m.style===meNow.style ? '<span>🎩 같은 마법사 유형</span>' : '')
      +(mateMode==="taste" ? '' : time)
      +'<span>🎸 파트 · '+esc(memberPartsText(m))+'</span>'
      +(lack.length ? '<span class="need">🧩 내게 없는 파트 · '+lack.map(p=>PART[p].n).join(" · ")+'</span>' : '')
      +'</div></article>';
  }).join("")+'</div>';
}
$("mate-mode").addEventListener("click", e=>{
  const b = e.target.closest("button[data-mode]"); if (!b) return;
  mateMode = b.dataset.mode; renderMates();
});
$("mates").addEventListener("click", e=>{
  const go = e.target.closest("[data-go]"); if (go) return goTo(go.dataset.go);
  const more = e.target.closest("[data-more]"); if (!more) return;
  const k = more.dataset.more;
  if (timeOpen.has(k)) timeOpen.delete(k); else timeOpen.add(k);
  renderMates();
});
$("btn-edit").addEventListener("click", ()=>goTo("view-onboard"));
$("btn-time").addEventListener("click", ()=>goTo("view-schedule"));
$("btn-godash").addEventListener("click", ()=>goTo("view-dash"));

/* ---------- 내 합주 시간 ---------- */
function openSchedule(){
  schedDraft = new Set(activeAvail(me.data.avail));
  mountEditor($("my-sched"), schedDraft, ()=>{ $("sched-summary").innerHTML = availSummary(schedDraft); });
  show("view-schedule");
}
$("sched-cancel").addEventListener("click", ()=>goTo("view-result"));
$("sched-save").addEventListener("click", async ()=>{
  const btn = $("sched-save"); btn.disabled = true;
  try{
    const d = await api("members", {id:me.id, token:me.token, avail:[...schedDraft]});
    me.data = d.member;
    toast("합주 시간을 저장했어요 🎄");
    loadMembers();
    goTo("view-result");
  }catch(e){ $("sched-summary").textContent = errText(e); }
  finally{ btn.disabled = false; }
});

/* ---------- 대시보드 ---------- */
let heatWeek = null, heatPick = null;
function renderDash(fresh){
  const all = currentMembers();
  const done = all.filter(m=>m.done);
  const bands = buildBands(all);
  const full = bands.filter(b=>!b.missing.length).length;
  const timed = all.filter(m=>(m.avail||[]).length).length;
  const artistAgg = {};
  for (const m of done) for (const a of (m.artists||[])){
    const k = norm(a.name);
    if (!artistAgg[k]) artistAgg[k] = {name:a.name, count:0};
    artistAgg[k].count++;
  }
  const hero = $("stats-hero");
  if (!hero.firstChild){
    hero.innerHTML = '<button class="big-stat" data-sel="all:all"><small>참여 완료 · 눌러보기</small><strong id="st-total">0</strong><span>명</span></button>'
      +'<div class="stats-copy"><span>THIS WINTER</span><h2 id="st-copy"></h2>'
      +'<div class="mini-stats"><div><b id="st-bands">0</b><small>바로 꾸릴 수 있는 밴드</small></div><div><b id="st-timed">0</b><small>시간을 칠한 멤버</small></div><div><b id="st-artists">0</b><small>모인 최애 아티스트</small></div></div></div>';
  }
  countUp($("st-total"), done.length); countUp($("st-bands"), full); countUp($("st-timed"), timed); countUp($("st-artists"), Object.keys(artistAgg).length);
  $("st-copy").textContent = done.length ? done.length+"개의 취향이 한 무대에 모이고 있어요." : "첫 번째 밴드 메이트를 기다리고 있어요.";

  $("dash-bands").innerHTML = bands.length ? bands.map(bandCard).join("")
    : '<div class="empty-state"><span>🎩</span><p>멤버가 2명 이상 모이면 파트를 맞춰 밴드를 짜드려요.</p></div>';

  renderHeat(all);

  const partCount={};
  for (const p of PARTS) partCount[p.k]=0;
  for (const m of done) for (const k of (m.parts||[])) if (k in partCount) partCount[k]++;
  const maxP = Math.max(1, ...Object.values(partCount));
  const mainCount = {};
  for (const p of PARTS) mainCount[p.k] = done.filter(m=>(m.parts||[]).includes(p.k) && lvlOf(m,p.k)>=70).length;
  $("dash-parts").innerHTML = PARTS.map(p=>barRow("part:"+p.k, partLabel(p.k), partCount[p.k], maxP, "", partCount[p.k] ? "주력 "+mainCount[p.k] : "")).join("");
  const rare = CORE.slice().sort((a,b)=>partCount[a]-partCount[b])[0];
  $("dash-need").textContent = done.length ? "지금 제일 귀한 파트: "+PART[rare].n+" — 주변에 연주자가 있다면 모셔와요!" : "";

  const gCount={};
  for (const m of done) for (const k of (m.genres||[])) gCount[k]=(gCount[k]||0)+1;
  const gSorted = Object.entries(gCount).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxG = Math.max(1, ...gSorted.map(e=>e[1]));
  $("dash-genres").innerHTML = gSorted.length ? gSorted.map(([k,c])=>barRow("genre:"+k, GENRE_NAME[k]||k, c, maxG, "wine")).join("") : empty("아직 장르 데이터가 없어요.");

  const sCount={};
  for (const m of done) sCount[m.style]=(sCount[m.style]||0)+1;
  $("dash-styles").innerHTML = Object.entries(STYLES).map(([k,s])=>
    '<button class="style-cell'+(sel&&sel.type==="style"&&sel.key===k?" on":"")+'" data-sel="style:'+k+'"><span class="e">'+s.e+'</span><b>'+(sCount[k]||0)+'명</b><small>'+esc(s.n)+'</small></button>').join("");

  const aSorted = Object.values(artistAgg).sort((a,b)=>b.count-a.count || a.name.localeCompare(b.name)).slice(0,12);
  const maxA = Math.max(1, ...aSorted.map(a=>a.count));
  $("dash-artists").innerHTML = aSorted.length ? aSorted.map(a=>barRow("artist:"+norm(a.name), a.name, a.count, maxA, "gold")).join("")
    : empty("취향 등록에서 좋아하는 아티스트를 골라주세요.");

  $("dash-coming").innerHTML = me ? "" : '<section class="coming-card"><span>✦</span><div><b>내 매칭 점수를 보고 싶다면</b><p>닉네임으로 입장하고 파트·장르·아티스트·합주 시간을 저장하면 나와 맞는 메이트와 밴드가 나타나요.</p></div><button class="button small primary" data-go="view-login">취향 등록 →</button></section>';

  renderSelection(all, artistAgg);
  if (fresh){
    const v = $("view-dash"); v.classList.add("grow");
    setTimeout(()=>v.classList.remove("grow"), 1300);
  }
}
function empty(t){ return '<div class="empty-state"><span>☾</span><p>'+t+'</p></div>'; }
function barRow(selKey, label, c, max, tone, extra){
  const on = sel && (sel.type+":"+sel.key)===selKey;
  return '<button class="bar-row'+(on?" on":"")+'" data-sel="'+esc(selKey)+'"><div class="bar-label"><b>'+esc(label)+'</b><span>'+c+'명'+(extra?' · '+extra:'')+' →</span></div>'
    +'<div class="bar-track'+(tone?" "+tone:"")+'"><i style="width:'+(c?Math.max(8,c/max*100):0)+'%"></i></div></button>';
}
function renderSelection(all, artistAgg){
  const anchor = $("selection-anchor");
  if (!sel){ anchor.innerHTML = ""; return; }
  const done = all.filter(m=>m.done);
  let title = "", list = [];
  if (sel.type==="all"){ title = "참여자 전체"; list = done; }
  else if (sel.type==="part"){ title = partLabel(sel.key)+" 선택자"; list = done.filter(m=>(m.parts||[]).includes(sel.key)); }
  else if (sel.type==="genre"){ title = (GENRE_NAME[sel.key]||sel.key)+" 선택자"; list = done.filter(m=>(m.genres||[]).includes(sel.key)); }
  else if (sel.type==="style"){ const s = STYLES[sel.key]||STYLES.pop; title = s.e+" "+s.n; list = done.filter(m=>m.style===sel.key); }
  else if (sel.type==="artist"){ const a = artistAgg && artistAgg[sel.key]; title = (a ? a.name : "그 아티스트")+" 좋아하는 사람"; list = done.filter(m=>(m.artists||[]).some(x=>norm(x.name)===sel.key)); }
  anchor.innerHTML = '<section class="magic-card selection-detail" id="selection-detail"><div class="card-head"><div><small>WHO PICKED THIS?</small><h2>'+esc(title)+'</h2><p>'+list.length+'명이 선택했어요.</p></div><button class="button small ghost" id="sel-close">닫기</button></div>'
    +(list.length ? '<div class="people-grid">'+list.map(personCard).join("")+'</div>' : empty("아직 아무도 없어요."))+'</section>';
}
function personCard(m){
  const n = (m.avail||[]).length;
  return '<article class="person-card" data-tilt>'+avatarHTML(m)+'<div><h3>'+esc(m.id)+'</h3><p>'+esc(memberPartsText(m))+'</p></div>'
    +'<div class="person-tags">'+(m.artists||[]).slice(0,3).map(a=>'<span>'+esc(a.name)+'</span>').join("")
    +(m.genres||[]).slice(0,3).map(g=>'<span>'+esc(GENRE_NAME[g]||g)+'</span>').join("")
    +(n?'<span class="time">🗓️ '+n+'칸</span>':'')+'</div></article>';
}
$("view-dash").addEventListener("click", e=>{
  if (e.target.closest("#sel-close")){ sel = null; renderDash(false); return; }
  const go = e.target.closest("[data-go]"); if (go){ goTo(go.dataset.go); return; }
  const b = e.target.closest("[data-sel]"); if (!b) return;
  const [type, ...rest] = b.dataset.sel.split(":"); const key = rest.join(":");
  sel = (sel && sel.type===type && sel.key===key) ? null : {type, key};
  renderDash(false);
  if (sel) setTimeout(()=>{ const d=$("selection-detail"); if (d) d.scrollIntoView({behavior:reduceMotion()?"auto":"smooth", block:"start"}); }, 40);
});
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
    const cover = ROLE_ORDER.map(r=>{
      const c = ms.filter(m=>(m.parts||[]).includes(r)).length;
      return '<span class="pill '+(c?"ok":"bad")+'">'+partLabel(r)+' '+c+'</span>';
    }).join("");
    det.innerHTML = '<div class="slot-detail"><h4>'+slotLabel(heatPick)+' · '+ms.length+'명 가능</h4>'
      +(ms.length ? '<div class="pills">'+ms.map(m=>'<span class="pill gold">'+esc(m.id)+'</span>').join("")+'</div>' : '<p class="muted" style="margin:0;font-size:12px">이 시간엔 아직 아무도 없어요.</p>')
      +'<div class="pills">'+cover+'</div>'
      +(ms.length && canFormBand(ms) ? '<div class="notice success">🎉 이 시간엔 보컬·기타·베이스·드럼 풀밴드 합주가 가능해요!</div>' : '')
      +'</div>';
  } else det.innerHTML = '<p class="muted" style="font-size:12px;margin:12px 0 0">'+(max ? "칸을 눌러 누가 되는지 확인해 보세요." : "아직 시간을 칠한 멤버가 없어요.")+'</p>';
  const top = [...heat.entries()].filter(([,v])=>v.length>=2).sort((a,b)=>b[1].length-a[1].length || (a[0]<b[0]?-1:1)).slice(0,6);
  $("dash-top").innerHTML = top.length ? top.map(([k,v])=>{
    const full = canFormBand(v);
    return '<button data-top="'+k+'"><span class="n">'+v.length+'명</span><span style="flex:1">'+slotLabel(k)
      +'<small>'+esc(v.map(m=>m.id).slice(0,4).join(", "))+(v.length>4?" 외":"")+'</small></span>'
      +(full?'<span class="pill ok">풀밴드</span>':'')+'</button>';
  }).join("") : empty("두 명 이상 겹치는 시간이 생기면 여기에 떠요.");
}
$("dash-top").addEventListener("click", e=>{
  const b = e.target.closest("button[data-top]"); if (!b) return;
  heatPick = b.dataset.top; heatWeek = weekIndexOf(heatPick.split("@")[0]);
  renderHeat();
  $("dash-heat").scrollIntoView({behavior:reduceMotion()?"auto":"smooth", block:"center"});
});

/* ---------- 관리자 ---------- */
let adminTarget = null;
function renderAdmin(){
  if (!isAdmin()) return;
  const list = [...membersCache].sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""));
  const people = list.filter(m=>!isAdminId(m.id));
  $("admin-summary").innerHTML = '<div><small>TOTAL MEMBERS</small><strong>'+people.length+'</strong><span> 명</span></div>'
    +'<p>완료 '+people.filter(m=>m.done).length+'명 · 작성 중 '+people.filter(m=>!m.done).length+'명 · 시간 등록 '+people.filter(m=>(m.avail||[]).length).length+'명</p>';
  const rows = $("admin-rows");
  rows.innerHTML = list.length ? "" : '<tr><td colspan="7" class="muted">아직 멤버가 없어요.</td></tr>';
  for (const m of list){
    const tr = document.createElement("tr");
    tr.innerHTML = '<td><b>'+esc(m.id||"?")+'</b>'+(isAdminId(m.id||"")?" 🗝️":"")+'</td>'
      +'<td>'+esc(memberPartsText(m, ", "))+'</td>'
      +'<td>'+esc((m.genres||[]).map(k=>GENRE_NAME[k]||k).join(", "))+'</td>'
      +'<td>'+esc((m.artists||[]).map(a=>a.name).join(", "))+'</td>'
      +'<td>'+(m.avail||[]).length+'칸</td>'
      +'<td>'+(m.done ? '<span class="pill ok">완료</span>' : '<span class="pill gold">작성 중</span>')+'</td>';
    const td = document.createElement("td");
    td.innerHTML = '<div class="row-actions"></div>';
    for (const [label,act] of [["이름 변경","rename"],["비번 재설정","resetpw"],["삭제","delete"]]){
      const b = document.createElement("button");
      b.className = "button small "+(act==="delete"?"danger":"ghost"); b.textContent = label;
      b.addEventListener("click", ()=>openAdminEditor(m, act));
      td.firstChild.appendChild(b);
    }
    tr.appendChild(td); rows.appendChild(tr);
  }
}
function openAdminEditor(m, act){
  adminTarget = {m, act};
  const ed = $("admin-editor"); ed.hidden = false;
  const btns = (cls, txt)=>'<div style="display:flex;gap:8px"><button class="button small ghost" id="admin-cancel">취소</button><button class="button small '+cls+'" id="admin-go">'+txt+'</button></div><div id="admin-err" class="notice error" hidden></div>';
  if (act==="rename"){
    ed.innerHTML = '<div class="row-edit"><b>\''+esc(m.id)+'\' 이름 변경 / 합치기</b>'
      +'<p class="muted" style="margin:0;font-size:12px">새 이름이 이미 있는 계정이면 두 계정을 하나로 합쳐요 (파트·장르·가수·합주 시간 합집합, 비밀번호는 기존 계정 것 유지).</p>'
      +'<input class="text-input" id="admin-input" maxlength="20" placeholder="새 닉네임">'+btns("primary","변경하기")+'</div>';
  } else if (act==="resetpw"){
    ed.innerHTML = '<div class="row-edit"><b>\''+esc(m.id)+'\' 비밀번호 재설정</b>'
      +'<input class="text-input" id="admin-input" maxlength="40" placeholder="새 비밀번호 (본인에게 전달하세요)">'+btns("primary","재설정")+'</div>';
  } else {
    ed.innerHTML = '<div class="row-edit"><b>\''+esc(m.id)+'\' 계정을 삭제할까요?</b>'
      +'<p class="muted" style="margin:0;font-size:12px">프로필, 취향, 합주 시간이 모두 지워지고 되돌릴 수 없어요.</p>'+btns("danger","삭제하기")+'</div>';
  }
  $("admin-cancel").addEventListener("click", ()=>{ ed.hidden=true; adminTarget=null; });
  $("admin-go").addEventListener("click", runAdminAction);
  ed.scrollIntoView({behavior:reduceMotion()?"auto":"smooth", block:"center"});
}
async function runAdminAction(){
  if (!adminTarget) return;
  const {m, act} = adminTarget, err = $("admin-err");
  const fail = t => { err.textContent = t; err.hidden = false; };
  const input = $("admin-input") ? $("admin-input").value.trim() : "";
  if (act==="resetpw" && input.length<4) return fail("비밀번호는 4자 이상!");
  if (act==="rename" && input.length<2) return fail("새 닉네임은 2자 이상!");
  try{
    await api("admin", {id:me.id, token:me.token, action:act, target:m.slug, value:input});
    $("admin-editor").hidden = true; adminTarget = null;
    toast("처리했어요");
    await loadMembers();
  }catch(e){ fail(errText(e)); }
}

/* ---------- 모션: 무대 3D 기울기 ---------- */
function initStage(){
  const card = $("stage-3d"), par = $("stage-parallax"), glare = $("stage-glare");
  if (!card || reduceMotion()) return;
  let tx=0, ty=0, cx=0, cy=0, hover=false, visible=true, raf=0;
  const t0 = performance.now();
  const loop = now=>{
    raf = 0;
    if (!visible || document.hidden) return;
    if (!hover){ const t=(now-t0)/1000; tx = Math.sin(t*.55)*6; ty = Math.cos(t*.42)*3.5; }
    cx += (tx-cx)*.08; cy += (ty-cy)*.08;
    card.style.transform = "rotateY("+cx.toFixed(2)+"deg) rotateX("+cy.toFixed(2)+"deg)";
    par.style.setProperty("--px", (-cx*1.6).toFixed(1)+"px");
    par.style.setProperty("--py", (cy*1.6).toFixed(1)+"px");
    glare.style.setProperty("--gx", (50+cx*4).toFixed(1)+"%");
    glare.style.setProperty("--gy", (30-cy*5).toFixed(1)+"%");
    raf = requestAnimationFrame(loop);
  };
  const kick = ()=>{ if (!raf) raf = requestAnimationFrame(loop); };
  card.addEventListener("pointermove", e=>{
    const r = card.getBoundingClientRect();
    const px = (e.clientX-r.left)/r.width, py = (e.clientY-r.top)/r.height;
    hover = true; tx = (px-.5)*16; ty = -(py-.5)*12; kick();
  });
  card.addEventListener("pointerleave", ()=>{ hover = false; });
  document.addEventListener("visibilitychange", kick);
  new IntersectionObserver(es=>{ visible = es[0].isIntersecting; if (visible) kick(); }).observe(card);
  kick();
}
/* ---------- 모션: 카드 입체 호버 ---------- */
function initTilt(){
  if (reduceMotion() || !finePointer()) return;
  let cur = null;
  document.addEventListener("pointermove", e=>{
    const el = e.target.closest && e.target.closest("[data-tilt]");
    if (cur && cur!==el){ cur.style.transform = ""; cur = null; }
    if (!el) return;
    cur = el;
    const r = el.getBoundingClientRect();
    const px = (e.clientX-r.left)/r.width-.5, py = (e.clientY-r.top)/r.height-.5;
    el.style.transform = "perspective(800px) rotateY("+(px*8).toFixed(2)+"deg) rotateX("+(-py*8).toFixed(2)+"deg) translateY(-3px)";
  }, {passive:true});
}
/* ---------- 모션: 스크롤 등장 ---------- */
const revealObs = ("IntersectionObserver" in window) ? new IntersectionObserver(es=>{
  for (const e of es) if (e.isIntersecting){ e.target.classList.add("in"); revealObs.unobserve(e.target); }
}, {threshold:.12, rootMargin:"0px 0px -6% 0px"}) : null;
function revealIn(root){
  const els = root.querySelectorAll("[data-reveal]:not(.in)");
  els.forEach((el,i)=>{
    if (!revealObs || reduceMotion()){ el.classList.add("in"); return; }
    el.style.transitionDelay = Math.min(i,6)*70+"ms";
    revealObs.observe(el);
  });
  // 감시자가 어떤 이유로 안 불려도 내용은 반드시 보이게 한다.
  setTimeout(()=>root.querySelectorAll("[data-reveal]:not(.in)").forEach(el=>{
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight) el.classList.add("in");
  }), 1500);
}

boot();
