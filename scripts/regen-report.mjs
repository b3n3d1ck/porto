// Regenerate the telkomschools.sch.id recon report PDF with clean table wrapping.
// Reads data reconstructed from the original (messy) PDF; does NOT re-scan the target.
// Run: node scripts/regen-report.mjs
import PDFDocument from 'pdfkit';
import { writeFileSync } from 'node:fs';

const OUT = process.argv[2] || 'recon-telkomschools.sch.id.pdf';

// ── palette ────────────────────────────────────────────────────────────────
const RED = '#c30044';
const INK = '#201f24';
const MUTED = '#6f6c76';
const LINE = '#e0dde3';
const SOFT = '#eeecef';
const SEV_COLOR = { high: '#c30044', medium: '#c2763a', low: '#b0893a', info: '#2f8fa8' };

// ── reconstructed data ─────────────────────────────────────────────────────
const target = 'telkomschools.sch.id';
const meta = {
  generated: '2026-11-05 07:52:06',
  started: '2026-11-05 07:49:56',
  duration: '55.9s',
  engine: 'recon-pipeline v1.1 (b3n3d1ck)',
};

const summary = {
  hosts: 6,
  liveWeb: 6,
  openPorts: 12,
  loginPages: 91,
  findings: 103,
  bySeverity: { high: 1, medium: 6, low: 5, info: 91 },
};

