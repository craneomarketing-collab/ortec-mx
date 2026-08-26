const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json",
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0] || "/");
  const rel = decoded.replace(/^\/+/, "");
  const abs = path.normalize(path.join(root, rel));
  if (!abs.startsWith(root)) return null;
  return abs;
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function candidates(urlPath) {
  const p = (urlPath.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  const list = [];
  if (p === "/") {
    list.push(path.join(ROOT, "index.html"));
    return list;
  }
  const abs = safeJoin(ROOT, p);
  if (abs) {
    list.push(abs);
    list.push(abs + ".html");
    list.push(path.join(abs, "index.html"));
  }
  return list;
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = req.url || "/";
    let file = null;
    for (const c of candidates(urlPath)) {
      if (isFile(c)) {
        file = c;
        break;
      }
    }
    const extGuess = path.extname((req.url || "").split("?")[0]).toLowerCase();
    const isAsset = [".css", ".js", ".png", ".jpg", ".jpeg", ".ico", ".svg", ".webp", ".gif", ".woff", ".woff2", ".map", ".json", ".webmanifest"].includes(extGuess);
    if (!file && !isAsset) {
      const fallback = path.join(ROOT, "index.html");
      if (isFile(fallback)) file = fallback;
    }
    if (!file) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Server error");
  }
});

server.listen(PORT, HOST, () => {
  console.log("Server running on port " + PORT);
});
