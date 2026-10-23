// 저장소 레이어: DATABASE_URL이 있으면 Postgres(Supabase/Neon 등), 없으면 로컬 JSON 파일(개발용).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED = JSON.parse(fs.readFileSync(path.join(__dirname, "seed-artists.json"), "utf8"));

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
// Supabase 트랜잭션 풀러(6543)와 서버리스 환경에 맞춘 설정: prepare 끄고 커넥션 1개.
const sql = DB_URL ? postgres(DB_URL, { ssl: "require", prepare: false, max: 3, onnotice: () => {} }) : null;

/* ---------- Postgres ---------- */
let readyP = null;
function ensure(){
  if (!sql) return null;
  if (!readyP) readyP = (async () => {
    // 이미 준비된 DB면 카탈로그 조회 한 번으로 끝낸다. ALTER는 테이블 잠금을 잡으므로 필요할 때만 실행.
    const cols = await sql`SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name IN ('members','artists') AND column_name IN ('slug','avail','levels')`;
    const has = new Set(cols.map(c => c.table_name + "." + c.column_name));
    if (has.has("members.slug") && has.has("members.avail") && has.has("members.levels") && has.has("artists.slug")) return;
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
      updated_at text NOT NULL DEFAULT '',
      avail jsonb NOT NULL DEFAULT '[]',
      levels jsonb NOT NULL DEFAULT '{}'
    )`;
    if (!has.has("members.avail"))
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS avail jsonb NOT NULL DEFAULT '[]'::jsonb`;
    if (!has.has("members.levels"))
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS levels jsonb NOT NULL DEFAULT '{}'::jsonb`;
    await sql`CREATE TABLE IF NOT EXISTS artists (
      slug text PRIMARY KEY,
      name text NOT NULL,
      genres jsonb NOT NULL DEFAULT '[]',
      aliases jsonb NOT NULL DEFAULT '[]',
      source text NOT NULL DEFAULT 'seed'
    )`;
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM artists`;
    if (count === 0){
      for (const a of SEED){
        await sql`INSERT INTO artists (slug, name, genres, aliases, source)
          VALUES (${a.slug}, ${a.name}, ${sql.json(a.genres)}, ${sql.json(a.aliases || [])}, ${a.source || "seed"})
          ON CONFLICT (slug) DO NOTHING`;
      }
    }
  })();
  return readyP;
}

// jsonb 컬럼이 드라이버/풀러에 따라 문자열로 올 수 있어 안전하게 파싱한다.
function jparse(v, fallback){
  if (v == null) return fallback;
  if (typeof v === "string"){
    try { return JSON.parse(v); } catch { return fallback; }
  }
  return v;
}
function rowToMember(r){
  return {
    slug: r.slug, id: r.id, pw: r.pw,
    parts: jparse(r.parts, []), partEtc: r.part_etc || "",
    genres: jparse(r.genres, []), artists: jparse(r.artists, []),
    style: r.style || "", done: !!r.done,
    createdAt: r.created_at || "", updatedAt: r.updated_at || "",
    avail: jparse(r.avail, []),
    levels: jparse(r.levels, {}),
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
    await sql`INSERT INTO members (slug, id, pw, parts, part_etc, genres, artists, style, done, created_at, updated_at, avail, levels)
      VALUES (${m.slug}, ${m.id}, ${m.pw}, ${sql.json(m.parts)}, ${m.partEtc||""},
              ${sql.json(m.genres)}, ${sql.json(m.artists)},
              ${m.style||""}, ${!!m.done}, ${m.createdAt||""}, ${m.updatedAt||""}, ${sql.json(m.avail||[])}, ${sql.json(m.levels||{})})
      ON CONFLICT (slug) DO UPDATE SET
        id = EXCLUDED.id, pw = EXCLUDED.pw, parts = EXCLUDED.parts, part_etc = EXCLUDED.part_etc,
        genres = EXCLUDED.genres, artists = EXCLUDED.artists, style = EXCLUDED.style,
        done = EXCLUDED.done, updated_at = EXCLUDED.updated_at, avail = EXCLUDED.avail, levels = EXCLUDED.levels`;
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
    return rows.map(r => ({ slug: r.slug, name: r.name, genres: jparse(r.genres, []), aliases: jparse(r.aliases, []), source: r.source }));
  }
  const d = fload();
  return Object.values(d.artists);
}

