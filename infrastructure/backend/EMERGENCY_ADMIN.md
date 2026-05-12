Emergency Admin setup

1) Generate bcrypt hash locally

From the repo root run (replace password and email):

```bash
node scripts/make-hash.mjs 'admin123' 'admin@gmail.com' 'Admin'
```

This prints the bcrypt hash and an example `EMERGENCY_ADMINS` JSON-line you can copy into your environment.

2) Set env var

Local dev: add to your `.env` (do NOT commit `.env` to source control):

EMERGENCY_ADMINS='[{"email":"admin@gmail.com","hash":"$2a$12$...","name":"Admin"}]'

Production: add to your secret manager / environment configuration (Docker Compose env, systemd unit, Kubernetes Secret, Vercel/Netlify env var).

3) Restart backend

Restart your backend process so `EMERGENCY_ADMINS` is loaded at startup.

4) Test emergency login

Use the emergency endpoint:

```bash
curl -i -X POST http://localhost:4000/api/auth/emergency-login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin123"}'
```

Or use the fallback endpoint:

```bash
curl -i -X POST http://localhost:4000/api/auth/login-fallback \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gmail.com","password":"admin123"}'
```

Security notes:
- Always store only bcrypt hashes in `EMERGENCY_ADMINS`.
- Protect and rotate these credentials regularly.
- Consider restricting access to these endpoints by IP or environment.
