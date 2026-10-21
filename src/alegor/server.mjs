import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer as httpServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { capture, compare, listSnapshots, validateStore } from './core.mjs';

const webRoot = resolve(fileURLToPath(new URL('../../web/alegor/', import.meta.url)));
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

export function createServer({ projects, storeDir, port = 8874 }) {
  validateStore(storeDir, projects);
  const token = randomBytes(32).toString('hex');
  const allow = new Map(projects.map((project) => [project.id, project]));
  const server = httpServer(async (req, res) => {
    const boundPort = server.address()?.port ?? port;
    const host = String(req.headers.host ?? '').toLowerCase();
    const allowedHosts = new Set([`127.0.0.1:${boundPort}`, `localhost:${boundPort}`]);
    if (!allowedHosts.has(host)) {
      res.writeHead(421, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Only loopback Host headers are accepted.' }));
      return;
    }
    const nonce = randomBytes(16).toString('base64');
    const headers = {
      'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
      'Cache-Control': 'no-store', 'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
    };
    const send = (status, body, type = 'application/json; charset=utf-8') => {
      res.writeHead(status, { ...headers, 'Content-Type': type });
      res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
    };
    const localOrigins = new Set([`http://127.0.0.1:${boundPort}`, `http://localhost:${boundPort}`]);
    const apiAuth = () => {
      const origin = req.headers.origin;
      if (origin && !localOrigins.has(origin)) return false;
      return req.headers.authorization === `Bearer ${token}`;
    };
    try {
      const url = new URL(req.url, `http://127.0.0.1:${port}`);
      if (url.pathname.startsWith('/api/')) {
        if (!apiAuth()) return send(403, { error: 'Local session token or origin check failed.' });
        if (req.method === 'GET' && url.pathname === '/api/projects') {
          return send(200, { projects: projects.map(({ id, name, color }) => ({ id, name, color })) });
        }
        const match = url.pathname.match(/^\/api\/projects\/([a-z0-9-]+)(?:\/(snapshots|brief|capture))?$/i);
        if (!match || !allow.has(match[1])) return send(404, { error: 'Configured project endpoint not found.' });
        const project = allow.get(match[1]);
        if (req.method === 'GET' && match[2] === 'snapshots') return send(200, { snapshots: listSnapshots(project, storeDir).map(({ id, revision, generatedAt, projectName, color, git }) => ({ id, revision, generatedAt, projectName, color, git: { head: git.head, branch: git.branch, status: git.status } })) });
        if (req.method === 'GET' && match[2] === 'brief') {
          const current = url.searchParams.get('current');
          const baseline = url.searchParams.get('baseline');
          if (!current) return send(400, { error: 'Select a current snapshot.' });
          try { return send(200, { brief: compare(project, storeDir, current, baseline) }); }
          catch (error) { return send(400, { error: error.message }); }
        }
        if (req.method === 'POST' && match[2] === 'capture') {
          if (!localOrigins.has(req.headers.origin)) return send(403, { error: 'Snapshot writes require the same local browser origin.' });
          const snapshot = capture(project, storeDir);
          return send(201, { snapshot: { id: snapshot.id, revision: snapshot.revision, generatedAt: snapshot.generatedAt, reused: snapshot.reused, projectName: snapshot.projectName, color: snapshot.color, git: { head: snapshot.git.head, branch: snapshot.git.branch, status: snapshot.git.status } } });
        }
        return send(405, { error: 'Method not allowed.' });
      }
      if (req.method !== 'GET' || !['/', '/index.html', '/style.css', '/app.mjs'].includes(url.pathname)) return send(404, { error: 'Page not found.' });
      const path = url.pathname === '/' ? '/index.html' : url.pathname;
      const absolute = resolve(webRoot, `.${path}`);
      if (!(absolute === webRoot || absolute.startsWith(`${webRoot}${sep}`))) return send(404, { error: 'Page not found.' });
      let body = readFileSync(absolute, 'utf8');
      if (path === '/index.html') body = body.replace('__ALEGOR_TOKEN__', esc(token)).replaceAll('__ALEGOR_NONCE__', esc(nonce));
      return send(200, body, mime[extname(absolute)] ?? 'application/octet-stream');
    } catch (error) {
      return send(500, { error: error.message });
    }
  });
  server.alegorToken = token;
  return server;
}
