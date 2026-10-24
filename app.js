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
const CORE = ["vocal","guitar","bass","drum","keys"];
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
// 선호 시간대 간단 조사 (lib/util.js TIME_PREF_KEYS와 같은 키)
const TIME_PREF = [{k:"wkDay",e:"☀️",n:"평일 오후"},{k:"wkEve",e:"🌙",n:"평일 저녁"},{k:"weDay",e:"🌤️",n:"주말 오후"},{k:"weEve",e:"✨",n:"주말 저녁"}];
const TPREF = Object.fromEntries(TIME_PREF.map(t=>[t.k,t]));
const tprefLabel = k => TPREF[k] ? TPREF[k].e+" "+TPREF[k].n : k;
function mountTimePref(root, set, onChange){
  const draw = ()=>{ root.innerHTML = '<div class="tpref"><p><b>주로 언제가 편해요?</b><small>여러 개 골라도 돼요 · 날짜별 칸과 별개로 전체 경향을 조사해요</small></p><div class="tpref-chips">'
    +TIME_PREF.map(t=>'<button type="button" class="genre-chip" data-tp="'+t.k+'" aria-pressed="'+set.has(t.k)+'">'+t.e+' '+t.n+'</button>').join("")+'</div></div>'; };
  root.onclick = e=>{ const b = e.target.closest("[data-tp]"); if (!b) return; const k = b.dataset.tp; set.has(k) ? set.delete(k) : set.add(k); draw(); if (onChange) onChange(); };
  draw();
}
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
  if (e && e.error==="not_member") return "이 모임의 멤버만 할 수 있어요.";
  if (e && e.error==="not_owner") return "모임을 만든 사람만 할 수 있어요.";
  if (e && e.error==="bad_slot") return "지난 시간이거나 고를 수 없는 시간이에요.";
  if (e && e.error==="bad_title") return "제목을 2자 이상 적어주세요.";
  if (e && e.error==="closed") return "이미 닫힌 제안이에요.";
  if (e && e.error==="filtered") return "😶 이런 표현은 보낼 수 없어요"+(e.reason?" ("+e.reason+")":"")+". 다르게 적어주세요.";
  if (e && e.error==="too_fast") return "조금만 천천히 보내주세요.";
  if (e && e.error==="too_many") return "10분에 30개까지만 보낼 수 있어요. 잠시 쉬었다 보내주세요.";
  if (e && e.error==="banned") return "운영진이 채팅을 잠시 정지했어요"+(e.until?" ("+new Date(e.until).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})+"까지)":"")+".";
  if (e && e.error==="read_only") return "관심만 누른 상태라 읽기만 할 수 있어요. 신청하면 쓸 수 있어요.";
  if (e && e.error==="too_long") return "300자까지만 보낼 수 있어요.";
  if (e && e.error==="bad_part") return "파트를 골라주세요.";
  if (e && e.error==="not_accepting") return "제안자가 지금은 사람을 받지 않아요.";
  if (e && e.error==="recruit_closed") return "공연 팀 모집 기간이 아니에요.";
  if (e && e.error==="show_locked") return "공연이 확정돼서 팀을 바꿀 수 없어요. 운영진에게 문의해 주세요.";
  if (e && e.error==="reserved") return "운영용으로 예약된 이름이에요. 다른 닉네임을 써주세요.";
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
let schedDraft = null, schedPref = null;
let sel = null;                // 대시보드 선택: {type, key}
const VIEWS = ["view-offline","view-home","view-login","view-onboard","view-result","view-schedule","view-dash","view-feedback","view-jams","view-jam","view-jam-edit","view-prop","view-prop-edit","view-shows","view-show"];

