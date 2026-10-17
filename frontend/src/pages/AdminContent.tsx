import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, FileJson, Upload } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

const problemExample = JSON.stringify(
  {
    problems: [
      {
        title: "Sum the parcels",
        slug: "sum-the-parcels",
        number: 1000,
        difficulty: "EASY",
        description:
          "Read an integer n, followed by n integers. Print their sum.\n\nConstraints: 1 <= n <= 1000; -1000 <= each integer <= 1000.",
        referenceSolution:
          "import sys\nvalues = list(map(int, sys.stdin.read().split()))\nprint(sum(values[1:]))",
        timeLimit: 2000,
        memoryLimit: 262144,
        tags: ["array"],
        constraints: ["1 <= n <= 1000"],
        starterCode: { python: "# Read input and print the sum\n" },
        testCases: [
          { input: "3\n2 4 6\n", output: "12", isSample: true },
          { input: "1\n-7\n", output: "-7", isSample: false },
          { input: "4\n0 5 -5 2\n", output: "2", isSample: false },
        ],
        sourceName: "CodeForge",
        license: "Original content",
        attribution: "Written by the course author",
      },
    ],
  },
  null,
  2,
);

const courseExample = JSON.stringify(
  {
    title: "Array foundations",
    description:
      "Learn to traverse arrays and reason about linear time algorithms.",
    difficulty: "BEGINNER",
    estimatedDays: 7,
    isPublished: false,
    isPremium: false,
    modules: [
      {
        slug: "array-basics",
        title: "Array basics",
        description: "Build the fundamentals.",
        lessons: [
          {
            slug: "traverse-an-array",
            title: "Traverse an array",
            summary: "Visit each value once.",
            content:
              "## A single pass\n\nKeep a running answer and update it for each element. A pass takes O(n) time and O(1) extra space.\n\n### Try it\n\nSum a few values by hand, then write a loop and check the result.",
            estimatedMinutes: 15,
            problemSlugs: [],
            resources: [],
          },
        ],
      },
    ],
  },
  null,
  2,
);

function errorText(error: unknown): string {
  const data = (
    error as {
      response?: { data?: { error?: unknown; details?: unknown } };
      message?: string;
    }
  )?.response?.data;
  const detail = data?.details ? ` ${JSON.stringify(data.details)}` : "";
  return `${typeof data?.error === "string" ? data.error : (error as Error)?.message || "Request failed. Please try again."}${detail}`;
}

function parseObject(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Enter a JSON object.");
  return parsed as Record<string, unknown>;
}

interface PreviewItem {
  slug: string;
  title: string;
  duplicate: boolean;
  conflict?: string;
}
interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  isPublished: boolean;
}

export default function AdminContent() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "courses" ? "courses" : "problems";
  const setTab = (value: "problems" | "courses") => setParams({ tab: value });
  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h2 className="text-xl font-bold">Content studio</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Add a single problem or build a course using normal forms. Use the
          advanced tools below for bulk JSON imports.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-semibold">Add practice questions</h3>
          <p className="text-sm text-muted-foreground">
            Enter a statement, sample inputs/outputs, hidden tests, and a
            correct Python solution. Save a draft, then verify and publish.
          </p>
          <Button asChild>
            <Link to="/admin/problems/new">Add a problem</Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Published problems appear in the public Problems catalog.
          </p>
        </div>
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-semibold">Create a structured course</h3>
          <p className="text-sm text-muted-foreground">
            Add modules and lessons, select practice questions, and attach
            LeetCode, TUF, video, or reading links.
          </p>
          <Button asChild>
            <Link to="/admin/courses/new">Create a course</Link>
          </Button>
          <Link to="/admin/courses" className="block text-sm text-coders-blue">
            Edit existing courses →
          </Link>
        </div>
      </div>
      <h3 className="font-semibold">Advanced: bulk import and JSON editing</h3>
      <div
        className="flex gap-2 border-b border-coders-border pb-3"
        aria-label="Content tools"
      >
        <Button
          variant={tab === "problems" ? "secondary" : "ghost"}
          aria-pressed={tab === "problems"}
          onClick={() => setTab("problems")}
        >
          <FileJson className="w-4 h-4 mr-2" />
          Problem import
        </Button>
        <Button
          variant={tab === "courses" ? "secondary" : "ghost"}
          aria-pressed={tab === "courses"}
          onClick={() => setTab("courses")}
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Courses
        </Button>
      </div>
      {tab === "problems" ? <ProblemImporter /> : <CourseAuthor />}
    </div>
  );
}

function JsonInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [fileError, setFileError] = useState("");
  return (
    <div className="space-y-3">
      <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Upload className="w-4 h-4" />
        Load a JSON file
        <input
          type="file"
          accept=".json,application/json"
          className="text-xs max-w-full"
          onChange={async (event) => {
            const file = event.currentTarget.files?.[0];
            setFileError("");
            if (!file) return;
            if (file.size > 256 * 1024) {
              setFileError("Choose a JSON file smaller than 256 KB.");
              return;
            }
            try {
              onChange(await file.text());
            } catch {
              setFileError("Could not read this file.");
            }
          }}
        />
      </label>
      {fileError && (
        <p role="alert" className="text-sm text-red-400">
          {fileError}
        </p>
      )}
      <label className="block text-sm font-medium">
        {label}
        <textarea
          spellCheck={false}
          className="mt-2 block w-full rounded-lg bg-coders-bg border border-coders-border p-3 font-mono text-xs leading-6 focus-visible:outline-coders-blue"
          rows={20}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  );
}

function ProblemImporter() {
  const [value, setValue] = useState(problemExample);
  const [preview, setPreview] = useState<{
    json: string;
    valid: boolean;
    items: PreviewItem[];
  } | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();
  const updateValue = (next: string) => {
    setValue(next);
    setPreview(null);
    setError("");
    setMessage("");
  };
  const validate = useMutation({
    mutationFn: async () => {
      const body = parseObject(value);
      const response = await api.post("/admin/content/problems/preview", body);
      return { json: value, ...response.data } as {
        json: string;
        valid: boolean;
        items: PreviewItem[];
      };
    },
    onMutate: () => {
      setPreview(null);
      setError("");
      setMessage("");
    },
    onSuccess: (result) => {
      if (result.json !== value) return;
      setPreview({
        json: result.json,
        valid: result.valid,
        items: result.items,
      });
      if (!result.valid)
        setError("Resolve the import conflicts below, then validate again.");
    },
    onError: (error) => setError(errorText(error)),
  });
  const importProblems = useMutation({
    mutationFn: async () => {
      if (!preview?.valid || preview.json !== value)
        throw new Error(
          "Validate the current JSON and resolve conflicts before importing.",
        );
      return api.post(
        "/admin/content/problems/import",
        parseObject(preview.json),
      );
    },
    onMutate: () => {
      setError("");
      setMessage("");
    },
    onSuccess: (result) => {
      setMessage(
        `Imported ${result.data.imported} draft problems. Review and publish them from Problems after reference solution verification.`,
      );
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-problems"] });
    },
    onError: (error) => setError(errorText(error)),
  });
  const busy = validate.isPending || importProblems.isPending;
  return (
    <section className="space-y-5">
      <div className="rounded-lg bg-coders-blue/5 border border-coders-blue/20 p-4 text-sm">
        <p>
          Imports are saved as unpublished drafts. Include statements, reference
          solutions, sample and hidden tests, and source/license details for
          content you have permission to use.
        </p>
        <p className="mt-2 text-muted-foreground">
          For LeetCode or TUF practice, add external links to course lessons. Do
          not import their statements or test cases without permission.
        </p>
      </div>
      <JsonInput
        label="Problem import JSON"
        value={value}
        onChange={updateValue}
      />
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => validate.mutate()} disabled={busy}>
          {validate.isPending ? "Validating…" : "Validate and preview"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => updateValue(problemExample)}
          disabled={busy}
        >
          Reset to example
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm text-red-400 whitespace-pre-wrap break-words"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-coders-green">
          {message}{" "}
          <Link to="/admin/problems" className="underline">
            Review problems
          </Link>
        </p>
      )}
      {preview && (
        <div className="glass-card p-4 space-y-4">
          <h3 className="font-semibold">
            Review {preview.items.length} problems
          </h3>
          <ul className="space-y-2">
            {preview.items.map((item, index) => (
              <li
                key={`${item.slug}-${index}`}
                className="flex flex-wrap justify-between gap-2 border-b border-coders-border pb-2 text-sm"
              >
                <span>
                  {item.title}{" "}
                  <span className="text-xs text-muted-foreground">
                    ({item.slug})
                  </span>
                </span>
                <span
                  className={
                    item.duplicate ? "text-yellow-400" : "text-coders-green"
                  }
                >
                  {item.duplicate
                    ? item.conflict || "Duplicate — resolve before import"
                    : "New draft"}
                </span>
              </li>
            ))}
          </ul>
          {preview.items.some((item) => item.duplicate) && (
            <p className="text-sm text-yellow-400">
              Duplicate slugs or problem numbers must be resolved before
              importing. Existing problems are not overwritten.
            </p>
          )}
          <Button
            onClick={() => importProblems.mutate()}
            disabled={
              busy ||
              !preview.valid ||
              preview.json !== value ||
              preview.items.some((item) => item.duplicate)
            }
          >
            {importProblems.isPending ? "Importing…" : "Import as drafts"}
          </Button>
        </div>
      )}
    </section>
  );
}

