import crypto from "node:crypto";

export const GENRE_KEYS = [
  "brit","modern","indie","punk","emo","grunge","hardcore","metal",
  "hardrock","blues","jazz","ballad","kpop","jrock","citypop","folk",
];
export const PART_KEYS = ["vocal","guitar","bass","drum","keys","etc"];

// 합주 가능 시간: 2시간 단위 칸, "YYYY-MM-DD@HH" 형식. app.js의 같은 상수·계산과 맞춰야 한다.
// 전체 기간 안에서 '이번 달부터 3개월'만 열린다 (10~12월, 11~1월, 12~2월 …). 날짜 기준은 한국 시간.
export const SLOT_HOURS = [10,12,14,16,18,20,22];
export const GLOBAL_START = "2026-10-01";
export const GLOBAL_END = "2027-12-31";
const pad = n => String(n).padStart(2, "0");
export function availWindow(now = new Date()){
  const kst = new Date(now.getTime() + 9 * 3600e3);
  const y = kst.getUTCFullYear(), m = kst.getUTCMonth();
  const first = `${y}-${pad(m + 1)}-01`;
  const endD = new Date(Date.UTC(y, m + 3, 0));
  const last = `${endD.getUTCFullYear()}-${pad(endD.getUTCMonth() + 1)}-${pad(endD.getUTCDate())}`;
  return { start: first < GLOBAL_START ? GLOBAL_START : first, end: last > GLOBAL_END ? GLOBAL_END : last };
}
const SLOT_RE = /^(\d{4}-\d{2}-\d{2})@(\d{2})$/;
export function cleanAvail(list){
  if (!Array.isArray(list)) return [];
  const { start, end } = availWindow();
  const out = new Set();
  for (const k of list){
    const m = SLOT_RE.exec(String(k));
    if (!m || m[1] < start || m[1] > end) continue;
    if (!SLOT_HOURS.includes(Number(m[2]))) continue;
    out.add(m[0]);
    if (out.size >= 600) break;
  }
  return [...out].sort();
}

export const GROUP_OF = {
  brit:"brit", modern:"brit",
  punk:"punkish", emo:"punkish", hardcore:"punkish", grunge:"punkish",
  metal:"heavy", hardrock:"heavy",
  indie:"indie", folk:"indie", citypop:"indie",
  jazz:"soul", blues:"soul",
  kpop:"pop", ballad:"pop",
  jrock:"jrockg",
};

export function computeStyle(genres, artists){
  const score = {};
  for (const k of genres) if (GROUP_OF[k]) score[GROUP_OF[k]] = (score[GROUP_OF[k]]||0)+2;
  for (const a of artists) for (const k of (a.genres||[])){
    const g = GROUP_OF[k]; if (g) score[g] = (score[g]||0)+1;
  }
  let best = null, bestN = -1;
  for (const [g,n] of Object.entries(score)) if (n > bestN){ best = g; bestN = n; }
  return best || "pop";
}

export function norm(s){
  return (s||"").normalize("NFC").toLowerCase().replace(/[\s\-_.·'’!?&,()]/g,"");
}
export function hashStr(s){
  let h = 5381;
  for (let i=0;i<s.length;i++){ h = ((h<<5)+h+s.charCodeAt(i))>>>0; }
  return h.toString(36);
}
export const memberSlug = id => "m_"+hashStr(norm(id));
export const artistSlug = name => "a_"+hashStr(norm(name));

export const sha = text =>
  crypto.createHash("sha256").update("karrot-winter:"+text).digest("hex");

export function strip(m){
  if (!m) return m;
  const { pw, ...rest } = m;
  return rest;
}

export function json(res, status, data){
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

export async function readBody(req){
  if (req.body !== undefined && req.body !== null){
    return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
