import { json, readBody, norm, sha, memberSlug, computeStyle } from "../lib/util.js";
import { getMember, putMember, deleteMember } from "../lib/db.js";

export default async function handler(req, res){
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method" });
    const b = await readBody(req);

    const adminId = String(b.id || "").normalize("NFC");
    if (norm(adminId) !== "admin") return json(res, 403, { error: "not_admin" });
    const admin = await getMember(memberSlug(adminId));
    if (!admin || admin.pw !== b.token) return json(res, 401, { error: "auth" });

    const target = await getMember(String(b.target || ""));
    if (!target) return json(res, 404, { error: "no_target" });
    const value = String(b.value || "").trim();

    if (b.action === "delete"){
      await deleteMember(target.slug);
      return json(res, 200, { ok: true });
    }

    if (b.action === "resetpw"){
      if (value.length < 4) return json(res, 400, { error: "bad_pw" });
      await putMember({ ...target, pw: sha(target.id.toLowerCase() + "|" + value),
        updatedAt: new Date().toISOString() });
      return json(res, 200, { ok: true });
    }

    if (b.action === "rename"){
      const newId = value.normalize("NFC");
      if (newId.length < 2 || newId.length > 20) return json(res, 400, { error: "bad_id" });
      const newSlug = memberSlug(newId);
      const now = new Date().toISOString();

      if (newSlug === target.slug){
        await putMember({ ...target, id: newId, updatedAt: now });
        return json(res, 200, { ok: true });
      }
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
        await deleteMember(target.slug);
      } else {
        await putMember({ ...target, slug: newSlug, id: newId, updatedAt: now });
        await deleteMember(target.slug);
      }
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { error: "bad_action" });
  } catch (e) {
    return json(res, 500, { error: "server" });
  }
}
