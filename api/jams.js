// 합주 모임: 멤버·노래·장소를 정하고, 멤버들의 합주 가능 시간으로 날짜를 제안받아 확정(픽스)한다.
// 목록(GET)은 누구나, 만들기는 로그인한 멤버, 날짜 픽스·수정·취소·삭제는 만든 사람만, 참석 응답은 멤버.
// 멤버는 만든 뒤에 모은다: 초대 링크로 스스로 참여(join)하거나, 만든 사람이 직접 초대(invite)하면 마이 페이지에서 수락(accept)한다.
// 인원(cap)은 만든 사람 포함 2~12명.
import crypto from "node:crypto";
import { json, readBody, memberSlug, SLOT_HOURS, GLOBAL_END } from "../lib/util.js";
import { getMember, listMembers, listJams, getJam, putJam, deleteJam } from "../lib/db.js";

const STATUS = ["planning", "fixed", "done", "canceled"];
const RSVP = ["yes", "no", "maybe"];
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// 시작은 10~23시 어느 시(時)든 되고, 끝나는 시간이 24시를 넘지 않아야 한다. 다른 모임과 겹치는 건 막지 않는다(화면에서 알림만).
function validSlot(slot, duration){
  const m = /^(\d{4}-\d{2}-\d{2})@(\d{2})$/.exec(String(slot || ""));
  if (!m) return false;
  const h = Number(m[2]), first = SLOT_HOURS[0], last = SLOT_HOURS[SLOT_HOURS.length - 1] + 2;
  if (h < first || h + duration > last) return false;
  return m[1] >= todayKst() && m[1] <= GLOBAL_END;
}
function cleanDuration(v, fallback){
  const d = Number(v ?? fallback);
  return Number.isFinite(d) ? Math.min(5, Math.max(1, Math.round(d))) : (fallback || 2);
}
const capOf = j => j.cap || 12;
async function cleanJam(input, base){
  const title = clip(input.title ?? base.title, 40);
  if (title.length < 2) throw { code: 400, error: "bad_title" };
  // 멤버는 여기서 바꾸지 않는다 (참여·수락·내보내기로만)
  const members = [...new Set([base.createdBy, ...base.members])];
  const cRaw = Math.round(Number(input.cap ?? capOf(base)));
  const cap = Number.isFinite(cRaw) ? Math.min(12, Math.max(2, cRaw)) : 12;
  if (cap < members.length) throw { code: 400, error: "cap_low" };
  const songs = (Array.isArray(input.songs) ? input.songs : base.songs).map(s => clip(s, 60)).filter(Boolean).slice(0, 10);
  const duration = cleanDuration(input.duration, base.duration);
  // 희망 시간대: "몇 시부터 몇 시까지"의 시작 시(時). 0이면 정하지 않음.
  const sRaw = Number(input.startHour ?? base.startHour);
  const startHour = Number.isInteger(sRaw) && sRaw >= SLOT_HOURS[0] && sRaw + duration <= SLOT_HOURS[SLOT_HOURS.length - 1] + 2 ? sRaw : 0;
  // 날짜 후보: 만들 때 미리 골라두는 날짜 (오늘 이후, 최대 14개). 비어 있으면 멤버 시간으로 아무 날이나 추천한다.
  const today = todayKst();
  const days = [...new Set((Array.isArray(input.days) ? input.days : base.days || []).map(String)
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= today && d <= GLOBAL_END))].sort().slice(0, 14);
  return { ...base, title, members, cap, songs, duration, startHour, days,
    note: clip(input.note ?? base.note, 300), place: clip(input.place ?? base.place, 40) };
}

