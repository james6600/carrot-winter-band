// 합주 후기: 합주가 끝난 모임의 멤버끼리 칭찬 태그(평점 없음)와 한 줄을 남긴다.
// 후기 내용(누가 누구에게·한 줄)은 그 모임 멤버만 보고, 받은 사람은 마이 페이지에서 모아 본다.
// GET 은 랭킹·뱃지 계산용 집계 재료만 준다 (받은 태그 수·작성 횟수, 한 줄과 작성자-대상 짝은 빼고).
import { json, readBody, memberSlug } from "../lib/util.js";
import { getMember, getJam, listJams, putReview, listReviews } from "../lib/db.js";
import { findBadWord, maskPII } from "../lib/chat-filter.js";

export const PRAISE = ["manner", "mood", "time", "prep", "skill", "listen", "lead", "again"];
const NOTE_MAX = 100;

// 합주가 끝났는지: 완료로 바꿨거나, 확정된 시간이 (한국 시간으로) 지났을 때
function jamEnded(j, now = Date.now()){
  if (j.status === "done") return true;
  if (j.status !== "fixed" || !j.fixedSlot) return false;
  const [day, h] = j.fixedSlot.split("@");
  const endKst = Date.parse(day + "T00:00:00Z") + (Number(h) + j.duration) * 3600e3;
  return now + 9 * 3600e3 >= endKst;
}
const attended = (j, slug) => j.members.includes(slug) && j.rsvp[slug] !== "no";

export default async function handler(req, res){
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method === "GET"){
      const all = await listReviews();
      return json(res, 200, {
        received: all.map(v => ({ to: v.to, jam: v.jam, tags: v.tags, at: v.at })),
        written: all.map(v => ({ from: v.from, jam: v.jam, at: v.at })),
      });
    }
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);
    const me = await getMember(memberSlug(String(b.id || "").normalize("NFC")));
    if (!me || me.pw !== b.token) return json(res, 401, { error: "auth" });

    // 내가 받은 후기 (마이 페이지): 모임 이름과 함께
    if (b.action === "mine"){
      const mine = await listReviews({ to: me.slug });
      const titles = Object.fromEntries((await listJams()).map(j => [j.slug, j.title]));
      return json(res, 200, { reviews: mine.map(v => ({ ...v, jamTitle: titles[v.jam] || "" })) });
    }

    const j = await getJam(String(b.target || ""));
    if (!j) return json(res, 404, { error: "no_target" });
    if (!j.members.includes(me.slug)) return json(res, 403, { error: "not_member" });

    if (b.action === "list"){
      return json(res, 200, { reviews: await listReviews({ jam: j.slug }), ended: jamEnded(j) });
    }
    if (b.action === "save"){
      if (!jamEnded(j)) return json(res, 400, { error: "not_ended" });
      const to = String(b.to || "");
      if (to === me.slug || !j.members.includes(to)) return json(res, 400, { error: "bad_target" });
      if (!attended(j, me.slug)) return json(res, 403, { error: "not_attended" });
      const tags = [...new Set((Array.isArray(b.tags) ? b.tags : []).map(String))].filter(t => PRAISE.includes(t));
      if (!tags.length) return json(res, 400, { error: "no_tags" });
      let note = String(b.note || "").replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
      if (note && findBadWord(note)) return json(res, 400, { error: "filtered", reason: "욕설·비하" });
      note = maskPII(note);
      const v = { jam: j.slug, from: me.slug, to, tags, note, at: new Date().toISOString() };
      await putReview(v);
      return json(res, 200, { ok: true, review: v });
    }
    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    if (e && e.code) return json(res, e.code, { error: e.error });
    console.error(e);
    return json(res, 500, { error: "server" });
  }
}