export async function putArtist(a){
  if (sql){
    await ensure();
    await sql`INSERT INTO artists (slug, name, genres, aliases, source)
      VALUES (${a.slug}, ${a.name}, ${sql.json(a.genres)}, ${sql.json(a.aliases||[])}, ${a.source||"claude"})
      ON CONFLICT (slug) DO NOTHING`;
    return;
  }
  const d = fload();
  if (!d.artists[a.slug]) d.artists[a.slug] = a;
  fsave(d);
}

/* ---------- 관리자(backstage): 계정·세션·활동 기록 ---------- */
let adminReadyP = null;
function ensureAdmin(){
  if (!sql) return null;
  if (!adminReadyP) adminReadyP = (async () => {
    await ensure();
    const t = await sql`SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name IN ('admins','admin_sessions','admin_logs')`;
    if (t.length === 3) return;
    await sql`CREATE TABLE IF NOT EXISTS admins (
      slug text PRIMARY KEY,
      id text NOT NULL,
      pw text NOT NULL,
      role text NOT NULL DEFAULT 'sub',
      totp_secret text NOT NULL DEFAULT '',
      totp_pending text NOT NULL DEFAULT '',
      totp_last bigint NOT NULL DEFAULT 0,
      fails int NOT NULL DEFAULT 0,
      locked_until bigint NOT NULL DEFAULT 0,
      must_change boolean NOT NULL DEFAULT false,
      created_at text NOT NULL DEFAULT '',
      created_by text NOT NULL DEFAULT '',
      last_login text NOT NULL DEFAULT ''
    )`;
    await sql`CREATE TABLE IF NOT EXISTS admin_sessions (
      hash text PRIMARY KEY,
      admin_slug text NOT NULL,
      stage text NOT NULL,
      expires bigint NOT NULL
    )`;
    await sql`CREATE TABLE IF NOT EXISTS admin_logs (
      n bigserial PRIMARY KEY,
      at text NOT NULL,
      actor text NOT NULL,
      action text NOT NULL,
      target text NOT NULL DEFAULT '',
      detail text NOT NULL DEFAULT ''
    )`;
    // Supabase Data API(anon 키)로는 읽히지 않게 RLS를 켠다. 앱은 테이블 소유자로 접속하므로 영향 없음.
    for (const name of ["admins", "admin_sessions", "admin_logs", "members", "artists"])
      await sql`ALTER TABLE ${sql(name)} ENABLE ROW LEVEL SECURITY`;
  })();
  return adminReadyP;
}
const rowToAdmin = r => ({
  slug: r.slug, id: r.id, pw: r.pw, role: r.role,
  totpSecret: r.totp_secret || "", totpPending: r.totp_pending || "", totpLast: Number(r.totp_last) || 0,
  fails: Number(r.fails) || 0, lockedUntil: Number(r.locked_until) || 0, mustChange: !!r.must_change,
  createdAt: r.created_at || "", createdBy: r.created_by || "", lastLogin: r.last_login || "",
});
function fadmin(d){
  d.admins ||= {}; d.adminSessions ||= {}; d.adminLogs ||= [];
  return d;
}

