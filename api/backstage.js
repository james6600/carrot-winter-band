// 관리자(backstage) API: 아이디·비밀번호 → Authenticator 6자리 코드 → 8시간 세션(HttpOnly 쿠키).
// 최고 관리자(super)는 모든 권한, 서브 관리자(sub)는 일반 회원 일정 조율과 닉네임 정리만.
import QRCode from "qrcode";
import { json, readBody, norm, sha, memberSlug, computeStyle, strip, cleanAvail, availWindow } from "../lib/util.js";
import {
  getMember, putMember, deleteMember, listMembers,
  listAdmins, getAdmin, putAdmin, createFirstAdmin, deleteAdmin,
  putSession, getSession, deleteSession, deleteSessionsOf, addLog, listLogs,
  listFeedback, getFeedback, updateFeedback, deleteFeedback,
} from "../lib/db.js";
import {
  hashPw, checkPw, verifyTotp, newSecret, newToken, tokenHash, otpauthUri, parseCookies, sessionCookie,
} from "../lib/admin-auth.js";

const FULL_TTL = 8 * 3600e3;      // 로그인 유지 8시간
const STEP_TTL = 5 * 60e3;        // 비밀번호 확인 후 코드 입력까지 5분
const MAX_FAILS = 5, LOCK_MS = 10 * 60e3;
const SUPER_ONLY = new Set(["admins", "admin_create", "admin_role", "admin_resetpw", "admin_reset2fa", "admin_delete",
  "member_resetpw", "member_delete", "logs", "feedback_delete"]);
const FEEDBACK_STATUS = ["new", "checking", "doing", "done", "hold"];
const DUMMY = hashPw("timing-equalizer");

const adminSlug = id => "ad_" + id;
const validAdminId = id => /^[a-z0-9_]{3,20}$/.test(id);
const validAdminPw = pw => typeof pw === "string" && pw.length >= 10 && pw.length <= 100;
const publicAdmin = a => ({ id: a.id, role: a.role, mfa: !!a.totpSecret, mustChange: a.mustChange,
  createdAt: a.createdAt, createdBy: a.createdBy, lastLogin: a.lastLogin, locked: a.lockedUntil > Date.now() });

