const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2',
};

function serveFrontend(req, res, json) {
  if (!['GET', 'HEAD'].includes(req.method)) return json(405, { error: 'Method not allowed' });
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { return json(400, { error: 'Invalid path' }); }
  if (pathname.includes('\0') || pathname.split('/').some(p => p.startsWith('.'))) return json(404, { error: 'Not found' });
  let filename = path.resolve(root, `.${pathname}`);
  if (!filename.startsWith(`${root}${path.sep}`) && filename !== root) return json(404, { error: 'Not found' });
  if (!fs.existsSync(filename) || !fs.statSync(filename).isFile()) {
    if (path.extname(pathname)) return json(404, { error: 'Not found' });
    filename = path.join(root, 'index.html');
  }
  if (!fs.existsSync(filename)) return json(503, { error: 'Frontend not built. Run npm run build.' });
  const bytes = fs.readFileSync(filename);
  res.writeHead(200, {
    'Content-Type': types[path.extname(filename)] || 'application/octet-stream',
    'Content-Length': bytes.length,
    'Cache-Control': path.extname(filename) === '.html' ? 'no-cache' : 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  });
  res.end(req.method === 'HEAD' ? undefined : bytes);
}

module.exports = { serveFrontend };
