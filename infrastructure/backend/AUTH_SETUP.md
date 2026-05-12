Auth & Login Setup Guide
=========================

This document explains all environment variables, configuration files, and endpoints related to authentication and login in the backend. Use this during development and deployment to configure secrets, emergency admin access, and JWT/session behavior.

Files of interest
-----------------
- `infrastructure/backend/src/routes/auth.ts` — primary login/register endpoints. Implements `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/register`, `/api/auth/change-password`, and the emergency endpoints `/api/auth/emergency-login` and `/api/auth/login-fallback`.
- `infrastructure/backend/src/middleware/auth.ts` — JWT verification middleware used by protected API routes; requires `JWT_SECRET`.
- `infrastructure/backend/src/db/pool.ts` — PostgreSQL connection via `DATABASE_URL`.
- `infrastructure/backend/src/server.ts` — server startup, CORS, rate limiting, and middleware. It wires the auth router and applies stricter rate limits to `/api/auth/login`.
- `scripts/make-hash.mjs` — helper script to generate bcrypt hashes for emergency admin passwords.

Key environment variables
-------------------------
Set these in your environment or secret manager (Docker Compose env, systemd, Kubernetes Secret, Vercel/Netlify environment settings):

- `DATABASE_URL`: PostgreSQL connection string (required). Example: `postgresql://user:pass@host:5432/dbname`
- `JWT_SECRET`: Secret used to sign JWT tokens (required). Generate a long random string (e.g. 32+ chars) and keep private.
- `SESSION_EXPIRY`: JWT expiry string. Default: `7d`. Examples: `1h`, `7d`, `30d`.
- `BCRYPT_ROUNDS`: Number of bcrypt rounds (work factor). Default: `12`.
- `CORS_ORIGIN`: Frontend origin allowed by CORS. Example: `https://crm.yourdomain.com`.
- `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`: Controls for global rate limiter (defaults provided in `server.ts`).
- `SENTRY_DSN`: Optional Sentry DSN for error monitoring.
- `EMERGENCY_ADMINS`: Optional emergency admin accounts (see below).

About `EMERGENCY_ADMINS`
------------------------
This variable allows configuring local, encrypted admin accounts for emergency access (use only when necessary). It must contain bcrypt-hashed passwords, never plaintext.

Supported formats:
1. JSON array string (recommended):

EMERGENCY_ADMINS='[{"email":"admin@example.com","hash":"$2a$12$...","name":"Admin"}]'

2. Semicolon-separated list (legacy):

EMERGENCY_ADMINS='admin@example.com:$2a$12$...:Admin;ops@example.com:$2a$12$...:Ops'

To generate a bcrypt hash locally use the helper script:

```bash
node scripts/make-hash.mjs '<password>' '<email>' '<Name>'
# Example
node scripts/make-hash.mjs 'admin123' 'admin@gmail.com' 'Admin'
```

The script prints the bcrypt hash and an example `EMERGENCY_ADMINS` JSON-line you can paste into your `.env` or secret store.

Endpoints (Auth)
-----------------
- POST `/api/auth/login` — standard DB-backed login (email + password). On success sets an HTTP-only cookie `auth_token`.
- POST `/api/auth/logout` — clears cookie.
- GET `/api/auth/me` — returns current user (requires Authorization). In the frontend we usually rely on the cookie; the `/me` route helps validate sessions.
- POST `/api/auth/register` — admin-only user creation (requires `authenticate` middleware and Admin role).
- POST `/api/auth/change-password` — change logged-in user's password.
- POST `/api/auth/emergency-login` — authenticate using `EMERGENCY_ADMINS` local hashes (issues same JWT cookie). Useful when DB/auth store is unavailable.
- POST `/api/auth/login-fallback` — tries DB login first; if DB fails or user missing, falls back to `EMERGENCY_ADMINS`.

Cookie and token behavior
-------------------------
- Cookie name: `auth_token` (HTTP-only). Frontend should primarily rely on this cookie; legacy responses also return a `token` in JSON for compatibility.
- JWT signed with `JWT_SECRET` and expiry from `SESSION_EXPIRY`.
- `middleware/auth.ts` expects `Authorization: Bearer <token>` header for API calls protected by JWT. The frontend can read `me` or use the cookie-based auth flow.

Where to set env vars (examples)
---------------------------------
- Local development: add to `.env` in `infrastructure/backend/` (gitignore your `.env`). Example `.env`:

```
DATABASE_URL=postgresql://crm:secret@localhost:5432/solarcrm
JWT_SECRET=replace-with-random-string
SESSION_EXPIRY=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=http://localhost:5173
EMERGENCY_ADMINS='[{"email":"admin@gmail.com","hash":"$2a$12$...","name":"Admin"}]'
```

- Docker Compose: add under `environment:` for the backend service or use a `.env` file referenced by Compose.
- Kubernetes: put these into a `Secret` and mount as environment variables.
- Cloud platforms (Vercel, Render, Fly, Heroku): use their environment variable UI.

Security best practices
-----------------------
- Never commit secrets to version control. Use secret managers in production.
- `EMERGENCY_ADMINS` must contain bcrypt hashes only. Rotate these credentials regularly and remove emergency accounts when no longer needed.
- Limit the exposure of emergency endpoints (e.g., IP allowlist, enable only in staging or with an extra feature-flag env var).
- Monitor `activity_log` for `EMERGENCY_LOGIN` entries. If DB is down the best-effort log insert may fail — keep an audit outside the app if possible.
- Use HTTPS in production and ensure `JWT_SECRET` is long and random.

Troubleshooting
---------------
- If login returns 500, ensure `DATABASE_URL` is correct and reachable.
- If JWT verification fails, confirm `JWT_SECRET` is identical across processes (and not regenerated between restarts).
- If emergency login not working, check `EMERGENCY_ADMINS` formatting and that hashes were created using compatible `BCRYPT_ROUNDS`.

Want me to
-----------
- add an example `.env.example` with placeholders, or
- create a small `scripts/create-emergency-user.mjs` to generate the hash and print the ready-to-copy env line.

Pick one and I'll add it to the repo.