import { json, readBody, norm, artistSlug, GENRE_KEYS } from "../lib/util.js";
import { listArtists, putArtist } from "../lib/db.js";

const GENRE_NAMES = {
  brit:"브리티시락", modern:"모던락", indie:"인디락", punk:"펑크", emo:"이모/팝펑크",
  grunge:"그런지", hardcore:"하드코어", metal:"메탈", hardrock:"하드록", blues:"블루스",
  jazz:"재즈", ballad:"발라드", kpop:"K-pop", jrock:"J-rock/J-pop", citypop:"시티팝", folk:"포크/어쿠스틱",
};

export default async function handler(req, res){
  try {
    if (req.method === "GET"){
      const artists = await listArtists();
      return json(res, 200, { artists: artists.map(a => ({ name: a.name, genres: a.genres, aliases: a.aliases })) });
    }
    if (req.method !== "POST") return json(res, 405, { error: "method" });

    const b = await readBody(req);
    const name = String(b.name || "").trim().slice(0, 60);
    if (!name) return json(res, 400, { error: "bad_name" });

    // 1) DB 매칭 (이름 + 별칭)
    const key = norm(name);
    const artists = await listArtists();
    for (const a of artists){
      if (norm(a.name) === key || (a.aliases || []).some(al => norm(al) === key))
        return json(res, 200, { known: true, name: a.name, genres: a.genres, source: "db" });
    }

    // 2) 마법 수정구: Anthropic API (키가 있을 때만)
    const KEY = process.env.ANTHROPIC_API_KEY;
    if (KEY){
      const keys = GENRE_KEYS.map(k => k + "(" + GENRE_NAMES[k] + ")").join(", ");
      const prompt = "뮤지션/밴드 '" + name + "'의 음악 장르를 분류해줘.\n"
        + "다음 장르 키 중에서만 1~3개 고르기: " + keys + "\n"
        + '반드시 JSON으로만 답해: {"known": true|false, "genres": ["키1","키2"]}\n'
        + "실존하는지 모르거나 음악가가 아니면 known을 false로.";
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-5-5",
          max_tokens: 300,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (r.ok){
        const data = await r.json();
        const text = (data.content || []).map(c => c.text || "").join("");
        const m = text.match(/\{[\s\S]*\}/);
        if (m){
          try {
            const parsed = JSON.parse(m[0]);
            const genres = (Array.isArray(parsed.genres) ? parsed.genres : [])
              .filter(k => GENRE_KEYS.includes(k)).slice(0, 3);
            if (parsed.known && genres.length){
              await putArtist({ slug: artistSlug(name), name, genres, aliases: [], source: "claude" });
              return json(res, 200, { known: true, name, genres, source: "claude" });
            }
          } catch {}
        }
      }
    }

    return json(res, 200, { known: false });
  } catch (e) {
    return json(res, 500, { error: "server" });
  }
}
