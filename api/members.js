import { json, readBody, memberSlug, strip, GENRE_KEYS, PART_KEYS, computeStyle, cleanAvail } from "../lib/util.js";
import { getMember, putMember, listMembers } from "../lib/db.js";

export default async function handler(req, res){
  try {
    if (req.method === "GET"){
      const members = await listMembers();
      return json(res, 200, { members: members.map(strip) });
    }
    if (req.method !== "POST") return json(res, 405, { error: "method" });

    const b = await readBody(req);
    const id = String(b.id || "").normalize("NFC");
    const me = await getMember(memberSlug(id));
    if (!me || me.pw !== b.token) return json(res, 401, { error: "auth" });
    const now = new Date().toISOString();

    // 합주 가능 시간만 갱신
    if (!b.profile){
      if (b.avail === undefined) return json(res, 400, { error: "empty" });
      const updated = { ...me, avail: cleanAvail(b.avail), updatedAt: now };
      await putMember(updated);
      return json(res, 200, { ok: true, member: strip(updated) });
    }

    const p = b.profile;
    const parts = Array.isArray(p.parts) ? p.parts.filter(k => PART_KEYS.includes(k)) : [];
    const genres = Array.isArray(p.genres) ? p.genres.filter(k => GENRE_KEYS.includes(k)) : [];
    const artists = (Array.isArray(p.artists) ? p.artists : []).slice(0, 30).map(a => ({
      name: String(a.name || "").slice(0, 60),
      genres: (Array.isArray(a.genres) ? a.genres : []).filter(k => GENRE_KEYS.includes(k)).slice(0, 3),
    })).filter(a => a.name);
    if (!parts.length || !genres.length || !artists.length)
      return json(res, 400, { error: "incomplete" });

    const updated = { ...me,
      parts, genres, artists,
      partEtc: String(p.partEtc || "").slice(0, 20),
      style: computeStyle(genres, artists),
      done: true,
      avail: p.avail === undefined ? (me.avail || []) : cleanAvail(p.avail),
      updatedAt: now,
    };
    await putMember(updated);
    return json(res, 200, { ok: true, member: strip(updated) });
  } catch (e) {
    return json(res, 500, { error: "server" });
  }
}
