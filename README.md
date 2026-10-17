# CodeForge

A coding judge with a React/TypeScript workspace, Express API, PostgreSQL persistence, Redis/Bull jobs, and a configurable isolated Judge0 execution provider. Python 3 is the only enabled execution language.

The existing React/Vite and Node/Express/Prisma stack is retained to preserve working functionality. It provides the equivalent responsibilities requested for Next.js/FastAPI/SQLAlchemy/Celery. This is a substantial implementation, **not a verified production deployment**. See [requirements audit](docs/implementation-audit.md) for the exact gaps and validation results.

## Implemented core

- Registration, bcrypt password hashing, session-bound short-lived JWT access cookies, hashed rotating refresh credentials, logout and credential-change revocation, role checks, CSRF request verification.
- Searchable, filtered, paginated problem catalog, original practice seed, private test cases, Monaco editor with textarea recovery, persistent drafts, custom input, separate Run and Submit semantics.
- Identifier-only jobs, independent worker, bounded execution, persisted queue state and verdict, strict output comparison, owner-only submission details, paginated history, bookmarks and progress.
- Database-derived leaderboard with stable ties; accepted problems count once. Admin problem/test editing, publication, submission monitoring and audit events.
- Versioned Prisma migrations, isolated-database integration tests, frontend tests, CI, dependency health checks and explicit retention command.
- A 22-module DSA course with original worked lessons, 27 local practice problems, enrollment and accepted-only progress; admin JSON course authoring and draft problem imports.
- Optional contextual AI tutor with Hint, Explain, Solution and Debug modes, explicit code-sharing controls and server-side privacy checks.

See [courses, imports and tutor setup](docs/courses-and-tutor.md) for the GitHub design references, course authoring format and backend AI configuration. Open **Courses** to learn, **Admin → Content** to author/import, or **Ask AI** on a problem to use the tutor once configured.

## Local setup

On Windows, run `powershell -ExecutionPolicy Bypass -File .\Start-CodeForge.ps1` from this folder. It starts Docker, rebuilds the app, applies migrations and loads missing built-in content. Existing accounts and database volumes are retained. Open http://localhost:3000 after it reports ready. To add your own questions, sign in as an admin and use **Admin → Problems → Add problem**. To create a course, use **Admin → Courses → Create course**. These are normal forms; JSON import is optional. If you need your own admin account, run `powershell -ExecutionPolicy Bypass -File .\Create-Admin.ps1` and choose your email, username and password. Existing accounts are not promoted or overwritten.

Install Docker Desktop/Compose. An isolated Judge0 endpoint must already be provisioned on a dedicated execution host; the app stack does not deploy a privileged sandbox on your machine. Review [execution security](docs/security.md) before enabling that endpoint.

1. Copy `.env.example` to `.env` and configure the database/Redis passwords, independent JWT secrets, `FRONTEND_URL`, `JUDGE0_URL`, optional `JUDGE0_AUTH_TOKEN`, and `COOKIE_SECURE`.
2. Generate secrets, for example `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Run separately for each secret. Use URL-safe database/Redis passwords.
3. Start: `docker compose up --build -d`.
4. Built-in content now loads automatically on API startup. To reload missing content manually: `docker compose exec api node dist-seed/seed.js`.
5. Bootstrap your own administrator: set `ADMIN_EMAIL`, `ADMIN_USERNAME`, and a unique `ADMIN_PASSWORD` in your private environment, then `docker compose exec api node dist/bootstrapAdmin.js`. No default users are seeded. Remove the bootstrap password afterward.
6. Open [CodeForge](http://localhost:3000). Backend liveness/readiness are available inside the API container at `/health` and `/ready`.

For an **existing database created with `prisma db push`**, first back it up and follow the baseline procedure in [deployment](docs/deployment.md). Startup never uses `--accept-data-loss` or automatically seeds accounts. The default database image is PostgreSQL 15 to match the existing volume; changing the image alone cannot upgrade a database. Keep `POSTGRES_VERSION` aligned with the existing volume's PG_VERSION.

## Development and verification

From `backend`: `npm ci`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run prisma:seed`, `npm run dev`. In another terminal run `npm run build` and `npm run worker`. Export the backend environment first; native Node processes do not inherit the repository-root `.env` automatically when started from `backend`.

From `frontend`: `npm ci`, `npm run dev`. Vite proxies `/api` to port 5000. Keep `FRONTEND_URL=http://localhost:3000` for local CSRF verification.

Checks:

```sh
cd backend
npm run lint
npm run build
npm test
# Dedicated database only; integration tests refuse a database not named codeforge_test.
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/codeforge_test npm test
cd ../frontend
npm run lint
npm run typecheck
npm test
npm run build
```

On PowerShell set variables with `$env:TEST_DATABASE_URL='...'` before `npm test`. Integration tests clear only the explicitly selected dedicated test database. CI creates its own PostgreSQL service. Python 3 is used for trusted seed-reference checks; user code is never executed on the application host.

Real execution tests require `ENABLE_SANDBOX_TESTS=true` and a reviewed isolated Judge0 endpoint. Complete browser tests require the running seeded stack, `npx playwright install chromium`, then `ENABLE_REAL_E2E=true npm run test:e2e` in `frontend`. These tests were **not** verified against a real sandbox in this environment.

## Operations

- Migrate: `docker compose exec api npx prisma migrate deploy`.
- Logs: `docker compose logs -f api worker`.
- Restart: `docker compose restart api worker`.
- Stop: `docker compose down` (retains database volumes).
- Retention: `docker compose exec api npm run retention`, with `SOURCE_RETENTION_DAYS` configured. Schedule this command in your deployment; it is not automatic.
- Admin health: authenticated `GET /api/admin/health`; readiness checks DB, Redis, provider and worker heartbeat.

## Documentation and limitations

[Architecture](docs/architecture.md) · [API](docs/api.md) · [Database](docs/database.md) · [Security](docs/security.md) · [Deployment](docs/deployment.md) · [Courses and tutor](docs/courses-and-tutor.md) · [Audit](docs/implementation-audit.md)

SMTP is required for password recovery and email verification delivery. MinIO avatar uploads and payment routes require additional configuration. The AI tutor requires backend OPENAI_API_KEY and AI_MODEL; no paid provider call was made in tests. Google/GitHub sign-in uses the configured provider applications; see [social login setup](docs/social-login.md). Full contests/rating and advanced statistics remain incomplete. No random statistics, fake execution fallback, or default admin password is provided.