/* ---------- 네비게이션 ---------- */
function navItems(){
  const fb = {v:"view-feedback",ic:"💌",t:"의견"}, jams = {v:"view-jams",ic:"🎪",t:"합주 모임"}, shows = {v:"view-shows",ic:"🎤",t:"공연"};
  if (!me) return [{v:"view-home",ic:"✦",t:"홈"},{v:"view-login",ic:"🎸",t:"취향 등록"},jams,shows,{v:"view-dash",ic:"📊",t:"대시보드"},fb];
  // 휴대폰 하단 메뉴는 6개까지만: 의견은 푸터 링크, 나가기는 마이 페이지 버튼으로 간다
  const my = {v:"view-result",ic:"🙋",t:"마이 페이지", badge:pendingCount()};
  return [my,{v:"view-onboard",ic:"🎸",t:"취향 등록"},{v:"view-schedule",ic:"🗓️",t:"합주 시간"},jams,shows,{v:"view-dash",ic:"📊",t:"대시보드"},{...fb, m:false},{v:"logout",ic:"🚪",t:"나가기",m:false}];
}
function renderNav(on){
  on = on || currentView;
  const items = navItems();
  const badge = i => i.badge ? '<i class="nav-badge">'+i.badge+'</i>' : '';
  $("topnav").innerHTML = items.map(i=>'<button data-v="'+i.v+'" class="'+(i.v===on?"on":"")+'">'+esc(i.t)+badge(i)+'</button>').join("")
    + (me ? '<span class="nav-user">🥕 '+esc(me.id)+'</span>' : '');
  $("mobilenav").innerHTML = items.filter(i=>i.m!==false).map(i=>'<button data-v="'+i.v+'" class="'+(i.v===on?"on":"")+'"><span>'+i.ic+badge(i)+'</span>'+esc(i.t)+'</button>').join("");
}
for (const id of ["topnav","mobilenav"]){
  $(id).addEventListener("click", e=>{ const b=e.target.closest("button[data-v]"); if (b) goTo(b.dataset.v); });
}
function show(view){
  currentView = view;
  for (const v of VIEWS) $(v).hidden = (v!==view);
  if (view!=="view-prop") stopChat();
  // 모임 상세·수정 화면은 메뉴에서 '합주 모임'을 켜둔다
  const p0 = view==="view-prop" || view==="view-prop-edit" ? propsCache.find(x=>x.slug===(view==="view-prop"?propOpen:(propDraft&&propDraft.slug))) : null;
  const inShow = view==="view-show" || (p0 && p0.showSlug) || (view==="view-prop-edit" && propDraft && propDraft.showSlug);
  renderNav(inShow ? "view-shows" : ["view-jam","view-jam-edit","view-prop","view-prop-edit"].includes(view) ? "view-jams" : view);
  window.scrollTo(0,0);
  revealIn($(view));
}
function goTo(v){
  if (v==="logout") return logout();
  if (v==="view-home"){ refreshHomeCta(); return show("view-home"); }
  if (v==="view-login"){ if (me) return goTo("view-onboard"); show("view-login"); setTimeout(()=>$("login-id").focus(), 200); return; }
  if (v==="view-dash"){ show("view-dash"); renderDash(true); loadMembers(); return; }
  if (v==="view-feedback"){ if (currentView!=="view-feedback") fbFrom = currentView; openFeedback(); return; }
  if (v==="view-jams"){ show("view-jams"); renderJams(); loadJams(); loadMembers(); return; }
  if (v==="view-jam"){ if (!jamOpen) return goTo("view-jams"); renderJam(); show("view-jam"); loadJams(); return; }
  if (v==="view-jam-edit"){ if (!me) return goTo("view-login"); return openJamEdit(null); }
  if (v==="view-prop"){ if (!propOpen) return goTo("view-jams"); renderProp(); show("view-prop"); loadJams(); return; }
  if (v==="view-shows"){ show("view-shows"); renderShows(); loadJams(); return; }
  if (v==="view-show"){ if (!showOpen) return goTo("view-shows"); renderShow(); show("view-show"); loadJams(); return; }
  if (v==="view-prop-edit"){ if (!me) return goTo("view-login"); return openPropEdit(null); }
  if (!me) return goTo("view-login");
  if (v==="view-onboard") return startOnboarding();
  if (v==="view-schedule") return openSchedule();
  if (v==="view-result"){
    if (!me.data.done) return startOnboarding();
    renderResult(false); show("view-result"); renderAgenda(); loadJams(); return;
  }
}
function refreshHomeCta(){
  $("cta-start-label").textContent = !me ? "나의 밴드 취향 찾기" : me.data.done ? "마이 페이지" : "취향 등록 이어하기";
}
$("brand").addEventListener("click", ()=>goTo("view-home"));
$("cta-start").addEventListener("click", ()=>goTo(!me ? "view-login" : "view-result"));
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
      if (d.ok){ setMe(d.member, token); refreshHomeCta(); renderNav(); openDeepLink(); return; }
    }catch(e){}
    lsDel("kw-session");
  }
  openDeepLink();
}
// 공유 링크: /?p=제안  /?show=공연
function openDeepLink(){
  const q = new URLSearchParams(location.search), p = q.get("p"), sh = q.get("show");
  if (!p && !sh) return;
  history.replaceState(null, "", location.pathname);
  if (p){ propOpen = p; goTo("view-prop"); } else { showOpen = sh; goTo("view-show"); }
}
let returnTo = null;   // 입장 후 돌아갈 곳 {view, slug}
function loginThenBack(view, slug){ returnTo = {view, slug}; goTo("view-login"); }
async function shareLink(kind, slug, title){
  const url = location.origin + "/?" + kind + "=" + encodeURIComponent(slug);
  const text = (kind==="show" ? "🎤 " : "📣 ") + title + " — 당근 밴드 메이커에서 같이 해요!";
  if (navigator.share){ try{ await navigator.share({title, text, url}); return; }catch(e){ if (e && e.name==="AbortError") return; } }
  try{ await navigator.clipboard.writeText(url); toast("링크를 복사했어요. 단톡방에 붙여넣어 초대하세요 🔗"); }
  catch(e){ prompt("이 링크를 복사해서 보내주세요", url); }
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
    if (returnTo){ const t = returnTo; returnTo = null; if (t.view==="view-prop") propOpen = t.slug; if (t.view==="view-show") showOpen = t.slug; goTo(t.view); }
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
  loadMembers(); loadJams();
  if (!pollTimer) pollTimer = setInterval(()=>{ if (!document.hidden) loadMembers(); }, 20000);
}
async function loadMembers(){
  try{
    const d = await api("members");
    membersCache = d.members || [];
    if (currentView==="view-dash") renderDash(false);
    if (currentView==="view-result"){ renderMates(); renderMyBand(); }
    loadJams();   // 마이 페이지 배지(응답 필요한 초대 수)를 위해 항상 같이 갱신
  }catch(e){ /* 다음 폴링에서 재시도 */ }
}
function currentMembers(){
  const list = membersCache.filter(m=>!isAdminId(m.id)).map(m=>({...m, avail:activeAvail(m.avail)}));
  if (!me) return list;
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
/* 기본 밴드 편성: 보컬 1 · 기타 2 · 베이스 · 드럼 · 키보드 (6인) */
const LINEUP = [
  {slot:"vocal",   role:"vocal",  label:"🎤 보컬"},
  {slot:"guitar1", role:"guitar", label:"🎸 기타 1"},
  {slot:"guitar2", role:"guitar", label:"🎸 기타 2"},
  {slot:"bass",    role:"bass",   label:"🎵 베이스"},
  {slot:"drum",    role:"drum",   label:"🥁 드럼"},
  {slot:"keys",    role:"keys",   label:"🎹 키보드"},
];
const SLOT_LABEL = Object.fromEntries(LINEUP.map(l=>[l.slot, l.label]));
// 파트 비중이 낮을수록 그 파트 배정 점수를 깎는다 (100% → 그대로, 50% → 0.78배, 10% → 0.6배).
const lvlFactor = (m, r) => .55 + .45*lvlOf(m, r)/100;
// 자리를 하나씩 채우면서 점수가 좋은 조합 40개만 남기는 빔 탐색.
// 점수: 채운 자리 수 → 비중 × (취향 궁합·다 같이 되는 시간).
function buildBands(list){
  const pool = list.filter(m=>m.done && !isAdminId(m.id));
  const tmemo = new Map();
  const taste = (x,y)=>{ const k = x.slug<y.slug ? x.slug+"|"+y.slug : y.slug+"|"+x.slug;
    if (!tmemo.has(k)) tmemo.set(k, tasteScore(x,y).score); return tmemo.get(k); };
  const avs = new Map(pool.map(m=>[m.slug, new Set(m.avail||[])]));
  const score = assign => {
    const f = assign.filter(t=>t.m);
    let ts=0, c=0;
    for (let i=0;i<f.length;i++) for (let j=i+1;j<f.length;j++){ ts+=taste(f[i].m,f[j].m); c++; }
    const withA = f.filter(t=>avs.get(t.m.slug).size);
    let time = .25;
    if (withA.length>=2){
      let inter = null;
      for (const t of withA){ const st = avs.get(t.m.slug); inter = inter ? new Set([...inter].filter(x=>st.has(x))) : new Set(st); }
      time = Math.min(1, inter.size/4);
    }
    const lv = f.reduce((s,t)=>s+lvlFactor(t.m,t.role),0)/(f.length||1);
    return f.length*10 + ((c ? ts/c : .3)*.55 + time*.45)*lv*3 + lv;
  };
  const sig = assign => LINEUP.map(l=>l.role).filter((r,i,arr)=>arr.indexOf(r)===i)
    .map(r=>r+":"+assign.filter(t=>t.role===r && t.m).map(t=>t.m.slug).sort().join(",")).join(";");
  const used = new Set(), bands = [];
  while (bands.length < 12){
    const cands = r => pool.filter(m=>!used.has(m.slug) && (m.parts||[]).includes(r))
      .sort((x,y)=>lvlOf(y,r)-lvlOf(x,r) || (y.avail||[]).length-(x.avail||[]).length).slice(0,8);
    const order = LINEUP.map((l,i)=>({...l, i, cs:cands(l.role)})).sort((x,y)=>x.cs.length-y.cs.length || x.i-y.i);
    if (order.every(l=>!l.cs.length)) break;
    let beam = [{assign:[], taken:new Set(), sc:0}];
    for (const l of order){
      const next = new Map();
      for (const st of beam){
        for (const m of [...l.cs.filter(c=>!st.taken.has(c.slug)), null]){
          const assign = [...st.assign, {m, role:l.role, slot:l.slot}];
          const k = sig(assign), sc = score(assign);
          if (next.has(k) && next.get(k).sc>=sc) continue;
          const taken = new Set(st.taken); if (m) taken.add(m.slug);
          next.set(k, {assign, taken, sc});
        }
      }
      beam = [...next.values()].sort((x,y)=>y.sc-x.sc).slice(0,40);
    }
    const best = beam[0].assign;
    const gs = best.filter(t=>t.role==="guitar" && t.m).map(t=>t.m).sort((x,y)=>lvlOf(y,"guitar")-lvlOf(x,"guitar"));
    const team = LINEUP.map(l=>{
      if (l.role==="guitar") return {m: gs[l.slot==="guitar1" ? 0 : 1] || null, role:"guitar", slot:l.slot};
      const t = best.find(x=>x.slot===l.slot); return {m: t ? t.m : null, role:l.role, slot:l.slot};
    });
    const filled = team.filter(t=>t.m);
    if (filled.length<2) break;
    filled.forEach(t=>used.add(t.m.slug));
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
  // 전원이 안 겹쳐도 가장 많은 인원이 되는 시간대를 찾는다 (예: 5/6명)
  const counts = new Map();
  for (const m of ms) for (const k of (m.avail||[])) counts.set(k, (counts.get(k)||0)+1);
  let bestN = 0; counts.forEach(v=>{ if (v>bestN) bestN = v; });
  const bestSlots = bestN ? [...counts].filter(([,v])=>v===bestN).map(([k])=>k).sort() : [];
  const absent = bestSlots.length ? ms.filter(m=>!(m.avail||[]).includes(bestSlots[0])).map(m=>m.id) : [];
  return { team, common, taste: c ? ts/c : 0, style: top ? top[0] : "pop",
    best: {n:bestN, of:ms.length, slots:bestSlots, absent},
    missing: team.filter(t=>!t.m).map(t=>t.slot), unknownTime: ms.length-withA.length };
}
// 이 사람들로 6인 기본 편성(보컬·기타 2·베이스·드럼·키보드)을 서로 다른 사람으로 채울 수 있는지
function canFormBand(ms){
  const used = new Set();
  const bt = i => {
    if (i===LINEUP.length) return true;
    for (const m of ms){
      if (used.has(m.slug) || !(m.parts||[]).includes(LINEUP[i].role)) continue;
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
  const rows = b.team.map(t=> t.m
    ? '<div class="role">'+avatarHTML(t.m)+'<span class="rl">'+SLOT_LABEL[t.slot]+'</span><b>'+esc(t.m.id)+'</b>'+((t.m.parts||[]).length>1 && t.m.levels && t.m.levels[t.role] ? '<span class="lv-tag">'+t.m.levels[t.role]+'%</span>' : '')+(me && t.m.slug===me.slug?' <span class="pill orange">나</span>':'')+'</div>'
    : '<div class="role need"><span class="avatar">🔍</span><span class="rl">'+SLOT_LABEL[t.slot]+'</span><b>구하는 중</b></div>').join("");
  const bt = b.best || {n:0, of:0, slots:[], absent:[]};
  const allIn = b.common && b.common.length;
  let timeTxt, chips = "", timeNote = "";
  if (allIn){
    timeTxt = "다 같이 되는 시간 <b>"+b.common.length+"칸</b>";
    chips = b.common.slice(0,3).map(k=>'<span class="pill ok">'+slotLabel(k)+'</span>').join("");
  } else if (bt.n>=2){
    timeTxt = "가장 많이 겹치는 시간 <b>"+bt.n+"/"+bt.of+"명</b> · "+bt.slots.length+"칸";
    chips = bt.slots.slice(0,3).map(k=>'<span class="pill gold">'+slotLabel(k)+'</span>').join("");
    timeNote = bt.absent.length ? '<p class="band-note">🕰️ '+esc(slotLabel(bt.slots[0]))+'에 빠지는 사람 · '+esc(bt.absent.join(", "))+'</p>' : "";
  } else {
    timeTxt = b.common===null && bt.n<2 ? "시간 등록 멤버 부족" : "겹치는 시간 없음";
  }
  const filled = b.team.filter(t=>t.m).length;
  return '<article class="band'+(b.missing.length?"":" ready")+(mine?" me":"")+'" data-tilt>'
    +'<small class="k">'+st.e+' '+(b.missing.length?"FORMING · "+filled+"/"+LINEUP.length:"READY TO JAM · 6인")+'</small>'
    +'<h4>'+esc(b.name)+'</h4><div class="roles">'+rows+'</div>'
    +'<div class="stats"><span>취향 궁합 <b>'+Math.round(b.taste*100)+'%</b></span><span>'+timeTxt+'</span>'
    +(b.unknownTime?'<span>시간 미입력 '+b.unknownTime+'명</span>':'')+'</div>'
    +(chips?'<div class="pills">'+chips+'</div>':'')+timeNote
    +(me && filled>=2 ? '<button class="button small ghost jam-from-band" data-jam-band="'+b.team.filter(t=>t.m).map(t=>t.m.slug).join(",")+'" data-jam-title="'+esc(b.name)+'">🎪 이 밴드로 모임 만들기</button>' : '')
    +'</article>';
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
    timePref:new Set(d.timePref||[]),
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
  mountTimePref($("ob-tpref"), draft.timePref);
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
      parts:[draft.main, ...draft.parts.filter(p=>p!==draft.main)].filter(Boolean), partEtc:draft.partEtc, genres:draft.genres, artists:draft.artists, avail:[...draft.avail], levels:draft.levels, timePref:[...draft.timePref],
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
  renderResult(true); show("view-result"); renderAgenda(); loadJams();
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
$("artist-input").addEventListener("focus", ()=>{ setTimeout(()=>{ const r = $("artist-input").getBoundingClientRect(); if (r.bottom > innerHeight-170) $("artist-input").scrollIntoView({block:"center", behavior:reduceMotion()?"auto":"smooth"}); }, 150); });
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

/* ---------- 마이 페이지: 다가오는 합주 · 초대 ---------- */
// 응답이 필요한 초대 수 (확정됐는데 내가 아직 참석 여부를 안 남긴 모임)
function pendingCount(){
  if (!me) return 0;
  return jamsCache.filter(j=>jamPhase(j)==="fixed" && j.members.includes(me.slug) && !j.rsvp[me.slug]).length + unreadRooms().length;
}
function renderAgenda(){
  const box = $("my-agenda"); if (!me || !box) return;
  const mine = jamsCache.filter(j=>isJamMember(j));
  const invites = mine.filter(j=>jamPhase(j)==="fixed" && j.members.includes(me.slug) && !j.rsvp[me.slug]).sort((a,b)=>a.fixedSlot.localeCompare(b.fixedSlot));
  const upcoming = mine.filter(j=>jamPhase(j)==="fixed" && j.rsvp[me.slug]).sort((a,b)=>a.fixedSlot.localeCompare(b.fixedSlot));
  const planning = mine.filter(j=>jamPhase(j)==="planning").sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
  const all = currentMembers(), nameOf = sl => (all.find(m=>m.slug===sl)||{}).id || "?";
  const row = (j, extra, cls) => '<div class="ag-row'+(cls?" "+cls:"")+'" data-jam="'+j.slug+'"><div class="ag-d">'+(j.fixedSlot?'<b>D'+dDay(j.fixedSlot.slice(0,10))+'</b><small>'+dayLabel(j.fixedSlot.slice(0,10))+'</small>':'<b>⏳</b><small>미정</small>')+'</div>'
    +'<div class="ag-main"><b>'+esc(j.title)+'</b><small>'+(j.fixedSlot?jamSlotLabel(j):'날짜 정하는 중'+(j.startHour?' · 희망 '+j.startHour+'–'+(j.startHour+j.duration)+'시':''))+(j.place?' · 📍 '+esc(j.place):'')+' · '+j.members.length+'명'+(j.createdBy!==me.slug?' · 🗝️ '+esc(nameOf(j.createdBy)):' · 내가 만든 모임')+'</small></div>'
    +'<div class="ag-side">'+extra+'</div></div>';
  let html = '<div class="card-head"><div><small>MY SCHEDULE</small><h2>내 합주 일정</h2><p>'+(invites.length?'응답을 기다리는 초대가 <b>'+invites.length+'개</b> 있어요.':upcoming.length?'다가오는 합주 '+upcoming.length+'개':'아직 예정된 합주가 없어요.')+'</p></div><span>📅</span></div>';
  if (invites.length) html += '<div class="ag-group"><div class="section-label">🔔 합주 초대 · 응답해 주세요</div>'+invites.map(j=>row(j,
      '<div class="ag-rsvp">'+["yes","maybe","no"].map(k=>'<button class="button small '+(k==="yes"?"primary":"ghost")+'" data-ag-rsvp="'+k+'" data-ag-jam="'+j.slug+'">'+RSVP_LABEL[k]+'</button>').join("")+'</div>', "invite")).join("")+'</div>';
  if (upcoming.length) html += '<div class="ag-group"><div class="section-label">🎸 다가오는 합주</div>'+upcoming.map(j=>{ const my = j.rsvp[me.slug];
      return row(j, '<span class="pill '+(my==="yes"?"ok":my==="no"?"bad":"gold")+'">'+RSVP_LABEL[my]+'</span>'); }).join("")+'</div>';
  if (planning.length) html += '<div class="ag-group"><div class="section-label">⏳ 날짜 정하는 중</div>'+planning.map(j=>{
      const me0 = activeAvail(me.data.avail).length;
      return row(j, j.createdBy===me.slug ? '<span class="pill orange">내가 날짜를 정해요</span>' : me0 ? '<span class="pill ok">내 시간 등록됨</span>' : '<span class="pill bad">내 시간 미등록</span>'); }).join("")+'</div>';
  const myProps = propsCache.filter(p=>p.status==="open" && p.createdBy===me.slug);
  const applied = propsCache.filter(p=>(p.status==="open" || unreadOf(p.slug)) && p.applicants[me.slug]);
  const prow = (p, side) => '<div class="ag-row'+(unreadOf(p.slug)?" invite":"")+'" data-prop="'+p.slug+'"><div class="ag-d"><b>📣</b><small>제안</small></div><div class="ag-main"><b>'+esc(p.title)+'</b><small>'+(p.whenText?'🗓️ '+esc(p.whenText)+' · ':'')+'신청 '+Object.keys(p.applicants).length+' · 관심 '+p.interest.length+(unreadOf(p.slug)?' · <b style="color:#ffc29a">💬 새 글 '+unreadOf(p.slug)+'</b>':'')+'</small></div><div class="ag-side">'+side+'</div></div>';
  if (myProps.length) html += '<div class="ag-group"><div class="section-label">📣 내 합주 제안</div>'+myProps.map(p=>prow(p, propFull(p)?'<span class="pill gold">파트 다 모임 · 모임 만들기</span>':'<span class="pill">모집 중</span>')).join("")+'</div>';
  if (applied.length) html += '<div class="ag-group"><div class="section-label">🙋 신청한 제안</div>'+applied.map(p=>{ const a = p.applicants[me.slug];
      return prow(p, appState(a)==="wait" ? '<span class="pill gold">⏳ '+PART[a.part].n+' 대기 '+waitRank(p, me.slug)+'번</span>' : '<span class="pill orange">'+PART[a.part].e+' '+PART[a.part].n+'로 신청</span>'); }).join("")+'</div>';
  if (!invites.length && !upcoming.length && !planning.length && !myProps.length && !applied.length)
    html += '<div class="empty-state ag-empty"><span>🎪</span><p>합주 모임에서 멤버를 모아 첫 합주를 만들어 보세요.<br>누군가 나를 모임에 넣으면 여기에 초대가 떠요.</p></div>';
  html += '<div class="jam-actions"><button class="button small ghost" data-v="view-jams">🎪 합주 모임 전체 보기</button>'+(activeAvail(me.data.avail).length?'':'<button class="button small ghost" data-v="view-schedule">🗓️ 내 합주 시간 등록하기</button>')+'</div>';
  box.innerHTML = html;
}
$("my-agenda").addEventListener("click", async e=>{
  const nav = e.target.closest("[data-v]"); if (nav){ e.stopPropagation(); return goTo(nav.dataset.v); }
  const pr = e.target.closest("[data-prop]"); if (pr){ e.stopPropagation(); propOpen = pr.dataset.prop; return goTo("view-prop"); }
  const b = e.target.closest("[data-ag-rsvp]"); if (!b) return;
  e.stopPropagation();
  b.disabled = true;
  try{
    const d = await api("jams", {id:me.id, token:me.token, action:"rsvp", target:b.dataset.agJam, answer:b.dataset.agRsvp});
    jamsCache = jamsCache.map(x=>x.slug===d.jam.slug ? d.jam : x);
    toast("응답을 남겼어요"); renderAgenda(); renderNav();
  }catch(err){ toast(errText(err)); b.disabled = false; }
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
$("btn-logout").addEventListener("click", logout);
$("btn-time").addEventListener("click", ()=>goTo("view-schedule"));
$("btn-godash").addEventListener("click", ()=>goTo("view-dash"));

/* ---------- 내 합주 시간 ---------- */
function openSchedule(){
  schedDraft = new Set(activeAvail(me.data.avail));
  schedPref = new Set(me.data.timePref||[]);
  mountTimePref($("my-tpref"), schedPref);
  mountEditor($("my-sched"), schedDraft, ()=>{ $("sched-summary").innerHTML = availSummary(schedDraft); });
  show("view-schedule");
}
$("sched-cancel").addEventListener("click", ()=>goTo("view-result"));
$("sched-save").addEventListener("click", async ()=>{
  const btn = $("sched-save"); btn.disabled = true;
  try{
    const d = await api("members", {id:me.id, token:me.token, avail:[...schedDraft], timePref:[...schedPref]});
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

  const tCount={}; for (const t of TIME_PREF) tCount[t.k]=0;
  let answered = 0;
  for (const m of done){ const tp = m.timePref||[]; if (tp.length) answered++; for (const k of tp) if (k in tCount) tCount[k]++; }
  const maxT = Math.max(1, ...Object.values(tCount));
  $("dash-tpref").innerHTML = TIME_PREF.map(t=>barRow("tpref:"+t.k, t.e+" "+t.n, tCount[t.k], maxT, "")).join("");
  const topT = TIME_PREF.slice().sort((a,b)=>tCount[b.k]-tCount[a.k])[0];
  $("dash-tpref-note").textContent = answered ? answered+"명이 답했어요. 제일 인기: "+topT.e+" "+topT.n+" ("+tCount[topT.k]+"명)" : "아직 답한 사람이 없어요. 합주 시간 화면에서 고를 수 있어요.";

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
  else if (sel.type==="tpref"){ title = tprefLabel(sel.key)+"이 편한 사람"; list = done.filter(m=>(m.timePref||[]).includes(sel.key)); }
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
      +(ms.length && canFormBand(ms) ? '<div class="notice success">🎉 이 시간엔 보컬·기타 2·베이스·드럼·키보드 6인 풀밴드 합주가 가능해요!</div>' : '')
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

/* ---------- 합주 모임 ---------- */
let jamsCache = [], jamOpen = null, jamDraft = null, calMonth = null;
const JAM_STATUS = {planning:["날짜 정하는 중","gold"], fixed:["확정","ok"], done:["끝난 합주",""], canceled:["취소됨","bad"]};
const RSVP_LABEL = {yes:"참석", maybe:"미정", no:"불참"};
const pad2 = n => String(n).padStart(2,"0");
function jamPhase(j){
  if (j.status==="canceled") return "canceled";
  if (j.status==="done") return "past";
  if (j.status==="fixed") return j.fixedSlot.slice(0,10) < TODAY ? "past" : "fixed";
  return "planning";
}
const jamStatus = j => JAM_STATUS[jamPhase(j)==="past" ? "done" : j.status];
const isJamMember = j => !!me && (j.members.includes(me.slug) || j.createdBy===me.slug);
function jamPeople(j){
  const all = currentMembers();
  return j.members.map(s=>all.find(m=>m.slug===s) || {slug:s, id:"(나간 멤버)", parts:[], avail:[]});
}
function jamSlotLabel(j, slot){
  slot = slot || j.fixedSlot; if (!slot) return "";
  const [day,h] = slot.split("@");
  return dayLabel(day)+" "+Number(h)+"–"+(Number(h)+j.duration)+"시";
}
// 합주 시간표는 2시간 칸(10–12, 12–14 …)이지만 모임은 1시간 단위로 시작·길이를 정한다.
// 어떤 시(時)가 되려면 그 시간이 든 2시간 칸을 칠해 두었어야 한다.
const JAM_FIRST = SLOT_HOURS[0], JAM_LAST = SLOT_HOURS[SLOT_HOURS.length-1]+2;   // 10시 ~ 24시
const blockOf = h => h - ((h - JAM_FIRST) % 2);
function covers(m, day, h, dur){
  const av = m.avail||[];
  for (let x=h; x<h+dur; x++) if (!av.includes(slotKey(day, blockOf(x)))) return false;
  return true;
}
const whoCovers = (j, day, h) => jamPeople(j).filter(m=>(m.avail||[]).length && covers(m, day, h, j.duration));
// 멤버들의 합주 시간으로 많이 겹치는 순서의 후보 (두 명 이상 되는 시간만).
// 같은 날 연속된 시작 시간에 같은 사람들이 되면 가장 이른 시작만 남긴다.
function jamSuggest(j){
  const people = jamPeople(j).filter(m=>(m.avail||[]).length);
  if (people.length<2) return [];
  const days = [...new Set(people.flatMap(m=>m.avail.map(k=>k.slice(0,10))))].filter(d=>d>=TODAY).sort();
  const out = [];
  for (const day of days){
    let prevKey = null, prevH = -9;
    for (let h=JAM_FIRST; h+j.duration<=JAM_LAST; h++){
      const who = people.filter(m=>covers(m, day, h, j.duration));
      const key = who.map(m=>m.slug).join(",");
      if (who.length>=2 && !(key===prevKey && h===prevH+1)) out.push({slot:slotKey(day,h), who, n:who.length});
      prevKey = who.length>=2 ? key : null; prevH = h;
    }
  }
  return out.sort((a,b)=>b.n-a.n || a.slot.localeCompare(b.slot));
}
// 희망 시간(몇 시부터 몇 시까지)에 되는 날짜 후보
function jamPrimary(j){
  if (!j.startHour) return [];
  const people = jamPeople(j).filter(m=>(m.avail||[]).length);
  const days = [...new Set(people.flatMap(m=>m.avail.map(k=>k.slice(0,10))))].filter(d=>d>=TODAY).sort();
  return days.map(day=>{ const who = people.filter(m=>covers(m, day, j.startHour, j.duration)); return {slot:slotKey(day, j.startHour), who, n:who.length}; })
    .filter(s=>s.n>=2).sort((a,b)=>b.n-a.n || a.slot.localeCompare(b.slot));
}
const jamBest = j => j.startHour ? jamPrimary(j) : jamSuggest(j);
// 같은 날 시간이 겹치는 다른 확정 모임
function jamOverlaps(j, slot){
  const [day,h] = slot.split("@"), a = Number(h), b = a+j.duration;
  return jamsCache.filter(o=>o.slug!==j.slug && o.status==="fixed" && o.fixedSlot.startsWith(day+"@"))
    .filter(o=>{ const oh = Number(o.fixedSlot.split("@")[1]); return oh<b && oh+o.duration>a; });
}
// 겹치면 막지 않고 물어만 본다
function fixJam(j, slot, duration){
  const ov = jamOverlaps(j, slot);
  if (ov.length){
    const all = currentMembers();
    const lines = ov.map(o=>{ const shared = o.members.filter(x=>j.members.includes(x)).map(x=>(all.find(m=>m.slug===x)||{}).id).filter(Boolean);
      return "· "+o.title+" ("+jamSlotLabel(o)+")"+(shared.length?" — 겹치는 멤버: "+shared.join(", "):""); });
    if (!confirm("다른 합주와 시간이 겹쳐요.\n"+lines.join("\n")+"\n\n그대로 진행할까요?")) return;
  }
  jamAct("fix", duration ? {slot, duration} : {slot}, "확정했어요! 캘린더에 올라갔어요 🎉");
}
async function loadJams(){
  try{
    const [d, p, c, sh] = await Promise.all([api("jams"), api("proposals"), me ? api("chat", {action:"summary", id:me.id, token:me.token}).catch(()=>null) : null, api("shows").catch(()=>null)]);
    jamsCache = d.jams||[]; propsCache = p.proposals||[]; if (c) chatSummary = c.rooms||{}; if (sh) showsCache = sh.shows||[];
    if (currentView==="view-shows") renderShows();
    if (currentView==="view-show") renderShow();
    if (currentView==="view-jams") renderJams();
    if (currentView==="view-jam") renderJam();
    if (currentView==="view-prop") renderProp();
    if (currentView==="view-result") renderAgenda();
    renderNav();
  }catch(e){ /* 다음 폴링에서 재시도 */ }
}
function jamCard(j){
  const [st, cls] = jamStatus(j), people = jamPeople(j), mine = isJamMember(j);
  const sug = j.status==="planning" ? jamBest(j) : [];
  const when = j.fixedSlot ? '🗓️ '+jamSlotLabel(j)+(j.place?' · 📍 '+esc(j.place):'')
    : sug.length ? '✨ 제안 <b>'+sug[0].n+'/'+people.length+'명</b> · '+jamSlotLabel(j, sug[0].slot) : '⏳ 멤버들의 합주 시간을 기다리는 중';
  return '<article class="jam-card'+(mine?" me":"")+'" data-jam="'+j.slug+'" data-tilt>'
    +'<div class="jam-top"><span class="pill '+cls+'">'+st+'</span>'+(mine?'<span class="pill orange">내 모임</span>':'')+'<small>'+people.length+'명 · '+(j.status==="planning"&&j.startHour ? '희망 '+j.startHour+'–'+(j.startHour+j.duration)+'시' : j.duration+'시간')+'</small></div>'
    +'<h4>'+esc(j.title)+'</h4><p class="jam-when">'+when+'</p>'
    +'<div class="jam-people">'+people.map(m=>'<span>'+avatarHTML(m)+esc(m.id)+'</span>').join("")+'</div>'
    +(j.songs.length?'<p class="jam-songs">🎵 '+esc(j.songs.slice(0,3).join(" · "))+(j.songs.length>3?' 외 '+(j.songs.length-3)+'곡':'')+'</p>':'')
    +'</article>';
}
let jamsTab = "jams";
$("jams-tabs").addEventListener("click", e=>{ const b = e.target.closest("[data-jt]"); if (!b) return; jamsTab = b.dataset.jt; renderJams(); });
function renderJams(){
  for (const b of $("jams-tabs").querySelectorAll("button")) b.setAttribute("aria-pressed", b.dataset.jt===jamsTab);
  $("jt-jams").hidden = jamsTab!=="jams"; $("jt-props").hidden = jamsTab!=="props"; $("jt-cal").hidden = jamsTab!=="cal";
  $("jams-cta").innerHTML = jamsTab==="cal" ? ''
    : me ? '<button class="button primary" id="'+(jamsTab==="props"?"props-new":"jams-new")+'">'+(jamsTab==="props"?"+ 합주 제안 올리기":"+ 새 모임 만들기")+'</button>'
    : '<button class="button ghost" id="jams-login">'+(jamsTab==="props"?"제안·신청하려면 입장해 주세요 →":"모임을 만들려면 입장해 주세요 →")+'</button>';
  renderCal(); renderProps();
  const groups = {planning:[], fixed:[], past:[]};
  for (const j of jamsCache){ const p = jamPhase(j); (groups[p==="canceled"?"past":p]).push(j); }
  groups.planning.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  groups.fixed.sort((a,b)=>a.fixedSlot.localeCompare(b.fixedSlot));
  groups.past.sort((a,b)=>(b.fixedSlot||b.updatedAt).localeCompare(a.fixedSlot||a.updatedAt));
  const empty = t => '<div class="empty-state"><span>☾</span><p>'+t+'</p></div>';
  $("jams-planning").innerHTML = groups.planning.length ? groups.planning.map(jamCard).join("") : empty(me ? "아직 없어요. 새 모임을 만들어 보세요 🥕" : "아직 계획 중인 모임이 없어요.");
  $("jams-fixed").innerHTML = groups.fixed.length ? groups.fixed.map(jamCard).join("") : empty("확정된 합주가 생기면 여기와 캘린더에 떠요.");
  $("jams-past-sec").hidden = !groups.past.length;
  $("jams-past").innerHTML = groups.past.map(jamCard).join("");
}
function renderCal(){
  if (!calMonth) calMonth = (TODAY < GLOBAL_START ? GLOBAL_START : TODAY > GLOBAL_END ? GLOBAL_END : TODAY).slice(0,7);
  const [y,m] = calMonth.split("-").map(Number);
  const first = new Date(y, m-1, 1), days = new Date(y, m, 0).getDate();
  const byDay = {};
  for (const j of jamsCache) if (j.fixedSlot && (j.status==="fixed"||j.status==="done") && j.fixedSlot.startsWith(calMonth))
    (byDay[j.fixedSlot.slice(0,10)] ||= []).push(j);
  let cells = "";
  for (let i=0;i<first.getDay();i++) cells += '<div class="cal-cell pad"></div>';
  for (let d=1; d<=days; d++){
    const key = y+"-"+pad2(m)+"-"+pad2(d);
    const list = (byDay[key]||[]).sort((a,b)=>a.fixedSlot.localeCompare(b.fixedSlot));
    cells += '<div class="cal-cell'+(key===TODAY?" today":"")+(key<TODAY?" past":"")+'"><span class="cal-d">'+d+'</span>'
      + list.map(j=>'<button class="cal-jam'+(jamPhase(j)==="past"?" done":"")+(isJamMember(j)?" me":"")+'" data-jam="'+j.slug+'" title="'+esc(j.title+" · "+jamSlotLabel(j)+" · "+jamPeople(j).map(p=>p.id).join(", "))+'">'
          +Number(j.fixedSlot.split("@")[1])+'시 '+esc(j.title)+'</button>').join("")+'</div>';
  }
  const prevOk = calMonth > GLOBAL_START.slice(0,7), nextOk = calMonth < GLOBAL_END.slice(0,7);
  $("jam-cal").innerHTML = '<div class="cal-head"><button class="sg-nav" data-cm="-1" aria-label="이전 달"'+(prevOk?"":" disabled")+'>‹</button><b>'+y+'년 '+m+'월</b><button class="sg-nav" data-cm="1" aria-label="다음 달"'+(nextOk?"":" disabled")+'>›</button></div>'
    +'<div class="cal-dow">'+DOW.map(d=>'<span>'+d+'</span>').join("")+'</div><div class="cal-grid">'+cells+'</div>'
    +'<div class="cal-legend"><span><i class="me"></i>내 모임</span><span><i></i>다른 모임</span><span><i class="done"></i>끝난 합주</span></div>';
}
$("jam-cal").addEventListener("click", e=>{
  const b = e.target.closest("[data-cm]"); if (!b || b.disabled) return;
  const [y,m] = calMonth.split("-").map(Number);
  const d = new Date(y, m-1+Number(b.dataset.cm), 1);
  calMonth = d.getFullYear()+"-"+pad2(d.getMonth()+1); renderCal();
});
document.addEventListener("click", e=>{
  const nb = e.target.closest("#jams-new, #jams-login, #props-new");
  if (nb){ return goTo(nb.id==="jams-new" ? "view-jam-edit" : nb.id==="props-new" ? "view-prop-edit" : "view-login"); }
  const pc = e.target.closest("[data-prop]");
  if (pc){ propOpen = pc.dataset.prop; goTo("view-prop"); return; }
  const fb = e.target.closest("[data-jam-band]");
  if (fb){ e.stopPropagation(); return openJamEdit(null, {members:fb.dataset.jamBand.split(","), title:fb.dataset.jamTitle}); }
  const c = e.target.closest("[data-jam]");
  if (c){ jamOpen = c.dataset.jam; goTo("view-jam"); }
});
$("jam-back").addEventListener("click", ()=>goTo("view-jams"));

function renderJam(){
  const j = jamsCache.find(x=>x.slug===jamOpen);
  if (!j){ $("jam-body").innerHTML = '<div class="empty-state"><span>☾</span><p>'+(jamsCache.length?"모임을 찾을 수 없어요. 지워졌을 수 있어요.":"불러오는 중…")+'</p></div>'; return; }
  const people = jamPeople(j), phase = jamPhase(j), member = isJamMember(j), owner = me && j.createdBy===me.slug;
  const creator = currentMembers().find(m=>m.slug===j.createdBy);
  const [st, cls] = jamStatus(j);
  const noTime = people.filter(m=>!(m.avail||[]).length);
  const rsvpOf = m => j.rsvp[m.slug];
  const chip = m => '<span class="jam-chip'+(me&&m.slug===me.slug?" me":"")+'">'+avatarHTML(m)+'<b>'+esc(m.id)+'</b>'
    +(phase==="fixed" ? '<small class="r '+(rsvpOf(m)||"none")+'">'+(RSVP_LABEL[rsvpOf(m)]||"응답 전")+'</small>'
      : phase==="planning" && !(m.avail||[]).length ? '<small class="r none">시간 미등록</small>' : '')+'</span>';

  let main = "";
  if (phase==="planning"){
    const sugRow = (s, i) => {
      const missing = people.filter(m=>!s.who.some(w=>w.slug===m.slug)).map(m=>m.id);
      return '<div class="sug-row'+(s.n===people.length?" full":"")+'"><div class="sug-main"><b>'+(i===0?'👑 ':'')+jamSlotLabel(j, s.slot)+'</b><small><span class="pill '+(s.n===people.length?"ok":"gold")+'">'+s.n+'/'+people.length+'명</span>'+(missing.length?' 빠짐: '+esc(missing.join(", ")):' 전원 가능!')+'</small></div>'
        +(owner?'<button class="button small primary" data-fix="'+s.slot+'">픽스</button>':'')+'</div>';
    };
    const sug = jamBest(j);
    const others = j.startHour ? jamSuggest(j).filter(s=>Number(s.slot.split("@")[1])!==j.startHour).slice(0,6) : [];
    const want = j.startHour ? j.startHour+'–'+(j.startHour+j.duration)+'시' : '';
    main += '<section class="magic-card jam-sec"><div class="card-head"><div><small>SUGGESTED</small><h2>'+(want?'<b class="want">'+want+'</b>에 되는 날':'이런 시간은 어때요?')+'</h2><p>멤버들이 등록한 합주 시간에서 많이 겹치는 순서예요. '+(owner?'하나를 골라 픽스하면 캘린더에 올라가요.':'날짜는 만든 사람('+esc(creator?creator.id:"?")+')이 정해요.')+'</p></div><span>✨</span></div>'
      + (sug.length ? '<div class="sug-list">'+sug.slice(0,8).map(sugRow).join("")+'</div>'
        : '<div class="empty-state"><span>⏳</span><p>'+(want?'아직 '+want+'에 두 명 이상 되는 날이 없어요.':'두 명 이상 합주 시간을 등록하면 제안이 떠요.')+'</p></div>')
      + (others.length ? '<details class="sug-more"><summary>다른 시간도 괜찮다면 · '+others.length+'개 더</summary><div class="sug-list">'+others.map((s,i)=>sugRow(s, -1)).join("")+'</div></details>' : '')
      + (owner ? '<div class="sug-manual"><b>직접 정하기</b><div class="sug-manual-row"><input type="date" id="jm-date" class="text-input" min="'+(TODAY>GLOBAL_START?TODAY:GLOBAL_START)+'" max="'+GLOBAL_END+'" value="'+(sug.length?sug[0].slot.slice(0,10):(TODAY>GLOBAL_START?TODAY:GLOBAL_START))+'">'
          +'<select id="jm-hour" class="text-input">'+hourOptions(JAM_FIRST, JAM_LAST-1, j.startHour||(sug.length?Number(sug[0].slot.split("@")[1]):19))+'</select><span>부터</span>'
          +'<select id="jm-end" class="text-input"></select><span>까지</span>'
          +'<button class="button small primary" data-fix-manual>이 시간으로 픽스</button></div><small id="jm-info"></small></div>' : '')
      + (noTime.length ? '<p class="jam-note">⏳ 아직 합주 시간을 등록하지 않은 멤버: <b>'+esc(noTime.map(m=>m.id).join(", "))+'</b></p>' : '')
      + (me && j.members.includes(me.slug) ? '<div class="jam-actions"><button class="button small ghost" data-jact="mytime">🗓️ 내 합주 시간 고치기</button></div>' : '')
      + '</section>';
  } else if (phase==="fixed"){
    const yes = people.filter(m=>rsvpOf(m)==="yes"), no = people.filter(m=>rsvpOf(m)==="no"), maybe = people.filter(m=>rsvpOf(m)==="maybe");
    const ovNow = jamOverlaps(j, j.fixedSlot);
    main += '<section class="magic-card jam-sec jam-fixed"><small class="k">FIXED · D'+dDay(j.fixedSlot.slice(0,10))+'</small><h2>'+jamSlotLabel(j)+'</h2>'
      +(j.place?'<p class="jam-place">📍 '+esc(j.place)+'</p>':'')
      +(ovNow.length?'<p class="jam-note">⚠️ 시간이 겹치는 합주: '+esc(ovNow.map(o=>o.title+" ("+jamSlotLabel(o)+")").join(", "))+'</p>':'')
      +'<div class="rsvp-sum"><span class="pill ok">참석 '+yes.length+'</span><span class="pill gold">미정 '+maybe.length+'</span><span class="pill bad">불참 '+no.length+'</span><span class="pill">응답 전 '+(people.length-yes.length-no.length-maybe.length)+'</span></div>'
      +(me && j.members.includes(me.slug) ? '<p class="jam-q">나는 갈 수 있나요?</p><div class="seg rsvp-seg">'+["yes","maybe","no"].map(k=>'<button data-rsvp="'+k+'" aria-pressed="'+(rsvpOf(me)===k)+'">'+RSVP_LABEL[k]+'</button>').join("")+'</div>' : '')
      +(owner?'<div class="jam-actions"><button class="button small ghost" data-jact="unfix">다른 시간으로 바꾸기</button><button class="button small ghost" data-jact="done">합주 끝! 완료로</button></div>':'')
      +'</section>';
  } else {
    main += '<section class="magic-card jam-sec jam-fixed muted-card"><small class="k">'+(phase==="canceled"?"CANCELED":"DONE")+'</small><h2>'+(j.fixedSlot?jamSlotLabel(j):"날짜를 정하지 않았어요")+'</h2>'
      +(j.place?'<p class="jam-place">📍 '+esc(j.place)+'</p>':'')
      +(owner?'<div class="jam-actions"><button class="button small ghost" data-jact="revive">다시 계획하기</button></div>':'')+'</section>';
  }

  $("jam-body").innerHTML = '<div class="page-heading jam-heading"><div class="season-badge"><span>✦</span> JAM SESSION</div>'
    +'<h1>'+esc(j.title)+'</h1><div class="pills"><span class="pill '+cls+'">'+st+'</span><span class="pill">'+people.length+'명 · '+j.duration+'시간</span>'+(creator?'<span class="pill'+(owner?' orange':'')+'">🗝️ 만든 사람 '+esc(creator.id)+(owner?' (나)':'')+'</span>':'')+'</div></div>'
    +'<div class="jam-layout"><div>'+main
    +'<section class="magic-card jam-sec section-gap"><div class="card-head"><div><small>SETLIST</small><h2>합주할 노래</h2></div><span>🎵</span></div>'
    +(j.songs.length?'<ol class="jam-songlist">'+j.songs.map(sng=>'<li>'+esc(sng)+'</li>').join("")+'</ol>':'<p class="muted" style="margin:0">아직 정한 노래가 없어요.</p>')
    +(j.note?'<p class="jam-memo">📝 '+esc(j.note)+'</p>':'')+'</section></div>'
    +'<aside><section class="magic-card jam-sec"><div class="card-head"><div><small>MEMBERS</small><h2>멤버 '+people.length+'명</h2></div><span>🥕</span></div><div class="jam-chips">'+people.map(chip).join("")+'</div>'
    +(owner?'<div class="jam-actions"><button class="button small ghost" data-jact="edit">✏️ 모임 수정</button>'+(phase!=="canceled"?'<button class="button small ghost" data-jact="cancel">모임 취소</button>':'')+'<button class="button small danger" data-jact="delete">삭제</button></div>'
      : member ? '<p class="jam-note">📌 멤버·노래·날짜는 만든 사람('+esc(creator?creator.id:"?")+')이 관리해요.</p>' : '')
    +'</section></aside></div>';
  updateManualInfo();
}
// 직접 정하기: 날짜·시간을 바꾸면 누가 되는지 바로 보여준다
function updateManualInfo(){
  const j = jamsCache.find(x=>x.slug===jamOpen), info = $("jm-info"), dateEl = $("jm-date"), hourEl = $("jm-hour");
  if (!j || !info || !dateEl || !hourEl) return;
  const day = dateEl.value, h = Number(hourEl.value), endEl = $("jm-end");
  const keep = Number(endEl.value) - h;
  const dur = keep>=1 && keep<=5 ? keep : Math.min(j.duration, JAM_LAST-h, 5);
  endEl.innerHTML = hourOptions(h+1, Math.min(JAM_LAST, h+5), h+dur);
  if (!day){ info.textContent = ""; return; }
  const jj = {...j, duration:dur};
  const people = jamPeople(jj), who = whoCovers(jj, day, h), missing = people.filter(m=>!who.some(w=>w.slug===m.slug)).map(m=>m.id);
  const ov = jamOverlaps(jj, slotKey(day, h));
  info.innerHTML = '<span class="pill '+(who.length===people.length?"ok":who.length?"gold":"bad")+'">'+who.length+'/'+people.length+'명 가능</span>'
    +(missing.length?' 빠짐: '+esc(missing.join(", ")):' 전원 가능!')
    +(ov.length?' <span class="pill bad">⚠️ '+esc(ov.map(o=>o.title).join(", "))+'와 겹침</span>':'');
}
$("jam-body").addEventListener("change", e=>{ if (e.target.closest("#jm-date, #jm-hour, #jm-end")) updateManualInfo(); });
function dDay(day){ const n = Math.round((pd(day)-pd(TODAY))/864e5); return n===0 ? "-DAY" : n>0 ? "-"+n : "+"+(-n); }
$("jam-body").addEventListener("click", async e=>{
  const j = jamsCache.find(x=>x.slug===jamOpen); if (!j) return;
  const fx = e.target.closest("[data-fix]"), rs = e.target.closest("[data-rsvp]"), ac = e.target.closest("[data-jact]");
  if (fx) return fixJam(j, fx.dataset.fix);
  if (e.target.closest("[data-fix-manual]")){
    const day = $("jm-date").value, h = Number($("jm-hour").value), dur = Number($("jm-end").value) - h;
    if (!day) return toast("날짜를 골라주세요");
    return fixJam({...j, duration:dur}, slotKey(day, h), dur);
  }
  if (rs) return jamAct("rsvp", {answer:rs.dataset.rsvp}, "응답을 남겼어요");
  if (!ac) return;
  const a = ac.dataset.jact;
  if (a==="mytime") return goTo("view-schedule");
  if (a==="edit") return openJamEdit(j);
  if (a==="unfix") return jamAct("unfix", {}, "다시 날짜를 정해요");
  if (a==="done") return jamAct("status", {status:"done"}, "수고했어요! 🎸");
  if (a==="revive") return jamAct("status", {status:"planning"}, "다시 계획해요");
  if (a==="cancel"){ if (confirm("'"+j.title+"' 모임을 취소할까요? 캘린더에서 내려가요.")) jamAct("status", {status:"canceled"}, "모임을 취소했어요"); return; }
  if (a==="delete"){ if (confirm("'"+j.title+"' 모임을 완전히 지울까요? 되돌릴 수 없어요.")) jamAct("delete", {}, "모임을 지웠어요"); }
});
async function jamAct(action, extra, msg){
  if (!me) return goTo("view-login");
  try{
    const d = await api("jams", {id:me.id, token:me.token, action, target:jamOpen, ...extra});
    if (action==="delete"){ jamsCache = jamsCache.filter(x=>x.slug!==jamOpen); jamOpen = null; toast(msg); return goTo("view-jams"); }
    jamsCache = jamsCache.map(x=>x.slug===d.jam.slug ? d.jam : x);
    renderJam(); toast(msg);
  }catch(e){ toast(errText(e)); }
}

/* ---------- 합주 제안 ---------- */
let propsCache = [], propOpen = null, propDraft = null;
const PROP_STATUS = {open:["모집 중","ok"], converted:["모임이 됐어요","orange"], closed:["닫힘",""], team:["공연팀 확정","orange"]};
const appState = a => a && a.state==="wait" ? "wait" : "in";
const ownerPartLabel = p => p.ownerPart && PART[p.ownerPart] ? PART[p.ownerPart].e+' '+PART[p.ownerPart].n : "";
// 파트별 대기 줄 (신청 순서)
function waitList(p){ return Object.entries(p.applicants||{}).filter(([,a])=>appState(a)==="wait").sort((x,y)=>x[1].at.localeCompare(y[1].at)); }
function waitRank(p, slug){ const a = p.applicants[slug]; if (!a || appState(a)!=="wait") return 0; return waitList(p).filter(([,x])=>x.part===a.part).findIndex(([sl])=>sl===slug)+1; }
const isPropOwner = p => !!me && p.createdBy===me.slug;
// 모집 파트별 현황: 필요 인원과 그 파트로 신청한 사람
function wantRows(p){
  const apps = Object.entries(p.applicants||{});
  return PARTS.filter(k=>p.want[k.k]).map(k=>({part:k.k, need:p.want[k.k], who:apps.filter(([,a])=>a.part===k.k && appState(a)==="in").map(([s])=>s),
    wait:apps.filter(([,a])=>a.part===k.k && appState(a)==="wait").length}));
}
const propFull = p => { const w = wantRows(p); return w.length>0 && w.every(x=>x.who.length>=x.need); };
function propCard(p){
  const [st, cls] = PROP_STATUS[p.status]||PROP_STATUS.open;
  const all = currentMembers(), by = all.find(m=>m.slug===p.createdBy);
  const apps = Object.values(p.applicants||{}).filter(a=>appState(a)==="in").length, waits = waitList(p).length;
  const mine = me && (p.createdBy===me.slug ? "owner" : p.applicants[me.slug] ? (appState(p.applicants[me.slug])==="wait" ? "wait" : "applied") : p.interest.includes(me.slug) ? "interest" : "");
  return '<article class="jam-card prop'+(mine?" me":"")+'" data-prop="'+p.slug+'" data-tilt>'
    +'<div class="jam-top"><span class="pill '+cls+'">'+st+'</span>'+(unreadOf(p.slug)?'<span class="pill orange">💬 새 글 '+unreadOf(p.slug)+'</span>':'')+(p.status==="open"&&!p.accepting?'<span class="pill">🔒 사람 안 받는 중</span>':propFull(p)&&p.status==="open"?'<span class="pill gold">정원 마감'+(waits?' · 대기 '+waits:'')+'</span>':'')+(mine==="owner"?'<span class="pill orange">내 제안</span>':mine==="applied"?'<span class="pill orange">신청함</span>':mine==="wait"?'<span class="pill orange">대기 중</span>':mine==="interest"?'<span class="pill">관심</span>':'')+'<small>👀 '+p.interest.length+' · 🙋 '+apps+(waits?' · ⏳ '+waits:'')+'</small></div>'
    +'<h4>'+esc(p.title)+'</h4>'
    +'<p class="jam-when">'+(p.whenText?'🗓️ '+esc(p.whenText)+' · ':'')+'🗝️ '+esc(by?by.id:"?")+(p.ownerPart?' ('+ownerPartLabel(p)+')':'')+'</p>'
    +(wantRows(p).length?'<div class="pills">'+wantRows(p).map(w=>'<span class="pill '+(w.who.length>=w.need?"ok":"")+'">'+PART[w.part].e+' '+PART[w.part].n+' '+w.who.length+'/'+w.need+'</span>').join("")+'</div>':'')
    +(p.body?'<p class="jam-songs prop-body">'+esc(p.body.length>90?p.body.slice(0,90)+"…":p.body)+'</p>':'')
    +'</article>';
}
function renderProps(){
  const general = propsCache.filter(p=>!p.showSlug);   // 공연 팀 모집은 공연 화면에서
  const open = general.filter(p=>p.status==="open"), rest = general.filter(p=>p.status!=="open");
  const empty = t => '<div class="empty-state"><span>📣</span><p>'+t+'</p></div>';
  $("props-open").innerHTML = open.length ? open.map(propCard).join("") : empty(me ? "아직 제안이 없어요. 하고 싶은 합주를 먼저 올려보세요!" : "아직 모집 중인 제안이 없어요.");
  $("props-closed-sec").hidden = !rest.length;
  $("props-closed").innerHTML = rest.map(propCard).join("");
}
function renderProp(){
  const p = propsCache.find(x=>x.slug===propOpen);
  if (!p){ $("prop-body").innerHTML = '<div class="empty-state"><span>☾</span><p>'+(propsCache.length?"제안을 찾을 수 없어요. 지워졌을 수 있어요.":"불러오는 중…")+'</p></div>'; return; }
  const all = currentMembers(), by = all.find(m=>m.slug===p.createdBy), owner = isPropOwner(p);
  const [st, cls] = PROP_STATUS[p.status]||PROP_STATUS.open;
  const person = sl => all.find(m=>m.slug===sl) || {slug:sl, id:"(나간 멤버)", parts:[]};
  const ins = Object.entries(p.applicants||{}).filter(([,a])=>appState(a)==="in").sort((a,b)=>a[1].at.localeCompare(b[1].at));
  const waits = waitList(p);
  const myApp = me && p.applicants[me.slug];
  const rows = wantRows(p);
  const sh = p.showSlug ? showsCache.find(x=>x.slug===p.showSlug) : null, isTeam = !!p.showSlug;
  const full = propFull(p), canRecruit = !sh || showRecruitOpen(sh);
  $("prop-back").textContent = isTeam ? "‹ "+(sh ? sh.title : "공연") : "‹ 합주 제안";
  let act = "";
  if (p.status==="converted") act = '<div class="jam-actions"><button class="button small primary" data-pact="gojam">🎪 만들어진 모임으로 이동 →</button></div>';
  else if (p.status==="team") act = '<p class="jam-note">🎤 공연팀으로 확정됐어요'+(sh?' — <b>'+esc(sh.title)+'</b>':'')+'.</p><div class="jam-actions">'+(sh?'<button class="button small primary" data-pact="goshow">🎤 공연 페이지로 →</button>':'')+(owner && sh && sh.status!=="confirmed" && sh.status!=="done"?'<button class="button small ghost" data-pact="reopen">확정 풀고 다시 모집</button><button class="button small ghost" data-pact="edit">✏️ 팀명·곡 수정</button>':'')+'</div>';
  else if (!me) act = '<p class="jam-note">입장하면 관심을 남기거나 파트를 골라 신청할 수 있어요.</p><div class="jam-actions"><button class="button small primary" data-pact="login">입장하기 →</button></div>';
  else if (owner){
    act = (p.status==="open" ? '<label class="switch-row"><span class="switch"><input type="checkbox" id="prop-accepting"'+(p.accepting?" checked":"")+'><i></i></span><span><b>'+(p.accepting?"사람 받는 중":"사람 안 받는 중")+'</b><small>'+(p.accepting?"끄면 새 신청을 받지 않아요. 지금 대기 중인 사람은 자리가 나면 순서대로 들어와요.":"켜면 다시 신청을 받아요.")+'</small></span></label>' : '')
      +'<div class="jam-actions">'
      +(p.status==="open" ? (isTeam ? '<button class="button small primary" data-pact="team-ui"'+(sh&&(sh.status==="confirmed"||sh.status==="done")?" disabled":"")+'>🎤 이 멤버로 공연팀 확정</button>' : '<button class="button small primary" data-pact="convert-ui">🎪 모임으로 만들기</button>')
          +'<button class="button small ghost" data-pact="close">다음에 해요 (닫기)</button>' : '<button class="button small ghost" data-pact="reopen">다시 모집하기</button>')
      +'<button class="button small ghost" data-pact="edit">✏️ 수정</button><button class="button small danger" data-pact="delete">삭제</button></div><div id="prop-convert" hidden></div>';
  } else if (p.status==="open"){
    const myParts = (me.data.parts||[]), opts = [...myParts, ...PARTS.map(k=>k.k).filter(k=>!myParts.includes(k))];
    const left = k => { const w = rows.find(x=>x.part===k); return !Object.keys(p.want).length ? " (모집 중)" : w ? (w.who.length<w.need ? " (자리 "+(w.need-w.who.length)+")" : " (마감 · 대기)") : " (대기)"; };
    act = '<div class="prop-apply">'
      +(myApp ? (appState(myApp)==="wait"
          ? '<p class="jam-note">⏳ <b>'+PART[myApp.part].e+' '+PART[myApp.part].n+'</b> 대기 <b>'+waitRank(p, me.slug)+'번째</b>예요. 자리가 나면 순서대로 자동으로 들어가요.</p>'
          : '<p class="jam-note">🙋 <b>'+PART[myApp.part].e+' '+PART[myApp.part].n+'</b>로 들어와 있어요. 제안자가 '+(isTeam?"팀을 확정하면 공연팀이 돼요.":"모임을 만들면 초대돼요.")+'</p>')
        +'<div class="jam-actions"><button class="button small ghost" data-pact="unapply">'+(appState(myApp)==="wait"?"대기 취소":"나가기 (신청 취소)")+'</button></div>'
        : !p.accepting ? '<p class="jam-note">🔒 제안자가 지금은 사람을 받지 않아요.</p>'
        : !canRecruit ? '<p class="jam-note">공연 팀 모집 기간이 아니에요.</p>'
        : '<div class="sug-manual-row"><select class="text-input" id="prop-part">'+opts.map(k=>'<option value="'+k+'">'+PART[k].e+' '+PART[k].n+left(k)+'</option>').join("")+'</select><button class="button small primary" data-pact="apply">'+(full?"⏳ 대기 신청":"🙋 이 파트로 신청")+'</button></div>'
          +(full?'<p class="bs-small muted" style="margin:6px 0 0">정원이 다 찼어요. 지금 신청하면 대기 순번을 받고, 누가 나가면 순서대로 들어가요.</p>':''))
      +'<div class="jam-actions"><button class="button small '+(p.interest.includes(me.slug)?"primary":"ghost")+'" data-pact="interest">'+(p.interest.includes(me.slug)?"👀 관심 있어요 ✓":"👀 관심 있어요")+'</button></div></div>';
  } else act = '<p class="jam-note">지금은 모집하지 않는 제안이에요.</p>';
  const chip = ([sl,a], i) => { const m = person(sl), wait = appState(a)==="wait";
    return '<span class="jam-chip'+(me&&sl===me.slug?" me":"")+(wait?" wait":"")+'">'+(wait?'<i class="wait-n">'+(i+1)+'</i>':'')+avatarHTML(m)+'<b>'+esc(m.id)+'</b><small class="r">'+PART[a.part].e+' '+PART[a.part].n+'</small>'
      +(owner && (p.status==="open") ? '<button type="button" class="chip-x" data-pact="remove" data-who="'+sl+'" title="내보내기" aria-label="'+esc(m.id)+' 내보내기">✕</button>' : '')+'</span>'; };

  $("prop-body").innerHTML = '<div class="page-heading jam-heading"><div class="season-badge"><span>✦</span> '+(isTeam?"TEAM RECRUIT":"JAM PROPOSAL")+'</div><h1>'+esc(p.title)+'</h1>'
    +'<div class="pills"><span class="pill '+cls+'">'+st+'</span>'+(sh?'<button class="pill pill-link" data-pact="goshow">🎤 '+esc(sh.title)+'</button>':'')
    +(p.status==="open"&&!p.accepting?'<span class="pill">🔒 사람 안 받는 중</span>':full&&p.status==="open"?'<span class="pill gold">정원 마감'+(waits.length?' · 대기 '+waits.length:'')+'</span>':'')
    +'<span class="pill'+(owner?' orange':'')+'">🗝️ '+esc(by?by.id:"?")+(owner?' (나)':'')+(p.ownerPart?' · '+ownerPartLabel(p):'')+'</span>'+(p.whenText?'<span class="pill">🗓️ '+esc(p.whenText)+'</span>':'')+'</div>'
    +'<div class="jam-actions share-row"><button class="button small '+(owner?"primary":"ghost")+'" data-pact="share">🔗 링크로 초대하기</button><small class="muted">카톡·당근 채팅 등에 붙여넣으면 이 '+(isTeam?"팀 모집":"제안")+'으로 바로 들어와요</small></div></div>'
    +'<div class="jam-layout"><div>'
    +'<section class="magic-card jam-sec"><div class="card-head"><div><small>ABOUT</small><h2>'+(isTeam?"어떤 팀인가요?":"어떤 합주인가요?")+'</h2></div><span>'+(isTeam?"🎤":"📣")+'</span></div>'
    +(p.body?'<p class="prop-text">'+esc(p.body)+'</p>':'<p class="muted" style="margin:0">설명이 없어요.</p>')
    +(p.songs.length?'<div class="section-label" style="margin-top:16px">'+(isTeam?"SETLIST · 예상 공연곡":"SONGS")+'</div><ol class="jam-songlist">'+p.songs.map(x=>'<li>'+esc(x)+'</li>').join("")+'</ol>':'')
    +act+'</section>'
    +'<div id="chat-mount"></div>'
    +'</div><aside>'
    +'<section class="magic-card jam-sec"><div class="card-head"><div><small>PARTS</small><h2>모집 파트</h2></div><span>🎸</span></div>'
    +(p.ownerPart?'<div class="pw-row ok owner-row"><b>'+ownerPartLabel(p)+'</b><span class="pill orange">제안자</span><small>'+esc(by?by.id:"?")+(owner?' (나)':'')+'</small></div>':'')
    +(rows.length ? '<div class="prop-want">'+rows.map(w=>'<div class="pw-row'+(w.who.length>=w.need?" ok":"")+'"><b>'+PART[w.part].e+' '+PART[w.part].n+'</b><span class="pill '+(w.who.length>=w.need?"ok":"gold")+'">'+w.who.length+'/'+w.need+(w.wait?' · 대기 '+w.wait:'')+'</span><small>'+(w.who.length?esc(w.who.map(sl=>person(sl).id).join(", ")):"아직 없어요")+'</small></div>').join("")+'</div>' : '<p class="muted" style="margin:0">파트를 정하지 않은 제안이에요. 누구나 신청할 수 있어요.</p>')
    +'</section>'
    +'<section class="magic-card jam-sec section-gap"><div class="card-head"><div><small>PEOPLE</small><h2>멤버 '+(ins.length+1)+(waits.length?' · 대기 '+waits.length:'')+' · 관심 '+p.interest.length+'</h2></div><span>🥕</span></div>'
    +'<div class="jam-chips"><span class="jam-chip'+(owner?" me":"")+'">'+avatarHTML(by||{parts:[p.ownerPart]})+'<b>'+esc(by?by.id:"?")+'</b><small class="r yes">🗝️ '+(p.ownerPart?ownerPartLabel(p):"제안자")+'</small></span>'+ins.map(chip).join("")+'</div>'
    +(waits.length?'<div class="section-label" style="margin:14px 0 8px">⏳ 대기 (순서대로 들어와요)</div><div class="jam-chips">'+waits.map(chip).join("")+'</div>':'')
    +(p.interest.length?'<p class="jam-note">👀 '+esc(p.interest.map(sl=>person(sl).id).join(", "))+'</p>':'')
    +'</section></aside></div>';
  mountChat(p);
}

/* ---------- 공연 ---------- */
let showsCache = [], showOpen = null;
const SHOW_STATUS = {recruiting:["팀 모집 중","ok"], closed:["모집 마감","gold"], confirmed:["공연 확정","orange"], done:["지난 공연",""]};
const PART_ABBR = {vocal:"V", guitar:"G", bass:"B", drum:"D", keys:"K", etc:"E"};
function showRecruitOpen(sh){
  if (!sh || sh.status!=="recruiting") return false;
  if (sh.recruitStart && TODAY < sh.recruitStart) return false;
  if (sh.recruitEnd && TODAY > sh.recruitEnd) return false;
  return true;
}
const showPast = sh => sh.status==="done" || (sh.status==="confirmed" && sh.date && sh.date < TODAY);
const showDate = sh => sh.date ? (()=>{ const d = pd(sh.date); return d.getFullYear()+"년 "+(d.getMonth()+1)+"월 "+d.getDate()+"일("+DOW[d.getDay()]+")"; })() : "날짜 미정";
const showPhase = sh => showPast(sh) ? ["지난 공연",""] : sh.status==="recruiting" && !showRecruitOpen(sh) ? (sh.recruitStart && TODAY < sh.recruitStart ? ["모집 예정","gold"] : ["모집 마감","gold"]) : SHOW_STATUS[sh.status]||SHOW_STATUS.recruiting;
const showTeams = sh => (sh.teamOrder||[]).map(sl=>propsCache.find(p=>p.slug===sl)).filter(p=>p && p.status==="team");
function memberLine(p){
  const all = currentMembers(), list = (p.team && p.team.members) || [];
  const cnt = {}; for (const m of list) cnt[m.part] = (cnt[m.part]||0)+1;
  const seen = {};
  return list.map(m=>{ const ab = PART_ABBR[m.part]||"E"; seen[m.part] = (seen[m.part]||0)+1;
    const who = all.find(x=>x.slug===m.slug); return '<span>'+ab+(cnt[m.part]>1?seen[m.part]:"")+': <b>'+esc(who?who.id:"?")+'</b></span>'; }).join(" · ");
}
function splitSong(x){ const i = x.lastIndexOf(" - "); return i>0 ? [x.slice(0,i).trim(), x.slice(i+3).trim()] : [x, ""]; }
function lineupCard(p, i){
  return '<article class="lineup-team"><div class="lt-num">'+(i+1)+'</div><div class="lt-main"><small>'+(i+1)+'번 공연팀</small><h3>'+esc(p.title)+'</h3><p class="lt-members">'+memberLine(p)+'</p>'
    +(p.songs.length?'<ol class="lt-songs">'+p.songs.map((x,k)=>{ const [t,a] = splitSong(x); return '<li><i>'+String(k+1).padStart(2,"0")+'</i><span><b>'+esc(t)+'</b>'+(a?'<small>'+esc(a)+'</small>':'')+'</span></li>'; }).join("")+'</ol>':'<p class="muted bs-small" style="margin:8px 0 0">셋리스트 준비 중</p>')
    +'</div></article>';
}
function showCard(sh){
  const [st, cls] = showPhase(sh), teams = showTeams(sh).length, joined = me && sh.participants.includes(me.slug);
  const recruiting = propsCache.filter(p=>p.showSlug===sh.slug && p.status==="open").length;
  return '<article class="show-card'+(showPast(sh)?" past":"")+'" data-show="'+sh.slug+'" data-tilt>'
    +'<div class="sc-date">'+(sh.date?'<b>'+Number(sh.date.slice(5,7))+'.'+Number(sh.date.slice(8))+'</b><small>'+sh.date.slice(0,4)+'</small>':'<b>TBA</b>')+'</div>'
    +'<div class="sc-main"><div class="jam-top"><span class="pill '+cls+'">'+st+'</span>'+(joined?'<span class="pill orange">참여 중</span>':'')+'</div>'
    +'<h4>'+esc(sh.title)+'</h4><p class="jam-when">'+(sh.timeText?'🕔 '+esc(sh.timeText)+' · ':'')+(sh.venue?'📍 '+esc(sh.venue):'장소 미정')+'</p>'
    +'<p class="jam-songs">🎸 확정 팀 '+teams+(sh.maxTeams?'/'+sh.maxTeams:'')+(recruiting?' · 모집 중 '+recruiting:'')+' · 🙋 참여 '+sh.participants.length+'명'
    +(sh.status==="recruiting"&&(sh.recruitStart||sh.recruitEnd)?' · 모집 '+(sh.recruitStart?sh.recruitStart.slice(5).replace("-","/"):"")+'~'+(sh.recruitEnd?sh.recruitEnd.slice(5).replace("-","/"):""):'')+'</p></div></article>';
}
function renderShows(){
  const now = showsCache.filter(x=>!showPast(x)).sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));
  const past = showsCache.filter(showPast).sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  $("shows-now").innerHTML = now.length ? now.map(showCard).join("") : '<div class="empty-state"><span>🎤</span><p>지금 열린 공연이 없어요. 운영진이 공연을 열면 여기에 떠요.</p></div>';
  $("shows-past-sec").hidden = !past.length;
  $("shows-past").innerHTML = past.map(showCard).join("");
}
function renderShow(){
  const sh = showsCache.find(x=>x.slug===showOpen);
  if (!sh){ $("show-body").innerHTML = '<div class="empty-state"><span>☾</span><p>'+(showsCache.length?"공연을 찾을 수 없어요.":"불러오는 중…")+'</p></div>'; return; }
  const [st, cls] = showPhase(sh), joined = me && sh.participants.includes(me.slug), open = showRecruitOpen(sh);
  const teams = showTeams(sh), lineup = sh.status==="confirmed" || sh.status==="done";
  const recruiting = propsCache.filter(p=>p.showSlug===sh.slug && p.status==="open");
  const all = currentMembers(), parts = sh.participants.map(sl=>all.find(m=>m.slug===sl)).filter(Boolean);
  const myTeam = me && propsCache.find(p=>p.showSlug===sh.slug && (p.createdBy===me.slug || p.applicants[me.slug]) && (p.status==="open"||p.status==="team"));
  let html = '<section class="show-hero magic-card"><div class="sh-kicker">'+(sh.date?sh.date.replace(/-/g,"."):"TBA")+(sh.venue?' · '+esc(sh.venue):'')+'</div>'
    +'<h1>'+esc(sh.title)+'</h1>'+(sh.description?'<p class="sh-desc">'+esc(sh.description)+'</p>':'')
    +'<div class="pills sh-pills"><span class="pill '+cls+'">'+st+'</span><span class="pill">🗓 '+showDate(sh)+'</span>'+(sh.timeText?'<span class="pill">🕔 '+esc(sh.timeText)+'</span>':'')+(sh.venue?'<span class="pill">📍 '+esc(sh.venue)+'</span>':'')
    +(sh.recruitStart||sh.recruitEnd?'<span class="pill">📝 팀 모집 '+(sh.recruitStart||"")+' ~ '+(sh.recruitEnd||"")+'</span>':'')+'</div>'
    +'<div class="jam-actions">'
    +(lineup ? '<button class="button primary" data-sact="lineup">🎸 공연 순서 보기</button>'
      : !me ? '<button class="button primary" data-sact="login">입장하고 참여하기 →</button>'
      : sh.status!=="done" ? '<button class="button '+(joined?"ghost":"primary")+'" data-sact="join">'+(joined?"✓ 참여 중 (취소)":"🙋 참여합니다")+'</button>' : '')
    +'<button class="button ghost" data-sact="share">🔗 공연 링크 공유</button></div></section>';
  if (lineup){
    html += '<section class="section-gap" id="show-lineup"><div class="section-label">PROGRAM</div><h2 class="jam-h2">공연 순서 & 셋리스트</h2>'
      +(teams.length?'<div class="lineup">'+teams.map(lineupCard).join("")+'</div>':'<div class="empty-state"><span>🎸</span><p>라인업 준비 중이에요.</p></div>')+'</section>';
  } else {
    html += '<section class="section-gap"><div class="section-label">TEAMS</div><h2 class="jam-h2">확정된 팀 '+teams.length+(sh.maxTeams?' / '+sh.maxTeams:'')+'</h2>'
      +(teams.length?'<div class="lineup">'+teams.map(lineupCard).join("")+'</div>':'<div class="empty-state"><span>🎸</span><p>아직 확정된 팀이 없어요.</p></div>')+'</section>'
      +'<section class="section-gap"><div class="jams-head"><div><div class="section-label">RECRUITING</div><h2 class="jam-h2">팀 모집 중 📣</h2></div>'
      +(me && joined && open ? (myTeam ? '<button class="button ghost" data-prop="'+myTeam.slug+'">내 팀 보기 →</button>' : '<button class="button primary" data-sact="newteam">+ 팀 모집 제안</button>') : '')+'</div>'
      +(!open ? '<p class="jam-note">'+(sh.status==="recruiting" && sh.recruitStart && TODAY < sh.recruitStart ? "팀 모집은 "+sh.recruitStart+"부터 열려요." : "팀 모집 기간이 끝났어요.")+'</p>'
        : me && !joined ? '<p class="jam-note">🙋 <b>참여합니다</b>를 누르면 팀을 만들거나 다른 팀에 신청할 수 있어요.</p>' : '')
      +(recruiting.length?'<div class="jam-list">'+recruiting.map(propCard).join("")+'</div>':'<div class="empty-state"><span>📣</span><p>아직 모집 중인 팀이 없어요.'+(open?' 먼저 팀을 만들어 보세요!':'')+'</p></div>')+'</section>'
      +'<section class="section-gap"><div class="section-label">PARTICIPANTS</div><h2 class="jam-h2">참여자 '+parts.length+'명</h2>'
      +(parts.length?'<div class="jam-people show-people">'+parts.map(m=>'<span>'+avatarHTML(m)+esc(m.id)+' <small>'+(m.parts||[]).map(k=>PART[k]?PART[k].e:"").join("")+'</small></span>').join("")+'</div>':'<p class="muted bs-small">아직 참여자가 없어요.</p>')+'</section>';
  }
  $("show-body").innerHTML = html;
}
$("show-back").addEventListener("click", ()=>goTo("view-shows"));
$("show-body").addEventListener("click", async e=>{
  const sh = showsCache.find(x=>x.slug===showOpen); if (!sh) return;
  const b = e.target.closest("[data-sact]"); if (!b) return;
  const a = b.dataset.sact;
  if (a==="login") return loginThenBack("view-show", sh.slug);
  if (a==="share") return shareLink("show", sh.slug, sh.title);
  if (a==="lineup") return $("show-lineup").scrollIntoView({behavior:reduceMotion()?"auto":"smooth"});
  if (a==="newteam") return openPropEdit(null, sh.slug);
  if (a==="join"){
    try{
      const d = await api("shows", {id:me.id, token:me.token, action:"join", target:sh.slug});
      showsCache = showsCache.map(x=>x.slug===d.show.slug ? d.show : x);
      renderShow(); toast(d.show.participants.includes(me.slug) ? "참여했어요! 팀을 만들거나 신청해 보세요 🎤" : "참여를 취소했어요");
    }catch(err){ toast(errText(err)); }
  }
});
document.addEventListener("click", e=>{ const c = e.target.closest("[data-show]"); if (c && !e.target.closest("[data-prop]")){ showOpen = c.dataset.show; goTo("view-show"); } });

/* ---------- 제안 채팅방 ---------- */
// 읽은 위치는 이 기기에만 저장한다 (방 → 마지막으로 본 메시지 번호)
let chatSummary = {}, chatRoom = null, chatLastN = 0, chatTimer = null, chatEl = null, chatBusy = false;
const readMap = () => { try{ return JSON.parse(lsGet("kw-chat-read")||"{}"); }catch(e){ return {}; } };
const unreadOf = room => { const s = chatSummary[room]; if (!s || !me) return 0; const r = readMap()[room]||0; return Math.max(0, Math.min(s.count, s.lastN - r)); };
const unreadRooms = () => Object.keys(chatSummary).filter(room=>unreadOf(room)>0);
function markRead(room, n){ const m = readMap(); if ((m[room]||0) >= n) return; m[room] = n; lsSet("kw-chat-read", JSON.stringify(m)); }
function stopChat(){ if (chatTimer){ clearInterval(chatTimer); chatTimer = null; } }
function mountChat(p){
  const mount = $("chat-mount"); if (!mount) return;
  const role = me ? (p.createdBy===me.slug ? "owner" : p.applicants[me.slug] ? "applicant" : p.interest.includes(me.slug) ? "interest" : "") : "";
  if (!role){
    stopChat(); chatRoom = null; chatEl = null;
    mount.innerHTML = '<section class="magic-card jam-sec section-gap chat-sec"><div class="card-head"><div><small>ROOM</small><h2>💬 채팅방</h2><p>'+(me ? '관심을 누르면 읽을 수 있고, 파트로 신청하면 함께 이야기할 수 있어요.' : '입장한 뒤 관심을 누르거나 신청하면 채팅방이 열려요.')+'</p></div><span>💬</span></div></section>';
    return;
  }
  if (chatRoom!==p.slug || !chatEl){
    stopChat(); chatRoom = p.slug; chatLastN = 0;
    chatEl = document.createElement("section");
    chatEl.className = "magic-card jam-sec section-gap chat-sec";
    chatEl.innerHTML = '<div class="card-head"><div><small>ROOM</small><h2>💬 채팅방</h2><p id="chat-desc">불러오는 중…</p></div><span>💬</span></div>'
      +'<div class="chat-log" id="chat-log"><p class="muted bs-small chat-empty">불러오는 중…</p></div>'
      +'<form class="chat-form" id="chat-form"><input class="text-input" id="chat-text" maxlength="300" placeholder="메시지 (300자까지)" autocomplete="off"><button class="button primary" id="chat-send">보내기</button></form>'
      +'<div id="chat-err" class="notice error" hidden></div>'
      +'<p class="chat-notice">🔒 운영진이 열람할 수 있어요 · 욕설·성적 표현은 자동으로 막혀요 · 전화번호 같은 개인정보는 가려져요 · 문제가 있는 메시지는 신고해 주세요</p>';
    chatEl.querySelector("#chat-form").addEventListener("submit", sendChat);
    chatEl.querySelector("#chat-log").addEventListener("click", reportChat);
    mount.appendChild(chatEl);
    loadChat(true);
    chatTimer = setInterval(()=>{ if (!document.hidden) loadChat(false); }, 4000);
  } else mount.appendChild(chatEl);
}
function msgHTML(m){
  const mine = me && m.authorSlug===me.slug;
  const time = new Date(m.at).toLocaleTimeString("ko-KR",{hour:"2-digit",minute:"2-digit"});
  if (m.hidden) return '<div class="msg hidden-msg" data-n="'+m.n+'"><div class="msg-body">🚫 운영진이 가린 메시지예요</div></div>';
  return '<div class="msg'+(mine?" me":"")+'" data-n="'+m.n+'"><div class="msg-meta">'+(mine?'나':esc(m.authorId))+' · '+time+(mine?'':' <button type="button" class="msg-report" data-report="'+m.n+'" title="신고">신고</button>')+'</div><div class="msg-body">'+esc(m.body)+'</div></div>';
}
async function loadChat(initial){
  if (!chatRoom || !me || chatBusy) return;
  chatBusy = true;
  try{
    const d = await api("chat", {action:"list", id:me.id, token:me.token, room:chatRoom, after:chatLastN});
    const log = chatEl.querySelector("#chat-log"), atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
    if (initial) log.innerHTML = "";
    if (d.messages.length){
      log.querySelector(".chat-empty")?.remove();
      for (const m of d.messages){ log.insertAdjacentHTML("beforeend", msgHTML(m)); chatLastN = Math.max(chatLastN, m.n); }
      if (initial || atBottom) log.scrollTop = log.scrollHeight;
    } else if (initial) log.innerHTML = '<p class="muted bs-small chat-empty">아직 메시지가 없어요. 첫 인사를 남겨보세요 🥕</p>';
    const form = chatEl.querySelector("#chat-form"), desc = chatEl.querySelector("#chat-desc");
    form.hidden = !d.canWrite;
    desc.textContent = d.canWrite ? "제안자와 신청자끼리 이야기해요. 4초마다 새 메시지를 확인해요."
      : d.banUntil ? "운영진이 채팅을 잠시 정지했어요 ("+new Date(d.banUntil).toLocaleString("ko-KR",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})+"까지). 읽기만 할 수 있어요."
      : d.closed ? "닫힌 제안이라 읽기만 할 수 있어요." : "관심만 누른 상태라 읽기만 할 수 있어요. 파트로 신청하면 쓸 수 있어요.";
    if (chatLastN){ markRead(chatRoom, chatLastN); if (chatSummary[chatRoom]) chatSummary[chatRoom].lastN = Math.max(chatSummary[chatRoom].lastN, chatLastN); renderNav(); }
  }catch(e){ if (initial) chatEl.querySelector("#chat-log").innerHTML = '<p class="muted bs-small chat-empty">'+esc(errText(e))+'</p>'; }
  finally{ chatBusy = false; }
}
async function sendChat(e){
  e.preventDefault();
  const input = chatEl.querySelector("#chat-text"), btn = chatEl.querySelector("#chat-send"), err = chatEl.querySelector("#chat-err");
  const body = input.value.trim(); if (!body) return;
  btn.disabled = true; err.hidden = true;
  try{
    const d = await api("chat", {action:"send", id:me.id, token:me.token, room:chatRoom, body});
    input.value = "";
    const log = chatEl.querySelector("#chat-log"); log.querySelector(".chat-empty")?.remove();
    if (d.message.n > chatLastN){ log.insertAdjacentHTML("beforeend", msgHTML(d.message)); chatLastN = d.message.n; log.scrollTop = log.scrollHeight; markRead(chatRoom, chatLastN); }
    loadChat(false);
  }catch(ex){ err.textContent = errText(ex); err.hidden = false; }
  finally{ btn.disabled = false; input.focus(); }
}
async function reportChat(e){
  const b = e.target.closest("[data-report]"); if (!b) return;
  const reason = prompt("어떤 문제가 있나요? (욕설, 성희롱, 괴롭힘, 광고 등) 운영진에게 전달돼요.");
  if (reason===null) return;
  try{ await api("chat", {action:"report", id:me.id, token:me.token, room:chatRoom, msg:Number(b.dataset.report), reason}); toast("신고했어요. 운영진이 확인할게요 🙏"); b.disabled = true; b.textContent = "신고됨"; }
  catch(ex){ toast(errText(ex)); }
}
$("prop-back").addEventListener("click", ()=>{ const p = propsCache.find(x=>x.slug===propOpen); if (p && p.showSlug){ showOpen = p.showSlug; return goTo("view-show"); } jamsTab = "props"; goTo("view-jams"); });
$("prop-body").addEventListener("click", async e=>{
  const p = propsCache.find(x=>x.slug===propOpen); if (!p) return;
  const b = e.target.closest("[data-pact]"); if (!b) return;
  const a = b.dataset.pact;
  if (a==="login") return loginThenBack("view-prop", p.slug);
  if (a==="gojam"){ jamOpen = p.jamSlug; return goTo("view-jam"); }
  if (a==="goshow"){ showOpen = p.showSlug; return goTo("view-show"); }
  if (a==="share") return shareLink("p", p.slug, p.title);
  if (a==="remove"){ const m = currentMembers().find(x=>x.slug===b.dataset.who); if (confirm("'"+(m?m.id:"이 사람")+"'을(를) 내보낼까요? 같은 파트 대기 1번이 자동으로 들어와요.")) propAct("remove", {member:b.dataset.who}, "내보냈어요"); return; }
  if (a==="team-ui"){
    const box = $("prop-convert"), all = currentMembers(), ins = Object.entries(p.applicants||{}).filter(([,x])=>appState(x)==="in");
    const myParts = me.data.parts||[], opts = [...myParts, ...PARTS.map(k=>k.k).filter(k=>!myParts.includes(k))];
    box.hidden = false;
    box.innerHTML = '<div class="row-edit"><b>공연팀으로 확정할까요?</b><p class="muted bs-small">지금 들어와 있는 멤버로 팀이 만들어지고 공연 라인업에 올라가요. 대기 중인 사람은 빠져요.</p>'
      +'<div class="jam-chips">'+ins.map(([sl,x])=>{ const m = all.find(y=>y.slug===sl)||{slug:sl,id:"?",parts:[]}; return '<span class="jam-chip">'+avatarHTML(m)+'<b>'+esc(m.id)+'</b><small class="r">'+PART[x.part].e+' '+PART[x.part].n+'</small></span>'; }).join("")+'</div>'
      +'<div class="sug-manual-row"><span class="bs-small">내 파트</span><select class="text-input" id="team-owner-part">'+opts.map(k=>'<option value="'+k+'"'+(k===p.ownerPart?" selected":"")+'>'+PART[k].e+' '+PART[k].n+'</option>').join("")+'</select></div>'
      +'<div class="jam-actions"><button class="button small ghost" data-pact="convert-cancel">취소</button><button class="button small primary" data-pact="team">🎤 공연팀 확정</button></div></div>';
    box.scrollIntoView({behavior:reduceMotion()?"auto":"smooth", block:"center"});
    return;
  }
  if (a==="team") return propAct("team", {ownerPart:$("team-owner-part").value}, "공연팀으로 확정했어요! 🎤");
  if (a==="edit") return openPropEdit(p);
  if (a==="interest") return propAct("interest", {}, p.interest.includes(me.slug) ? "관심을 거뒀어요" : "관심을 남겼어요 👀");
  if (a==="apply") return propAct("apply", {part:$("prop-part").value}, propFull(p) ? "대기 신청했어요. 자리가 나면 순서대로 들어가요 ⏳" : "신청했어요! 🙋");
  if (a==="unapply") return propAct("unapply", {}, "나왔어요. 같은 파트 대기 1번이 대신 들어가요");
  if (a==="close") return propAct("close", {}, "제안을 닫았어요. 언제든 다시 열 수 있어요");
  if (a==="reopen") return propAct("reopen", {}, "다시 모집해요 📣");
  if (a==="delete"){ if (confirm("'"+p.title+"' 제안을 지울까요? 되돌릴 수 없어요.")) propAct("delete", {}, "제안을 지웠어요"); return; }
  if (a==="convert-ui"){
    const box = $("prop-convert"), all = currentMembers();
    const apps = Object.entries(p.applicants||{});
    box.hidden = false;
    box.innerHTML = '<div class="row-edit"><b>모임에 넣을 멤버를 골라주세요</b><p class="muted bs-small">신청한 사람 중에서 골라요(대기자는 꺼져 있어요). 나는 자동으로 들어가요. 모임을 만들면 이 제안은 "모임이 됐어요"로 바뀌어요.</p>'
      +(apps.length?'<div class="je-members">'+apps.map(([sl,ap])=>{ const m = all.find(x=>x.slug===sl)||{slug:sl,id:"?",parts:[]}; return '<button type="button" class="je-m'+(appState(ap)==="in"?" on":"")+'" data-cm="'+sl+'">'+avatarHTML(m)+'<span>'+esc(m.id)+'</span><small>'+PART[ap.part].e+'</small></button>'; }).join("")+'</div>':'<p class="muted bs-small">아직 신청한 사람이 없어요. 나 혼자로도 모임을 만들 수는 있어요.</p>')
      +'<div class="jam-actions"><button class="button small ghost" data-pact="convert-cancel">취소</button><button class="button small primary" data-pact="convert">🎪 이 멤버로 모임 만들기</button></div></div>';
    box.scrollIntoView({behavior:reduceMotion()?"auto":"smooth", block:"center"});
    return;
  }
  if (a==="convert-cancel"){ $("prop-convert").hidden = true; return; }
  if (a==="convert"){
    const members = [...$("prop-convert").querySelectorAll(".je-m.on")].map(x=>x.dataset.cm);
    try{
      const d = await api("proposals", {id:me.id, token:me.token, action:"convert", target:p.slug, members});
      propsCache = propsCache.map(x=>x.slug===d.proposal.slug ? d.proposal : x);
      jamsCache = [d.jam, ...jamsCache];
      toast("모임을 만들었어요! 이제 날짜를 정해요 🎪");
      jamOpen = d.jam.slug; goTo("view-jam");
    }catch(err){ toast(errText(err)); }
  }
});
$("prop-body").addEventListener("click", e=>{ const b = e.target.closest("#prop-convert .je-m"); if (b) b.classList.toggle("on"); });
$("prop-body").addEventListener("change", e=>{ if (e.target.id==="prop-accepting") propAct("accepting", {value:e.target.checked}, e.target.checked ? "다시 사람을 받아요 🙋" : "새 신청을 받지 않아요 🔒"); });
async function propAct(action, extra, msg){
  if (!me) return goTo("view-login");
  try{
    const d = await api("proposals", {id:me.id, token:me.token, action, target:propOpen, ...extra});
    if (action==="delete"){ const was = propsCache.find(x=>x.slug===propOpen); propsCache = propsCache.filter(x=>x.slug!==propOpen); propOpen = null; toast(msg); if (was && was.showSlug){ showOpen = was.showSlug; loadJams(); return goTo("view-show"); } jamsTab = "props"; return goTo("view-jams"); }
    if (action==="team") loadJams();
    propsCache = propsCache.map(x=>x.slug===d.proposal.slug ? d.proposal : x);
    renderProp(); toast(msg);
  }catch(e){ toast(errText(e)); }
}
/* 제안 올리기 · 수정 */
function openPropEdit(p, showSlug){
  if (!me) return goTo("view-login");
  const mine0 = (me.data.parts||[])[0] || "vocal";
  propDraft = p ? {slug:p.slug, want:{...p.want}, showSlug:p.showSlug||"", ownerPart:p.ownerPart||mine0} : {slug:null, want:{vocal:1, guitar:1, bass:1, drum:1}, showSlug:showSlug||"", ownerPart:mine0};
  if (!p) delete propDraft.want[propDraft.ownerPart];   // 내 파트는 빼고 시작
  const team = !!propDraft.showSlug, sh = team ? showsCache.find(x=>x.slug===propDraft.showSlug) : null;
  $("pe-heading").innerHTML = team ? (p ? '공연팀 <em>수정</em>' : '공연팀 <em>모집하기</em>') : p ? '제안 <em>수정</em>' : '합주 <em>제안 올리기</em>';
  $("pe-title-label").textContent = team ? "팀명" : "제목";
  $("pe-title").placeholder = team ? "예: 전기톱 아쿠마" : "예: 겨울 브릿팝 카피 밴드 모집";
  $("pe-songs-label").innerHTML = team ? '예상 공연곡 <small>한 줄에 한 곡 · "곡 - 아티스트"</small>' : '하고 싶은 곡 <small>선택 · 한 줄에 한 곡</small>';
  $("pe-when-fld").hidden = team;
  $("pe-body").placeholder = team ? (sh ? "'"+sh.title+"' 무대에서 어떤 음악을 하고 싶은지, 연습은 언제 할지 적어주세요." : "") : "하고 싶은 음악, 분위기, 실력 기준, 자주 모일 수 있는지 등을 자유롭게 적어주세요.";
  $("pe-title").value = p ? p.title : ""; $("pe-body").value = p ? p.body : "";
  $("pe-songs").value = p ? p.songs.join("\n") : ""; $("pe-when").value = p ? p.whenText : "";
  $("pe-save").innerHTML = (p ? "저장하기" : "올리기")+' <span>→</span>';
  $("pe-err").hidden = true;
  renderPeMine(); renderPeWant();
  show("view-prop-edit");
  setTimeout(()=>$("pe-title").focus(), 150);
}
function renderPeMine(){
  const myParts = me.data.parts||[], opts = [...myParts, ...PARTS.map(k=>k.k).filter(k=>!myParts.includes(k))];
  $("pe-mine").innerHTML = opts.map(k=>'<button type="button" class="genre-chip" data-mine="'+k+'" aria-pressed="'+(propDraft.ownerPart===k)+'">'+PART[k].e+' '+PART[k].n+(myParts.includes(k)?'':' ')+'</button>').join("");
}
$("pe-mine").addEventListener("click", e=>{
  const b = e.target.closest("[data-mine]"); if (!b) return;
  const prev = propDraft.ownerPart; propDraft.ownerPart = b.dataset.mine;
  // 새로 고른 내 파트를 모집 인원에서 하나 빼고, 놓은 파트는 하나 채워 둔다 (새 제안일 때만)
  if (!propDraft.slug && prev !== propDraft.ownerPart){
    if (propDraft.want[propDraft.ownerPart]){ propDraft.want[propDraft.ownerPart]--; if (!propDraft.want[propDraft.ownerPart]) delete propDraft.want[propDraft.ownerPart]; }
    if (prev && ["vocal","guitar","bass","drum"].includes(prev) && !propDraft.want[prev]) propDraft.want[prev] = 1;
  }
  renderPeMine(); renderPeWant();
});
function renderPeWant(){
  $("pe-want").innerHTML = PARTS.map(k=>{ const n = propDraft.want[k.k]||0;
    return '<div class="pw-edit'+(n?" on":"")+'"><b>'+k.e+' '+k.n+'</b><div class="pw-step"><button type="button" data-pw="'+k.k+'" data-d="-1" aria-label="줄이기"'+(n?"":" disabled")+'>−</button><span>'+n+'명</span><button type="button" data-pw="'+k.k+'" data-d="1" aria-label="늘리기"'+(n>=5?" disabled":"")+'>+</button></div></div>'; }).join("");
}
$("pe-want").addEventListener("click", e=>{
  const b = e.target.closest("[data-pw]"); if (!b || b.disabled) return;
  const k = b.dataset.pw, n = Math.min(5, Math.max(0, (propDraft.want[k]||0) + Number(b.dataset.d)));
  if (n) propDraft.want[k] = n; else delete propDraft.want[k];
  renderPeWant();
});
$("pe-cancel").addEventListener("click", ()=>{ if (propDraft.slug){ propOpen = propDraft.slug; goTo("view-prop"); } else if (propDraft.showSlug){ showOpen = propDraft.showSlug; goTo("view-show"); } else { jamsTab = "props"; goTo("view-jams"); } });
$("pe-save").addEventListener("click", async ()=>{
  const err = $("pe-err"), fail = t=>{ err.textContent = t; err.hidden = false; };
  const title = $("pe-title").value.trim(), body = $("pe-body").value.trim();
  if (title.length<2) return fail("제목을 2자 이상 적어주세요.");
  if (title.length<2 && propDraft.showSlug) return fail("팀명을 2자 이상 적어주세요.");
  if (body.length<5) return fail("어떤 "+(propDraft.showSlug?"팀":"합주")+"인지 5자 이상 적어주세요.");
  const proposal = {title, body, want:propDraft.want, ownerPart:propDraft.ownerPart, songs:$("pe-songs").value.split("\n").map(x=>x.trim()).filter(Boolean), whenText:propDraft.showSlug ? "" : $("pe-when").value.trim(), showSlug:propDraft.showSlug||undefined};
  const btn = $("pe-save"); btn.disabled = true; err.hidden = true;
  try{
    const d = await api("proposals", propDraft.slug ? {id:me.id, token:me.token, action:"update", target:propDraft.slug, proposal} : {id:me.id, token:me.token, action:"create", proposal});
    propsCache = propsCache.some(x=>x.slug===d.proposal.slug) ? propsCache.map(x=>x.slug===d.proposal.slug ? d.proposal : x) : [d.proposal, ...propsCache];
    propOpen = d.proposal.slug;
    toast(propDraft.slug ? "고쳤어요" : propDraft.showSlug ? "팀 모집을 올렸어요! 링크로 멤버를 초대해 보세요 🎤" : "제안을 올렸어요! 링크로 사람들을 초대해 보세요 📣");
    goTo("view-prop");
  }catch(e){ fail(errText(e)); }
  finally{ btn.disabled = false; }
});

/* 만들기 · 수정 */
function openJamEdit(j, preset){
  if (!me) return goTo("view-login");
  jamDraft = j ? {slug:j.slug, title:j.title, members:new Set(j.members), songs:j.songs.join("\n"), duration:j.duration, startHour:j.startHour||19, place:j.place, note:j.note}
    : {slug:null, title:(preset&&preset.title)||"", members:new Set([me.slug, ...((preset&&preset.members)||[])]), songs:"", duration:2, startHour:19, place:"", note:""};
  jamDraft.members.add(me.slug);
  $("je-heading").innerHTML = j ? '모임 <em>수정</em>' : '새 <em>합주 모임</em>';
  $("je-name").value = jamDraft.title; $("je-songs").value = jamDraft.songs;
  $("je-place").value = jamDraft.place; $("je-note").value = jamDraft.note;
  $("je-err").hidden = true;
  renderJeTime(); renderJeMembers();
  show("view-jam-edit");
  setTimeout(()=>$("je-name").focus(), 150);
}
// "몇 시부터 몇 시까지": 시작 10~23시, 끝은 시작+1 ~ 시작+5 (24시 넘지 않게)
function hourOptions(from, to, cur){ let o = ""; for (let h=from; h<=to; h++) o += '<option value="'+h+'"'+(h===cur?" selected":"")+'>'+h+'시</option>'; return o; }
function renderJeTime(){
  const st = Math.min(JAM_LAST-1, Math.max(JAM_FIRST, jamDraft.startHour||19));
  jamDraft.startHour = st;
  jamDraft.duration = Math.min(jamDraft.duration, JAM_LAST-st, 5);
  $("je-start").innerHTML = hourOptions(JAM_FIRST, JAM_LAST-1, st);
  $("je-end").innerHTML = hourOptions(st+1, Math.min(JAM_LAST, st+5), st+jamDraft.duration);
}
$("je-start").addEventListener("change", ()=>{ jamDraft.startHour = Number($("je-start").value); renderJeTime(); });
$("je-end").addEventListener("change", ()=>{ jamDraft.duration = Number($("je-end").value) - jamDraft.startHour; });
function renderJeMembers(){
  const all = currentMembers().filter(m=>m.done || jamDraft.members.has(m.slug))
    .sort((a,b)=>(a.slug===me.slug?-1:b.slug===me.slug?1:0) || a.id.localeCompare(b.id));
  $("je-members").innerHTML = all.map(m=>'<button type="button" class="je-m'+(jamDraft.members.has(m.slug)?" on":"")+'" data-m="'+m.slug+'"'+(m.slug===me.slug?' disabled':'')+' title="'+esc(memberPartsText(m, " · "))+'">'+avatarHTML(m)+'<span>'+esc(m.id)+(m.slug===me.slug?' (나)':'')+'</span><small>'+(m.parts||[]).map(k=>PART[k]?PART[k].e:"").join("")+'</small></button>').join("")
    || '<p class="muted" style="margin:0">아직 취향 등록을 마친 멤버가 없어요.</p>';
  $("je-count").textContent = jamDraft.members.size+"명 (나 포함, 최대 12명)";
}
$("je-members").addEventListener("click", e=>{
  const b = e.target.closest("[data-m]"); if (!b || b.disabled) return;
  const s = b.dataset.m;
  if (jamDraft.members.has(s)) jamDraft.members.delete(s);
  else if (jamDraft.members.size>=12) return toast("멤버는 12명까지예요");
  else jamDraft.members.add(s);
  renderJeMembers();
});
$("je-cancel").addEventListener("click", ()=>{ if (jamDraft.slug){ jamOpen = jamDraft.slug; goTo("view-jam"); } else goTo("view-jams"); });
$("je-save").addEventListener("click", async ()=>{
  const err = $("je-err"), fail = t=>{ err.textContent = t; err.hidden = false; };
  const title = $("je-name").value.trim();
  if (title.length<2) return fail("모임 이름을 2자 이상 적어주세요.");
  if (jamDraft.members.size<2) return fail("멤버를 한 명 이상 더 골라주세요.");
  const jam = {title, members:[...jamDraft.members], songs:$("je-songs").value.split("\n").map(x=>x.trim()).filter(Boolean),
    duration:jamDraft.duration, startHour:jamDraft.startHour, place:$("je-place").value.trim(), note:$("je-note").value.trim()};
  const btn = $("je-save"); btn.disabled = true; err.hidden = true;
  try{
    const d = await api("jams", jamDraft.slug ? {id:me.id, token:me.token, action:"update", target:jamDraft.slug, jam} : {id:me.id, token:me.token, action:"create", jam});
    jamsCache = jamsCache.some(x=>x.slug===d.jam.slug) ? jamsCache.map(x=>x.slug===d.jam.slug ? d.jam : x) : [d.jam, ...jamsCache];
    jamOpen = d.jam.slug;
    toast(jamDraft.slug ? "모임을 고쳤어요" : "모임을 만들었어요! 이제 날짜를 골라요 🎪");
    goTo("view-jam");
  }catch(e){ fail(errText(e)); }
  finally{ btn.disabled = false; }
});

/* ---------- 오류 보고 · 기능 제안 ---------- */
const FB_KIND = {bug:"🐞 오류", idea:"💡 제안", etc:"💬 기타"};
const FB_STATUS = {new:["접수", ""], checking:["확인 중", "gold"], doing:["반영 중", "orange"], done:["완료", "ok"], hold:["보류", "bad"]};
const FB_HINT = {
  bug:"어떤 화면에서 무엇을 했을 때 어떻게 됐는지 적어주세요.\n예) 합주 시간에서 칸을 칠하고 저장을 누르면 '저장 중 오류'가 떠요. (휴대폰, 크롬)",
  idea:"있으면 좋겠는 기능과 이유를 적어주세요.\n예) 밴드 카드에서 바로 단톡방 링크를 공유할 수 있으면 좋겠어요.",
  etc:"하고 싶은 말을 자유롭게 적어주세요.",
};
let fbKind = "bug", fbFrom = "view-home";
function setFbKind(k){
  fbKind = k;
  for (const b of $("fb-kind").querySelectorAll("button")) b.setAttribute("aria-pressed", b.dataset.kind===k);
  $("fb-body").placeholder = FB_HINT[k];
  $("fb-env-fld").hidden = k!=="bug";
}
$("fb-kind").addEventListener("click", e=>{ const b = e.target.closest("[data-kind]"); if (b) setFbKind(b.dataset.kind); });
$("footer-feedback").addEventListener("click", ()=>goTo("view-feedback"));
function openFeedback(){
  setFbKind(fbKind);
  $("fb-name-fld").hidden = !!me;
  $("fb-err").hidden = true;
  show("view-feedback");
  renderMyFeedback();
}
async function renderMyFeedback(){
  const box = $("fb-mine");
  if (!me){ box.innerHTML = '<p class="muted fb-empty">로그인하고 보내면 처리 상태와 운영진 답장을 여기서 볼 수 있어요.</p>'; return; }
  box.innerHTML = '<p class="muted fb-empty">불러오는 중…</p>';
  try{
    const {items} = await api("feedback", {action:"mine", id:me.id, token:me.token});
    box.innerHTML = items.length ? items.map(f=>{
      const [st, cls] = FB_STATUS[f.status] || FB_STATUS.new;
      return '<div class="fb-item"><div class="fb-item-head"><span class="pill">'+FB_KIND[f.kind]+'</span><span class="pill '+cls+'">'+st+'</span><small>'+new Date(f.createdAt).toLocaleDateString("ko-KR",{month:"numeric",day:"numeric"})+'</small></div>'
        +'<b>'+esc(f.title)+'</b>'
        +(f.reply ? '<p class="fb-reply"><span>🗝️ 운영진</span>'+esc(f.reply)+'</p>' : '')+'</div>';
    }).join("") : '<p class="muted fb-empty">아직 보낸 의견이 없어요.</p>';
  }catch(e){ box.innerHTML = '<p class="muted fb-empty">목록을 불러오지 못했어요.</p>'; }
}
$("fb-send").addEventListener("click", async ()=>{
  const err = $("fb-err"), fail = t=>{ err.textContent = t; err.hidden = false; };
  const title = $("fb-title").value.trim(), body = $("fb-body").value.trim();
  if (title.length<2) return fail("제목을 2자 이상 적어주세요.");
  if (body.length<5) return fail("내용을 5자 이상 적어주세요.");
  const meta = fbKind==="bug" && $("fb-env").checked
    ? {view:fbFrom, ua:navigator.userAgent, screen:innerWidth+"x"+innerHeight, url:location.pathname} : null;
  const btn = $("fb-send"); btn.disabled = true; err.hidden = true;
  try{
    await api("feedback", {action:"submit", kind:fbKind, title, body, meta, website:$("fb-website").value,
      ...(me ? {id:me.id, token:me.token} : {name:$("fb-name").value.trim()})});
    $("fb-title").value = ""; $("fb-body").value = "";
    toast("부엉이가 의견을 전달했어요 🦉");
    renderMyFeedback();
  }catch(e){ fail(e && e.error==="too_many" ? "잠시 후 다시 보내주세요. (10분에 5건까지)" : "보내지 못했어요. 잠시 후 다시 시도해 주세요."); }
  finally{ btn.disabled = false; }
});

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
