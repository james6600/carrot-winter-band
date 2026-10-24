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
      WHERE table_schema = current_schema() AND table_name IN ('members','artists') AND column_name IN ('slug','avail','levels','time_pref')`;
    const has = new Set(cols.map(c => c.table_name + "." + c.column_name));
    if (has.has("members.slug") && has.has("members.avail") && has.has("members.levels") && has.has("members.time_pref") && has.has("artists.slug")) return;
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
      levels jsonb NOT NULL DEFAULT '{}',
      time_pref jsonb NOT NULL DEFAULT '[]'
    )`;
    if (!has.has("members.avail"))
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS avail jsonb NOT NULL DEFAULT '[]'::jsonb`;
    if (!has.has("members.levels"))
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS levels jsonb NOT NULL DEFAULT '{}'::jsonb`;
    if (!has.has("members.time_pref"))
      await sql`ALTER TABLE members ADD COLUMN IF NOT EXISTS time_pref jsonb NOT NULL DEFAULT '[]'::jsonb`;
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
    timePref: jparse(r.time_pref, []),
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
    await sql`INSERT INTO members (slug, id, pw, parts, part_etc, genres, artists, style, done, created_at, updated_at, avail, levels, time_pref)
      VALUES (${m.slug}, ${m.id}, ${m.pw}, ${sql.json(m.parts)}, ${m.partEtc||""},
              ${sql.json(m.genres)}, ${sql.json(m.artists)},
              ${m.style||""}, ${!!m.done}, ${m.createdAt||""}, ${m.updatedAt||""}, ${sql.json(m.avail||[])}, ${sql.json(m.levels||{})}, ${sql.json(m.timePref||[])})
      ON CONFLICT (slug) DO UPDATE SET
        id = EXCLUDED.id, pw = EXCLUDED.pw, parts = EXCLUDED.parts, part_etc = EXCLUDED.part_etc,
        genres = EXCLUDED.genres, artists = EXCLUDED.artists, style = EXCLUDED.style,
        done = EXCLUDED.done, updated_at = EXCLUDED.updated_at, avail = EXCLUDED.avail, levels = EXCLUDED.levels, time_pref = EXCLUDED.time_pref`;
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
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'jams'`;
    if (cols.length){
      if (!cols.some(c => c.column_name === "start_hour"))
        await sql`ALTER TABLE jams ADD COLUMN IF NOT EXISTS start_hour int NOT NULL DEFAULT 0`;
      return;
    }
    await sql`CREATE TABLE IF NOT EXISTS jams (
      slug text PRIMARY KEY,
      title text NOT NULL,
      created_by text NOT NULL,
      members jsonb NOT NULL DEFAULT '[]',
      songs jsonb NOT NULL DEFAULT '[]',
      note text NOT NULL DEFAULT '',
      place text NOT NULL DEFAULT '',
      duration int NOT NULL DEFAULT 2,
      start_hour int NOT NULL DEFAULT 0,
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
  duration: Number(r.duration) || 2, startHour: Number(r.start_hour) || 0, status: r.status, fixedSlot: r.fixed_slot || "", rsvp: jparse(r.rsvp, {}),
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
    await sql`INSERT INTO jams (slug, title, created_by, members, songs, note, place, duration, start_hour, status, fixed_slot, rsvp, created_at, updated_at)
      VALUES (${j.slug}, ${j.title}, ${j.createdBy}, ${sql.json(j.members)}, ${sql.json(j.songs)}, ${j.note||""}, ${j.place||""},
              ${j.duration||2}, ${j.startHour||0}, ${j.status}, ${j.fixedSlot||""}, ${sql.json(j.rsvp||{})}, ${j.createdAt}, ${j.updatedAt})
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title, members = EXCLUDED.members, songs = EXCLUDED.songs, note = EXCLUDED.note, place = EXCLUDED.place,
        duration = EXCLUDED.duration, start_hour = EXCLUDED.start_hour, status = EXCLUDED.status, fixed_slot = EXCLUDED.fixed_slot, rsvp = EXCLUDED.rsvp, updated_at = EXCLUDED.updated_at`;
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

/* ---------- 합주 제안 (모집 글) ---------- */
let propReadyP = null;
function ensureProposals(){
  if (!sql) return null;
  if (!propReadyP) propReadyP = (async () => {
    await ensure();
    const cols = (await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'proposals'`).map(c => c.column_name);
    if (cols.length){
      if (!cols.includes("accepting")) await sql`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS accepting boolean NOT NULL DEFAULT true`;
      if (!cols.includes("show_slug")) await sql`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS show_slug text NOT NULL DEFAULT ''`;
      if (!cols.includes("team")) await sql`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS team jsonb NOT NULL DEFAULT '{}'::jsonb`;
      return;
    }
    await sql`CREATE TABLE IF NOT EXISTS proposals (
      slug text PRIMARY KEY,
      title text NOT NULL,
      body text NOT NULL DEFAULT '',
      songs jsonb NOT NULL DEFAULT '[]',
      want jsonb NOT NULL DEFAULT '{}',
      when_text text NOT NULL DEFAULT '',
      created_by text NOT NULL,
      status text NOT NULL DEFAULT 'open',
      jam_slug text NOT NULL DEFAULT '',
      interest jsonb NOT NULL DEFAULT '[]',
      applicants jsonb NOT NULL DEFAULT '{}',
      accepting boolean NOT NULL DEFAULT true,
      show_slug text NOT NULL DEFAULT '',
      team jsonb NOT NULL DEFAULT '{}',
      created_at text NOT NULL,
      updated_at text NOT NULL
    )`;
    await sql`ALTER TABLE proposals ENABLE ROW LEVEL SECURITY`;
  })();
  return propReadyP;
}
const rowToProposal = r => ({
  slug: r.slug, title: r.title, body: r.body || "", songs: jparse(r.songs, []), want: jparse(r.want, {}),
  whenText: r.when_text || "", createdBy: r.created_by, status: r.status, jamSlug: r.jam_slug || "",
  interest: jparse(r.interest, []), applicants: jparse(r.applicants, {}),
  accepting: r.accepting !== false, showSlug: r.show_slug || "", team: jparse(r.team, {}),
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export async function listProposals(){
  if (sql){
    await ensureProposals();
    return (await sql`SELECT * FROM proposals ORDER BY created_at DESC LIMIT 500`).map(rowToProposal);
  }
  return Object.values(fload().proposals || {}).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export async function getProposal(slug){
  if (sql){
    await ensureProposals();
    const rows = await sql`SELECT * FROM proposals WHERE slug = ${slug}`;
    return rows.length ? rowToProposal(rows[0]) : null;
  }
  return (fload().proposals || {})[slug] || null;
}
export async function putProposal(p){
  if (sql){
    await ensureProposals();
    await sql`INSERT INTO proposals (slug, title, body, songs, want, when_text, created_by, status, jam_slug, interest, applicants, accepting, show_slug, team, created_at, updated_at)
      VALUES (${p.slug}, ${p.title}, ${p.body||""}, ${sql.json(p.songs)}, ${sql.json(p.want||{})}, ${p.whenText||""}, ${p.createdBy},
              ${p.status}, ${p.jamSlug||""}, ${sql.json(p.interest||[])}, ${sql.json(p.applicants||{})}, ${p.accepting !== false}, ${p.showSlug||""}, ${sql.json(p.team||{})}, ${p.createdAt}, ${p.updatedAt})
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title, body = EXCLUDED.body, songs = EXCLUDED.songs, want = EXCLUDED.want, when_text = EXCLUDED.when_text,
        status = EXCLUDED.status, jam_slug = EXCLUDED.jam_slug, interest = EXCLUDED.interest, applicants = EXCLUDED.applicants,
        accepting = EXCLUDED.accepting, show_slug = EXCLUDED.show_slug, team = EXCLUDED.team, updated_at = EXCLUDED.updated_at`;
    return;
  }
  const d = fload(); d.proposals ||= {}; d.proposals[p.slug] = p; fsave(d);
}
export async function deleteProposal(slug){
  if (sql){
    await ensureProposals();
    await sql`DELETE FROM proposals WHERE slug = ${slug}`;
    return;
  }
  const d = fload(); if (d.proposals) delete d.proposals[slug]; fsave(d);
}

/* ---------- 채팅: 메시지·신고·채팅 정지 ---------- */
let chatReadyP = null;
function ensureChat(){
  if (!sql) return null;
  if (!chatReadyP) chatReadyP = (async () => {
    await ensure();
    const t = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name IN ('chat_messages','chat_reports','chat_bans')`;
    if (t.length === 3) return;
    await sql`CREATE TABLE IF NOT EXISTS chat_messages (
      n bigserial PRIMARY KEY,
      room text NOT NULL,
      author_slug text NOT NULL,
      author_id text NOT NULL,
      body text NOT NULL,
      at text NOT NULL,
      hidden boolean NOT NULL DEFAULT false,
      hidden_by text NOT NULL DEFAULT '',
      flag text NOT NULL DEFAULT ''
    )`;
    await sql`CREATE INDEX IF NOT EXISTS chat_messages_room ON chat_messages (room, n)`;
    await sql`CREATE TABLE IF NOT EXISTS chat_reports (
      n bigserial PRIMARY KEY,
      room text NOT NULL,
      msg_n bigint NOT NULL,
      by_slug text NOT NULL,
      by_id text NOT NULL,
      reason text NOT NULL DEFAULT '',
      at text NOT NULL,
      status text NOT NULL DEFAULT 'new'
    )`;
    await sql`CREATE TABLE IF NOT EXISTS chat_bans (
      slug text PRIMARY KEY,
      until text NOT NULL,
      by_admin text NOT NULL DEFAULT '',
      reason text NOT NULL DEFAULT '',
      at text NOT NULL
    )`;
    for (const name of ["chat_messages", "chat_reports", "chat_bans"]) await sql`ALTER TABLE ${sql(name)} ENABLE ROW LEVEL SECURITY`;
  })();
  return chatReadyP;
}
const rowToMsg = r => ({ n: Number(r.n), room: r.room, authorSlug: r.author_slug, authorId: r.author_id, body: r.body, at: r.at,
  hidden: !!r.hidden, hiddenBy: r.hidden_by || "", flag: r.flag || "" });
function fchat(d){ d.chat ||= { messages: [], reports: [], bans: {} }; return d.chat; }

export async function addMessage(m){
  if (sql){
    await ensureChat();
    const [r] = await sql`INSERT INTO chat_messages (room, author_slug, author_id, body, at, flag)
      VALUES (${m.room}, ${m.authorSlug}, ${m.authorId}, ${m.body}, ${m.at}, ${m.flag || ""}) RETURNING *`;
    return rowToMsg(r);
  }
  const d = fload(), c = fchat(d);
  const n = c.messages.reduce((x, y) => Math.max(x, y.n), 0) + 1;
  const row = { n, hidden: false, hiddenBy: "", flag: "", ...m };
  c.messages.push(row); c.messages = c.messages.slice(-5000); fsave(d); return row;
}
export async function listMessages(room, after = 0, limit = 100){
  if (sql){
    await ensureChat();
    const rows = after
      ? await sql`SELECT * FROM chat_messages WHERE room = ${room} AND n > ${after} ORDER BY n ASC LIMIT ${limit}`
      : await sql`SELECT * FROM (SELECT * FROM chat_messages WHERE room = ${room} ORDER BY n DESC LIMIT ${limit}) t ORDER BY n ASC`;
    return rows.map(rowToMsg);
  }
  const all = fchat(fload()).messages.filter(x => x.room === room);
  return after ? all.filter(x => x.n > after).slice(0, limit) : all.slice(-limit);
}
export async function getMessage(n){
  if (sql){
    await ensureChat();
    const rows = await sql`SELECT * FROM chat_messages WHERE n = ${n}`;
    return rows.length ? rowToMsg(rows[0]) : null;
  }
  return fchat(fload()).messages.find(x => x.n === n) || null;
}
export async function hideMessage(n, by, hidden = true){
  if (sql){
    await ensureChat();
    await sql`UPDATE chat_messages SET hidden = ${hidden}, hidden_by = ${hidden ? by : ""} WHERE n = ${n}`;
    return;
  }
  const d = fload(), m = fchat(d).messages.find(x => x.n === n);
  if (m){ m.hidden = hidden; m.hiddenBy = hidden ? by : ""; fsave(d); }
}
// 도배 방지용: 최근 N분 동안 보낸 수와 마지막 전송 시각
export async function authorRecent(slug, sinceIso){
  if (sql){
    await ensureChat();
    const [r] = await sql`SELECT count(*)::int AS c, max(at) AS last FROM chat_messages WHERE author_slug = ${slug} AND at > ${sinceIso}`;
    return { count: r.c, last: r.last || "" };
  }
  const mine = fchat(fload()).messages.filter(x => x.authorSlug === slug && x.at > sinceIso);
  return { count: mine.length, last: mine.length ? mine[mine.length - 1].at : "" };
}
// 방별 요약(메시지 수·마지막 번호·시각) — 안 읽은 메시지 배지용
export async function roomSummary(rooms){
  if (!rooms.length) return {};
  const out = {};
  if (sql){
    await ensureChat();
    const rows = await sql`SELECT room, count(*)::int AS c, max(n)::int AS last_n, max(at) AS last_at FROM chat_messages
      WHERE room IN ${sql(rooms)} AND hidden = false GROUP BY room`;
    for (const r of rows) out[r.room] = { count: r.c, lastN: r.last_n, lastAt: r.last_at };
    return out;
  }
  for (const m of fchat(fload()).messages) if (rooms.includes(m.room) && !m.hidden){
    const o = out[m.room] ||= { count: 0, lastN: 0, lastAt: "" };
    o.count++; o.lastN = Math.max(o.lastN, m.n); o.lastAt = m.at > o.lastAt ? m.at : o.lastAt;
  }
  return out;
}

export async function addReport(r){
  const row = { ...r, at: new Date().toISOString(), status: "new" };
  if (sql){
    await ensureChat();
    await sql`INSERT INTO chat_reports (room, msg_n, by_slug, by_id, reason, at) VALUES (${r.room}, ${r.msgN}, ${r.bySlug}, ${r.byId}, ${r.reason || ""}, ${row.at})`;
    return;
  }
  const d = fload(), c = fchat(d);
  row.n = c.reports.reduce((x, y) => Math.max(x, y.n), 0) + 1;
  c.reports.push(row); fsave(d);
}
export async function listReports(){
  if (sql){
    await ensureChat();
    const rows = await sql`SELECT r.*, m.body AS msg_body, m.author_slug AS msg_author_slug, m.author_id AS msg_author_id, m.hidden AS msg_hidden
      FROM chat_reports r LEFT JOIN chat_messages m ON m.n = r.msg_n ORDER BY r.n DESC LIMIT 300`;
    return rows.map(r => ({ n: Number(r.n), room: r.room, msgN: Number(r.msg_n), bySlug: r.by_slug, byId: r.by_id, reason: r.reason, at: r.at, status: r.status,
      msg: r.msg_body == null ? null : { body: r.msg_body, authorSlug: r.msg_author_slug, authorId: r.msg_author_id, hidden: !!r.msg_hidden } }));
  }
  const c = fchat(fload());
  return [...c.reports].reverse().map(r => { const m = c.messages.find(x => x.n === r.msgN);
    return { ...r, msg: m ? { body: m.body, authorSlug: m.authorSlug, authorId: m.authorId, hidden: m.hidden } : null }; });
}
export async function updateReport(n, status){
  if (sql){ await ensureChat(); await sql`UPDATE chat_reports SET status = ${status} WHERE n = ${n}`; return; }
  const d = fload(), r = fchat(d).reports.find(x => x.n === n); if (r){ r.status = status; fsave(d); }
}
export async function getBan(slug){
  if (sql){
    await ensureChat();
    const rows = await sql`SELECT * FROM chat_bans WHERE slug = ${slug} AND until > ${new Date().toISOString()}`;
    return rows.length ? { slug, until: rows[0].until, by: rows[0].by_admin, reason: rows[0].reason, at: rows[0].at } : null;
  }
  const b = fchat(fload()).bans[slug];
  return b && b.until > new Date().toISOString() ? b : null;
}
export async function setBan(b){
  if (sql){
    await ensureChat();
    await sql`INSERT INTO chat_bans (slug, until, by_admin, reason, at) VALUES (${b.slug}, ${b.until}, ${b.by}, ${b.reason || ""}, ${b.at})
      ON CONFLICT (slug) DO UPDATE SET until = EXCLUDED.until, by_admin = EXCLUDED.by_admin, reason = EXCLUDED.reason, at = EXCLUDED.at`;
    return;
  }
  const d = fload(); fchat(d).bans[b.slug] = b; fsave(d);
}
export async function deleteBan(slug){
  if (sql){ await ensureChat(); await sql`DELETE FROM chat_bans WHERE slug = ${slug}`; return; }
  const d = fload(); delete fchat(d).bans[slug]; fsave(d);
}
export async function listBans(){
  const now = new Date().toISOString();
  if (sql){
    await ensureChat();
    return (await sql`SELECT * FROM chat_bans WHERE until > ${now} ORDER BY until`).map(r => ({ slug: r.slug, until: r.until, by: r.by_admin, reason: r.reason, at: r.at }));
  }
  return Object.values(fchat(fload()).bans).filter(b => b.until > now);
}

/* ---------- 공연 ---------- */
let showReadyP = null;
function ensureShows(){
  if (!sql) return null;
  if (!showReadyP) showReadyP = (async () => {
    await ensure();
    const t = await sql`SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'shows'`;
    if (t.length) return;
    await sql`CREATE TABLE IF NOT EXISTS shows (
      slug text PRIMARY KEY,
      title text NOT NULL,
      date text NOT NULL DEFAULT '',
      time_text text NOT NULL DEFAULT '',
      venue text NOT NULL DEFAULT '',
      description text NOT NULL DEFAULT '',
      recruit_start text NOT NULL DEFAULT '',
      recruit_end text NOT NULL DEFAULT '',
      max_teams int NOT NULL DEFAULT 0,
      status text NOT NULL DEFAULT 'recruiting',
      participants jsonb NOT NULL DEFAULT '[]',
      team_order jsonb NOT NULL DEFAULT '[]',
      created_by text NOT NULL DEFAULT '',
      created_at text NOT NULL,
      updated_at text NOT NULL
    )`;
    await sql`ALTER TABLE shows ENABLE ROW LEVEL SECURITY`;
  })();
  return showReadyP;
}
const rowToShow = r => ({
  slug: r.slug, title: r.title, date: r.date || "", timeText: r.time_text || "", venue: r.venue || "", description: r.description || "",
  recruitStart: r.recruit_start || "", recruitEnd: r.recruit_end || "", maxTeams: Number(r.max_teams) || 0, status: r.status,
  participants: jparse(r.participants, []), teamOrder: jparse(r.team_order, []), createdBy: r.created_by || "",
  createdAt: r.created_at, updatedAt: r.updated_at,
});
export async function listShows(){
  if (sql){
    await ensureShows();
    return (await sql`SELECT * FROM shows ORDER BY date DESC, created_at DESC LIMIT 200`).map(rowToShow);
  }
  return Object.values(fload().shows || {}).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
export async function getShow(slug){
  if (sql){
    await ensureShows();
    const rows = await sql`SELECT * FROM shows WHERE slug = ${slug}`;
    return rows.length ? rowToShow(rows[0]) : null;
  }
  return (fload().shows || {})[slug] || null;
}
export async function putShow(s){
  if (sql){
    await ensureShows();
    await sql`INSERT INTO shows (slug, title, date, time_text, venue, description, recruit_start, recruit_end, max_teams, status, participants, team_order, created_by, created_at, updated_at)
      VALUES (${s.slug}, ${s.title}, ${s.date||""}, ${s.timeText||""}, ${s.venue||""}, ${s.description||""}, ${s.recruitStart||""}, ${s.recruitEnd||""},
              ${s.maxTeams||0}, ${s.status}, ${sql.json(s.participants||[])}, ${sql.json(s.teamOrder||[])}, ${s.createdBy||""}, ${s.createdAt}, ${s.updatedAt})
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title, date = EXCLUDED.date, time_text = EXCLUDED.time_text, venue = EXCLUDED.venue, description = EXCLUDED.description,
        recruit_start = EXCLUDED.recruit_start, recruit_end = EXCLUDED.recruit_end, max_teams = EXCLUDED.max_teams, status = EXCLUDED.status,
        participants = EXCLUDED.participants, team_order = EXCLUDED.team_order, updated_at = EXCLUDED.updated_at`;
    return;
  }
  const d = fload(); d.shows ||= {}; d.shows[s.slug] = s; fsave(d);
}
export async function deleteShow(slug){
  if (sql){ await ensureShows(); await sql`DELETE FROM shows WHERE slug = ${slug}`; return; }
  const d = fload(); if (d.shows) delete d.shows[slug]; fsave(d);
}
