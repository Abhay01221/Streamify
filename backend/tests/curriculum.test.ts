import { execFileSync } from 'child_process';
import { dsaCourse } from '../prisma/dsaCourse';
import { dsaProblems } from '../prisma/dsaProblems';
import { originalProblems } from '../prisma/originalProblems';
import { normalizeOutput } from '../src/execution/policy';

describe('original DSA curriculum integrity', () => {
  const problems = [...originalProblems, ...dsaProblems];
  const knownSlugs = new Set(problems.map(problem => problem.slug));

  it('has unique catalog identifiers and no broken local practice links', () => {
    expect(knownSlugs.size).toBe(problems.length);
    expect(new Set(problems.map(problem => problem.number)).size).toBe(problems.length);
    for (const module of dsaCourse.modules) {
      for (const lesson of module.lessons) {
        for (const slug of lesson.problemSlugs) expect(knownSlugs.has(slug as typeof problems[number]['slug'])).toBe(true);
      }
    }
  });

  it('provides original worked lessons throughout the ordered path', () => {
    expect(dsaCourse.modules).toHaveLength(22);
    expect(new Set(dsaCourse.modules.map(module => module.slug)).size).toBe(dsaCourse.modules.length);
    const lessons = dsaCourse.modules.flatMap(module => module.lessons);
    expect(new Set(lessons.map(lesson => lesson.slug)).size).toBe(lessons.length);
    for (const lesson of lessons) {
      expect(lesson.content.length).toBeGreaterThan(1500);
      expect(lesson.content).toContain('```python');
      expect(lesson.content).toContain('## Common errors and checkpoint');
      expect(lesson.estimatedMinutes).toBeGreaterThan(0);
      expect(Number.isInteger(lesson.estimatedMinutes)).toBe(true);
      expect(lesson.problemSlugs.length).toBeGreaterThan(0);
    }
  });

  it('gives every new local problem samples, boundary tests, and a precise input contract', () => {
    for (const problem of dsaProblems) {
      expect(problem.number).toBeGreaterThanOrEqual(11001);
      expect(problem.description).toContain('## Input format');
      expect(problem.description).toContain('## Output format');
      expect(problem.testCases.length).toBeGreaterThanOrEqual(3);
      expect(problem.testCases.some(testCase => testCase.isSample)).toBe(true);
      expect(problem.testCases.some(testCase => !testCase.isSample)).toBe(true);
    }
  });
});

// Only repository-owned Python reference programs are executed here. User code
// continues to run exclusively through the configured isolated judge provider.
describe('trusted additional DSA reference fixtures', () => {
  for (const problem of dsaProblems) {
    test.each(problem.testCases.map((testCase, index) => [index, testCase.input, testCase.output] as const))(
      `${problem.slug} case %s`, (_index, input, expected) => {
        const actual = execFileSync(process.platform === 'win32' ? 'python' : 'python3', ['-c', problem.reference], {
          input, encoding: 'utf8', timeout: 5000,
        });
        expect(normalizeOutput(actual)).toBe(normalizeOutput(expected));
      },
    );
  }
});
