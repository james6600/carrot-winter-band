// 로컬 개발 서버: 정적 파일 + /api 서버리스 함수 흉내 (Vercel 없이 테스트)
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const PORT = process.env.PORT || 3000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://localhost");

  if (u.pathname.startsWith("/api/")){
    const name = u.pathname.slice(5).replace(/[^a-z0-9_-]/gi, "");
    const file = path.join(root, "api", name + ".js");
    if (!fs.existsSync(file)){ res.statusCode = 404; res.end("{}"); return; }
    try {
      const mod = await import(pathToFileURL(file).href + "?t=" + Date.now());
      res.status = c => { res.statusCode = c; return res; };
      res.json = d => { res.setHeader("content-type", "application/json; charset=utf-8"); res.end(JSON.stringify(d)); };
      await mod.default(req, res);
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.end(JSON.stringify({ error: "dev", detail: String(e) }));
    }
    return;
  }

  let p = u.pathname === "/" ? "/index.html" : decodeURIComponent(u.pathname);
  const f = path.normalize(path.join(root, p));
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){
    res.statusCode = 404; res.end("not found"); return;
  }
  res.setHeader("content-type", TYPES[path.extname(f).toLowerCase()] || "application/octet-stream");
  res.end(fs.readFileSync(f));
}).listen(PORT, () => console.log("dev server: http://localhost:" + PORT));
