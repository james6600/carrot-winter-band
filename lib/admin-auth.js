// 관리자(backstage) 인증 도구: 비밀번호 해시, TOTP(RFC 6238), 세션 토큰·쿠키.
import crypto from "node:crypto";

export function hashPw(pw){
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(String(pw), salt, 32);
  return "scrypt$" + salt.toString("hex") + "$" + h.toString("hex");
}
export function checkPw(pw, stored){
  const [kind, salt, hash] = String(stored || "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const got = crypto.scryptSync(String(pw), Buffer.from(salt, "hex"), 32);
  const exp = Buffer.from(hash, "hex");
  return exp.length === got.length && crypto.timingSafeEqual(got, exp);
}

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function b32encode(buf){
  let bits = 0, val = 0, out = "";
  for (const byte of buf){
    val = ((val << 8) | byte) & 0xffff; bits += 8;
    while (bits >= 5){ out += B32[(val >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}
export function b32decode(str){
  const s = String(str).toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, val = 0; const out = [];
  for (const c of s){
    val = ((val << 5) | B32.indexOf(c)) & 0xffff; bits += 5;
    if (bits >= 8){ out.push((val >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
export function hotp(secret, counter){
  const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", b32decode(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(n % 1000000).padStart(6, "0");
}
// 성공하면 사용한 시간 단계(30초 단위)를, 실패하면 0을 돌려준다. lastStep 이하 단계는 재사용 방지로 거부.
export function verifyTotp(secret, code, lastStep = 0, at = Date.now()){
  const c = String(code || "").replace(/\s/g, "");
  if (!secret || !/^\d{6}$/.test(c)) return 0;
  const step = Math.floor(at / 30000);
  for (const w of [0, -1, 1]){
    const s = step + w;
    if (s <= lastStep) continue;
    if (crypto.timingSafeEqual(Buffer.from(hotp(secret, s)), Buffer.from(c))) return s;
  }
  return 0;
}
export const newSecret = () => b32encode(crypto.randomBytes(20));
export const newToken = () => crypto.randomBytes(32).toString("base64url");
export const tokenHash = t => crypto.createHash("sha256").update(String(t)).digest("hex");
export function otpauthUri(id, secret){
  const issuer = "CarrotBandMaker";
  return "otpauth://totp/" + encodeURIComponent(issuer + ":" + id) + "?secret=" + secret
    + "&issuer=" + encodeURIComponent(issuer) + "&algorithm=SHA1&digits=6&period=30";
}
export function parseCookies(req){
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")){
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
export function sessionCookie(token, maxAge, secure){
  return "bs_session=" + (token || "") + "; Path=/api/backstage; HttpOnly; SameSite=Strict; Max-Age=" + maxAge + (secure ? "; Secure" : "");
}
