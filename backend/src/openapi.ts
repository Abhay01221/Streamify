const json = (schema: object) => ({ 'application/json': { schema } });
const response = { description: 'Successful response', content: json({ type: 'object' }) };
const error = { description: 'Request rejected', content: json({ type: 'object', required: ['error'], properties: { error: { type: 'string' } } }) };
const paths: Record<string, object> = {};
const add = (path: string, method: string, summary: string, secured = true, body?: object) => {
  const pathParameters = [...path.matchAll(/\{(\w+)\}/g)].map(m => ({ in: 'path', name: m[1], required: true, schema: { type: 'string' } }));
  paths[path] = { ...paths[path], [method]: { summary, ...(secured ? { security: [{ accessCookie: [] }, { bearerAuth: [] }] } : {}),
    parameters: [...pathParameters, ...(['post', 'patch', 'put', 'delete'].includes(method) ? [{ in: 'header', name: 'X-CodeForge-CSRF', required: true, schema: { type: 'string', enum: ['1'] } }] : [])],
    ...(body ? { requestBody: { required: true, content: json(body) } } : {}),
    responses: { [path === '/api/submissions' && method === 'post' ? '202' : '200']: response, '400': error, '401': error, '403': error, '429': error, '503': error } } };
};
const string = { type: 'string' };
add('/api/auth/register', 'post', 'Create an ordinary account', false, { type: 'object', required: ['email', 'username', 'password'], properties: { email: { ...string, format: 'email' }, username: { ...string, minLength: 3, maxLength: 20 }, password: { ...string, minLength: 8, maxLength: 72 } } });
add('/api/auth/login', 'post', 'Login with email and password', false, { type: 'object', required: ['email', 'password'], properties: { email: { ...string, format: 'email' }, password: string } });
for (const name of ['logout', 'refresh', 'forgot-password', 'reset-password', 'verify-email']) add(`/api/auth/${name}`, 'post', name, name === 'logout');
add('/api/auth/me', 'get', 'Current authenticated profile');
add('/api/problems', 'get', 'Search/filter problems; page and limit pagination', false);
add('/api/problems/{slug}', 'get', 'Published problem with sample tests only', false);
add('/api/problems/{slug}/submissions', 'get', 'Own recent judged submissions');
add('/api/problems/bookmarks', 'get', 'Own bookmarks');
add('/api/problems/{slug}/bookmark', 'put', 'Bookmark a published problem');
add('/api/problems/{slug}/bookmark', 'delete', 'Remove a bookmark');
add('/api/submissions', 'post', 'Queue a Run or judged Submit', true, { type: 'object', additionalProperties: false,
  required: ['problemSlug', 'language', 'code'], properties: { problemSlug: string, language: { type: 'string', enum: ['python', 'python3'] },
    code: { ...string, minLength: 1, maxLength: 65536 }, isRun: { type: 'boolean', default: false }, customInput: { ...string, maxLength: 65536, description: 'Only permitted when isRun=true; empty string is supported' } } });
add('/api/submissions', 'get', 'Own submission history; page, limit, verdict, language, problem filters');
add('/api/submissions/{id}', 'get', 'Owner/admin detail; hidden test output stripped for nonadmins');
add('/api/users/me/progress', 'get', 'Distinct solved problems');
add('/api/users/{username}', 'get', 'Profile subject to privacy', false);
add('/api/users/{username}/stats', 'get', 'Statistics subject to privacy', false);
add('/api/users/{username}/heatmap', 'get', 'UTC activity subject to privacy', false);
add('/api/users/me', 'patch', 'Update permitted profile fields');
add('/api/leaderboard', 'get', 'Public account ranking by distinct active problems solved', false);
for (const suffix of ['problems', 'submissions', 'users', 'analytics', 'health']) add(`/api/admin/${suffix}`, 'get', `Admin-only ${suffix}`);
add('/api/admin/problems', 'post', 'Admin-only create draft or validated published problem');
add('/api/admin/problems/{id}', 'get', 'Admin-only problem including private tests');
add('/api/admin/problems/{id}', 'patch', 'Admin-only validated problem/test replacement');
add('/api/admin/problems/{id}', 'delete', 'Admin-only unpublish preserving history');
add('/api/study-plans', 'get', 'Published courses with current learner progress; page/limit pagination', false);
add('/api/study-plans/{id}', 'get', 'Course modules, lessons and current learner practice status', false);
add('/api/study-plans/{id}/enroll', 'post', 'Enroll in a published course idempotently');
add('/api/study-plans/{id}/lessons/{lessonId}/completion', 'put', 'Mark an enrolled lesson as read/unread', true,
  { type: 'object', required: ['completed'], additionalProperties: false, properties: { completed: { type: 'boolean' } } });
for (const action of ['preview', 'import']) add(`/api/admin/content/problems/${action}`, 'post', `Admin-only problem ${action}; imports create drafts only`);
add('/api/admin/content/courses', 'get', 'Admin-only course catalog including drafts');
add('/api/admin/content/courses/{id}', 'get', 'Admin-only course authoring JSON');
add('/api/admin/content/courses/{slug}', 'put', 'Admin-only course save with stable module/lesson slugs');
add('/api/tutor/status', 'get', 'AI tutor availability without disclosing credentials', false);
add('/api/tutor/messages', 'post', 'Authenticated bounded AI tutoring using public problem context', true,
  { type: 'object', required: ['problemSlug', 'mode', 'message'], additionalProperties: false, properties: {
    problemSlug: string, mode: { type: 'string', enum: ['hint', 'explain', 'solution', 'debug'] },
    message: { ...string, maxLength: 4000 }, code: { ...string, maxLength: 32768 }, submissionId: string,
    history: { type: 'array', maxItems: 8, items: { type: 'object', required: ['role', 'content'], properties: { role: { type: 'string', enum: ['user', 'assistant'] }, content: { ...string, maxLength: 8000 } } } },
  } });
export const openapi = { openapi: '3.0.3', info: { title: 'CodeForge core API', version: '1.0.0',
  description: 'Core implemented endpoints. See docs/api.md for exact response shapes and optional legacy integrations.' }, paths,
  components: { securitySchemes: { accessCookie: { type: 'apiKey', in: 'cookie', name: 'accessToken' }, bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } } };
