// 저장소 레이어: DATABASE_URL이 있으면 Neon Postgres, 없으면 로컬 JSON 파일(개발용).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-artists.json"), "utf8"));

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const sql = DB_URL ? neon(DB_URL) : null;

/* ---------- Postgres ---------- */
let readyP = null;
function ensure(){
  if (!sql) return null;
  if (!readyP) readyP = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS members (
      slug text PRIMARY KEY,
      id text NOT NULL,
      pw text NOT NULL,
      parts jsonb NOT NULL DEFAULT '[]',
      part_etc text NOT NULL DEFAULT '',
      genres jsonb NOT NULL DEFAULT '[]',
      artists jsonb NOT NULL DEFAULT '[]',
      style text NOT NULL DEFAULT '',
      done boolean NOT NULL DEFAULT false,
      created_at text NOT NULL DEFAULT '',
      updated_at text NOT NULL DEFAULT ''
    )`;
    await sql`CREATE TABLE IF NOT EXISTS artists (
      slug text PRIMARY KEY,
      name text NOT NULL,
      genres jsonb NOT NULL DEFAULT '[]',
      aliases jsonb NOT NULL DEFAULT '[]',
      source text NOT NULL DEFAULT 'seed'
    )`;
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM artists`;
    if (count === 0){
      await sql`INSERT INTO artists (slug, name, genres, aliases, source)
        SELECT t.slug, t.name, t.genres, t.aliases, t.source
        FROM jsonb_to_recordset(${JSON.stringify(SEED)}::jsonb)
          AS t(slug text, name text, genres jsonb, aliases jsonb, source text)
        ON CONFLICT (slug) DO NOTHING`;
    }
  })();
  return readyP;
}

function rowToMember(r){
  return {
    slug: r.slug, id: r.id, pw: r.pw,
    parts: r.parts || [], partEtc: r.part_etc || "",
    genres: r.genres || [], artists: r.artists || [],
    style: r.style || "", done: !!r.done,
    createdAt: r.created_at || "", updatedAt: r.updated_at || "",
  };
}

/* ---------- 파일 폴백 (로컬 개발) ---------- */
const FILE = path.join(process.cwd(), "data", "dev-db.json");
function fload(){
  try { return JSON.parse(fs.readFileSync(FILE, "utf8")); }
  catch { return { members: {}, artists: Object.fromEntries(SEED.map(a => [a.slug, a])) }; }
}
function fsave(d){
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(d, null, 1));
}

/* ---------- 공용 API ---------- */
export async function getMember(slug){
  if (sql){
    await ensure();
    const rows = await sql`SELECT * FROM members WHERE slug = ${slug}`;
    return rows.length ? rowToMember(rows[0]) : null;
  }
  const d = fload();
  return d.members[slug] || null;
}

export async function putMember(m){
  if (sql){
    await ensure();
    await sql`INSERT INTO members (slug, id, pw, parts, part_etc, genres, artists, style, done, created_at, updated_at)
      VALUES (${m.slug}, ${m.id}, ${m.pw}, ${JSON.stringify(m.parts)}::jsonb, ${m.partEtc||""},
              ${JSON.stringify(m.genres)}::jsonb, ${JSON.stringify(m.artists)}::jsonb,
              ${m.style||""}, ${!!m.done}, ${m.createdAt||""}, ${m.updatedAt||""})
      ON CONFLICT (slug) DO UPDATE SET
        id = EXCLUDED.id, pw = EXCLUDED.pw, parts = EXCLUDED.parts, part_etc = EXCLUDED.part_etc,
        genres = EXCLUDED.genres, artists = EXCLUDED.artists, style = EXCLUDED.style,
        done = EXCLUDED.done, updated_at = EXCLUDED.updated_at`;
    return;
  }
  const d = fload();
  d.members[m.slug] = m;
  fsave(d);
}

export async function deleteMember(slug){
  if (sql){
    await ensure();
    await sql`DELETE FROM members WHERE slug = ${slug}`;
    return;
  }
  const d = fload();
  delete d.members[slug];
  fsave(d);
}

export async function listMembers(){
  if (sql){
    await ensure();
    const rows = await sql`SELECT * FROM members ORDER BY created_at`;
    return rows.map(rowToMember);
  }
  const d = fload();
  return Object.values(d.members).sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""));
}

export async function listArtists(){
  if (sql){
    await ensure();
    const rows = await sql`SELECT * FROM artists`;
    return rows.map(r => ({ slug: r.slug, name: r.name, genres: r.genres||[], aliases: r.aliases||[], source: r.source }));
  }
  const d = fload();
  return Object.values(d.artists);
}

export async function putArtist(a){
  if (sql){
    await ensure();
    await sql`INSERT INTO artists (slug, name, genres, aliases, source)
      VALUES (${a.slug}, ${a.name}, ${JSON.stringify(a.genres)}::jsonb, ${JSON.stringify(a.aliases||[])}::jsonb, ${a.source||"claude"})
      ON CONFLICT (slug) DO NOTHING`;
    return;
  }
  const d = fload();
  if (!d.artists[a.slug]) d.artists[a.slug] = a;
  fsave(d);
}
