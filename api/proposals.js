// 합주 제안: "이런 합주 하고 싶어요" 글을 올리면 사람들이 관심·신청하고, 제안자가 모임으로 만들거나 닫는다.
// 공연에 연결된 제안(showSlug)은 '팀 모집'이고, 확정하면 공연팀이 된다.
// 파트가 다 차면 새 신청은 대기(후보)로 들어가고, 누가 나가면 그 파트 대기 1번이 자동으로 들어온다.
// 목록(GET)은 누구나. 글쓰기·관심·신청은 로그인한 멤버, 수정·사람 받기·내보내기·전환·닫기·삭제는 제안자만.
import crypto from "node:crypto";
import { json, readBody, memberSlug, PART_KEYS } from "../lib/util.js";
import { getMember, listMembers, listProposals, getProposal, putProposal, deleteProposal, putJam, getShow, putShow } from "../lib/db.js";
import { recruitOpen } from "../lib/shows.js";

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
function cleanProposal(input, base){
  const title = clip(input.title ?? base.title, 40);
  if (title.length < 2) throw { code: 400, error: "bad_title" };
  const body = clip(input.body ?? base.body, 1000);
  const songs = (Array.isArray(input.songs) ? input.songs : base.songs).map(s => clip(s, 80)).filter(Boolean).slice(0, 10);
  const want = {};
  const src = input.want && typeof input.want === "object" ? input.want : base.want;
  for (const k of PART_KEYS){ const n = Math.round(Number(src[k]) || 0); if (n > 0) want[k] = Math.min(5, n); }
  // 제안자 본인이 맡을 파트 (모집 인원과 별도)
  const ownerPart = PART_KEYS.includes(input.ownerPart) ? input.ownerPart : (base.ownerPart || "");
  // 모집 인원은 제안자를 포함한 전체 인원이다. 파트를 정한 제안이면 제안자 파트는 최소 1명.
  if (ownerPart && Object.keys(want).length && !want[ownerPart]) want[ownerPart] = 1;
  return { ...base, title, body, songs, want, ownerPart, whenText: clip(input.whenText ?? base.whenText, 60) };
}
// 파트 정원: 모집 파트를 정하지 않았으면 무제한, 정했으면 그 파트 인원(정하지 않은 파트는 0 → 대기)
// 다른 사람이 들어올 수 있는 자리: 그 파트 모집 인원에서 제안자 자리(제안자 파트면 1)를 뺀 수
const capOf = (p, part) => Object.keys(p.want || {}).length ? Math.max(0, (p.want[part] || 0) - (p.ownerPart === part ? 1 : 0)) : Infinity;
const stateOf = a => a.state === "wait" ? "wait" : "in";
// 파트마다 먼저 신청한 순서대로 정원까지 'in', 나머지는 'wait'. 누가 나가거나 정원이 늘면 대기 1번이 들어온다.
function rebalance(p){
  const applicants = {};
  const byPart = {};
  for (const [s, a] of Object.entries(p.applicants || {})) (byPart[a.part] ||= []).push([s, a]);
  for (const [part, list] of Object.entries(byPart)){
    // 이미 들어와 있던 사람이 먼저, 그다음 신청 순서
    list.sort((x, y) => (stateOf(x[1]) === stateOf(y[1]) ? 0 : stateOf(x[1]) === "in" ? -1 : 1) || x[1].at.localeCompare(y[1].at));
    const cap = capOf(p, part);
    list.forEach(([s, a], i) => { applicants[s] = { ...a, state: i < cap ? "in" : "wait" }; });
  }
  return { ...p, applicants };
}
const inMembers = p => Object.entries(p.applicants || {}).filter(([, a]) => stateOf(a) === "in");
export const proposalFull = p => Object.keys(p.want || {}).length > 0
  && Object.entries(p.want).every(([part, n]) => inMembers(p).filter(([, a]) => a.part === part).length + (p.ownerPart === part ? 1 : 0) >= n);

