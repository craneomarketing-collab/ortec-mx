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
  ".xml": "application/xml; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".map": "application/json",
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0].split("#")[0] || "/");
  const rel = decoded.replace(/^\/+/, "");
  const abs = path.normalize(path.join(root, rel));
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (abs !== root && !abs.startsWith(rootWithSep)) return null;
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

const GTM_HEAD = "<!-- Google Tag Manager --><script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-WVL4N8TP');</script><!-- End Google Tag Manager -->";
const GTM_BODY = '<!-- Google Tag Manager (noscript) --><noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WVL4N8TP" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript><!-- End Google Tag Manager (noscript) -->';

function injectGtm(html) {
  if (html.indexOf("GTM-WVL4N8TP") !== -1) return html;
  let out = html;
  const headClose = out.match(/<head[^>]*>/i);
  if (headClose) {
    const i = out.indexOf(headClose[0]) + headClose[0].length;
    out = out.slice(0, i) + GTM_HEAD + out.slice(i);
  }
  const bodyOpen = out.match(/<body[^>]*>/i);
  if (bodyOpen) {
    const i = out.indexOf(bodyOpen[0]) + bodyOpen[0].length;
    out = out.slice(0, i) + GTM_BODY + out.slice(i);
  }
  return out;
}

// --- Canonical host / URL (SEO: "Duplicada sin canonical" en GSC) ---
const CANONICAL_ORIGIN = "https://www.ortec.mx";
const CANONICAL_HOST = "www.ortec.mx";
// Solo estos hosts se redirigen; localhost, IPs y health checks no se tocan.
const REDIRECT_HOSTS = new Set(["ortec.mx", "www.ortec.mx"]);

function requestHost(req) {
  const raw = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
  return raw.replace(/:\d+$/, "");
}

function requestProto(req) {
  const xf = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim().toLowerCase();
  if (xf) return xf;
  try {
    const v = JSON.parse(req.headers["cf-visitor"] || "{}");
    if (v && v.scheme) return String(v.scheme).toLowerCase();
  } catch {}
  return ""; // desconocido: no forzamos https para evitar bucles
}

function canonicalPath(urlPath) {
  const p = urlPath.replace(/\/+$/, "");
  return p === "" ? "/" : p;
}

function escAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function injectCanonical(html, urlPath) {
  const href = escAttr(CANONICAL_ORIGIN + canonicalPath(urlPath));
  let out = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, "").replace(/<meta[^>]+property=["']og:url["'][^>]*>/gi, "");
  const tags = '<link rel="canonical" href="' + href + '"/><meta property="og:url" content="' + href + '"/>';
  const head = out.match(/<head[^>]*>/i);
  if (!head) return out;
  const i = out.indexOf(head[0]) + head[0].length;
  return out.slice(0, i) + tags + out.slice(i);
}

function sendTextFile(res, filePath, contentType) {
  const body = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=300",
    "Content-Length": body.length,
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  try {
    const rawUrl = req.url || "/";
    const urlPath = rawUrl.split("?")[0].split("#")[0] || "/";
    const query = rawUrl.indexOf("?") !== -1 ? rawUrl.slice(rawUrl.indexOf("?")) : "";

    // 301 a https://www.ortec.mx (host sin www, http, o barra final en paginas)
    const host = requestHost(req);
    if (REDIRECT_HOSTS.has(host)) {
      const proto = requestProto(req);
      const ext0 = path.extname(urlPath);
      const wantPath = ext0 ? urlPath : canonicalPath(urlPath);
      if (host !== CANONICAL_HOST || proto === "http" || wantPath !== urlPath) {
        res.writeHead(301, { Location: CANONICAL_ORIGIN + wantPath + query, "Cache-Control": "public, max-age=3600" });
        res.end();
        return;
      }
    }

    // Explicit SEO assets (avoid SPA fallback and stream edge cases)
    if (urlPath === "/robots.txt") {
      const f = path.join(ROOT, "robots.txt");
      if (!isFile(f)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      sendTextFile(res, f, "text/plain; charset=utf-8");
      return;
    }
    if (urlPath === "/sitemap.xml" || urlPath === "/sitemap") {
      const f = path.join(ROOT, "sitemap.xml");
      if (!isFile(f)) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }
      // text/xml: Airo/CDN has been returning 500/block on application/xml for .xml
      sendTextFile(res, f, "text/xml; charset=utf-8");
      return;
    }

    let file = null;
    for (const c of candidates(urlPath)) {
      if (isFile(c)) {
        file = c;
        break;
      }
    }
    const extGuess = path.extname(urlPath).toLowerCase();
    const isAsset = [".css", ".js", ".png", ".jpg", ".jpeg", ".ico", ".svg", ".webp", ".gif", ".woff", ".woff2", ".map", ".json", ".webmanifest", ".txt", ".xml"].includes(extGuess);
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
    if (ext === ".html") {
      let html = fs.readFileSync(file, "utf8");
      html = injectGtm(html);
      html = injectCanonical(html, urlPath);
      const buf = Buffer.from(html, "utf8");
      res.writeHead(200, { "Content-Type": MIME[ext], "Content-Length": buf.length });
      res.end(buf);
      return;
    }
    if (ext === ".txt" || ext === ".xml" || ext === ".json" || ext === ".webmanifest" || ext === ".svg" || ext === ".css" || ext === ".js" || ext === ".map") {
      sendTextFile(res, file, MIME[ext] || "application/octet-stream");
      return;
    }
    const stat = fs.statSync(file);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Content-Length": stat.size,
    });
    fs.createReadStream(file).pipe(res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Server error");
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log("Server running on port " + PORT);
});
