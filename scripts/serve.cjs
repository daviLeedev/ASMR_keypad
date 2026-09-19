const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(process.cwd(), "dist");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".wav": "audio/wav",
  ".json": "application/json",
};
http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep)) file = path.join(root, "index.html");
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory())
      file = path.join(root, "index.html");
    res.setHeader(
      "Content-Type",
      mime[path.extname(file)] || "application/octet-stream",
    );
    fs.createReadStream(file).pipe(res);
  })
  .listen(8081, "127.0.0.1", () =>
    process.stdout.write("KeyLingo preview http://127.0.0.1:8081\n"),
  );
