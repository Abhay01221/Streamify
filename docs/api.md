# Core HTTP API

Existing `/api` paths are retained. `GET /api/openapi.json` generates the core OpenAPI document from the route catalog in `backend/src/openapi.ts`. It documents core request constraints and authentication, but response schemas are currently generic objects; fully generated schemas for all optional routes remain future work.

All JSON state-changing requests require `X-CodeForge-CSRF: 1`. Browser clients send HttpOnly cookies. Non-browser clients may use a short-lived access token in `Authorization: Bearer ...` and must send the CSRF header. Origin, when present, must equal FRONTEND_URL. Errors use `{ "error": "message" }`; validation errors additionally include a details array. Responses include an X-Request-ID header. HTTP 400 means invalid input, 401 missing/expired authentication, 403 denied access/origin, 404 missing or unpublished problem, 409 conflict, 429 request/concurrency limit, and 503 dependency failure.

| Method | Path | Behavior |
|---|---|---|
| POST | /api/auth/register | Ordinary account only; email, username, password |
| POST | /api/auth/login | Sets access/refresh cookies; optional TOTP challenge |
| POST | /api/auth/refresh | Single-use refresh rotation |
| POST | /api/auth/logout | Revokes all sessions for this user |
| GET | /api/auth/me | Current user/profile/stats |
| POST | /api/auth/forgot-password | Generic recovery message; SMTP required |
| POST | /api/auth/reset-password | Expiring, single-use token and new password |
| POST | /api/auth/verify-email | Verification within 24 hours of registration |
| GET | /api/problems | page, limit, search, difficulty, tags, status, sortBy, sortOrder |
| GET | /api/problems/:slug | Published problem and sample tests only |
| GET | /api/problems/:slug/editorial | Nonpremium or authorized editorial sections |
| GET | /api/problems/:slug/submissions | Own recent judged submissions |
| GET | /api/problems/bookmarks | Own bookmarks, bounded to 100 |
| PUT/DELETE | /api/problems/:slug/bookmark | Save/remove bookmark |
| POST | /api/submissions | Run or Submit, returns 202 with submissionId |
| GET | /api/submissions | Own paginated history; verdict, language, problem filters |
| GET | /api/submissions/:id | Own/admin source, result and queue status |
| GET | /api/users/me/progress | Paginated distinct solved problems |
| GET | /api/users/:username | Profile subject to privacy |
| GET | /api/users/:username/stats | Stats/recent metadata, never private source |
| GET | /api/users/:username/heatmap | UTC accepted-submission activity |
| PATCH | /api/users/me | Validated editable profile fields |
| PATCH | /api/settings/account | Password/email change with current password, revokes sessions |
| GET/DELETE | /api/settings/sessions[/:id] | List/revoke own sessions |
| GET | /api/leaderboard | Deterministic distinct-active-problem scores, page/limit |
| GET | /api/admin/problems[/:id] | Admin catalog/detail including private tests |
| POST/PATCH | /api/admin/problems[/:id] | Validated authoring, test replacement, publication |
| DELETE | /api/admin/problems/:id | Unpublish, preserving history |
| GET | /api/admin/submissions | Admin submission monitoring |
| GET | /api/admin/health | Queue depth and worker heartbeat |
| GET | /api/study-plans[/:id] | Published courses, ordered lessons and current learner progress; id or slug detail |
| POST | /api/study-plans/:id/enroll | Idempotent enrollment; includes prior accepted solves |
| PUT | /api/study-plans/:id/lessons/:lessonId/completion | Own reading completion, `{completed:boolean}`; enrollment required |
| POST | /api/admin/content/problems/preview | Validate `{problems:[...]}` and report duplicates without writes |
| POST | /api/admin/content/problems/import | Atomic create of drafts only; at most 25 problems |
| GET | /api/admin/content/courses[/:id] | Admin drafts/catalog and authoring JSON |
| PUT | /api/admin/content/courses/:slug | Validate/save course; stable slugs preserve lesson progress |
| GET | /api/tutor/status | `{enabled:boolean}` without credentials |
| POST | /api/tutor/messages | Bounded contextual tutor; authenticated and quota-limited |
| GET | /api/metrics | Actual public counts |
| GET | /health, /ready | Liveness and downstream readiness |

Example Run request:

```json
{"problemSlug":"ledger-total","language":"python","code":"import json\nprint(sum(json.loads(input())))","isRun":true,"customInput":"[3,-2,8]"}
```

Submit the same body with `isRun:false` and omit customInput. Client expected output fields are rejected. An empty customInput is a real empty-input run. The frontend offers sample-input buttons. Both operations are asynchronous, but Run is persisted with isRun=true and never awards progress.

Poll the returned submissionId. Queue states are Pending, Running, Completed or Failed; verdicts include ACCEPTED, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, COMPILE_ERROR, RUNTIME_ERROR, OUTPUT_LIMIT_EXCEEDED and SYSTEM_ERROR. Memory-limit-specific provider verdicts are not claimed. Hidden results expose pass/fail and metrics only; echoable input/output and diagnostics are omitted. Custom Run stdout is returned in a visible custom test result. Runtime uses milliseconds and memory uses KB.

Tutor requests accept `problemSlug`, `mode` (hint/explain/solution/debug), `message`, optional `code`, owned `submissionId`, and at most eight bounded user/assistant history messages. Debug requires code. Responses are `{message,mode,model}`; no automatic execution or acceptance is implied. Public context and sample results only are sent to the provider. Missing configuration/provider failure returns 503; quota exhaustion returns 429. See [course/import/tutor formats](courses-and-tutor.md).

Optional inherited routes exist for contests, discussions, company catalogs, notifications, TOTP setup and payments. Their presence does not establish complete features; see the audit. Payment activation requires configuration and a signed raw-body webhook, and there is no free mock premium activation.
