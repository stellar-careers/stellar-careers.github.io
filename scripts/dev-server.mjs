import { createServer } from 'http';
import { readFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// 配信ディレクトリ。第1引数 or 環境変数 SERVE_DIR で差し替え可能（例: mock）。既定は docs。
const DOCS_DIR = join(__dirname, '..', process.argv[2] || process.env.SERVE_DIR || 'docs');
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let filePath = join(DOCS_DIR, url);

  try {
    const stat = statSync(filePath);
    if (stat.isDirectory()) filePath = join(filePath, 'index.html');
  } catch {}

  try {
    const data = readFileSync(filePath);
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  } catch {
    // Try adding /index.html for clean URLs (e.g., /about-us -> /about-us/index.html)
    try {
      const fallback = join(filePath, 'index.html');
      const data = readFileSync(fallback);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 Not Found</h1>');
    }
  }
});

server.listen(PORT, () => {
  console.log(`\n  Stellar Careers - Dev Server\n`);
  console.log(`  http://localhost:${PORT}/\n`);
});
