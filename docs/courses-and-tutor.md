# Courses, problem imports and the AI tutor

## Design references

The implementation extends the existing React/Express stack. These GitHub sources were inspected for architecture and learning flow ideas:

| Source | Idea applied in CodeForge |
| --- | --- |
| [freeCodeCamp curriculum configuration](https://github.com/freeCodeCamp/freeCodeCamp/blob/main/curriculum/structure/curriculum.json) and [file structure](https://contribute.freecodecamp.org/curriculum-file-structure/) | Ordered courses, topic modules and discrete lessons with stable identifiers |
| [Exercism concept-exercise design](https://github.com/exercism/docs/blob/main/building/tracks/concept-exercises.md) | Explain a concept, provide examples/hints, then practise with independently checked exercises |
| [VisualCodeMOOC](https://github.com/XJTLU-AIED/VisualCodeMOOC) | Contextual tutoring alongside the learning/practice experience |

These are design references. No third-party source code or curriculum text was copied. CodeForge's new lessons, examples, statements, reference programs and test fixtures are original repository content.

## Enable the curriculum

Apply the migrations and seed your configured database:

```sh
cd backend
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
```

For Compose, rebuild the API and run `docker compose exec api node dist-seed/seed.js`. The seed adds 27 original Python problems (nine existing and eighteen new) and the 22-module course **DSA: Foundations to Interviews**. Repeating it preserves accounts, accepted submissions, authored problem edits and existing courses/progress. A previously seeded course is preserved; update it in the content studio rather than expecting reseeding to overwrite edits.

Open **Courses**, or `/study-plan/dsa-foundations-to-interviews`. Guests can read free published lessons. Enrollment requires an account. Lessons include worked Python examples, complexity, common mistakes, review checkpoints and local practice links. The curriculum covers foundations/complexity, mathematics/bits, arrays/matrices, hashing/strings, sorting, pointers/windows/prefix sums, binary search, linked lists, stacks/queues, recursion/backtracking, greedy/intervals, heaps, trees/BSTs, tries, graph algorithms, dynamic programming, range queries, advanced strings and interview revision. Advanced topics are introductory lessons and worked examples, not every specialized algorithm.

Reading and solving are tracked separately. Learners mark lessons read/unread. Problem credit is derived from their distinct accepted **Submit** records on active problems. Runs, repeated accepts, AI suggestions and external links do not add solved credit. The percentage counts completed lessons plus distinct solved local problems and includes solves made before enrollment. Navigation resumes unfinished reading or practice. Progress belongs to the signed-in account.

## Author courses

Open **Admin → Courses → Create a course** for the normal form. Add modules, lessons, examples and local practice selections, preview, then save a draft or review and publish. No JSON is required. The advanced JSON editor remains under **Admin → Content → Courses**. `isPublished:false` keeps drafts out of public endpoints. Published courses require valid lessons and existing published local practice problems.

Modules and lessons follow their array order. Module slugs are unique within the course; lesson slugs are unique within their module. Keep slugs stable to retain lesson IDs and progress. Saving replaces the supplied structure: removing modules/lessons also removes their reading completion records. The UI explains this before confirmation. Resources have `{ "title": "...", "url": "https://...", "kind": "reading" }`; kinds are `reading`, `practice` and `video`. They are external links, not embedded or verified external judging integrations.

## Import more problems

To add one question, open **Admin → Problems → Add problem**. Fill the statement, constraints, sample and hidden cases, Python starter and reference solution; then save a draft or verify and publish. For bulk imports, open **Admin → Content → Problem import**. Use the working example or a JSON object with a `problems` array. Requests are limited to 256 KB and batches to 25 problems. Split larger libraries into batches.

Required fields are `title`, `slug`, unique `number`, `difficulty`, `description`, Python `referenceSolution` and `testCases`. Optional fields include lowercase-hyphenated `tags`, `constraints`, Python `starterCode`, `timeLimit` (milliseconds), `memoryLimit` (kilobytes; default 262144), and source metadata. Include input/output formats and at least one sample case. External content requires `sourceName`, `sourceUrl`, `license` or permission details, and `attribution`. An optional `sourceProblemId` prevents repeated source imports.

Preview performs no writes and reports conflicting slugs, numbers or source IDs. Confirming imports creates **unpublished drafts only**, in one transaction. Existing problems cannot be overwritten. Review drafts under Admin → Problems before publishing; reference execution must pass every configured case through Judge0.

For LeetCode/TUF, curate external practice links or arrange permission for hosted content. Their terms restrict scraping and redistribution: [LeetCode](https://leetcode.com/terms/), [takeUforward](https://takeuforward.org/terms-and-conditions). A link is not automatic submission/completion synchronization.

## Enable AI tutoring

Set these **backend-only** variables and restart/rebuild the API:

```dotenv
OPENAI_API_KEY=your-private-project-api-key
AI_MODEL=a-model-available-to-your-api-project
AI_REQUESTS_PER_HOUR=20
AI_MAX_OUTPUT_TOKENS=1800
AI_TIMEOUT_MS=45000
```

Keep actual keys out of Git and frontend `VITE_` variables. Both key and model are required; an unconfigured tutor reports unavailable. No model training or vector database is needed. Choose a model and usage budget in your provider account. The backend uses the [Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses), keeps the key [server-side](https://developers.openai.com/api/reference/overview), requests `store:false` and grants no tools. `store:false` does not promise zero provider retention; review your account's data settings.

Open a problem and select **Ask AI** / **AI tutor**. Hint provides incremental guidance; Explain walks through the public problem; Solution requests Python code and complexity; Debug analyzes selected code. Code and latest public results are included only when the learner checks the relevant options. The panel explains what is sent to OpenAI. Chat stays in page memory and resets on account/problem changes. Responses arrive as a complete message with loading, cancellation and recoverable errors.

Authentication, published-problem/premium access, submission ownership, input/output bounds, timeout and Redis hourly quotas are enforced in the backend. Public fields are selected explicitly and sample results are filtered in SQL. Hidden test values, private reference programs, unpublished editorials, other users' submissions and credentials are excluded from model context. User content is treated as untrusted data. Model instruction-following is probabilistic; secret data is excluded before the request.

AI suggestions do not award credit, replace editor content or submit code automatically. Verify them with Run/Submit through the isolated judge. Development tests mock provider responses and failures; no real paid model calls were made.

## Verification

Backend tests cover PostgreSQL enrollment/completion, accepted-only progress, stable-ID edits, authorization, draft publication, authoring roundtrip and atomic imports. Trusted reference programs are checked against all repository fixtures. Frontend tests cover course navigation, import review and opt-in tutor context.

Run `npx playwright test --config playwright.ui.config.ts` in `frontend` for desktop/mobile course checks using deterministic API fixtures, separately from real-stack judge E2E. Install the matching Chromium with `npx playwright install chromium`, or use an installed supported browser by setting `PLAYWRIGHT_CHANNEL=msedge` (PowerShell: `$env:PLAYWRIGHT_CHANNEL='msedge'`). These UI fixtures do not replace backend persistence or real provider checks.
