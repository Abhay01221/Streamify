process.env.JWT_SECRET = 'test-access-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-that-is-at-least-32-characters';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.JUDGE0_URL = 'http://judge.example';
if (process.env.TEST_DATABASE_URL) {
  const url = new URL(process.env.TEST_DATABASE_URL);
  if (!url.pathname.endsWith('/codeforge_test')) throw new Error('Tests require a dedicated codeforge_test database');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
