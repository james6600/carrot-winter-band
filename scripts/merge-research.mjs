// 조사 결과(data/research/*.json)를 가수 DB에 합친다.
// - 기존 시드·운영 DB의 이름/별칭과 겹치는 항목은 건너뛴다.
// - lib/seed-artists.json에 추가하고, DATABASE_URL이 있으면 Supabase에도 넣는다(이미 있으면 그대로 둠).
// 사용: node scripts/merge-research.mjs   (운영 반영 시 DATABASE_URL 환경변수 설정)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { norm, artistSlug, GENRE_KEYS } from "../lib/util.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const seedPath = path.join(root, "lib", "seed-artists.json");
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const files = ["korea-festivals.json", "international.json"];

const DB_URL = process.env.DATABASE_URL || "";
let sql = null, dbArtists = [];
if (DB_URL){
  const { default: postgres } = await import("postgres");
  sql = postgres(DB_URL, { ssl: "require", prepare: false, max: 1, onnotice: () => {} });
  const rows = await sql`SELECT slug, name, aliases FROM artists`;
  dbArtists = rows.map(r => ({ slug: r.slug, name: r.name, aliases: typeof r.aliases === "string" ? JSON.parse(r.aliases) : (r.aliases || []) }));
}

const taken = new Set();
const slugs = new Set();
for (const a of [...seed, ...dbArtists]){
  taken.add(norm(a.name));
  for (const al of (a.aliases || [])) taken.add(norm(al));
  slugs.add(a.slug);
}

const added = [];
const stats = {};
for (const f of files){
  const p = path.join(root, "data", "research", f);
  if (!fs.existsSync(p)){ console.log("skip (없음):", f); continue; }
  const list = JSON.parse(fs.readFileSync(p, "utf8"));
  stats[f] = { total: list.length, added: 0, dup: 0, bad: 0 };
  for (const x of list){
    const name = String(x.name || "").trim();
    const genres = (x.genres || []).filter(g => GENRE_KEYS.includes(g)).slice(0, 3);
    if (!name || !genres.length){ stats[f].bad++; continue; }
    const aliases = [...new Set((x.aliases || []).map(s => String(s).trim()).filter(s => s && norm(s) !== norm(name)))].slice(0, 6);
    const keys = [norm(name), ...aliases.map(norm)].filter(Boolean);
    if (keys.some(k => taken.has(k))){ stats[f].dup++; continue; }
    const slug = artistSlug(name);
    if (slugs.has(slug)){ stats[f].dup++; continue; }
    keys.forEach(k => taken.add(k)); slugs.add(slug);
    added.push({ slug, name, genres, aliases, source: f.startsWith("korea") ? "festival" : "chart" });
    stats[f].added++;
  }
}

fs.writeFileSync(seedPath, JSON.stringify([...seed, ...added], null, 1));
console.log("파일별:", JSON.stringify(stats));
console.log("시드 파일:", seed.length, "->", seed.length + added.length);

if (sql){
  let n = 0;
  for (const a of added){
    const r = await sql`INSERT INTO artists (slug, name, genres, aliases, source)
      VALUES (${a.slug}, ${a.name}, ${sql.json(a.genres)}, ${sql.json(a.aliases)}, ${a.source})
      ON CONFLICT (slug) DO NOTHING`;
    n += r.count || 0;
  }
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM artists`;
  console.log("운영 DB 추가:", n, "| 운영 DB 총:", count);
  await sql.end();
}
