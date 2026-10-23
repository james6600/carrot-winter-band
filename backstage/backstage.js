"use strict";
/* =========================================================
   Backstage — 관리자 화면 (최고 관리자 / 서브 관리자)
   ========================================================= */

const GENRE_NAME = {brit:"브리티시락",modern:"모던락",indie:"인디락",punk:"펑크",emo:"이모/팝펑크",grunge:"그런지",
  hardcore:"하드코어",metal:"메탈",hardrock:"하드록",blues:"블루스",jazz:"재즈/펑크",ballad:"발라드",
  kpop:"K-pop",jrock:"J-rock/J-pop",citypop:"시티팝",folk:"포크/어쿠스틱"};
const PART = {vocal:"🎤 보컬",guitar:"🎸 기타",bass:"🎵 베이스",drum:"🥁 드럼",keys:"🎹 키보드",etc:"✨ 그 외"};
const SLOT_HOURS = [10,12,14,16,18,20,22];
const ROLE_NAME = {super:"최고 관리자", sub:"서브 관리자"};
const ACTION_NAME = {
  setup:"최초 설정", login:"로그인", mfa_enrolled:"2단계 등록", locked:"잠김", changepw:"내 비밀번호 변경",
  member_avail:"회원 일정 수정", member_rename:"회원 이름 변경", member_merge:"회원 합치기",
  member_resetpw:"회원 비번 재설정", member_delete:"회원 삭제",
  admin_create:"관리자 추가", admin_role:"권한 변경", admin_resetpw:"관리자 비번 재설정",
  admin_reset2fa:"2단계 초기화", admin_delete:"관리자 삭제",
  feedback_update:"의견 처리", feedback_delete:"의견 삭제",
};
const ERR = {
  auth:"아이디 또는 비밀번호가 맞지 않아요.", proof:"예전 admin 계정 비밀번호가 맞지 않아요.",
  code:"코드가 맞지 않아요. 휴대폰 시간이 자동 설정인지 확인하고 새 코드로 다시 입력해 주세요.",
  bad_id:"아이디는 영문 소문자·숫자·_ 3~20자예요.", bad_pw:"비밀번호는 10자 이상이고, 이전 비밀번호와 달라야 해요.",
  exists:"이미 있는 관리자 아이디예요.", self:"내 계정은 여기서 바꿀 수 없어요.", role:"최고 관리자만 할 수 있어요.",
  session:"로그인이 만료됐어요. 다시 로그인해 주세요.", stage:"처음부터 다시 로그인해 주세요.",
  already:"이미 설정이 끝났어요. 새로고침 해주세요.", no_target:"대상을 찾을 수 없어요. 새로고침 해주세요.",
};