export default async function handler(req, res){
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method === "GET") return json(res, 200, { jams: await listJams() });
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);
    const me = await getMember(memberSlug(String(b.id || "").normalize("NFC")));
    if (!me || me.pw !== b.token) return json(res, 401, { error: "auth" });
    const now = new Date().toISOString();

    if (b.action === "create"){
      const base = { slug: "j_" + crypto.randomBytes(5).toString("hex"), createdBy: me.slug, members: [], songs: [],
        note: "", place: "", duration: 2, startHour: 0, days: [], cap: 12, invites: {}, status: "planning", fixedSlot: "", rsvp: {}, createdAt: now, updatedAt: now };
      const jam = await cleanJam(b.jam || {}, base);
      // '이 밴드로 모임 만들기'처럼 미리 정한 사람은 초대장으로 보낸다
      const known = new Set((await listMembers()).map(m => m.slug));
      for (const s of (Array.isArray(b.jam && b.jam.invites) ? b.jam.invites : []).map(String).slice(0, 11))
        if (known.has(s) && s !== me.slug) jam.invites[s] = { by: me.slug, at: now };
      await putJam(jam);
      return json(res, 200, { ok: true, jam });
    }

    const jam = await getJam(String(b.target || ""));
    if (!jam) return json(res, 404, { error: "no_target" });
    const isOwner = jam.createdBy === me.slug;
    const invites = { ...(jam.invites || {}) };
    // 초대 링크로 참여, 또는 받은 초대 수락
    if (b.action === "join" || b.action === "accept"){
      if (jam.members.includes(me.slug)) return json(res, 200, { ok: true, jam });
      if (b.action === "accept" && !invites[me.slug]) return json(res, 400, { error: "no_invite" });
      if (jam.status === "done" || jam.status === "canceled") return json(res, 400, { error: "closed" });
      if (jam.members.length >= capOf(jam)) return json(res, 400, { error: "jam_full" });
      delete invites[me.slug];
      const next = { ...jam, members: [...jam.members, me.slug], invites, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "decline"){
      delete invites[me.slug];
      const next = { ...jam, invites, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "leave"){
      if (isOwner) return json(res, 400, { error: "owner_leave" });
      const rsvp = { ...jam.rsvp }; delete rsvp[me.slug];
      const next = { ...jam, members: jam.members.filter(s => s !== me.slug), rsvp, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (!isOwner && !jam.members.includes(me.slug)) return json(res, 403, { error: "not_member" });
    if (b.action !== "rsvp" && !isOwner) return json(res, 403, { error: "not_owner" });

    if (b.action === "invite"){
      const known = new Set((await listMembers()).map(m => m.slug));
      const targets = (Array.isArray(b.targets) ? b.targets : [b.targets]).map(String)
        .filter(s => known.has(s) && !jam.members.includes(s) && !invites[s]);
      if (Object.keys(invites).length + targets.length > 30) return json(res, 400, { error: "too_many_invites" });
      for (const s of targets) invites[s] = { by: me.slug, at: now };
      const next = { ...jam, invites, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "uninvite"){
      delete invites[String(b.who || "")];
      const next = { ...jam, invites, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "kick"){
      const who = String(b.who || "");
      if (who === jam.createdBy) return json(res, 400, { error: "owner_leave" });
      const rsvp = { ...jam.rsvp }; delete rsvp[who];
      const next = { ...jam, members: jam.members.filter(s => s !== who), rsvp, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "update"){
      const next = await cleanJam(b.jam || {}, jam);
      // 멤버가 빠지면 그 사람의 참석 응답도 지운다
      for (const k of Object.keys(next.rsvp)) if (!next.members.includes(k)) delete next.rsvp[k];
      if (next.status === "fixed" && !validSlot(next.fixedSlot, next.duration)){ next.status = "planning"; next.fixedSlot = ""; }
      await putJam({ ...next, updatedAt: now });
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "fix"){
      // 직접 정하기에서 끝나는 시간을 바꾸면 길이도 함께 바뀐다
      const duration = b.duration === undefined ? jam.duration : cleanDuration(b.duration, jam.duration);
      if (!validSlot(b.slot, duration)) return json(res, 400, { error: "bad_slot" });
      const next = { ...jam, status: "fixed", fixedSlot: String(b.slot), duration, startHour: Number(String(b.slot).split("@")[1]),
        rsvp: { [me.slug]: "yes" }, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "unfix"){
      const next = { ...jam, status: "planning", fixedSlot: "", rsvp: {}, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "rsvp"){
      if (jam.status !== "fixed") return json(res, 400, { error: "not_fixed" });
      if (!RSVP.includes(b.answer)) return json(res, 400, { error: "bad_answer" });
      const next = { ...jam, rsvp: { ...jam.rsvp, [me.slug]: b.answer }, updatedAt: now };
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "status"){
      if (!STATUS.includes(b.status) || b.status === "fixed") return json(res, 400, { error: "bad_status" });
      const next = { ...jam, status: b.status, updatedAt: now };
      if (b.status === "planning"){ next.fixedSlot = ""; next.rsvp = {}; }
      await putJam(next);
      return json(res, 200, { ok: true, jam: next });
    }
    if (b.action === "delete"){
      await deleteJam(jam.slug);
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    if (e && e.code) return json(res, e.code, { error: e.error });
    console.error(e);
    return json(res, 500, { error: "server" });
  }
}