// non-info findings (severity, title, host, detail)
const findings = [
  ['high', 'SQL injection (error-based disclosure)', 'mylms.telkomschools.sch.id',
    'A single-quote probe caused the server to return a database error at /wp-admin. Parameter username appears injectable — verify manually with an authorized test.'],
  ['medium', 'Missing security header: content-security-policy', 'data.telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['medium', 'Missing security header: content-security-policy', 'igracias.telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['medium', 'Sensitive file exposed: /phpinfo.php', 'mylms.telkomschools.sch.id', 'Endpoint returned HTTP 403 (5528 bytes) with a matching signature.'],
  ['medium', 'Missing security header: content-security-policy', 'ppdb.telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['medium', 'Missing security header: content-security-policy', 'telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['medium', 'Missing security header: content-security-policy', 'www.telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['low', 'Missing security header: permissions-policy', 'data.telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['low', 'Missing security header: permissions-policy', 'igracias.telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['low', 'Missing security header: permissions-policy', 'ppdb.telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['low', 'Missing security header: permissions-policy', 'telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
  ['low', 'Missing security header: permissions-policy', 'www.telkomschools.sch.id', 'Absence of this header weakens the browser-side posture.'],
];

const subdomains = [
  ['data.telkomschools.sch.id', '104.26.12.52, 172.67.70.26, 104.26.13.52'],
  ['igracias.telkomschools.sch.id', '172.67.70.26, 104.26.12.52, 104.26.13.52'],
  ['mylms.telkomschools.sch.id', '104.26.13.52, 104.26.12.52, 172.67.70.26'],
  ['ppdb.telkomschools.sch.id', '104.26.12.52, 172.67.70.26, 104.26.13.52'],
  ['telkomschools.sch.id', '172.67.70.26, 104.26.13.52, 104.26.12.52'],
  ['www.telkomschools.sch.id', '104.26.13.52, 172.67.70.26, 104.26.12.52'],
];

const dnsRecords = [
  ['data.telkomschools.sch.id', 'A 104.26.12.52,172.67.70.26,104.26.13.52  |  AAAA 2606:4700:20::681a:d34,2606:4700:20::681a:c34,2606:4700:20::ac43:461a'],
  ['igracias.telkomschools.sch.id', 'A 172.67.70.26,104.26.12.52,104.26.13.52  |  AAAA 2606:4700:20::ac43:461a,2606:4700:20::681a:d34,2606:4700:20::681a:c34'],
  ['mylms.telkomschools.sch.id', 'A 104.26.13.52,104.26.12.52,172.67.70.26  |  AAAA 2606:4700:20::681a:d34,2606:4700:20::ac43:461a,2606:4700:20::681a:c34'],
  ['ppdb.telkomschools.sch.id', 'A 104.26.12.52,172.67.70.26,104.26.13.52  |  AAAA 2606:4700:20::681a:c34,2606:4700:20::681a:d34,2606:4700:20::ac43:461a'],
  ['telkomschools.sch.id', 'A 172.67.70.26,104.26.13.52,104.26.12.52  |  AAAA 2606:4700:20::ac43:461a,2606:4700:20::681a:c34,2606:4700:20::681a:d34  |  MX alt2.aspmx.l.google.com,alt3.aspmx.l.google.com,aspmx.l.google.com,alt1.aspmx.l.google.com,alt4.aspmx.l.google.com  |  NS zariyah.ns.cloudflare.com,benedict.ns.cloudflare.com'],
  ['www.telkomschools.sch.id', 'A 104.26.13.52,172.67.70.26,104.26.12.52  |  AAAA 2606:4700:20::681a:d34,2606:4700:20::681a:c34,2606:4700:20::ac43:461a'],
];

const ports = [
  ['104.26.12.52', '80 HTTP, 443 HTTPS, 8080 HTTP-Alt, 8443 HTTPS-Alt'],
  ['172.67.70.26', '80 HTTP, 443 HTTPS, 8080 HTTP-Alt, 8443 HTTPS-Alt'],
  ['104.26.13.52', '80 HTTP, 443 HTTPS, 8080 HTTP-Alt, 8443 HTTPS-Alt'],
];

const httpHosts = [
  ['403', 'mylms.telkomschools.sch.id', 'Just a moment...', 'cloudflare, Cloudflare'],
  ['403', 'ppdb.telkomschools.sch.id', '—', 'cloudflare, Cloudflare'],
  ['403', 'data.telkomschools.sch.id', '—', 'cloudflare, Cloudflare'],
  ['200', 'telkomschools.sch.id', 'Telkom Schools – Yayasan Pendidikan Telkom', 'cloudflare, WordPress, Cloudflare'],
  ['200', 'igracias.telkomschools.sch.id', '—', 'cloudflare, Cloudflare'],
  ['200', 'www.telkomschools.sch.id', 'Telkom Schools – Yayasan Pendidikan Telkom', 'cloudflare, WordPress, Cloudflare'],
];

const WP = 'https://telkomschools.sch.id/wp-login.php';
const redir = (h) => `https://telkomschools.sch.id/wp-login.php?redirect_to=https%3A%2F%2F${h}%2Fwp-admin%2F&reauth=1`;

// login/admin pages: [host, path, status, redirectOrNull]
const login = [];
const L = (host, path, status, r = null) => login.push([host, path, status, r]);

const dataPaths = ['/login','/signin','/auth/login','/sign-in','/auth','/wp-login.php','/users/login','/user/login','/administrator','/admin','/admin/login','/wp-admin','/account/login','/oauth/authorize','/session','/admin.php','/sso','/panel','/cpanel','/phpmyadmin','/api/auth','/api/login','/pma','/dashboard','/graphql','/login.html'];
const dataStat = { '/login':403,'/signin':403,'/auth/login':403,'/sign-in':403,'/auth':403,'/wp-login.php':403,'/users/login':403,'/user/login':403,'/administrator':403,'/admin':403,'/admin/login':403,'/wp-admin':403,'/account/login':403,'/oauth/authorize':403,'/session':403,'/admin.php':520,'/sso':520,'/panel':520,'/cpanel':520,'/phpmyadmin':520,'/api/auth':520,'/api/login':520,'/pma':520,'/dashboard':520,'/graphql':520,'/login.html':520 };
for (const p of dataPaths) L('data.telkomschools.sch.id', p, dataStat[p]);

L('igracias.telkomschools.sch.id', '/wp-login.php', 403);

const mylmsPaths = ['/login','/sign-in','/signin','/auth','/auth/login','/user/login','/users/login','/wp-login.php','/wp-admin','/administrator','/admin','/admin.php','/account/login','/admin/login','/session','/oauth/authorize','/dashboard','/panel','/sso','/cpanel','/phpmyadmin','/api/login','/pma','/api/auth','/graphql','/login.html'];
for (const p of mylmsPaths) L('mylms.telkomschools.sch.id', p, 403);

const ppdbPaths = ['/login','/sign-in','/user/login','/signin','/auth/login','/users/login','/auth','/wp-login.php','/administrator','/admin','/wp-admin','/admin.php','/admin/login','/account/login','/oauth/authorize','/session','/sso','/dashboard','/panel','/cpanel','/pma','/phpmyadmin','/api/auth','/api/login','/login.html','/graphql'];
const ppdbStat = { '/login':403,'/sign-in':403,'/user/login':403,'/signin':403,'/auth/login':403,'/users/login':403,'/auth':403,'/wp-login.php':403,'/administrator':403,'/admin':403,'/wp-admin':403,'/admin.php':403,'/admin/login':403,'/account/login':403,'/oauth/authorize':403,'/session':403,'/sso':403,'/dashboard':403,'/panel':403,'/cpanel':520,'/pma':520,'/phpmyadmin':520,'/api/auth':520,'/api/login':520,'/login.html':520,'/graphql':520 };
for (const p of ppdbPaths) L('ppdb.telkomschools.sch.id', p, ppdbStat[p]);

L('telkomschools.sch.id', '/login', 403, WP);
L('telkomschools.sch.id', '/wp-login.php', 403);
L('telkomschools.sch.id', '/wp-admin', 403, redir('telkomschools.sch.id'));
L('telkomschools.sch.id', '/admin', 403, redir('telkomschools.sch.id'));
L('telkomschools.sch.id', '/cpanel', 200);
L('telkomschools.sch.id', '/dashboard', 403, redir('telkomschools.sch.id'));

L('www.telkomschools.sch.id', '/login', 403, WP);
L('www.telkomschools.sch.id', '/wp-login.php', 403);
L('www.telkomschools.sch.id', '/wp-admin', 403, redir('www.telkomschools.sch.id'));
L('www.telkomschools.sch.id', '/admin', 403, redir('telkomschools.sch.id'));
L('www.telkomschools.sch.id', '/cpanel', 200);
L('www.telkomschools.sch.id', '/dashboard', 403, redir('telkomschools.sch.id'));

// build the 91 INFO findings from the login table, matching the original report
for (const [host, path, , r] of login) {
  const detail = r
    ? `Authentication endpoint discovered at ${path} (redirects to ${r})`
    : `Authentication endpoint discovered at ${path}`;
  findings.push(['info', 'Login / admin surface', host, detail]);
}

// ── word wrapping: break long tokens at punctuation, never mid-word ───────
const BREAK_CHARS = new Set([' ', '.', '/', '&', '=', '?', '-', '_', ':', '%', ',']);
function wrapText(doc, text, maxWidth, font, size) {
  doc.font(font).fontSize(size);
  const s = String(text ?? '');
  if (doc.widthOfString(s) <= maxWidth) return [s];
  const lines = [];
  let line = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (doc.widthOfString(line + ch) <= maxWidth) {
      line += ch;
    } else {
      // prefer breaking at the last punctuation in the current line
      let brk = -1;
      for (let j = line.length - 1; j > 0; j--) {
        if (BREAK_CHARS.has(line[j])) { brk = j; break; }
      }
      if (brk > 0 && brk < line.length - 1) {
        lines.push(line.slice(0, brk + 1));
        line = line.slice(brk + 1) + ch;
      } else {
        lines.push(line);
        line = ch;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ── table renderer (page-break aware, punctuation wrapping) ────────────────
function drawTable(doc, headers, rows, colW, opts = {}) {
  const pad = 6;
  const headerH = 20;
  const size = opts.size || 7.5;
  const lineH = size + 1.6;
  const W = doc.page.width, H = doc.page.height, M = 46, MW = W - 92;
  const cellW = colW.map((w) => w - pad * 2);
  const cellText = (c) => (c && typeof c === 'object' ? (c.text ?? '') : (c ?? ''));

  // pre-wrap every cell
  const wrapped = rows.map((row) =>
    row.map((cell, i) => wrapText(doc, cellText(cell), cellW[i], 'Helvetica', size)));

  const drawHead = () => {
    const y = doc.y;
    doc.rect(M, y, MW, headerH).fill(RED);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(size + 0.5);
    let cx = M;
    headers.forEach((hd, i) => {
      doc.text(hd.toUpperCase(), cx + pad, y + (headerH - size - 0.5) / 2, { width: cellW[i] });
      cx += colW[i];
    });
    doc.y = y + headerH;
  };

  drawHead();
  rows.forEach((row, ri) => {
    const lines = wrapped[ri];
    const n = Math.max(...lines.map((l) => l.length));
    const rh = Math.max(14, n * lineH + pad * 2);
    if (doc.y + rh > H - 56) { doc.addPage(); drawHead(); }
    const y = doc.y;
    doc.rect(M, y, MW, rh).fill(ri % 2 ? SOFT : '#ffffff');
    let cx = M;
    row.forEach((cell, i) => {
      const c = cell && typeof cell === 'object' ? cell : { text: cell };
      doc.fillColor(c.__color || opts.textColor || INK).font('Helvetica').fontSize(size);
      lines[i].forEach((ln, li) => {
        doc.text(ln, cx + pad, y + pad + li * lineH, { width: cellW[i], lineBreak: false });
      });
      cx += colW[i];
    });
    doc.y = y + rh;
  });
  doc.moveDown(0.5);
}

// ── build ──────────────────────────────────────────────────────────────────
const doc = new PDFDocument({ size: 'A4', margin: 46 });
const chunks = [];
doc.on('data', (c) => chunks.push(c));
const done = new Promise((r) => doc.on('end', r));

const W = doc.page.width, H = doc.page.height, M = 46, MW = W - 92;
let page = 1;

const watermark = () => {
  const py = doc.y;
  doc.save();
  doc.fillOpacity(0.05);
  doc.rotate(-32, { origin: [W / 2, H / 2] });
  doc.font('Helvetica-Bold').fontSize(58).fillColor(RED);
  doc.text('b3n3d1ck — RECON', 0, H / 2 - 24, { width: W, align: 'center' });
  doc.restore();
  doc.y = py;
};
const footer = () => {
  const py = doc.y;
  const y = H - 34;
  doc.moveTo(M, y - 6).lineTo(W - M, y - 6).strokeColor(LINE).lineWidth(0.5).stroke();
  doc.font('Helvetica').fontSize(7).fillColor(MUTED);
  doc.text('CONFIDENTIAL — authorized security assessment', M, y, { width: MW, align: 'left' });
  doc.text(String(page).padStart(2, '0'), M, y, { width: MW, align: 'right' });
  doc.y = py;
};
const newPage = () => { doc.addPage(); page++; watermark(); };
const sectionTitle = (txt) => {
  if (doc.y > H - 120) newPage();
  doc.moveDown(0.4);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text(txt);
  doc.moveTo(M, doc.y + 2).lineTo(W - M, doc.y + 2).strokeColor(RED).lineWidth(1.3).stroke();
  doc.moveDown(0.7);
};

// cover
watermark();
doc.font('Helvetica-Bold').fontSize(42).fillColor(INK).text('SECURITY', M, 130, { characterSpacing: 1 });
doc.font('Helvetica-Bold').fontSize(42).fillColor(RED).text('RECON REPORT', M, doc.y + 2, { characterSpacing: 1 });
doc.moveDown(0.4);
doc.font('Helvetica').fontSize(13).fillColor(MUTED).text('Automated reconnaissance & vulnerability detection');
doc.moveDown(1.3);
doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('TARGET');
doc.font('Helvetica-Bold').fontSize(26).fillColor(RED).text(target);
doc.moveDown(1);
const coverMeta = [
  ['GENERATED', meta.generated],
  ['STARTED', meta.started],
  ['DURATION', meta.duration],
  ['ENGINE', meta.engine],
];
coverMeta.forEach(([k, v]) => {
  doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(k);
  doc.font('Helvetica').fontSize(11).fillColor(INK).text('   ' + v);
  doc.moveDown(0.3);
});
doc.rect(W - 200, 130, 154, 36).fill(RED);
doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text('CONFIDENTIAL', W - 194, 142);

// summary
newPage(); footer();
sectionTitle('Executive Summary');
const stats = [
  ['HOSTS', summary.hosts], ['LIVE WEB', summary.liveWeb], ['OPEN PORTS', summary.openPorts],
  ['LOGIN PAGES', summary.loginPages], ['FINDINGS', summary.findings],
];
const cw = MW / stats.length;
const boxY = doc.y;
stats.forEach(([k, v], i) => {
  const x = M + i * cw;
  doc.rect(x, boxY, cw - 6, 44).fill(i % 2 ? SOFT : '#f7f5f7');
  doc.font('Helvetica-Bold').fontSize(18).fillColor(RED).text(String(v), x + 12, boxY + 8, { width: cw - 18 });
  doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(k, x + 12, boxY + 32, { width: cw - 18 });
});
doc.y = boxY + 44;
doc.moveDown(0.8);
const sevLine = ['high', 'medium', 'low', 'info'].map((k) => k.toUpperCase() + ' ' + (summary.bySeverity[k] || 0)).join('   ·   ');
doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Severity breakdown: ' + sevLine);
doc.moveDown(0.4);
doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(
  'This report reflects a passive + active reconnaissance pass. Findings are detection signals that require ' +
  'manual confirmation within an authorized scope. No data exfiltration, authentication bypass, or exploitation ' +
  'was performed by this engine.', { width: MW, lineGap: 3 });

// findings
newPage(); footer();
sectionTitle('Vulnerability Findings');
const fRows = findings.map((f) => [
  { text: f[0].toUpperCase(), __color: SEV_COLOR[f[0]] },
  { text: f[1] },
  { text: f[2] },
  { text: f[3] },
]);
drawTable(doc, ['Severity', 'Finding', 'Host', 'Detail'], fRows, [58, 140, 130, MW - 328], { colored: true });

// subdomains
newPage(); footer();
sectionTitle(`Discovered Subdomains (${subdomains.length})`);
drawTable(doc, ['Host', 'A records'], subdomains.map((s) => [s[0], s[1]]), [250, MW - 250]);

// dns
newPage(); footer();
sectionTitle('DNS Records');
drawTable(doc, ['Host', 'Records'], dnsRecords, [190, MW - 190]);

// ports
newPage(); footer();
sectionTitle('Open Ports');
drawTable(doc, ['IP', 'Open ports'], ports, [170, MW - 170]);

// http
newPage(); footer();
sectionTitle(`HTTP Hosts (${httpHosts.length})`);
drawTable(doc, ['Status', 'Host', 'Title', 'Technology'], httpHosts.map((h) => [
  { text: h[0], __color: Number(h[0]) < 400 ? '#2f9e6a' : RED },
  h[1], h[2], h[3],
]), [46, 150, 150, MW - 346], { colored: true });

// login pages
newPage(); footer();
sectionTitle(`Login / Admin Pages (${login.length})`);
drawTable(doc, ['Status', 'URL', 'Redirect'], login.map((l) => [
  { text: l[2], __color: l[2] < 400 ? '#2f9e6a' : (l[2] === 200 ? '#2f9e6a' : (l[2] === 520 ? '#b0893a' : RED)) },
  l[0] + l[1],
  l[3] || '—',
]), [44, 210, MW - 254], { colored: true });

doc.end();
await done;
writeFileSync(OUT, Buffer.concat(chunks));
console.log('wrote', OUT, Buffer.concat(chunks).length, 'bytes', '| pages:', page, '| login rows:', login.length, '| findings:', findings.length);
