import { json, readBody, sha, memberSlug, strip } from "../lib/util.js";
import { getMember, putMember } from "../lib/db.js";

export default async function handler(req, res){
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);
    const id = String(b.id || "").trim().normalize("NFC");
    if (id.length < 2 || id.length > 20) return json(res, 400, { error: "bad_id" });
    const slug = memberSlug(id);
    const existing = await getMember(slug);

    // 저장된 토큰으로 재로그인
    if (b.token){
      if (existing && existing.pw === b.token)
        return json(res, 200, { ok: true, member: strip(existing), token: b.token });
      return json(res, 401, { error: "wrong_token" });
    }

    const pw = String(b.pw || "");
    if (pw.length < 4 || pw.length > 40) return json(res, 400, { error: "bad_pw" });
    const hash = sha(id.toLowerCase() + "|" + pw);

    if (existing){
      if (existing.pw !== hash) return json(res, 401, { error: "wrong_pw" });
      return json(res, 200, { ok: true, member: strip(existing), token: hash });
    }

    const now = new Date().toISOString();
    const m = { slug, id, pw: hash, parts: [], partEtc: "", genres: [], artists: [],
      style: "", done: false, createdAt: now, updatedAt: now };
    await putMember(m);
    return json(res, 200, { ok: true, member: strip(m), token: hash, created: true });
  } catch (e) {
    return json(res, 500, { error: "server" });
  }
}
