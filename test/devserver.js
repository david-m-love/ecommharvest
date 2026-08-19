// Local dev server: serves public/ and runs the api/ handlers in-process, so the
// form can be driven end to end without `vercel dev`.
//   node test/devserver.js [port]
//
// Mirrors the two vercel.json behaviours the form depends on: cleanUrls (/thanks
// resolves to thanks.html) and JSON body parsing.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.argv[2]) || 4322;
const ROOT = new URL('../public/', import.meta.url).pathname;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ics': 'text/calendar; charset=utf-8',
};

const handlers = {
  '/api/register': (await import('../api/register.js')).default,
  '/api/registrations': (await import('../api/registrations.js')).default,
};

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve(data);
      }
    });
  });
}

// Minimal stand-in for the Vercel response helpers the handlers use.
function wrap(res) {
  res.status = (c) => {
    res.statusCode = c;
    return res;
  };
  res.json = (b) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(b));
    return res;
  };
  res.send = (b) => {
    res.end(b);
    return res;
  };
  return res;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  const handler = handlers[pathname];
  if (handler) {
    req.body = req.method === 'POST' ? await readBody(req) : undefined;
    try {
      await handler(req, wrap(res));
    } catch (err) {
      console.error('handler threw', err);
      if (!res.writableEnded) wrap(res).status(500).json({ ok: false, error: 'Handler threw' });
    }
    return;
  }

  // cleanUrls: /thanks -> thanks.html
  let rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  if (!extname(rel)) rel += '.html';
  const file = normalize(join(ROOT, rel));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, () => console.log(`dev server on http://localhost:${PORT}`));
