// 공연: 운영진이 백스테이지에서 열고, 회원은 '참여합니다'를 눌러 팀 모집(합주 제안과 같은 방식)에 들어간다.
// 목록(GET)은 누구나. 참여 토글은 로그인한 멤버.
import { json, readBody, memberSlug } from "../lib/util.js";
import { getMember, listShows, getShow, putShow } from "../lib/db.js";

export default async function handler(req, res){
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method === "GET") return json(res, 200, { shows: await listShows() });
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);
    const me = await getMember(memberSlug(String(b.id || "").normalize("NFC")));
    if (!me || me.pw !== b.token) return json(res, 401, { error: "auth" });
    const show = await getShow(String(b.target || ""));
    if (!show) return json(res, 404, { error: "no_target" });
    if (b.action === "join"){
      if (show.status === "done") return json(res, 400, { error: "show_locked" });
      const has = show.participants.includes(me.slug);
      const want = b.value === undefined ? !has : !!b.value;
      const participants = want ? [...new Set([...show.participants, me.slug])] : show.participants.filter(s => s !== me.slug);
      const next = { ...show, participants, updatedAt: new Date().toISOString() };
      await putShow(next);
      return json(res, 200, { ok: true, show: next });
    }
    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "server" });
  }
}
