import { useCallback, useEffect, useRef, useState } from 'react';

const API = (import.meta as any).env?.VITE_RECON_API || 'http://localhost:8787';

type Severity = 'high' | 'medium' | 'low' | 'info';
type ScanSummary = {
  subdomains: number; liveHosts: number; openPorts: number;
  loginPages: number; apiEndpoints: number; findings: number;
  bySeverity: Record<Severity, number>;
};
type DnsRecord = { host: string; A?: string[]; AAAA?: string[]; CNAME?: string[]; MX?: { exchange: string; priority: number }[]; NS?: string[]; TXT?: string[] };
type PortEntry = { port: number; service: string };
type HttpEntry = { host: string; scheme: string; status: number; title: string; server: string; tech: string[]; missing: string[]; bodySize: number };
type LoginPage = { host: string; scheme?: string; path: string; status: number; formFields: string[]; finalUrl?: string; verified?: boolean };
type ApiEndpoint = { host: string; scheme: string; path: string; kind: string; status: number; size: number; severity: Severity; finalUrl?: string; verified?: boolean };
type SqliTest = { host: string; path: string; param: string; payload: string; technique: 'error' | 'boolean'; result: 'injectable' | 'clean'; sig: string | null };
type PlaybookRow = { field: string; value: string; note: string };
type Sqli = { host: string; path: string; param: string; payload: string; technique: string; sig: string; playbook?: PlaybookRow[] };
type UploadForm = { host: string; scheme?: string; pagePath?: string; action: string; method: string; inputs: { name: string; type: string }[]; fileInput: string };
type XssSurface = { host: string; scheme?: string; path: string; param: string; technique: string; probe?: string };
type Persist = { vector: 'sqli-write' | 'upload' | 'xss'; db?: string; host: string; path: string; param?: string; payload?: string; shellPath?: string; shell?: string; filename?: string; status: string; detail: string };
type Exposure = { host: string; scheme: string; path: string; status: number; size: number; severity: Severity; finalUrl?: string; verified?: boolean };
type Finding = { severity: Severity; title: string; host: string; detail: string; evidence: string };
type Scan = {
  id: string; target: string; status: 'running' | 'done' | 'error';
  phase: string; phaseIndex: number; totalPhases: number; startedAt: number; endedAt: number | null;
  error: string | null; logs: { t: number; msg: string }[]; forcing?: boolean;
  results: {
    subdomains: string[]; dns: DnsRecord[]; ports: Record<string, PortEntry[]>;
    http: HttpEntry[]; live200: string[]; loginPages: LoginPage[]; apiEndpoints: ApiEndpoint[];
    exposure: Exposure[]; sqli: Sqli[]; sqliTests: SqliTest[];
    uploadForms: UploadForm[]; xss: XssSurface[]; xssTests: { host: string; path: string; param: string; reflected: boolean }[];
    persist: Persist[]; emailSecurity?: Finding[]; takeover?: Finding[]; cors?: Finding[]; findings: Finding[];
  };
  summary: ScanSummary;
};

const MODULES = [
  { id: 'subdomains', label: 'Subdomains', hint: 'crt.sh + hackertarget + wordlist' },
  { id: 'dns', label: 'DNS', hint: 'A / CNAME / MX / TXT' },
  { id: 'ports', label: 'Ports', hint: 'top 26 services' },
  { id: 'http', label: 'HTTP', hint: 'status / title / tech' },
  { id: 'login', label: 'Login 200', hint: 'auth surface' },
  { id: 'api', label: 'API 200', hint: 'exposed endpoints' },
  { id: 'exposure', label: 'Files 200', hint: 'exposed sensitive files' },
  { id: 'sqli', label: 'SQLi', hint: 'detection probes' },
  { id: 'persist', label: 'Force Inject', hint: 'drop a backdoor via SQLi / upload / XSS' },
  { id: 'findings', label: 'Vulns', hint: 'passive detection' },
] as const;

