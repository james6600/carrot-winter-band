// 오류 보고 · 기능 제안: 누구나 보낼 수 있고, 로그인한 사람은 자기가 보낸 의견과 관리자 답변을 볼 수 있다.
import { json, readBody, sha, memberSlug } from "../lib/util.js";
import { getMember, addFeedback, countRecentFeedback, listFeedback } from "../lib/db.js";

export const FEEDBACK_KINDS = ["bug", "idea", "etc"];
const LIMIT = 5, WINDOW_MS = 10 * 60e3;   // 10분에 5건까지

const clip = (v, n) => String(v ?? "").trim().slice(0, n);
export const publicFeedback = f => ({ n: f.n, kind: f.kind, title: f.title, body: f.body, status: f.status,
  reply: f.reply, createdAt: f.createdAt, updatedAt: f.updatedAt });

async function whoIs(b){
  if (!b.id || !b.token) return null;
  const m = await getMember(memberSlug(String(b.id).normalize("NFC")));
  return m && m.pw === b.token ? m : null;
}

export default async function handler(req, res){
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);

    if (b.action === "mine"){
      const me = await whoIs(b);
      if (!me) return json(res, 401, { error: "auth" });
      return json(res, 200, { items: (await listFeedback({ authorSlug: me.slug })).map(publicFeedback) });
    }

    if (b.action === "submit"){
      if (b.website) return json(res, 200, { ok: true });   // 봇이 채우는 숨은 칸
      const kind = FEEDBACK_KINDS.includes(b.kind) ? b.kind : "etc";
      const title = clip(b.title, 80), body = clip(b.body, 2000);
      if (title.length < 2) return json(res, 400, { error: "bad_title" });
      if (body.length < 5) return json(res, 400, { error: "bad_body" });
      const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
      const ipHash = sha("feedback|" + ip);
      if (await countRecentFeedback(ipHash, new Date(Date.now() - WINDOW_MS).toISOString()) >= LIMIT)
        return json(res, 429, { error: "too_many" });
      const me = await whoIs(b);
      const m = b.meta && typeof b.meta === "object" ? b.meta : null;
      const meta = m ? { view: clip(m.view, 40), ua: clip(m.ua, 300), screen: clip(m.screen, 20), url: clip(m.url, 200) } : {};
      const n = await addFeedback({ kind, title, body, meta, ipHash,
        authorSlug: me ? me.slug : "", authorId: me ? me.id : clip(b.name, 20) });
      return json(res, 200, { ok: true, n, linked: !!me });
    }

    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    console.error(e);
    return json(res, 500, { error: "server" });
  }
}