export async function listAdmins(){
  if (sql){
    await ensureAdmin();
    return (await sql`SELECT * FROM admins ORDER BY created_at`).map(rowToAdmin);
  }
  return Object.values(fadmin(fload()).admins).sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
}
export async function getAdmin(slug){
  if (sql){
    await ensureAdmin();
    const rows = await sql`SELECT * FROM admins WHERE slug = ${slug}`;
    return rows.length ? rowToAdmin(rows[0]) : null;
  }
  return fadmin(fload()).admins[slug] || null;
}
export async function putAdmin(a){
  if (sql){
    await ensureAdmin();
    await sql`INSERT INTO admins (slug, id, pw, role, totp_secret, totp_pending, totp_last, fails, locked_until, must_change, created_at, created_by, last_login)
      VALUES (${a.slug}, ${a.id}, ${a.pw}, ${a.role}, ${a.totpSecret||""}, ${a.totpPending||""}, ${a.totpLast||0},
              ${a.fails||0}, ${a.lockedUntil||0}, ${!!a.mustChange}, ${a.createdAt||""}, ${a.createdBy||""}, ${a.lastLogin||""})
      ON CONFLICT (slug) DO UPDATE SET
        id = EXCLUDED.id, pw = EXCLUDED.pw, role = EXCLUDED.role, totp_secret = EXCLUDED.totp_secret,
        totp_pending = EXCLUDED.totp_pending, totp_last = EXCLUDED.totp_last, fails = EXCLUDED.fails,
        locked_until = EXCLUDED.locked_until, must_change = EXCLUDED.must_change, last_login = EXCLUDED.last_login`;
    return;
  }
  const d = fadmin(fload()); d.admins[a.slug] = a; fsave(d);
}
// 처음 한 번만: 관리자가 아무도 없을 때만 넣는다(동시 요청 경쟁 방지).
export async function createFirstAdmin(a){
  if (sql){
    await ensureAdmin();
    const rows = await sql`INSERT INTO admins (slug, id, pw, role, created_at, created_by, must_change)
      SELECT ${a.slug}, ${a.id}, ${a.pw}, 'super', ${a.createdAt}, 'setup', false
      WHERE NOT EXISTS (SELECT 1 FROM admins) RETURNING slug`;
    return rows.length > 0;
  }
  const d = fadmin(fload());
  if (Object.keys(d.admins).length) return false;
  d.admins[a.slug] = { ...a, role: "super", totpSecret: "", totpPending: "", totpLast: 0, fails: 0, lockedUntil: 0, mustChange: false, createdBy: "setup", lastLogin: "" };
  fsave(d); return true;
}
export async function deleteAdmin(slug){
  if (sql){
    await ensureAdmin();
    await sql`DELETE FROM admin_sessions WHERE admin_slug = ${slug}`;
    await sql`DELETE FROM admins WHERE slug = ${slug}`;
    return;
  }
  const d = fadmin(fload());
  delete d.admins[slug];
  for (const [h, s] of Object.entries(d.adminSessions)) if (s.adminSlug === slug) delete d.adminSessions[h];
  fsave(d);
}

export async function putSession(s){
  if (sql){
    await ensureAdmin();
    await sql`DELETE FROM admin_sessions WHERE expires < ${Date.now()}`;
    await sql`INSERT INTO admin_sessions (hash, admin_slug, stage, expires)
      VALUES (${s.hash}, ${s.adminSlug}, ${s.stage}, ${s.expires})`;
    return;
  }
  const d = fadmin(fload()); d.adminSessions[s.hash] = s; fsave(d);
}
export async function getSession(hash){
  if (sql){
    await ensureAdmin();
    const rows = await sql`SELECT * FROM admin_sessions WHERE hash = ${hash} AND expires > ${Date.now()}`;
    return rows.length ? { hash: rows[0].hash, adminSlug: rows[0].admin_slug, stage: rows[0].stage, expires: Number(rows[0].expires) } : null;
  }
  const s = fadmin(fload()).adminSessions[hash];
  return s && s.expires > Date.now() ? s : null;
}
export async function deleteSession(hash){
  if (sql){
    await ensureAdmin();
    await sql`DELETE FROM admin_sessions WHERE hash = ${hash}`;
    return;
  }
  const d = fadmin(fload()); delete d.adminSessions[hash]; fsave(d);
}
// 비밀번호 재설정·2단계 초기화·권한 변경 때 그 관리자의 모든 로그인을 끊는다.
export async function deleteSessionsOf(slug, exceptHash = ""){
  if (sql){
    await ensureAdmin();
    await sql`DELETE FROM admin_sessions WHERE admin_slug = ${slug} AND hash <> ${exceptHash}`;
    return;
  }
  const d = fadmin(fload());
  for (const [h, s] of Object.entries(d.adminSessions)) if (s.adminSlug === slug && h !== exceptHash) delete d.adminSessions[h];
  fsave(d);
}

