// 합주 제안: "이런 합주 하고 싶어요" 글을 올리면 사람들이 관심·신청하고, 제안자가 모임으로 만들거나 닫는다.
// 목록(GET)은 누구나. 글쓰기·관심·신청은 로그인한 멤버, 수정·전환·닫기·삭제는 제안자만.
import crypto from "node:crypto";
import { json, readBody, memberSlug, PART_KEYS } from "../lib/util.js";
import { getMember, listMembers, listProposals, getProposal, putProposal, deleteProposal, putJam } from "../lib/db.js";

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
function cleanProposal(input, base){
  const title = clip(input.title ?? base.title, 40);
  if (title.length < 2) throw { code: 400, error: "bad_title" };
  const body = clip(input.body ?? base.body, 1000);
  const songs = (Array.isArray(input.songs) ? input.songs : base.songs).map(s => clip(s, 60)).filter(Boolean).slice(0, 10);
  const want = {};
  const src = input.want && typeof input.want === "object" ? input.want : base.want;
  for (const k of PART_KEYS){ const n = Math.round(Number(src[k]) || 0); if (n > 0) want[k] = Math.min(5, n); }
  return { ...base, title, body, songs, want, whenText: clip(input.whenText ?? base.whenText, 60) };
}

export default async function handler(req, res){
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method === "GET") return json(res, 200, { proposals: await listProposals() });
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);
    const me = await getMember(memberSlug(String(b.id || "").normalize("NFC")));
    if (!me || me.pw !== b.token) return json(res, 401, { error: "auth" });
    const now = new Date().toISOString();

    if (b.action === "create"){
      const base = { slug: "p_" + crypto.randomBytes(5).toString("hex"), body: "", songs: [], want: {}, whenText: "",
        createdBy: me.slug, status: "open", jamSlug: "", interest: [], applicants: {}, createdAt: now, updatedAt: now };
      const p = cleanProposal(b.proposal || {}, base);
      await putProposal(p);
      return json(res, 200, { ok: true, proposal: p });
    }

    const p = await getProposal(String(b.target || ""));
    if (!p) return json(res, 404, { error: "no_target" });
    const owner = p.createdBy === me.slug;
    const OWNER_ONLY = new Set(["update", "convert", "close", "reopen", "delete"]);
    if (OWNER_ONLY.has(b.action) && !owner) return json(res, 403, { error: "not_owner" });
    const save = async next => { await putProposal({ ...next, updatedAt: now }); return json(res, 200, { ok: true, proposal: { ...next, updatedAt: now } }); };

    if (b.action === "update") return save(cleanProposal(b.proposal || {}, p));
    if (b.action === "interest"){
      if (owner) return json(res, 400, { error: "self" });
      const has = p.interest.includes(me.slug);
      return save({ ...p, interest: has ? p.interest.filter(s => s !== me.slug) : [...p.interest, me.slug] });
    }
    if (b.action === "apply"){
      if (owner) return json(res, 400, { error: "self" });
      if (p.status !== "open") return json(res, 400, { error: "closed" });
      const part = PART_KEYS.includes(b.part) ? b.part : "";
      if (!part) return json(res, 400, { error: "bad_part" });
      return save({ ...p, applicants: { ...p.applicants, [me.slug]: { part, at: now } } });
    }
    if (b.action === "unapply"){
      const applicants = { ...p.applicants }; delete applicants[me.slug];
      return save({ ...p, applicants });
    }
    if (b.action === "convert"){
      if (p.status !== "open") return json(res, 400, { error: "closed" });
      const known = new Set((await listMembers()).map(m => m.slug));
      const picked = (Array.isArray(b.members) ? b.members : Object.keys(p.applicants)).map(String)
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
    if (b.action === "close"){ if (p.status === "converted") return json(res, 400, { error: "converted" }); return save({ ...p, status: "closed" }); }
    if (b.action === "reopen"){ if (p.status === "converted") return json(res, 400, { error: "converted" }); return save({ ...p, status: "open" }); }
    if (b.action === "delete"){ await deleteProposal(p.slug); return json(res, 200, { ok: true }); }
    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    if (e && e.code) return json(res, e.code, { error: e.error });
    console.error(e);
    return json(res, 500, { error: "server" });
  }
}
