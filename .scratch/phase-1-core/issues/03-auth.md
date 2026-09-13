# 03 — Admin login and role guard

Status: ready-for-human
Blocked by: 01

Email plus password, bcrypt hashed. JWT in an httpOnly, Secure, SameSite=Lax
cookie. Roles `ADMIN` and `RECRUITER`.

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- Guard resolves the user and attaches it to the request
- `RECRUITER` sees only Applications where `assigned_recruiter_id` is them;
  scoping lives in the repository layer so no endpoint can forget it
- Session timeout, and a seeded first Admin

Global `ValidationPipe` with `whitelist` and `forbidNonWhitelisted` is installed
here and applies to every later endpoint.