export default async function handler(req, res){
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method === "GET") return json(res, 200, { proposals: await listProposals() });
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);
    const me = await getMember(memberSlug(String(b.id || "").normalize("NFC")));
    if (!me || me.pw !== b.token) return json(res, 401, { error: "auth" });
    const now = new Date().toISOString();
    // 공연 팀 모집에 손대면 그 공연에 '참여'한 것으로 본다
    const joinShow = async show => { if (show && !show.participants.includes(me.slug)) await putShow({ ...show, participants: [...show.participants, me.slug], updatedAt: now }); };

    if (b.action === "create"){
      const base = { slug: "p_" + crypto.randomBytes(5).toString("hex"), body: "", songs: [], want: {}, whenText: "",
        createdBy: me.slug, status: "open", jamSlug: "", interest: [], applicants: {}, accepting: true, showSlug: "", team: {},
        ownerPart: (me.parts || [])[0] || "", createdAt: now, updatedAt: now };
      const input = b.proposal || {};
      let show = null;
      if (input.showSlug){
        show = await getShow(String(input.showSlug));
        if (!show) return json(res, 404, { error: "no_show" });
        if (!recruitOpen(show)) return json(res, 400, { error: "recruit_closed" });
        base.showSlug = show.slug;
      }
      const p = cleanProposal(input, base);
      await putProposal(p);
      await joinShow(show);
      return json(res, 200, { ok: true, proposal: p });
    }

    let p = await getProposal(String(b.target || ""));
    if (!p) return json(res, 404, { error: "no_target" });
    const owner = p.createdBy === me.slug;
    const OWNER_ONLY = new Set(["update", "accepting", "add", "remove", "convert", "team", "close", "reopen", "delete"]);
    if (OWNER_ONLY.has(b.action) && !owner) return json(res, 403, { error: "not_owner" });
    const show = p.showSlug ? await getShow(p.showSlug) : null;
    const save = async next => { next = { ...next, updatedAt: now }; await putProposal(next); return json(res, 200, { ok: true, proposal: next }); };

    if (b.action === "update") return save(rebalance(cleanProposal(b.proposal || {}, p)));
    if (b.action === "accepting") return save({ ...p, accepting: !!b.value });
    if (b.action === "interest"){
      if (owner) return json(res, 400, { error: "self" });
      const has = p.interest.includes(me.slug);
      return save({ ...p, interest: has ? p.interest.filter(s => s !== me.slug) : [...p.interest, me.slug] });
    }
    if (b.action === "apply"){
      if (owner) return json(res, 400, { error: "self" });
      if (p.status !== "open") return json(res, 400, { error: "closed" });
      if (!p.accepting) return json(res, 400, { error: "not_accepting" });
      if (show && !recruitOpen(show)) return json(res, 400, { error: "recruit_closed" });
      const part = PART_KEYS.includes(b.part) ? b.part : "";
      if (!part) return json(res, 400, { error: "bad_part" });
      const prev = p.applicants[me.slug];
      // 파트를 바꾸면 그 파트 줄 맨 뒤로 선다
      const entry = prev && prev.part === part ? prev : { part, at: now, state: "wait" };
      const next = rebalance({ ...p, applicants: { ...p.applicants, [me.slug]: entry } });
      await joinShow(show);
      return save(next);
    }
    // 미리 같이 하기로 한 사람: 제안자가 닉네임으로 찾아 바로 넣는다 (사람 받기·모집 기간과 상관없이, 자리가 있을 때)
    if (b.action === "add"){
      if (p.status !== "open") return json(res, 400, { error: "closed" });
      const who = await getMember(String(b.member || ""));
      if (!who) return json(res, 404, { error: "no_member" });
      if (who.slug === p.createdBy) return json(res, 400, { error: "self" });
      if (p.applicants[who.slug] && stateOf(p.applicants[who.slug]) === "in") return json(res, 400, { error: "already" });
      const part = PART_KEYS.includes(b.part) ? b.part : "";
      if (!part) return json(res, 400, { error: "bad_part" });
      const taken = inMembers(p).filter(([s, a]) => a.part === part && s !== who.slug).length;
      if (taken >= capOf(p, part)) return json(res, 400, { error: "part_full" });
      // 대기 중이던 사람이면 대기에서 꺼내 바로 넣는다
      const next = rebalance({ ...p, applicants: { ...p.applicants, [who.slug]: { part, at: now, state: "in", invited: true } } });
      if (show) await putShow({ ...show, participants: [...new Set([...show.participants, who.slug])], updatedAt: now });
      return save(next);
    }
    if (b.action === "unapply" || b.action === "remove"){
      const who = b.action === "remove" ? String(b.member || "") : me.slug;
      if (!p.applicants[who]) return json(res, 404, { error: "no_applicant" });
      const applicants = { ...p.applicants }; delete applicants[who];
      return save(rebalance({ ...p, applicants }));
    }
    if (b.action === "convert"){
      if (p.showSlug) return json(res, 400, { error: "is_team" });
      if (p.status !== "open") return json(res, 400, { error: "closed" });
      const known = new Set((await listMembers()).map(m => m.slug));
      const picked = (Array.isArray(b.members) ? b.members : inMembers(p).map(([s]) => s)).map(String)
        .filter(s => s in p.applicants && known.has(s));
      const members = [...new Set([me.slug, ...picked])].slice(0, 12);
      const jam = { slug: "j_" + crypto.randomBytes(5).toString("hex"), title: p.title, createdBy: me.slug, members, songs: p.songs,
        note: p.whenText ? "희망 시기: " + p.whenText : "", place: "", duration: 2, startHour: 0, status: "planning", fixedSlot: "", rsvp: {},
        createdAt: now, updatedAt: now };
      await putJam(jam);
      const next = { ...p, status: "converted", jamSlug: jam.slug, updatedAt: now };
      await putProposal(next);
      return json(res, 200, { ok: true, proposal: next, jam });
    }
    // 공연 팀 확정: 들어와 있는 멤버로 팀을 만들어 공연에 올린다
    if (b.action === "team"){
      if (!show) return json(res, 400, { error: "not_team" });
      if (p.status !== "open") return json(res, 400, { error: "closed" });
      if (show.status === "confirmed" || show.status === "done") return json(res, 400, { error: "show_locked" });
      const ownerPart = PART_KEYS.includes(b.ownerPart) ? b.ownerPart : (p.ownerPart || (me.parts || [])[0] || "etc");
      const members = [{ slug: me.slug, part: ownerPart }, ...inMembers(p).map(([s, a]) => ({ slug: s, part: a.part }))];
      const next = { ...p, status: "team", team: { members, at: now } };
      await putProposal({ ...next, updatedAt: now });
      if (!show.teamOrder.includes(p.slug)) await putShow({ ...show, teamOrder: [...show.teamOrder, p.slug], updatedAt: now });
      return json(res, 200, { ok: true, proposal: { ...next, updatedAt: now } });
    }
    if (b.action === "close"){ if (p.status !== "open") return json(res, 400, { error: "converted" }); return save({ ...p, status: "closed" }); }
    if (b.action === "reopen"){
      if (p.status === "converted") return json(res, 400, { error: "converted" });
      if (p.status === "team"){
        if (!show || show.status === "confirmed" || show.status === "done") return json(res, 400, { error: "show_locked" });
        await putShow({ ...show, teamOrder: show.teamOrder.filter(s => s !== p.slug), updatedAt: now });
      }
      return save({ ...p, status: "open", team: {} });
    }
    if (b.action === "delete"){
      if (show && show.teamOrder.includes(p.slug)){
        if (show.status === "confirmed" || show.status === "done") return json(res, 400, { error: "show_locked" });
        await putShow({ ...show, teamOrder: show.teamOrder.filter(s => s !== p.slug), updatedAt: now });
      }
      await deleteProposal(p.slug); return json(res, 200, { ok: true });
    }
    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    if (e && e.code) return json(res, e.code, { error: e.error });
    console.error(e);
    return json(res, 500, { error: "server" });
  }
}
