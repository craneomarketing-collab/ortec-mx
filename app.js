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
    const urlPath = (req.url || "/").split("?")[0].split("#")[0] || "/";

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