export async function addLog(l){
  const row = { at: new Date().toISOString(), actor: l.actor, action: l.action, target: l.target || "", detail: l.detail || "" };
  if (sql){
    await ensureAdmin();
    await sql`INSERT INTO admin_logs (at, actor, action, target, detail)
      VALUES (${row.at}, ${row.actor}, ${row.action}, ${row.target}, ${row.detail})`;
    return;
  }
  const d = fadmin(fload()); d.adminLogs.push(row); d.adminLogs = d.adminLogs.slice(-500); fsave(d);
}
export async function listLogs(limit = 200){
  if (sql){
    await ensureAdmin();
    const rows = await sql`SELECT at, actor, action, target, detail FROM admin_logs ORDER BY n DESC LIMIT ${limit}`;
    return rows.map(r => ({ ...r }));
  }
  return fadmin(fload()).adminLogs.slice(-limit).reverse();
}

/* ---------- 오류 보고 · 기능 제안 ---------- */
let fbReadyP = null;
function ensureFeedback(){
  if (!sql) return null;
  if (!fbReadyP) fbReadyP = (async () => {
    await ensure();
    const t = await sql`SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'feedback'`;
    if (t.length) return;
    await sql`CREATE TABLE IF NOT EXISTS feedback (
      n bigserial PRIMARY KEY,
      kind text NOT NULL,
      title text NOT NULL,
      body text NOT NULL,
      author_slug text NOT NULL DEFAULT '',
      author_id text NOT NULL DEFAULT '',
      meta jsonb NOT NULL DEFAULT '{}',
      ip_hash text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'new',
      reply text NOT NULL DEFAULT '',
      replied_by text NOT NULL DEFAULT '',
      created_at text NOT NULL,
      updated_at text NOT NULL
    )`;
    await sql`ALTER TABLE feedback ENABLE ROW LEVEL SECURITY`;
  })();
  return fbReadyP;
}
const rowToFeedback = r => ({
  n: Number(r.n), kind: r.kind, title: r.title, body: r.body,
  authorSlug: r.author_slug || "", authorId: r.author_id || "", meta: jparse(r.meta, {}), ipHash: r.ip_hash || "",
  status: r.status, reply: r.reply || "", repliedBy: r.replied_by || "",
  createdAt: r.created_at, updatedAt: r.updated_at,
});

export async function addFeedback(f){
  const now = new Date().toISOString();
  if (sql){
    await ensureFeedback();
    const [r] = await sql`INSERT INTO feedback (kind, title, body, author_slug, author_id, meta, ip_hash, created_at, updated_at)
      VALUES (${f.kind}, ${f.title}, ${f.body}, ${f.authorSlug||""}, ${f.authorId||""}, ${sql.json(f.meta||{})}, ${f.ipHash||""}, ${now}, ${now})
      RETURNING n`;
    return Number(r.n);
  }
  const d = fload(); d.feedback ||= [];
  const n = (d.feedback.reduce((m, x) => Math.max(m, x.n), 0)) + 1;
  d.feedback.push({ n, status: "new", reply: "", repliedBy: "", ...f, createdAt: now, updatedAt: now });
  fsave(d); return n;
}
// 같은 사람(IP 해시)이 최근에 보낸 개수 — 도배 방지용.
export async function countRecentFeedback(ipHash, sinceIso){
  if (sql){
    await ensureFeedback();
    const [r] = await sql`SELECT count(*)::int AS c FROM feedback WHERE ip_hash = ${ipHash} AND created_at > ${sinceIso}`;
    return r.c;
  }
  return (fload().feedback || []).filter(x => x.ipHash === ipHash && x.createdAt > sinceIso).length;
}
export async function listFeedback({ authorSlug } = {}){
  if (sql){
    await ensureFeedback();
    const rows = authorSlug
      ? await sql`SELECT * FROM feedback WHERE author_slug = ${authorSlug} ORDER BY n DESC LIMIT 50`
      : await sql`SELECT * FROM feedback ORDER BY n DESC LIMIT 500`;
    return rows.map(rowToFeedback);
  }
  const all = [...(fload().feedback || [])].reverse();
  return authorSlug ? all.filter(x => x.authorSlug === authorSlug).slice(0, 50) : all.slice(0, 500);
}
export async function getFeedback(n){
  if (sql){
    await ensureFeedback();
    const rows = await sql`SELECT * FROM feedback WHERE n = ${n}`;
    return rows.length ? rowToFeedback(rows[0]) : null;
  }
  return (fload().feedback || []).find(x => x.n === n) || null;
}
export async function updateFeedback(n, patch){
  const now = new Date().toISOString();
  if (sql){
    await ensureFeedback();
    await sql`UPDATE feedback SET status = ${patch.status}, reply = ${patch.reply}, replied_by = ${patch.repliedBy}, updated_at = ${now} WHERE n = ${n}`;
    return;
  }
  const d = fload(); const f = (d.feedback || []).find(x => x.n === n);
  if (f){ Object.assign(f, patch, { updatedAt: now }); fsave(d); }
}
export async function deleteFeedback(n){
  if (sql){
    await ensureFeedback();
    await sql`DELETE FROM feedback WHERE n = ${n}`;
    return;
  }
  const d = fload(); d.feedback = (d.feedback || []).filter(x => x.n !== n); fsave(d);
}