/* ---------- 유틸 ---------- */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad = n => String(n).padStart(2, "0");
const DOW = ["일","월","화","수","목","금","토"];
function slotText(k){
  const [d, h] = k.split("@"); const [y, m, dd] = d.split("-").map(Number);
  return m + "/" + dd + "(" + DOW[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()] + ") " + Number(h) + "시";
}
function todayKst(){
  const k = new Date(Date.now() + 9 * 3600e3);
  return k.getUTCFullYear() + "-" + pad(k.getUTCMonth() + 1) + "-" + pad(k.getUTCDate());
}
const when = iso => iso ? new Date(iso).toLocaleString("ko-KR", {month:"numeric", day:"numeric", hour:"2-digit", minute:"2-digit"}) : "—";
let toastTimer = 0;
function toast(msg){
  const t = $("toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>{ t.hidden = true; }, 2600);
}
function errText(e){
  if (e && e.error === "locked") return "여러 번 틀려서 잠겼어요. " + new Date(e.until).toLocaleTimeString("ko-KR", {hour:"2-digit", minute:"2-digit"}) + " 이후에 다시 시도해 주세요.";
  return (e && ERR[e.error]) || "처리 중 오류가 났어요. 잠시 후 다시 시도해 주세요.";
}
async function api(action, body = {}){
  const r = await fetch("/api/backstage", {method:"POST", headers:{"content-type":"application/json"},
    credentials:"same-origin", body:JSON.stringify({action, ...body})});
  const d = await r.json().catch(()=>({error:"server"}));
  if (!r.ok){
    if (d.error === "session" && action !== "status"){ setTimeout(boot, 1200); }
    if (d.error === "must_change"){ showChangePw(true); }
    throw d;
  }
  return d;
}
function formErr(form, msg){ const n = form.querySelector(".notice.error"); n.textContent = msg; n.hidden = !msg; }
function bindForm(id, run){
  const f = $(id);
  f.addEventListener("submit", async e=>{
    e.preventDefault();
    const btn = f.querySelector("button:not([type=button])");
    formErr(f, ""); btn.disabled = true;
    try { await run(Object.fromEntries(new FormData(f)), f); }
    catch (err){ formErr(f, typeof err === "string" ? err : errText(err)); }
    finally { btn.disabled = false; }
  });
}

/* ---------- 화면 전환 ---------- */
const VIEWS = ["v-loading","v-setup","v-login","v-enroll","v-mfa","v-changepw","v-main"];
let me = null;
function show(v){
  for (const x of VIEWS) $(x).hidden = x !== v;
  const focus = $(v).querySelector("input"); if (focus) setTimeout(()=>focus.focus(), 50);
  renderMe();
}
function renderMe(){
  const box = $("bs-me");
  box.hidden = !me || $("v-main").hidden;
  if (!me) return;
  box.innerHTML = '<span class="pill ' + (me.role === "super" ? "orange" : "gold") + '">' + ROLE_NAME[me.role] + '</span>'
    + '<b>' + esc(me.id) + '</b>'
    + '<button class="button small ghost" data-act="changepw">비밀번호 변경</button>'
    + '<button class="button small ghost" data-act="logout">로그아웃</button>';
}
document.addEventListener("click", async e=>{
  const b = e.target.closest("[data-act]"); if (!b) return;
  if (b.dataset.act === "logout"){ await api("logout").catch(()=>{}); me = null; boot(); }
  if (b.dataset.act === "changepw") showChangePw(false);
});
async function boot(){
  show("v-loading");
  try {
    const s = await api("status");
    if (s.stage === "full"){ me = s.me; return me.mustChange ? showChangePw(true) : enterMain(); }
    me = null;
    if (s.stage === "enroll") return showEnroll();
    if (s.stage === "mfa") return show("v-mfa");
    show(s.setup ? "v-setup" : "v-login");
  } catch { $("v-loading").innerHTML = '<p class="notice error">서버에 연결할 수 없어요. 잠시 후 새로고침 해주세요.</p>'; }
}

/* ---------- 로그인 단계 ---------- */
bindForm("f-setup", async v=>{
  if (v.pw !== v.pw2) throw "새 비밀번호 확인이 달라요.";
  await api("setup", {proof:v.proof, id:v.id.trim().toLowerCase(), pw:v.pw});
  $("f-setup").reset(); showEnroll();
});
bindForm("f-login", async (v, f)=>{
  const d = await api("login", {id:v.id, pw:v.pw});
  f.reset();
  if (d.stage === "enroll") showEnroll(); else show("v-mfa");
});
async function showEnroll(){
  show("v-enroll");
  $("enroll-qr").innerHTML = '<p class="muted">QR 만드는 중…</p>';
  try {
    const d = await api("enroll_info");
    $("enroll-qr").innerHTML = d.qr;
    $("enroll-secret").textContent = d.secret;
  } catch (e){ $("enroll-qr").innerHTML = '<p class="notice error">' + esc(errText(e)) + '</p>'; }
}
const afterCode = d=>{ me = d.me; toast("들어왔어요 🗝️"); return me.mustChange ? showChangePw(true) : enterMain(); };
bindForm("f-enroll", async (v, f)=>{ const d = await api("enroll", {code:v.code}); f.reset(); afterCode(d); });
bindForm("f-mfa", async (v, f)=>{ const d = await api("mfa", {code:v.code}); f.reset(); afterCode(d); });

let forcedPw = false;
function showChangePw(forced){
  forcedPw = forced;
  $("changepw-lead").textContent = forced ? "임시 비밀번호로 들어왔어요. 계속하려면 나만 아는 새 비밀번호로 바꿔주세요."
    : "바꾸면 다른 기기에서 로그인한 세션은 모두 끊겨요.";
  $("changepw-cancel").hidden = forced;
  show("v-changepw");
}
$("changepw-cancel").addEventListener("click", ()=>enterMain());
bindForm("f-changepw", async (v, f)=>{
  if (v.next !== v.next2) throw "새 비밀번호 확인이 달라요.";
  await api("changepw", {current:v.current, next:v.next});
  f.reset(); me.mustChange = false; toast("비밀번호를 바꿨어요"); enterMain();
});

/* ---------- 관리 화면 ---------- */
const TABS = [
  {k:"members", t:"👥 회원 관리"},
  {k:"schedule", t:"🗓️ 일정 조율"},
  {k:"feedback", t:"💌 의견함"},
  {k:"admins", t:"🛡️ 관리자", sup:true},
  {k:"logs", t:"📜 활동 기록", sup:true},
];
let tab = "members", members = [], win = null;
async function enterMain(){
  show("v-main");
  const tabs = TABS.filter(t => !t.sup || me.role === "super");
  if (!tabs.some(t => t.k === tab)) tab = "members";
  $("bs-tabs").innerHTML = tabs.map(t => '<button data-tab="' + t.k + '" aria-pressed="' + (t.k === tab) + '">' + t.t + '</button>').join("");
  await openTab(tab);
  if (tab !== "feedback") loadFeedback().catch(()=>{});
}
$("bs-tabs").addEventListener("click", e=>{ const b = e.target.closest("[data-tab]"); if (b) openTab(b.dataset.tab); });
async function openTab(k){
  tab = k;
  for (const b of $("bs-tabs").querySelectorAll("button")) b.setAttribute("aria-pressed", b.dataset.tab === k);
  for (const t of TABS) $("t-" + t.k).hidden = t.k !== k;
  try {
    if (k === "members" || k === "schedule") await loadMembers();
    if (k === "admins") await loadAdmins();
    if (k === "logs") await loadLogs();
    if (k === "feedback") await loadFeedback();
  } catch (e){ toast(errText(e)); }
}
async function loadMembers(){
  const d = await api("members");
  members = d.members; win = d.window;
  renderMembers(); renderSchedule();
}
const isSuper = () => me && me.role === "super";
const activeAvail = m => { const t = todayKst(); return (m.avail || []).filter(k => k.slice(0, 10) >= t); };

/* 회원 관리 */
$("m-search").addEventListener("input", ()=>renderMembers());
function renderMembers(){
  const done = members.filter(m => m.done).length;
  $("m-summary").innerHTML = '<div><small>TOTAL MEMBERS</small><strong>' + members.length + '</strong><span> 명</span></div>'
    + '<p>완료 ' + done + '명 · 작성 중 ' + (members.length - done) + '명 · 시간 등록 ' + members.filter(m => activeAvail(m).length).length + '명</p>';
  const q = $("m-search").value.trim().toLowerCase();
  const list = members.filter(m => !q || String(m.id).toLowerCase().includes(q));
  const acts = [["일정","avail"],["이름 변경·합치기","rename"]].concat(isSuper() ? [["비번 재설정","resetpw"],["삭제","delete"]] : []);
  $("m-rows").innerHTML = list.length ? list.map(m =>
    '<tr><td><b>' + esc(m.id) + '</b></td>'
    + '<td>' + esc((m.parts || []).map(p => PART[p] || p).join(", ")) + '</td>'
    + '<td>' + esc((m.genres || []).map(g => GENRE_NAME[g] || g).join(", ")) + '</td>'
    + '<td>' + activeAvail(m).length + '칸</td>'
    + '<td>' + (m.done ? '<span class="pill ok">완료</span>' : '<span class="pill gold">작성 중</span>') + '</td>'
    + '<td><div class="row-actions">' + acts.map(([t, a]) =>
        '<button class="button small ' + (a === "delete" ? "danger" : "ghost") + '" data-m="' + esc(m.slug) + '" data-ma="' + a + '">' + t + '</button>').join("")
    + '</div></td></tr>').join("") : '<tr><td colspan="6" class="muted">' + (q ? "검색 결과가 없어요." : "아직 회원이 없어요.") + '</td></tr>';
}
$("m-rows").addEventListener("click", e=>{
  const b = e.target.closest("[data-ma]"); if (!b) return;
  const m = members.find(x => x.slug === b.dataset.m); if (!m) return;
  if (b.dataset.ma === "avail") return openAvailEditor(m);
  memberDialog(m, b.dataset.ma);
});
function dialog(html, onGo, goLabel = "확인"){
  const d = $("dlg");
  d.innerHTML = '<form method="dialog" class="form-stack">' + html
    + '<div class="notice error" hidden></div><div class="bs-dlg-actions"><button class="button small ghost" value="cancel" formnovalidate>취소</button>'
    + '<button class="button small primary" value="go" data-go>' + goLabel + '</button></div></form>';
  const f = d.querySelector("form");
  f.addEventListener("submit", async e=>{
    if (e.submitter && e.submitter.value === "cancel") return;
    e.preventDefault();
    const btn = f.querySelector("[data-go]"); btn.disabled = true; formErr(f, "");
    try { await onGo(Object.fromEntries(new FormData(f))); d.close(); }
    catch (err){ formErr(f, typeof err === "string" ? err : errText(err)); }
    finally { btn.disabled = false; }
  });
  d.showModal();
  const first = f.querySelector("input"); if (first) first.focus();
  return d;
}
function memberDialog(m, act){
  const name = "'" + esc(m.id) + "'";
  if (act === "rename") dialog('<b>' + name + ' 이름 변경 / 합치기</b><p class="muted bs-small">새 이름이 이미 있는 계정이면 두 계정을 하나로 합쳐요 (파트·장르·가수·합주 시간 합집합, 비밀번호는 기존 계정 것 유지).</p>'
    + '<input class="text-input" name="value" maxlength="20" minlength="2" required placeholder="새 닉네임">', async v=>{
      const d = await api("member_rename", {target:m.slug, value:v.value.trim()});
      toast(d.merged ? "두 계정을 합쳤어요" : "이름을 바꿨어요"); await loadMembers();
    });
  if (act === "resetpw") dialog('<b>' + name + ' 비밀번호 재설정</b><p class="muted bs-small">새 비밀번호를 본인에게 직접 전달해 주세요.</p>'
    + '<input class="text-input" name="value" maxlength="40" minlength="4" required autocomplete="off" placeholder="새 비밀번호 (4자 이상)">', async v=>{
      await api("member_resetpw", {target:m.slug, value:v.value.trim()}); toast("비밀번호를 바꿨어요");
    });
  if (act === "delete") dialog('<b>' + name + ' 계정을 삭제할까요?</b><p class="muted bs-small">프로필, 취향, 합주 시간이 모두 지워지고 되돌릴 수 없어요. 확인하려면 닉네임을 그대로 입력하세요.</p>'
    + '<input class="text-input" name="confirm" required autocomplete="off" placeholder="' + esc(m.id) + '">', async v=>{
      if (v.confirm.trim() !== m.id) throw "닉네임이 일치하지 않아요.";
      await api("member_delete", {target:m.slug}); toast("삭제했어요"); await loadMembers();
    });
}

/* 회원 일정 수정 */
function windowDays(){
  const out = [], t = todayKst();
  if (!win) return out;
  let d = new Date(win.start + "T00:00:00Z");
  const end = new Date(win.end + "T00:00:00Z");
  for (; d <= end; d = new Date(d.getTime() + 864e5)){
    const k = d.toISOString().slice(0, 10);
    if (k >= t) out.push(k);
  }
  return out;
}
function openAvailEditor(m){
  const days = windowDays();
  const months = [...new Set(days.map(d => d.slice(0, 7)))];
  const sel = new Set(activeAvail(m));
  let month = months[0];
  const d = dialog('<b>\'' + esc(m.id) + '\' 합주 가능 시간</b><p class="muted bs-small">칸을 누르거나 끌어서 켜고 끌 수 있어요. 저장하면 본인 화면에도 바로 반영돼요.</p>'
    + '<div class="seg bs-months"></div><div class="bs-grid-wrap"><table class="bs-avail"></table></div><p class="bs-count muted bs-small"></p>', async ()=>{
      await api("member_avail", {target:m.slug, avail:[...sel]}); toast("'" + m.id + "' 일정을 저장했어요"); await loadMembers();
    }, "저장");
  d.classList.add("wide");
  const monthsBox = d.querySelector(".bs-months"), table = d.querySelector(".bs-avail"), count = d.querySelector(".bs-count");
  const draw = ()=>{
    monthsBox.innerHTML = months.map(mo => '<button type="button" data-mo="' + mo + '" aria-pressed="' + (mo === month) + '">' + Number(mo.slice(5)) + '월</button>').join("");
    table.innerHTML = '<tr><th></th>' + SLOT_HOURS.map(h => '<th>' + h + '시</th>').join("") + '</tr>'
      + days.filter(x => x.startsWith(month)).map(x => {
        const [y, mo, dd] = x.split("-").map(Number), w = new Date(Date.UTC(y, mo - 1, dd)).getUTCDay();
        return '<tr><th class="' + (w === 0 || w === 6 ? "we" : "") + '">' + mo + '/' + dd + ' ' + DOW[w] + '</th>'
          + SLOT_HOURS.map(h => { const k = x + "@" + pad(h); return '<td data-k="' + k + '" class="' + (sel.has(k) ? "on" : "") + '"></td>'; }).join("") + '</tr>';
      }).join("");
    count.textContent = "선택 " + sel.size + "칸";
  };
  monthsBox.addEventListener("click", e=>{ const b = e.target.closest("[data-mo]"); if (b){ month = b.dataset.mo; draw(); } });
  let paint = null;
  const apply = td=>{ const k = td.dataset.k; if (paint) sel.add(k); else sel.delete(k); td.classList.toggle("on", paint); count.textContent = "선택 " + sel.size + "칸"; };
  table.addEventListener("pointerdown", e=>{
    const td = e.target.closest("td[data-k]"); if (!td) return;
    e.preventDefault(); paint = !sel.has(td.dataset.k); apply(td);
  });
  table.addEventListener("pointerover", e=>{ if (paint === null) return; const td = e.target.closest("td[data-k]"); if (td) apply(td); });
  const stop = ()=>{ paint = null; };
  window.addEventListener("pointerup", stop);
  d.addEventListener("close", ()=>window.removeEventListener("pointerup", stop), {once:true});
  draw();
}

/* 일정 조율 */
let picked = null;
function renderSchedule(){
  const withTime = members.filter(m => activeAvail(m).length);
  if (!picked) picked = new Set(withTime.map(m => m.slug));
  for (const s of [...picked]) if (!members.some(m => m.slug === s)) picked.delete(s);
  $("s-people").innerHTML = members.length ? members.map(m => {
    const n = activeAvail(m).length;
    return '<span class="bs-chip' + (picked.has(m.slug) ? " on" : "") + (n ? "" : " empty") + '">'
      + '<button type="button" data-pick="' + esc(m.slug) + '">' + esc(m.id) + ' <small>' + n + '칸</small></button>'
      + '<button type="button" data-edit="' + esc(m.slug) + '" title="일정 수정" aria-label="' + esc(m.id) + ' 일정 수정">✎</button></span>';
  }).join("") : '<p class="muted">아직 회원이 없어요.</p>';
  const people = members.filter(m => picked.has(m.slug));
  const count = new Map();
  for (const m of people) for (const k of activeAvail(m)){ if (!count.has(k)) count.set(k, []); count.get(k).push(m.id); }
  const ranked = [...count.entries()].filter(([, who]) => who.length >= 2)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])).slice(0, 30);
  if (people.length < 2){ $("s-result").innerHTML = '<p class="muted">두 명 이상 골라주세요.</p>'; return; }
  const all = ranked.filter(([, who]) => who.length === people.length).length;
  $("s-result").innerHTML = '<p class="bs-small muted">' + people.length + '명 선택 · 모두 되는 시간 <b>' + all + '칸</b></p>'
    + (ranked.length ? '<div class="bs-slots">' + ranked.map(([k, who]) => {
        const missing = people.filter(m => !who.includes(m.id)).map(m => m.id);
        return '<div class="bs-slot' + (missing.length ? "" : " full") + '"><b>' + slotText(k) + '</b><span class="pill ' + (missing.length ? "gold" : "ok") + '">' + who.length + '/' + people.length + '명</span>'
          + '<small>' + esc(who.join(", ")) + (missing.length ? ' <i>· 빠짐: ' + esc(missing.join(", ")) + '</i>' : '') + '</small></div>';
      }).join("") + '</div>' : '<p class="muted">겹치는 시간이 아직 없어요.</p>');
}
$("s-people").addEventListener("click", e=>{
  const p = e.target.closest("[data-pick]"), ed = e.target.closest("[data-edit]");
  if (p){ picked.has(p.dataset.pick) ? picked.delete(p.dataset.pick) : picked.add(p.dataset.pick); renderSchedule(); }
  if (ed){ const m = members.find(x => x.slug === ed.dataset.edit); if (m) openAvailEditor(m); }
});
$("s-all").addEventListener("click", ()=>{ picked = new Set(members.filter(m => activeAvail(m).length).map(m => m.slug)); renderSchedule(); });
$("s-none").addEventListener("click", ()=>{ picked = new Set(); renderSchedule(); });

