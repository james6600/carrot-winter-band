// 합주 제안 채팅방. 제안자·신청자는 쓰고, 관심만 누른 사람은 읽기만.
// 금칙어·개인정보 가리기·Claude 검사·도배 방지·신고가 들어 있고, 운영진(backstage)이 열람·가리기·채팅 정지를 할 수 있다.
import { json, readBody, memberSlug } from "../lib/util.js";
import { getMember, getProposal, listProposals, addMessage, listMessages, getMessage, authorRecent, roomSummary, addReport, getBan } from "../lib/db.js";
import { findBadWord, maskPII, aiCheck } from "../lib/chat-filter.js";

const MAX_LEN = 300, PER_10MIN = 30, MIN_GAP_MS = 1000;
// 대기(후보) 중인 신청자는 읽기만, 정원 안에 들어온 신청자부터 쓸 수 있다
const roleOf = (p, slug) => p.createdBy === slug ? "owner" : p.applicants[slug] ? (p.applicants[slug].state === "wait" ? "wait" : "applicant") : p.interest.includes(slug) ? "interest" : "";
const publicMsg = m => ({ n: m.n, authorSlug: m.authorSlug, authorId: m.hidden ? "" : m.authorId, body: m.hidden ? "" : m.body, at: m.at, hidden: m.hidden });

export default async function handler(req, res){
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);
    const me = await getMember(memberSlug(String(b.id || "").normalize("NFC")));
    if (!me || me.pw !== b.token) return json(res, 401, { error: "auth" });
    const now = new Date();

    // 내가 들어가 있는 방들의 요약 (안 읽은 메시지 배지용)
    if (b.action === "summary"){
      const rooms = (await listProposals()).filter(p => roleOf(p, me.slug)).map(p => p.slug);
      return json(res, 200, { rooms: await roomSummary(rooms) });
    }

    const p = await getProposal(String(b.room || ""));
    if (!p) return json(res, 404, { error: "no_room" });
    const role = roleOf(p, me.slug);
    if (!role) return json(res, 403, { error: "not_member" });
    const ban = await getBan(me.slug);
    const canWrite = (role === "owner" || role === "applicant") && p.status !== "closed" && !ban;

    if (b.action === "list"){
      const after = Math.max(0, Number(b.after) || 0);
      const msgs = await listMessages(p.slug, after, 100);
      return json(res, 200, { messages: msgs.map(publicMsg), role, canWrite, closed: p.status === "closed",
        banUntil: ban ? ban.until : "", title: p.title });
    }

    if (b.action === "send"){
      if (!canWrite) return json(res, 403, { error: ban ? "banned" : role === "interest" || role === "wait" ? "read_only" : "closed", until: ban ? ban.until : undefined });
      let body = String(b.body || "").replace(/\s+/g, " ").trim();
      if (!body) return json(res, 400, { error: "empty" });
      if (body.length > MAX_LEN) return json(res, 400, { error: "too_long" });
      // 도배 방지
      const recent = await authorRecent(me.slug, new Date(now.getTime() - 10 * 60e3).toISOString());
      if (recent.count >= PER_10MIN) return json(res, 429, { error: "too_many" });
      if (recent.last && now.getTime() - Date.parse(recent.last) < MIN_GAP_MS) return json(res, 429, { error: "too_fast" });
      // 금칙어 → 바로 차단
      const bad = findBadWord(body);
      if (bad) return json(res, 400, { error: "filtered", reason: "욕설·비하" });
      // 개인정보 가리기
      body = maskPII(body);
      // Claude 검사 (실패하면 통과하되 표시만 남긴다)
      const ai = await aiCheck(body);
      if (ai.block) return json(res, 400, { error: "filtered", reason: ai.reason || "부적절한 표현" });
      const m = await addMessage({ room: p.slug, authorSlug: me.slug, authorId: me.id, body, at: now.toISOString(), flag: ai.checked ? "" : "unchecked" });
      return json(res, 200, { ok: true, message: publicMsg(m) });
    }

    if (b.action === "report"){
      const m = await getMessage(Number(b.msg));
      if (!m || m.room !== p.slug) return json(res, 404, { error: "no_msg" });
      if (m.authorSlug === me.slug) return json(res, 400, { error: "self" });
      await addReport({ room: p.slug, msgN: m.n, bySlug: me.slug, byId: me.id, reason: String(b.reason || "").trim().slice(0, 200) });
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "server" });
  }
}