type Tab = 'subdomains' | 'dns' | 'ports' | 'http' | 'login' | 'api' | 'exposure' | 'sqli' | 'persist' | 'findings';

function fmtTime(ts?: number | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
}

function Arrow({ diagonal = true }: { diagonal?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={diagonal ? 'M7 17 17 7M8 7h9v9' : 'M4 12h16m-6-6 6 6-6 6'} />
    </svg>
  );
}

function SevBadge({ sev }: { sev: Severity }) {
  return <span className={'recon-sev recon-sev-' + sev}>{sev.toUpperCase()}</span>;
}

function VerifyBadge({ verified }: { verified?: boolean }) {
  if (verified === undefined) return <span className="recon-badge recon-badge-ok">200</span>;
  return <span className={'recon-badge ' + (verified ? 'recon-badge-ok' : 'recon-badge-warn')}>{verified ? '200 ✓' : '200 ⚠'}</span>;
}

export default function ReconConsole({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [target, setTarget] = useState('');
  const [backend, setBackend] = useState<'checking' | 'online' | 'offline'>('checking');
  const [scanId, setScanId] = useState<string | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('subdomains');
  const logRef = useRef<HTMLDivElement>(null);
  const sqliRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setBackend('checking');
    fetch(API + '/health')
      .then((r) => r.json())
      .then(() => alive && setBackend('online'))
      .catch(() => alive && setBackend('offline'));
    return () => { alive = false; };
  }, [open]);

  useEffect(() => {
    if (!scanId || !open) return;
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(API + '/api/scan/' + scanId);
        const s: Scan = await r.json();
        if (!alive) return;
        setScan(s);
        if (s.status === 'done' || s.status === 'error') { setBusy(false); return; }
        setTimeout(tick, 700);
      } catch {
        if (alive) { setBusy(false); setError('Lost connection to recon-server'); }
      }
    };
    tick();
    return () => { alive = false; };
  }, [scanId, open]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [scan?.logs]);
  useEffect(() => { sqliRef.current?.scrollTo({ top: sqliRef.current.scrollHeight }); }, [scan?.results.sqliTests]);

  const start = useCallback(async () => {
    const t = target.trim();
    if (!t) return;
    setError('');
    setBusy(true);
    setScan(null);
    setTab('subdomains');
    try {
      const r = await fetch(API + '/api/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: t }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || 'Failed to start scan'); setBusy(false); return; }
      setScanId(data.scanId);
    } catch {
      setError('Cannot reach recon-server on ' + API);
      setBusy(false);
    }
  }, [target]);

  const forceInject = useCallback(async () => {
    if (!scanId) return;
    setError('');
    try {
      const r = await fetch(API + '/api/scan/' + scanId + '/force', { method: 'POST' });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Force-inject failed'); return; }
      setTab('persist');
    } catch {
      setError('Cannot reach recon-server on ' + API);
    }
  }, [scanId]);

  if (!open) return null;

  const progress = scan ? Math.min(100, Math.round((scan.phaseIndex / scan.totalPhases) * 100)) : 0;
  const ports = scan ? Object.entries(scan.results.ports) : [];
  const sqliHits = scan ? scan.results.sqli.length : 0;

  const tabLabel = (t: Tab) => {
    if (t === 'subdomains') return `Subdomains (${scan?.results.subdomains.length ?? 0})`;
    if (t === 'dns') return 'DNS';
    if (t === 'ports') return 'Ports';
    if (t === 'http') return `HTTP (${scan?.results.http.length ?? 0})`;
    if (t === 'login') return `Login (${scan?.results.loginPages.length ?? 0})`;
    if (t === 'api') return `API (${scan?.results.apiEndpoints.length ?? 0})`;
    if (t === 'exposure') return `Files (${scan?.results.exposure.length ?? 0})`;
    if (t === 'sqli') return `SQLi (${scan?.results.sqliTests.length ?? 0} · ${sqliHits} hits)`;
    if (t === 'persist') return `Force Inject (${scan?.results.persist.length ?? 0})`;
    return `Findings (${scan?.summary.findings ?? 0})`;
  };

  return (
    <div className="recon" role="dialog" aria-modal="true" aria-label="Recon Automation Pipeline" data-lenis-prevent>
      <div className="recon-topbar">
        <div className="recon-title">
          <span className="recon-brand">recon<span>.</span></span>
          <span className="recon-sub">INTEL PIPELINE / DETECTION ONLY</span>
        </div>
        <div className={'recon-status recon-status-' + backend}>
          <i />
          {backend === 'checking' ? 'CHECKING BACKEND' : backend === 'online' ? 'ENGINE ONLINE' : 'ENGINE OFFLINE'}
        </div>
        <button className="recon-close" onClick={onClose}>Close <b aria-hidden="true">×</b></button>
      </div>

      <div className="recon-body">
        <div className="recon-controls">
          <label className="recon-field">
            <span className="recon-field-label">TARGET DOMAIN</span>
            <input className="recon-input" value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && start()} placeholder="example.com" spellCheck={false} autoCapitalize="off" autoCorrect="off" />
          </label>
          <button className="recon-start" onClick={start} disabled={busy || backend === 'offline'}>
            {busy ? 'SCANNING…' : 'RUN RECON'} <Arrow />
          </button>
          <div className="recon-modules">
            {MODULES.map((m) => <span key={m.id} className="recon-module" title={m.hint}>{m.label}</span>)}
          </div>
        </div>

        {backend === 'offline' && (
          <div className="recon-offline">Engine offline. Start it locally with <code>node recon-server/server.mjs</code> (port 8787).</div>
        )}
        {error && <div className="recon-error">{error}</div>}

        {scan && (
          <>
            <div className="recon-progress">
              <div className="recon-progress-track"><div className="recon-progress-fill" style={{ width: progress + '%' }} /></div>
              <div className="recon-progress-meta">
                <span className="recon-phase">{scan.status === 'done' ? 'COMPLETE' : scan.phase.toUpperCase()}</span>
                <span className="recon-stats">
                  {scan.summary.subdomains} hosts · {scan.summary.liveHosts} live · {scan.summary.openPorts} ports · {scan.summary.loginPages} login · {scan.summary.apiEndpoints} api · {scan.summary.findings} findings
                </span>
              </div>
            </div>

            {scan.status === 'done' && (
              <div className="recon-sev-summary">
                <span className="recon-sev recon-sev-high">HIGH {scan.summary.bySeverity.high}</span>
                <span className="recon-sev recon-sev-medium">MED {scan.summary.bySeverity.medium}</span>
                <span className="recon-sev recon-sev-low">LOW {scan.summary.bySeverity.low}</span>
                <span className="recon-sev recon-sev-info">INFO {scan.summary.bySeverity.info}</span>
              </div>
            )}

            <div className="recon-split">
              <div className="recon-logs" ref={logRef}>
                {scan.logs.map((l, i) => (
                  <div key={i} className="recon-log"><span>{fmtTime(l.t)}</span><span>{l.msg}</span></div>
                ))}
                {scan.status === 'running' && <div className="recon-log recon-log-live"><span>●</span><span>working…</span></div>}
              </div>

              <div className="recon-results">
                <div className="recon-tabs">
                  {(['subdomains', 'dns', 'ports', 'http', 'login', 'api', 'exposure', 'sqli', 'persist', 'findings'] as const).map((t) => (
                    <button key={t} className={'recon-tab' + (tab === t ? ' is-active' : '')} onClick={() => setTab(t)}>{tabLabel(t)}</button>
                  ))}
                </div>

                {tab === 'subdomains' && (
                  <div className="recon-panel recon-panel-scroll">
                    <div className="recon-sqli-head">
                      <span>{scan.results.subdomains.length} discovered</span>
                      <span className="recon-sqli-hits">{scan.results.live200?.length ?? 0} live 200</span>
                    </div>
                    {scan.results.subdomains.length === 0 ? <div className="recon-empty">No hosts yet…</div>
                      : scan.results.subdomains.map((s) => {
                          const h = scan.results.http.find((x) => x.host === s);
                          const code = h ? h.status : null;
                          const live = code === 200;
                          const label = live ? '200' : code ? String(code) : 'no http';
                          const badge = live ? 'recon-badge-ok' : code ? 'recon-badge-warn' : 'recon-badge-muted';
                          return (
                            <div key={s} className="recon-sec-row">
                              <div className="recon-http-head">
                                <span className={'recon-badge ' + badge}>{label}</span>
                                <span className="recon-host">{s}</span>
                                <span className="recon-muted">{h ? h.scheme : 'no HTTP response'}</span>
                              </div>
                            </div>
                          );
                        })}
                  </div>
                )}

                {tab === 'dns' && (
                  <div className="recon-panel recon-panel-scroll">
                    <table className="recon-table">
                      <thead><tr><th>HOST</th><th>RECORDS</th></tr></thead>
                      <tbody>
                        {scan.results.dns.map((d) => (
                          <tr key={d.host}>
                            <td className="recon-host">{d.host}</td>
                            <td className="recon-records">
                              {d.A && d.A.map((v) => <span key={'a' + v} className="recon-chip">A {v}</span>)}
                              {d.AAAA && d.AAAA.map((v) => <span key={'aaaa' + v} className="recon-chip">AAAA {v}</span>)}
                              {d.CNAME && d.CNAME.map((v) => <span key={'c' + v} className="recon-chip">CNAME {v}</span>)}
                              {d.MX && d.MX.map((v) => <span key={'mx' + v.exchange} className="recon-chip">MX {v.exchange}</span>)}
                              {d.NS && d.NS.map((v) => <span key={'ns' + v} className="recon-chip">NS {v}</span>)}
                              {d.TXT && d.TXT.slice(0, 2).map((v) => <span key={'t' + v} className="recon-chip" title={v}>TXT {v.slice(0, 42)}{v.length > 42 ? '…' : ''}</span>)}
                              {!d.A && !d.AAAA && !d.CNAME && !d.MX && !d.NS && !d.TXT && <span className="recon-muted">no records</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'ports' && (
                  <div className="recon-panel recon-panel-scroll">
                    {ports.length === 0 ? <div className="recon-empty">No open ports found…</div>
                      : ports.map(([ip, list]) => (
                          <div key={ip} className="recon-port-row">
                            <span className="recon-host">{ip}</span>
                            {list.length === 0 ? <span className="recon-muted">no open ports</span>
                              : list.map((p) => <span key={p.port} className="recon-chip recon-chip-port">{p.port} <i>{p.service}</i></span>)}
                          </div>
                        ))}
                  </div>
                )}

                {tab === 'http' && (
                  <div className="recon-panel recon-panel-scroll">
                    {scan.results.http.length === 0 ? <div className="recon-empty">No live HTTP hosts…</div>
                      : scan.results.http.map((h) => (
                          <div key={h.host} className="recon-http-row">
                            <div className="recon-http-head">
                              <span className={'recon-badge recon-badge-' + (h.status < 400 ? 'ok' : 'warn')}>{h.status}</span>
                              <span className="recon-host">{h.host}</span>
                              <span className="recon-muted">{h.scheme}</span>
                            </div>
                            {h.title && <div className="recon-http-title">{h.title}</div>}
                            {h.tech.length > 0 && <div className="recon-records">{h.tech.map((t) => <span key={t} className="recon-chip">{t}</span>)}</div>}
                          </div>
                        ))}
                  </div>
                )}

                {tab === 'login' && (
                  <div className="recon-panel recon-panel-scroll">
                    {scan.results.loginPages.length === 0 ? <div className="recon-empty">No HTTP-200 login pages detected…</div>
                      : scan.results.loginPages.map((l, i) => (
                          <div key={i} className="recon-sec-row">
                            <div className="recon-http-head">
                              <VerifyBadge verified={l.verified} />
                              <span className="recon-host">{l.scheme || 'https'}://{l.host}{l.path}</span>
                              {l.verified === false && <span className="recon-muted">no response on recheck — unstable target</span>}
                            </div>
                            {l.formFields.length > 0 && (
                              <div className="recon-records">{l.formFields.map((f) => <span key={f} className="recon-chip">{f}</span>)}</div>
                            )}
                          </div>
                        ))}
                  </div>
                )}

                {tab === 'api' && (
                  <div className="recon-panel recon-panel-scroll">
                    {scan.results.apiEndpoints.length === 0 ? <div className="recon-empty">No HTTP-200 API endpoints detected…</div>
                      : scan.results.apiEndpoints.map((a, i) => (
                          <div key={i} className="recon-sec-row">
                            <div className="recon-http-head">
                              <SevBadge sev={a.severity} />
                              <VerifyBadge verified={a.verified} />
                              <span className="recon-host">{a.host}{a.path}</span>
                              <span className="recon-muted">{a.kind} · {a.size}b</span>
                              {a.verified === false && <span className="recon-muted">no response on recheck — unstable target</span>}
                            </div>
                            <div className="recon-curl"><b>GET · curl</b> <code>curl -s "{a.scheme}://{a.host}{a.path}"</code></div>
                          </div>
                        ))}
                  </div>
                )}

                {tab === 'exposure' && (
                  <div className="recon-panel recon-panel-scroll">
                    {scan.results.exposure.length === 0 ? <div className="recon-empty">No HTTP-200 sensitive files exposed…</div>
                      : scan.results.exposure.map((e, i) => (
                          <div key={i} className="recon-sec-row">
                            <div className="recon-http-head">
                              <SevBadge sev={e.severity} />
                              <VerifyBadge verified={e.verified} />
                              <span className="recon-host">{e.host}{e.path}</span>
                              <span className="recon-muted">{e.size}b</span>
                              {e.verified === false && <span className="recon-muted">no response on recheck — unstable target</span>}
                            </div>
                            <div className="recon-curl"><b>GET · curl</b> <code>curl -s "{e.scheme}://{e.host}{e.path}"</code></div>
                          </div>
                        ))}
                  </div>
                )}

                {tab === 'sqli' && (
                  <div className="recon-panel recon-panel-scroll recon-sqli" ref={sqliRef}>
                    <div className="recon-sqli-head">
                      <span>{scan.results.sqliTests.length} probes</span>
                      <span className="recon-sqli-hits">{sqliHits} injectable</span>
                    </div>
                    {scan.results.sqliTests.length === 0 ? <div className="recon-empty">No SQLi probes yet…</div>
                      : scan.results.sqliTests.map((t, i) => (
                          <div key={i} className={'recon-sqli-row' + (t.result === 'injectable' ? ' is-hit' : '')}>
                            <span className={'recon-badge ' + (t.result === 'injectable' ? 'recon-badge-hit' : 'recon-badge-ok')}>{t.result === 'injectable' ? 'HIT' : 'clean'}</span>
                            <span className="recon-host">{t.host}{t.path}</span>
                            <span className="recon-muted">{t.param} = {t.payload} · {t.technique}</span>
                          </div>
                        ))}
                    {scan.results.sqli.length > 0 && (
                      <div className="recon-playbook">
                        <div className="recon-sqli-head">
                          <span>CONFIRMED HITS — WHAT TO PUT WHERE</span>
                          <span className="recon-sqli-hits">{scan.results.sqli.length} injectable</span>
                        </div>
                        {scan.results.sqli.map((s, i) => (
                          <div key={'pb' + i} className="recon-playbook-item">
                            <div className="recon-http-head">
                              <span className="recon-badge recon-badge-hit">HIT</span>
                              <span className="recon-host">{s.host}{s.path}</span>
                              <span className="recon-muted">{s.param} · {s.technique}</span>
                            </div>
                            <div className="recon-curl"><b>EVIDENCE</b> <code>{s.payload}</code></div>
                            {(s.playbook || []).map((p, j) => (
                              <div key={j} className="recon-playbook-row">
                                <code className="recon-playbook-field">{p.field}</code>
                                <code className="recon-playbook-value">{p.value}</code>
                                <span className="recon-muted">{p.note}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {tab === 'persist' && (
                  <div className="recon-panel recon-panel-scroll">
                    <div className="recon-sqli-head">
                      <span>FORCE INJECT — BACKDOOR DROP</span>
                      <span className="recon-sqli-hits">{scan.results.persist.length} attempts</span>
                    </div>
                    <div className="recon-curl"><b>SURFACES</b> upload forms: {scan.results.uploadForms.length} · XSS: {scan.results.xss.length} · SQLi: {scan.results.sqli.length}</div>
                    <button className="recon-start recon-force" onClick={forceInject} disabled={scan.forcing}>
                      {scan.forcing ? 'INJECTING…' : 'RUN FORCE INJECT'} <Arrow diagonal={false} />
                    </button>
                    {scan.results.uploadForms.map((f, i) => (
                      <div key={'uf' + i} className="recon-sec-row">
                        <div className="recon-http-head">
                          <span className="recon-badge recon-badge-ok">UPLOAD</span>
                          <span className="recon-host">{f.host}{f.action || '/upload'}</span>
                          <span className="recon-muted">file field: {f.fileInput} · {f.method}</span>
                        </div>
                      </div>
                    ))}
                    {scan.results.xss.map((x, i) => (
                      <div key={'xs' + i} className="recon-sec-row">
                        <div className="recon-http-head">
                          <span className="recon-badge recon-badge-hit">XSS</span>
                          <span className="recon-host">{x.host}{x.path}</span>
                          <span className="recon-muted">param: {x.param} · {x.technique}</span>
                        </div>
                      </div>
                    ))}
                    {scan.results.persist.length === 0 ? (
                      <div className="recon-empty">{scan.forcing ? 'Injecting…' : 'Run FORCE INJECT to drop the backdoor through every detected surface (SQLi file-write · upload · XSS).'}</div>
                    ) : scan.results.persist.map((p, i) => (
                      <div key={'ps' + i} className="recon-persist-row">
                        <div className="recon-http-head">
                          <span className={'recon-badge ' + (p.status === 'attempted' ? 'recon-badge-hit' : 'recon-badge-ok')}>{p.vector.toUpperCase()}</span>
                          <span className="recon-host">{p.host}{p.path}</span>
                          <span className="recon-muted">{p.db ? p.db + ' · ' : ''}{p.status}</span>
                        </div>
                        {p.filename && <div className="recon-curl"><b>FILE</b> <code>{p.filename}</code></div>}
                        {p.payload && <div className="recon-curl"><b>PAYLOAD</b> <code className="recon-payload-code">{p.payload}</code></div>}
                        {p.shell && <div className="recon-curl"><b>SHELL</b> <code className="recon-payload-code">{p.shell}</code></div>}
                        <div className="recon-muted">{p.detail}</div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'findings' && (
                  <div className="recon-panel recon-panel-scroll">
                    {scan.results.findings.length === 0 ? <div className="recon-empty">No findings…</div>
                      : scan.results.findings.map((f, i) => (
                          <div key={i} className="recon-finding">
                            <div className="recon-finding-head">
                              <SevBadge sev={f.severity} />
                              <span className="recon-finding-title">{f.title}</span>
                            </div>
                            <div className="recon-host">{f.host}</div>
                            <div className="recon-finding-detail">{f.detail}</div>
                          </div>
                        ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {!scan && !busy && (
          <div className="recon-idle">
            <span className="recon-idle-mark">&lt;/&gt;</span>
            <p>Enter a domain and hit <b>RUN RECON</b>.<br />Subdomain + API + login-surface discovery and passive vuln detection.<br />Detection only — authorized targets.</p>
          </div>
        )}
      </div>
    </div>
  );
}