/* 관리자 계정 (최고 관리자) */
let admins = [];
async function loadAdmins(){ admins = (await api("admins")).admins; renderAdmins(); }
function renderAdmins(){
  $("a-rows").innerHTML = admins.map(a => {
    const self = a.id === me.id;
    const acts = self ? '<span class="muted bs-small">나</span>' : [
      [a.role === "super" ? "서브로 변경" : "최고로 변경", "role"], ["비번 재설정", "resetpw"], ["2단계 초기화", "reset2fa"], ["삭제", "delete"],
    ].map(([t, k]) => '<button class="button small ' + (k === "delete" ? "danger" : "ghost") + '" data-a="' + esc(a.id) + '" data-aa="' + k + '">' + t + '</button>').join("");
    return '<tr><td><b>' + esc(a.id) + '</b>' + (a.locked ? ' <span class="pill bad">잠김</span>' : '') + (a.mustChange ? ' <span class="pill">임시 비번</span>' : '') + '</td>'
      + '<td><span class="pill ' + (a.role === "super" ? "orange" : "gold") + '">' + ROLE_NAME[a.role] + '</span></td>'
      + '<td>' + (a.mfa ? '<span class="pill ok">등록됨</span>' : '<span class="pill">미등록</span>') + '</td>'
      + '<td>' + when(a.lastLogin) + '</td><td>' + esc(a.createdBy || "—") + '</td>'
      + '<td><div class="row-actions">' + acts + '</div></td></tr>';
  }).join("");
}
function genPw(){
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint32Array(14));
  return [...r].map(n => abc[n % abc.length]).join("");
}
document.addEventListener("click", e=>{
  const g = e.target.closest("[data-gen]"); if (!g) return;
  g.parentElement.querySelector("input").value = genPw();
});
bindForm("f-admin-new", async (v, f)=>{
  await api("admin_create", {id:v.id.trim().toLowerCase(), pw:v.pw, role:v.role});
  toast("'" + v.id + "' 관리자를 추가했어요. 임시 비밀번호를 직접 전달하세요."); f.reset(); await loadAdmins();
});
$("a-rows").addEventListener("click", e=>{
  const b = e.target.closest("[data-aa]"); if (!b) return;
  const a = admins.find(x => x.id === b.dataset.a); if (!a) return;
  const name = "'" + esc(a.id) + "'";
  const done = async msg=>{ toast(msg); await loadAdmins(); };
  if (b.dataset.aa === "role"){
    const role = a.role === "super" ? "sub" : "super";
    dialog('<b>' + name + '을(를) ' + ROLE_NAME[role] + '로 바꿀까요?</b><p class="muted bs-small">'
      + (role === "super" ? "최고 관리자는 관리자 계정 관리·회원 삭제까지 모든 권한을 가져요." : "서브 관리자는 회원 일정 조율과 닉네임 정리만 할 수 있어요.") + ' 그 사람은 다시 로그인해야 해요.</p>',
      async ()=>{ await api("admin_role", {target:a.id, role}); await done("권한을 바꿨어요"); });
  }
  if (b.dataset.aa === "resetpw")
    dialog('<b>' + name + ' 비밀번호 재설정</b><p class="muted bs-small">임시 비밀번호로 바뀌고, 다음 로그인 때 직접 바꾸게 돼요.</p>'
      + '<div class="bs-pwgen"><input class="text-input" name="pw" minlength="10" maxlength="100" required autocomplete="off" placeholder="임시 비밀번호 (10자 이상)"><button type="button" class="button small ghost" data-gen>생성</button></div>',
      async v=>{ await api("admin_resetpw", {target:a.id, pw:v.pw}); await done("임시 비밀번호로 바꿨어요. 직접 전달하세요."); });
  if (b.dataset.aa === "reset2fa")
    dialog('<b>' + name + ' 2단계 인증을 초기화할까요?</b><p class="muted bs-small">휴대폰을 바꾸거나 앱을 지웠을 때 써요. 다음 로그인 때 QR을 새로 등록해요.</p>',
      async ()=>{ await api("admin_reset2fa", {target:a.id}); await done("2단계 인증을 초기화했어요"); });
  if (b.dataset.aa === "delete")
    dialog('<b>' + name + ' 관리자를 삭제할까요?</b><p class="muted bs-small">확인하려면 아이디를 그대로 입력하세요.</p><input class="text-input" name="confirm" required autocomplete="off" placeholder="' + esc(a.id) + '">',
      async v=>{ if (v.confirm.trim() !== a.id) throw "아이디가 일치하지 않아요."; await api("admin_delete", {target:a.id}); await done("관리자를 삭제했어요"); });
});

