// vuln-lab — intentionally vulnerable local web app (fixture for the portfolio walkthrough).
// Run:  node vuln-lab/server.mjs
// Port: 8790 (override with PORT env var)
//
// This app is DELIBERATELY insecure and must only ever run on localhost for the
// purpose of demonstrating each vulnerability in a controlled, authorized lab.
// It is the "target" fixture; the attacker is the reader of WALKTHROUGH.md.
import http from 'node:http';
import { exec } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT) || 8790;
const db = new DatabaseSync(':memory:');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

// ── schema + seed ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username TEXT,
    password TEXT,
    role TEXT
  );
  CREATE TABLE flags (
    id INTEGER PRIMARY KEY,
    name TEXT,
    value TEXT
  );
`);
db.prepare(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`).run('admin', 'admin123', 'admin');
db.prepare(`INSERT INTO users (username, password, role) VALUES (?, ?, ?)`).run('b3n3d1ck', 'hunter2', 'user');
db.prepare(`INSERT INTO flags (name, value) VALUES (?, ?)`).run('lab-flag', 'FLAG{sqli_union_is_just_select_with_extra_steps}');

// ── intentionally vulnerable query (no prepared statements, no escaping) ──
function login(username, password) {
  // VULN: string concatenation into SQL → classic authentication bypass + UNION.
  const q = `SELECT id, username, role FROM users WHERE username = '${username}' AND password = '${password}'`;
  try {
    return db.prepare(q).all();
  } catch (e) {
    return { error: e.message };
  }
}

function userById(id) {
  // VULN: no authz check + raw interpolation → IDOR.
  try {
    return db.prepare(`SELECT id, username, role FROM users WHERE id = ${id}`).all();
  } catch (e) {
    return { error: e.message };
  }
}

// ── helpers ────────────────────────────────────────────────────────────────
const readBody = (req) => new Promise((resolve) => {
  let b = '';
  req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
  req.on('end', () => resolve(b));
});

// Minimal multipart/form-data parser for the lab's single-file upload endpoint.
function parseMultipart(bodyBuf, boundary) {
  const delim = Buffer.from('--' + boundary);
  const parts = [];
  let pos = bodyBuf.indexOf(delim);
  while (pos !== -1) {
    const next = bodyBuf.indexOf(delim, pos + delim.length);
    const segEnd = next === -1 ? bodyBuf.length : next;
    const seg = bodyBuf.slice(pos, segEnd);
    const headerEnd = seg.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const header = seg.slice(0, headerEnd).toString('utf8');
      let content = seg.slice(headerEnd + 4);
      if (content.length >= 2 && content[content.length - 2] === 0x0d && content[content.length - 1] === 0x0a) content = content.slice(0, -2);
      const name = header.match(/name="([^"]+)"/)?.[1];
      const filename = header.match(/filename="([^"]+)"/)?.[1];
      if (name) parts.push({ name, filename, content });
    }
    if (next === -1) break;
    pos = next;
  }
  return parts;
}

const send = (res, code, body, type = 'text/html') => {
  res.writeHead(code, { 'Content-Type': type + '; charset=utf-8' });
  res.end(body);
};

const sendJson = (res, code, obj) => send(res, code, JSON.stringify(obj, null, 2), 'application/json');