function CourseAuthor() {
  const [slug, setSlug] = useState("array-foundations");
  const [value, setValue] = useState(courseExample);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [review, setReview] = useState<{
    json: string;
    slug: string;
    title: string;
    published: boolean;
    modules: number;
    lessons: number;
    problemLinks: number;
  } | null>(null);
  const queryClient = useQueryClient();
  const catalog = useQuery<{ courses: CourseSummary[] }>({
    queryKey: ["admin-content-courses"],
    queryFn: () =>
      api.get("/admin/content/courses").then((response) => response.data),
  });
  const resetReview = () => {
    setReview(null);
    setError("");
    setMessage("");
  };
  const load = useMutation({
    mutationFn: (course: CourseSummary) =>
      api
        .get(`/admin/content/courses/${course.id}`)
        .then((response) => ({
          slug: course.slug,
          course: response.data.course,
        })),
    onMutate: resetReview,
    onSuccess: (result) => {
      setSlug(result.slug);
      setValue(JSON.stringify(result.course, null, 2));
    },
    onError: (error) => setError(errorText(error)),
  });
  const save = useMutation({
    mutationFn: async () => {
      if (!review || review.slug !== slug || review.json !== value)
        throw new Error("Review the current course before saving.");
      return api.put(
        `/admin/content/courses/${encodeURIComponent(slug)}`,
        parseObject(value),
      );
    },
    onMutate: () => {
      setError("");
      setMessage("");
    },
    onSuccess: () => {
      setMessage(
        "Course saved. Lesson progress is preserved for matching module and lesson slugs.",
      );
      setReview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-content-courses"] });
      queryClient.invalidateQueries({ queryKey: ["study-plans"] });
      queryClient.invalidateQueries({ queryKey: ["study-plan"] });
    },
    onError: (error) => setError(errorText(error)),
  });
  const reviewCourse = () => {
    resetReview();
    try {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
        throw new Error("Use a lowercase course slug with hyphens.");
      const body = parseObject(value);
      if (
        typeof body.title !== "string" ||
        !body.title.trim() ||
        !Array.isArray(body.modules)
      )
        throw new Error("The course needs a title and a modules array.");
      let lessons = 0;
      let problemLinks = 0;
      body.modules.forEach((module: unknown) => {
        if (
          !module ||
          typeof module !== "object" ||
          !Array.isArray((module as { lessons?: unknown }).lessons)
        )
          throw new Error("Every module needs a lessons array.");
        const items = (module as { lessons: { problemSlugs?: unknown }[] })
          .lessons;
        lessons += items.length;
        items.forEach((lesson) => {
          if (Array.isArray(lesson.problemSlugs))
            problemLinks += lesson.problemSlugs.length;
        });
      });
      setReview({
        json: value,
        slug,
        title: body.title,
        published: body.isPublished === true,
        modules: body.modules.length,
        lessons,
        problemLinks,
      });
    } catch (error) {
      setError(errorText(error));
    }
  };
  return (
    <section className="space-y-5">
      <div className="glass-card p-4">
        <h3 className="font-semibold mb-3">Existing courses</h3>
        {catalog.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading courses…
          </p>
        ) : catalog.isError ? (
          <p role="alert" className="text-sm">
            Could not load the course catalog.{" "}
            <button className="underline" onClick={() => catalog.refetch()}>
              Try again
            </button>
          </p>
        ) : catalog.data?.courses.length ? (
          <ul className="space-y-2">
            {catalog.data.courses.map((course) => (
              <li
                key={course.id}
                className="flex flex-wrap items-center justify-between gap-3 text-sm"
              >
                <span>
                  {course.title}{" "}
                  <span className="text-xs text-muted-foreground">
                    {course.isPublished ? "Published" : "Draft"}
                  </span>
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    className="text-coders-blue"
                    to={`/admin/courses/${course.id}/edit`}
                  >
                    Edit with form
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={load.isPending}
                    onClick={() => load.mutate(course)}
                  >
                    Load <span className="sr-only">{course.title}</span>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No courses yet. Create one below.
          </p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Order modules and lessons in their arrays. Use stable slugs to retain
        reading progress. Link local problems with <code>problemSlugs</code>;
        external resources use <code>{"{ title, url, kind }"}</code> with kind{" "}
        <code>practice</code>, <code>reading</code>, or <code>video</code>.
        Saving replaces the course contents, including removed lessons. Set{" "}
        <code>isPublished</code> to true only when it is ready for learners.
      </p>
      <label className="block text-sm font-medium">
        Course slug
        <input
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            resetReview();
          }}
          className="block mt-2 w-full bg-coders-bg border border-coders-border p-3 rounded-lg text-sm focus-visible:outline-coders-blue"
        />
      </label>
      <JsonInput
        label="Course JSON"
        value={value}
        onChange={(next) => {
          setValue(next);
          resetReview();
        }}
      />
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={reviewCourse}
          disabled={save.isPending || load.isPending}
        >
          Review course
        </Button>
        <Button
          variant="ghost"
          disabled={save.isPending || load.isPending}
          onClick={() => {
            setSlug("array-foundations");
            setValue(courseExample);
            resetReview();
          }}
        >
          New example course
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm text-red-400 whitespace-pre-wrap break-words"
        >
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-coders-green">
          {message}
        </p>
      )}
      {review && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="font-semibold">{review.title}</h3>
          <p className="text-sm">
            {review.modules} modules · {review.lessons} lessons ·{" "}
            {review.problemLinks} local problem links
          </p>
          <p className="text-sm text-muted-foreground">
            This will save <strong>{review.slug}</strong> as{" "}
            {review.published
              ? "a published course visible to learners"
              : "an unpublished draft"}
            . The server validates lesson content and linked problems before
            saving.
          </p>
          {catalog.data?.courses.some(
            (course) => course.slug === review.slug,
          ) && (
            <p className="text-sm text-yellow-400">
              Saving replaces the existing course. Omitted modules and lessons,
              including their reading progress, will be removed. Matching module
              and lesson slugs retain progress. Review the full JSON before
              confirming.
            </p>
          )}
          <Button
            onClick={() => save.mutate()}
            disabled={
              save.isPending || review.json !== value || review.slug !== slug
            }
          >
            {save.isPending
              ? "Saving…"
              : review.published
                ? "Confirm save and publish"
                : "Confirm save draft"}
          </Button>
        </div>
      )}
    </section>
  );
}