/* ---------- 합주 모임 ---------- */
let jamReadyP = null;
function ensureJams(){
  if (!sql) return null;
  if (!jamReadyP) jamReadyP = (async () => {
    await ensure();
    const t = await sql`SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'jams'`;
    if (t.length) return;
    await sql`CREATE TABLE IF NOT EXISTS jams (
      slug text PRIMARY KEY,
      title text NOT NULL,
      created_by text NOT NULL,
      members jsonb NOT NULL DEFAULT '[]',
      songs jsonb NOT NULL DEFAULT '[]',
      note text NOT NULL DEFAULT '',
      place text NOT NULL DEFAULT '',
      duration int NOT NULL DEFAULT 2,
      status text NOT NULL DEFAULT 'planning',
      fixed_slot text NOT NULL DEFAULT '',
      rsvp jsonb NOT NULL DEFAULT '{}',
      created_at text NOT NULL,
      updated_at text NOT NULL
    )`;
    await sql`ALTER TABLE jams ENABLE ROW LEVEL SECURITY`;
  })();
  return jamReadyP;
}
const rowToJam = r => ({
  slug: r.slug, title: r.title, createdBy: r.created_by,
  members: jparse(r.members, []), songs: jparse(r.songs, []), note: r.note || "", place: r.place || "",
  duration: Number(r.duration) || 2, status: r.status, fixedSlot: r.fixed_slot || "", rsvp: jparse(r.rsvp, {}),
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export async function listJams(){
  if (sql){
    await ensureJams();
    return (await sql`SELECT * FROM jams ORDER BY created_at DESC LIMIT 500`).map(rowToJam);
  }
  return Object.values(fload().jams || {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getJam(slug){
  if (sql){
    await ensureJams();
    const rows = await sql`SELECT * FROM jams WHERE slug = ${slug}`;
    return rows.length ? rowToJam(rows[0]) : null;
  }
  return (fload().jams || {})[slug] || null;
}
export async function putJam(j){
  if (sql){
    await ensureJams();
    await sql`INSERT INTO jams (slug, title, created_by, members, songs, note, place, duration, status, fixed_slot, rsvp, created_at, updated_at)
      VALUES (${j.slug}, ${j.title}, ${j.createdBy}, ${sql.json(j.members)}, ${sql.json(j.songs)}, ${j.note||""}, ${j.place||""},
              ${j.duration||2}, ${j.status}, ${j.fixedSlot||""}, ${sql.json(j.rsvp||{})}, ${j.createdAt}, ${j.updatedAt})
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title, members = EXCLUDED.members, songs = EXCLUDED.songs, note = EXCLUDED.note, place = EXCLUDED.place,
        duration = EXCLUDED.duration, status = EXCLUDED.status, fixed_slot = EXCLUDED.fixed_slot, rsvp = EXCLUDED.rsvp, updated_at = EXCLUDED.updated_at`;
    return;
  }
  const d = fload(); d.jams ||= {}; d.jams[j.slug] = j; fsave(d);
}
export async function deleteJam(slug){
  if (sql){
    await ensureJams();
    await sql`DELETE FROM jams WHERE slug = ${slug}`;
    return;
  }
  const d = fload(); if (d.jams) delete d.jams[slug]; fsave(d);
}