const page = (title, html) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:ui-monospace,monospace;background:#111;color:#e8e8e8;max-width:820px;margin:40px auto;padding:0 20px}
h1{color:#c30044}label{display:block;margin-top:12px}input,button{font-family:inherit;margin-top:4px;padding:8px;width:100%;box-sizing:border-box}
button{background:#c30044;color:#fff;border:0;cursor:pointer}code{background:#222;padding:2px 6px;border-radius:4px}
.muted{color:#888}.err{color:#f66}</style></head><body>${html}</body></html>`;

// ── routes ─────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');

  if (u.pathname === '/' && req.method === 'GET') {
    return send(res, 200, page('Vuln Lab — portal', `
      <h1>Vuln Lab — internal portal</h1>
      <p class="muted">A deliberately vulnerable fixture. Nothing here is real.</p>
      <p><a href="/login" style="color:#c30044">Login</a> · <a href="/api/users" style="color:#c30044">API</a> · <a href="/upload" style="color:#c30044">Upload</a> · <a href="/search?q=hi" style="color:#c30044">Search</a></p>
      <p class="muted">Read WALKTHROUGH.md for the attacker-perspective guide.</p>`));
  }

  // ── login (SQLi) ─────────────────────────────────────────────────────────
  if (u.pathname === '/login' && req.method === 'GET') {
    return send(res, 200, page('Login', `
      <h1>Login</h1>
      <form method="POST" action="/login">
        <label>Username<input name="username" value=""></label>
        <label>Password<input name="password" type="password" value=""></label>
        <button type="submit">Sign in</button>
      </form>
      <p class="muted">VULN: SQL injection (auth bypass, UNION, boolean, error-based).</p>`));
  }

  if (u.pathname === '/login' && req.method === 'POST') {
    const body = await readBody(req);
    const p = new URLSearchParams(body);
    const username = p.get('username') || '';
    const password = p.get('password') || '';
    const rows = login(username, password);
    if (rows && !rows.error && rows.length) {
      const r = rows[0];
      return send(res, 200, page('Logged in', `
        <h1>Welcome, ${String(r.username).replace(/[<>&]/g, '')}</h1>
        <p>role: <b>${String(r.role).replace(/[<>&]/g, '')}</b> · id: ${r.id}</p>
        <p class="muted">VULN: reflected fields above are not escaped → stored/reflected XSS if username contains HTML.</p>
        <p><a href="/admin" style="color:#c30044">Admin panel</a></p>`));
    }
    return send(res, 200, page('Login failed', `
      <h1>Login failed</h1>
      ${rows?.error ? `<p class="err">SQL error (leaked): <code>${rows.error.replace(/[<>&]/g, '')}</code></p>` : '<p class="muted">Invalid credentials.</p>'}
      <p class="muted">VULN: error-based SQLi — the DB error is reflected to the client.</p>
      <p><a href="/login" style="color:#c30044">Back</a></p>`));
  }

  // ── exposed API (200) ────────────────────────────────────────────────────
  if (u.pathname === '/api/users' && req.method === 'GET') {
    // VULN: unauthenticated mass data exposure.
    return sendJson(res, 200, db.prepare('SELECT id, username, role FROM users').all());
  }

  // ── IDOR ─────────────────────────────────────────────────────────────────
  if (u.pathname === '/api/user' && req.method === 'GET') {
    const id = u.searchParams.get('id') || '1';
    return sendJson(res, 200, userById(id));
  }

  // ── admin panel + RCE ────────────────────────────────────────────────────
  if (u.pathname === '/admin' && req.method === 'GET') {
    return send(res, 200, page('Admin', `
      <h1>Admin panel</h1>
      <p class="muted">VULN: no real access control. Any logged-in (or bypassed) session reaches here.</p>
      <form method="POST" action="/admin/ping">
        <label>Host to ping<input name="host" value="127.0.0.1"></label>
        <button type="submit">Run</button>
      </form>
      <p class="muted">VULN: command injection — the host value is passed to a shell.</p>`));
  }

  if (u.pathname === '/admin/ping' && req.method === 'POST') {
    const body = await readBody(req);
    const host = new URLSearchParams(body).get('host') || '127.0.0.1';
    // VULN: unsanitized shell argument → command injection / RCE.
    exec(`ping -n 1 ${host}`, { timeout: 4000 }, (err, stdout, stderr) => {
      send(res, 200, page('Ping result', `
        <h1>ping ${String(host).replace(/[<>&]/g, '')}</h1>
        <pre>${(stdout || stderr || '').replace(/[<>&]/g, '')}</pre>
        <p class="muted">VULN: command injection. Try host = <code>127.0.0.1 &amp; whoami</code></p>`));
    });
    return;
  }

  // ── exposed secret file ──────────────────────────────────────────────────
  if (u.pathname === '/.env' && req.method === 'GET') {
    return send(res, 200, 'DB_PASSWORD=lab-secret-4f2c\nAPI_KEY=sk_live_9x8y7z\nJWT_SECRET=change-me\n', 'text/plain');
  }

  // ── unrestricted file upload → webshell drop ──────────────────────────────
  if (u.pathname === '/upload' && req.method === 'GET') {
    return send(res, 200, page('Upload', `
      <h1>Upload</h1>
      <form method="POST" action="/upload" enctype="multipart/form-data">
        <label>File<input name="file" type="file"></label>
        <button type="submit">Upload</button>
      </form>
      <p class="muted">VULN: unrestricted file upload — no extension/MIME/contents check. Anything saved to /uploads/ is served back.</p>`));
  }

  if (u.pathname === '/upload' && req.method === 'POST') {
    const ct = req.headers['content-type'] || '';
    const boundary = ct.match(/boundary=(.+)$/)?.[1]?.replace(/["';]/g, '');
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const bodyBuf = Buffer.concat(chunks);
      const file = boundary ? parseMultipart(bodyBuf, boundary).find((p) => p.filename) : null;
      if (file && file.content && file.content.length) {
        const name = path.basename(file.filename || 'shell.php');
        writeFileSync(path.join(UPLOAD_DIR, name), file.content);
        return send(res, 200, page('Uploaded', `
          <h1>Uploaded</h1>
          <p>Saved as <code>/uploads/${name}</code> (${file.content.length} bytes).</p>
          <p class="muted">VULN: no filename/extension sanitization — a PHP webshell is accepted as-is. (This demo serves it as text; a real PHP runtime would execute it.)</p>
          <p><a href="/uploads/${name}" style="color:#c30044">View uploaded file</a></p>`));
      }
      return send(res, 400, 'no file received');
    });
    return;
  }

  if (u.pathname.startsWith('/uploads/') && req.method === 'GET') {
    const name = path.basename(decodeURIComponent(u.pathname.slice('/uploads/'.length)));
    const full = path.join(UPLOAD_DIR, name);
    if (!existsSync(full)) return send(res, 404, 'not found');
    return send(res, 200, readFileSync(full, 'utf8'), 'text/plain');
  }

  // ── reflected XSS ─────────────────────────────────────────────────────────
  if (u.pathname === '/search' && req.method === 'GET') {
    const q = u.searchParams.get('q') || '';
    // VULN: the query is echoed back without escaping → reflected XSS.
    return send(res, 200, page('Search', `
      <h1>Search</h1>
      <p>Results for: ${q}</p>
      <p class="muted">VULN: reflected XSS — the <code>q</code> value is written into the page unescaped.</p>`));
  }

  // ── open redirect ────────────────────────────────────────────────────────
  if (u.pathname === '/redirect' && req.method === 'GET') {
    const to = u.searchParams.get('url');
    if (to) { res.writeHead(302, { Location: to }); return res.end(); }
    return send(res, 200, 'usage: /redirect?url=https://example.com');
  }

  send(res, 404, 'not found');
});

server.listen(PORT, '127.0.0.1', () => console.log(`vuln-lab listening on http://127.0.0.1:${PORT}`));