/* 의견함 */
const FB_KIND = {bug:"🐞 오류", idea:"💡 제안", etc:"💬 기타"};
const FB_STATUS = {new:["접수", ""], checking:["확인 중", "gold"], doing:["반영 중", "orange"], done:["완료", "ok"], hold:["보류", "bad"]};
let feedback = [], fKind = "";
async function loadFeedback(){
  feedback = (await api("feedback_list")).items;
  const fresh = feedback.filter(f => f.status === "new").length;
  const btn = $("bs-tabs").querySelector('[data-tab="feedback"]');
  if (btn) btn.innerHTML = "💌 의견함" + (fresh ? ' <span class="bs-badge">' + fresh + '</span>' : "");
  renderFeedback();
}
function renderFeedback(){
  const st = $("f-status").value;
  const list = feedback.filter(f => (!fKind || f.kind === fKind)
    && (st === "open" ? !["done", "hold"].includes(f.status) : !st || f.status === st));
  $("f-list").innerHTML = list.length ? list.map(f => {
    const [label, cls] = FB_STATUS[f.status] || FB_STATUS.new;
    const who = f.authorSlug ? '<b>' + esc(f.authorId) + '</b>' : (f.authorId ? esc(f.authorId) + ' <small>(로그인 안 함)</small>' : '<small>익명</small>');
    const meta = f.meta && f.meta.ua ? '<details class="bs-fb-meta"><summary>환경 정보</summary>화면: ' + esc(f.meta.view || "?") + ' · 크기: ' + esc(f.meta.screen || "?") + '<br>' + esc(f.meta.ua) + '</details>' : "";
    return '<article class="bs-fb' + (f.status === "new" ? " new" : "") + '" data-n="' + f.n + '">'
      + '<div class="bs-fb-head"><span class="pill">' + FB_KIND[f.kind] + '</span><span class="pill ' + cls + '">' + label + '</span><span class="bs-fb-who">' + who + '</span><small>#' + f.n + ' · ' + when(f.createdAt) + '</small></div>'
      + '<h3>' + esc(f.title) + '</h3><p class="bs-fb-body">' + esc(f.body) + '</p>' + meta
      + '<div class="bs-fb-reply"><textarea class="text-input" rows="2" maxlength="2000" placeholder="' + (f.authorSlug ? "답장 (보낸 사람에게 보여요)" : "메모 (로그인 안 한 사람은 답장을 볼 수 없어요)") + '">' + esc(f.reply) + '</textarea>'
      + '<div class="bs-fb-actions"><select class="text-input">' + Object.entries(FB_STATUS).map(([k, [t]]) => '<option value="' + k + '"' + (k === f.status ? " selected" : "") + '>' + t + '</option>').join("") + '</select>'
      + '<button class="button small primary" data-fb="save">저장</button>' + (isSuper() ? '<button class="button small danger" data-fb="delete">삭제</button>' : "") + '</div>'
      + (f.repliedBy ? '<small class="muted">마지막 답장: ' + esc(f.repliedBy) + ' · ' + when(f.updatedAt) + '</small>' : "") + '</div></article>';
  }).join("") : '<p class="muted">' + (feedback.length ? "조건에 맞는 의견이 없어요." : "아직 받은 의견이 없어요.") + '</p>';
}
$("f-kind").addEventListener("click", e=>{
  const b = e.target.closest("[data-k]"); if (!b) return;
  fKind = b.dataset.k;
  for (const x of $("f-kind").querySelectorAll("button")) x.setAttribute("aria-pressed", x === b);
  renderFeedback();
});
$("f-status").addEventListener("change", renderFeedback);
$("f-list").addEventListener("click", async e=>{
  const b = e.target.closest("[data-fb]"); if (!b) return;
  const card = b.closest("[data-n]"), n = Number(card.dataset.n);
  const f = feedback.find(x => x.n === n); if (!f) return;
  if (b.dataset.fb === "delete") return dialog('<b>#' + n + ' 의견을 삭제할까요?</b><p class="muted bs-small">「' + esc(f.title) + '」 — 되돌릴 수 없어요.</p>',
    async ()=>{ await api("feedback_delete", {target:n}); toast("삭제했어요"); await loadFeedback(); }, "삭제");
  b.disabled = true;
  try {
    await api("feedback_update", {target:n, status:card.querySelector("select").value, reply:card.querySelector("textarea").value});
    toast("#" + n + " 저장했어요"); await loadFeedback();
  } catch (err){ toast(errText(err)); }
  finally { b.disabled = false; }
});

/* 활동 기록 */
async function loadLogs(){
  const {logs} = await api("logs");
  $("l-rows").innerHTML = logs.length ? logs.map(l => '<tr><td>' + when(l.at) + '</td><td><b>' + esc(l.actor) + '</b></td><td>'
    + esc(ACTION_NAME[l.action] || l.action) + '</td><td>' + esc(l.target) + '</td><td>' + esc(l.detail) + '</td></tr>').join("")
    : '<tr><td colspan="5" class="muted">기록이 없어요.</td></tr>';
}

boot();
