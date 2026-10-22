import crypto from "node:crypto";

export const GENRE_KEYS = [
  "brit","modern","indie","punk","emo","grunge","hardcore","metal",
  "hardrock","blues","jazz","ballad","kpop","jrock","citypop","folk",
];
export const PART_KEYS = ["vocal","guitar","bass","drum","keys","etc"];

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