function headers(res){
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-robots-tag", "noindex, nofollow, noarchive");
}
async function startSession(req, res, admin, stage){
  const token = newToken();
  const ttl = stage === "full" ? FULL_TTL : STEP_TTL;
  await putSession({ hash: tokenHash(token), adminSlug: admin.slug, stage, expires: Date.now() + ttl });
  res.setHeader("set-cookie", sessionCookie(token, Math.floor(ttl / 1000), req.headers["x-forwarded-proto"] === "https"));
}
function clearCookie(req, res){
  res.setHeader("set-cookie", sessionCookie("", 0, req.headers["x-forwarded-proto"] === "https"));
}
async function currentSession(req){
  const token = parseCookies(req).bs_session;
  if (!token) return null;
  const s = await getSession(tokenHash(token));
  if (!s) return null;
  const admin = await getAdmin(s.adminSlug);
  return admin ? { ...s, admin } : null;
}
async function fail(admin){
  const fails = admin.fails + 1;
  await putAdmin(fails >= MAX_FAILS ? { ...admin, fails: 0, lockedUntil: Date.now() + LOCK_MS } : { ...admin, fails });
  if (fails >= MAX_FAILS) await addLog({ actor: admin.id, action: "locked", detail: "연속 " + MAX_FAILS + "회 실패" });
}
async function enrollInfo(admin){
  let a = admin;
  if (!a.totpPending){ a = { ...a, totpPending: newSecret() }; await putAdmin(a); }
  const uri = otpauthUri(a.id, a.totpPending);
  const qr = await QRCode.toString(uri, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  return { qr, secret: a.totpPending.replace(/(.{4})/g, "$1 ").trim(), uri };
}
async function statusOf(sess){
  if (!sess){
    const admins = await listAdmins();
    return { stage: null, setup: admins.length === 0 };
  }
  const a = sess.admin;
  return { stage: sess.stage, me: { id: a.id, role: a.role, mustChange: a.mustChange } };
}

export default async function handler(req, res){
  headers(res);
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    // 다른 사이트에서 보낸 요청 차단 (쿠키는 SameSite=Strict, 여기서 한 번 더 확인)
    const origin = req.headers.origin;
    if (origin){
      try { if (new URL(origin).host !== req.headers.host) return json(res, 403, { error: "origin" }); }
      catch { return json(res, 403, { error: "origin" }); }
    }
    if (!String(req.headers["content-type"] || "").includes("application/json")) return json(res, 415, { error: "type" });
    const b = await readBody(req);
    const action = String(b.action || "");
    const sess = await currentSession(req);

    /* ----- 로그인 전 ----- */
    if (action === "status") return json(res, 200, await statusOf(sess));

    if (action === "logout"){
      const token = parseCookies(req).bs_session;
      if (token) await deleteSession(tokenHash(token));
      clearCookie(req, res);
      return json(res, 200, { ok: true });
    }

    if (action === "setup"){
      // 첫 최고 관리자 만들기: 관리자가 한 명도 없을 때, 예전 'admin' 회원 비밀번호(또는 ADMIN_SETUP_KEY)로 본인 확인.
      if ((await listAdmins()).length) return json(res, 409, { error: "already" });
      const proof = String(b.proof || "");
      let ok = false;
      if (process.env.ADMIN_SETUP_KEY) ok = proof.length > 0 && proof === process.env.ADMIN_SETUP_KEY;
      else {
        const legacy = await getMember(memberSlug("admin"));
        ok = !!legacy && legacy.pw === sha("admin|" + proof);
      }
      if (!ok){ await new Promise(r => setTimeout(r, 800)); return json(res, 401, { error: "proof" }); }
      const id = String(b.id || "").trim().toLowerCase();
      if (!validAdminId(id)) return json(res, 400, { error: "bad_id" });
      if (!validAdminPw(b.pw)) return json(res, 400, { error: "bad_pw" });
      const admin = { slug: adminSlug(id), id, pw: hashPw(b.pw), createdAt: new Date().toISOString() };
      if (!(await createFirstAdmin(admin))) return json(res, 409, { error: "already" });
      await addLog({ actor: id, action: "setup", detail: "최고 관리자 생성" });
      await startSession(req, res, await getAdmin(admin.slug), "enroll");
      return json(res, 200, { stage: "enroll" });
    }

    if (action === "login"){
      const id = String(b.id || "").trim().toLowerCase();
      const admin = validAdminId(id) ? await getAdmin(adminSlug(id)) : null;
      if (!admin){ checkPw(String(b.pw || ""), DUMMY); return json(res, 401, { error: "auth" }); }
      if (admin.lockedUntil > Date.now()) return json(res, 423, { error: "locked", until: admin.lockedUntil });
      if (!checkPw(String(b.pw || ""), admin.pw)){ await fail(admin); return json(res, 401, { error: "auth" }); }
      const stage = admin.totpSecret ? "mfa" : "enroll";
      await startSession(req, res, admin, stage);
      return json(res, 200, { stage });
    }

    if (!sess){ clearCookie(req, res); return json(res, 401, { error: "session" }); }
    const me = sess.admin;
    const token = parseCookies(req).bs_session;

    if (action === "enroll_info"){
      if (sess.stage !== "enroll") return json(res, 403, { error: "stage" });
      return json(res, 200, await enrollInfo(me));
    }

    if (action === "enroll" || action === "mfa"){
      if (sess.stage !== action) return json(res, 403, { error: "stage" });
      if (me.lockedUntil > Date.now()) return json(res, 423, { error: "locked", until: me.lockedUntil });
      const secret = action === "enroll" ? me.totpPending : me.totpSecret;
      const step = verifyTotp(secret, b.code, me.totpLast);
      if (!step){ await fail(me); return json(res, 401, { error: "code" }); }
      const now = new Date().toISOString();
      const next = { ...me, totpLast: step, fails: 0, lastLogin: now };
      if (action === "enroll"){ next.totpSecret = me.totpPending; next.totpPending = ""; }
      await putAdmin(next);
      await deleteSession(tokenHash(token));
      await startSession(req, res, next, "full");
      await addLog({ actor: me.id, action: action === "enroll" ? "mfa_enrolled" : "login" });
      return json(res, 200, { stage: "full", me: { id: me.id, role: me.role, mustChange: me.mustChange } });
    }

    /* ----- 로그인 후 ----- */
    if (sess.stage !== "full") return json(res, 403, { error: "stage" });

    if (action === "changepw"){
      if (!checkPw(String(b.current || ""), me.pw)) return json(res, 401, { error: "auth" });
      if (!validAdminPw(b.next) || b.next === b.current) return json(res, 400, { error: "bad_pw" });
      await putAdmin({ ...me, pw: hashPw(b.next), mustChange: false });
      await deleteSessionsOf(me.slug, tokenHash(token));
      await addLog({ actor: me.id, action: "changepw" });
      return json(res, 200, { ok: true });
    }
    if (me.mustChange) return json(res, 403, { error: "must_change" });
    if (SUPER_ONLY.has(action) && me.role !== "super") return json(res, 403, { error: "role" });

    const log = (act, target, detail) => addLog({ actor: me.id, action: act, target, detail });

    if (action === "members"){
      const members = (await listMembers()).map(strip);
      return json(res, 200, { members, window: availWindow() });
    }

    if (action.startsWith("member_")){
      const target = await getMember(String(b.target || ""));
      if (!target) return json(res, 404, { error: "no_target" });
      const now = new Date().toISOString();
      const value = String(b.value || "").trim();

      if (action === "member_avail"){
        const avail = cleanAvail(b.avail);
        await putMember({ ...target, avail, updatedAt: now });
        await log("member_avail", target.id, avail.length + "칸");
        return json(res, 200, { ok: true, avail });
      }
      if (action === "member_delete"){
        await deleteMember(target.slug);
        await log("member_delete", target.id);
        return json(res, 200, { ok: true });
      }
      if (action === "member_resetpw"){
        if (value.length < 4) return json(res, 400, { error: "bad_pw" });
        await putMember({ ...target, pw: sha(target.id.toLowerCase() + "|" + value), updatedAt: now });
        await log("member_resetpw", target.id);
        return json(res, 200, { ok: true });
      }
      if (action === "member_rename"){
        const newId = value.normalize("NFC");
        if (newId.length < 2 || newId.length > 20) return json(res, 400, { error: "bad_id" });
        const newSlug = memberSlug(newId);
        if (newSlug === target.slug){
          await putMember({ ...target, id: newId, updatedAt: now });
        } else {
          const existing = await getMember(newSlug);
          if (existing){
            // 합치기: 기존 계정 유지(비밀번호 포함), 데이터 합집합
            const parts = [...new Set([...(existing.parts||[]), ...(target.parts||[])])];
            const genres = [...new Set([...(existing.genres||[]), ...(target.genres||[])])];
            const names = new Set((existing.artists||[]).map(a => norm(a.name)));
            const artists = [...(existing.artists||[]),
              ...((target.artists||[]).filter(a => !names.has(norm(a.name))))];
            const avail = [...new Set([...(existing.avail||[]), ...(target.avail||[])])].sort();
            const levels = { ...(target.levels||{}) };
            for (const [k, v] of Object.entries(existing.levels||{})) levels[k] = Math.max(v, levels[k]||0);
            await putMember({ ...existing, parts, genres, artists, avail, levels,
              partEtc: existing.partEtc || target.partEtc || "",
              done: !!(existing.done || target.done),
              style: computeStyle(genres, artists), updatedAt: now });
          } else {
            await putMember({ ...target, slug: newSlug, id: newId, updatedAt: now });
          }
          await deleteMember(target.slug);
          await log(existing ? "member_merge" : "member_rename", target.id, "→ " + newId);
          return json(res, 200, { ok: true, merged: !!existing });
        }
        await log("member_rename", target.id, "→ " + newId);
        return json(res, 200, { ok: true });
      }
      return json(res, 400, { error: "bad_action" });
    }

    if (action === "feedback_list"){
      const items = (await listFeedback()).map(({ ipHash, ...f }) => f);
      return json(res, 200, { items });
    }
    if (action === "feedback_update" || action === "feedback_delete"){
      const f = await getFeedback(Number(b.target));
      if (!f) return json(res, 404, { error: "no_target" });
      if (action === "feedback_delete"){
        await deleteFeedback(f.n);
        await log("feedback_delete", "#" + f.n, f.title);
        return json(res, 200, { ok: true });
      }
      const status = FEEDBACK_STATUS.includes(b.status) ? b.status : f.status;
      const reply = String(b.reply ?? f.reply).trim().slice(0, 2000);
      await updateFeedback(f.n, { status, reply, repliedBy: reply !== f.reply ? me.id : f.repliedBy });
      await log("feedback_update", "#" + f.n, status + (reply !== f.reply ? " · 답변" : ""));
      return json(res, 200, { ok: true });
    }

    if (action === "admins") return json(res, 200, { admins: (await listAdmins()).map(publicAdmin) });
    if (action === "logs") return json(res, 200, { logs: await listLogs(200) });

    if (action === "admin_create"){
      const id = String(b.id || "").trim().toLowerCase();
      const role = b.role === "super" ? "super" : "sub";
      if (!validAdminId(id)) return json(res, 400, { error: "bad_id" });
      if (!validAdminPw(b.pw)) return json(res, 400, { error: "bad_pw" });
      if (await getAdmin(adminSlug(id))) return json(res, 409, { error: "exists" });
      await putAdmin({ slug: adminSlug(id), id, pw: hashPw(b.pw), role, mustChange: true,
        createdAt: new Date().toISOString(), createdBy: me.id });
      await log("admin_create", id, role);
      return json(res, 200, { ok: true });
    }

    if (action.startsWith("admin_")){
      const target = await getAdmin(adminSlug(String(b.target || "")));
      if (!target) return json(res, 404, { error: "no_target" });
      if (target.slug === me.slug) return json(res, 400, { error: "self" });

      if (action === "admin_role"){
        const role = b.role === "super" ? "super" : "sub";
        await putAdmin({ ...target, role });
        await deleteSessionsOf(target.slug);
        await log("admin_role", target.id, role);
        return json(res, 200, { ok: true });
      }
      if (action === "admin_resetpw"){
        if (!validAdminPw(b.pw)) return json(res, 400, { error: "bad_pw" });
        await putAdmin({ ...target, pw: hashPw(b.pw), mustChange: true, fails: 0, lockedUntil: 0 });
        await deleteSessionsOf(target.slug);
        await log("admin_resetpw", target.id);
        return json(res, 200, { ok: true });
      }
      if (action === "admin_reset2fa"){
        await putAdmin({ ...target, totpSecret: "", totpPending: "", totpLast: 0, fails: 0, lockedUntil: 0 });
        await deleteSessionsOf(target.slug);
        await log("admin_reset2fa", target.id);
        return json(res, 200, { ok: true });
      }
      if (action === "admin_delete"){
        await deleteAdmin(target.slug);
        await log("admin_delete", target.id);
        return json(res, 200, { ok: true });
      }
    }

    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "server" });
  }
}
