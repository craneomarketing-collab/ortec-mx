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
      res.writeHead(200, { "Content-Type": MIME[ext] });
      res.end(html);
      return;
    }
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
