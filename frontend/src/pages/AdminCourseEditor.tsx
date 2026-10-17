import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { contentError, contentSlug } from "@/lib/contentErrors";

interface Resource {
  title: string;
  url: string;
  kind: "practice" | "reading" | "video";
}
interface Lesson {
  key: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  estimatedMinutes: number;
  problemSlugs: string[];
  resources: Resource[];
}
interface Module {
  key: string;
  slug: string;
  title: string;
  description: string;
  lessons: Lesson[];
}
interface Course {
  title: string;
  description: string;
  difficulty: string;
  estimatedDays: number;
  isPremium: boolean;
  modules: Module[];
}
interface Problem {
  id: string;
  slug: string;
  title: string;
  number: number;
  isActive: boolean;
}
interface SavedCourse {
  slug?: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedDays: number;
  isPremium: boolean;
  isPublished: boolean;
  modules: Array<
    Omit<Module, "key" | "lessons"> & { lessons: Array<Omit<Lesson, "key">> }
  >;
}
let keys = 0;
const key = () => `author-item-${++keys}`;
const newLesson = (): Lesson => ({
  key: key(),
  title: "",
  slug: "",
  summary: "",
  content: "",
  estimatedMinutes: 20,
  problemSlugs: [],
  resources: [],
});
const newModule = (): Module => ({
  key: key(),
  title: "",
  slug: "",
  description: "",
  lessons: [newLesson()],
});
const newCourse = (): Course => ({
  title: "",
  description: "",
  difficulty: "BEGINNER",
  estimatedDays: 7,
  isPremium: false,
  modules: [newModule()],
});
const field =
  "mt-1 block w-full rounded-lg border border-coders-border bg-coders-surface p-3 text-sm focus-visible:outline-coders-blue";
function reorder<T>(items: T[], index: number, direction: number): T[] {
  const next = [...items];
  const target = index + direction;
  if (target < 0 || target >= next.length) return items;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function AdminCourseEditor() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [course, setCourse] = useState<Course>(newCourse);
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemSearch, setProblemSearch] = useState("");
  const [problemError, setProblemError] = useState("");
  const [catalog, setCatalog] = useState<Array<{ id: string; slug: string }>>(
    [],
  );
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [existing, setExisting] = useState(Boolean(id));
  const [review, setReview] = useState<{
    course: SavedCourse;
    slug: string;
  } | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    content: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    setReview(null);
    setError("");
    setMessage("");
    setLoadFailed(false);
    setExisting(Boolean(id));
    setProblemError("");
    setCatalogReady(false);
    setCatalogError("");
    const loadCatalog = api.get("/admin/content/courses").then((response) => {
      if (active) {
        setCatalog(response.data.courses || []);
        setCatalogReady(true);
      }
      return response;
    });
    const loadProblems = async () => {
      const catalog: Problem[] = [];
      let page = 1;
      let total = 0;
      do {
        const { data } = await api.get(
          `/admin/problems?limit=100&page=${page}`,
        );
        catalog.push(...data.problems);
        total = data.pagination?.total ?? catalog.length;
        page++;
      } while (catalog.length < total && page <= 100);
      if (active) setProblems(catalog);
    };
    void loadProblems().catch(() => {
      if (active)
        setProblemError(
          "Could not load practice problems. Existing links are kept. Reload the page to try again.",
        );
    });
    if (!id) {
      setCourse(newCourse());
      setSlug("");
      setPublished(false);
      setLoading(false);
      void loadCatalog.catch(() => {
        if (active)
          setCatalogError(
            "Could not check existing course URLs. Try again before saving.",
          );
      });
      return () => {
        active = false;
      };
    }
    setLoading(true);
    Promise.all([
      api.get(`/admin/content/courses/${encodeURIComponent(id)}`),
      loadCatalog,
    ])
      .then(([detail, catalog]) => {
        if (!active) return;
        const data: SavedCourse = detail.data.course;
        const courseSlug =
          data.slug ||
          catalog.data.courses.find(
            (item: { id: string; slug: string }) =>
              item.id === id || item.slug === id,
          )?.slug;
        if (!courseSlug)
          throw new Error(
            "Could not resolve this course URL. Return to Content studio and reopen the course.",
          );
        setSlug(courseSlug);
        setPublished(data.isPublished);
        setCourse({
          title: data.title,
          description: data.description,
          difficulty: data.difficulty,
          estimatedDays: data.estimatedDays,
          isPremium: data.isPremium,
          modules: data.modules.map((module) => ({
            ...module,
            key: key(),
            lessons: module.lessons.map((lesson) => ({
              ...lesson,
              key: key(),
              resources: Array.isArray(lesson.resources)
                ? lesson.resources
                : [],
            })),
          })),
        });
      })
      .catch((error) => {
        if (active) {
          setError(contentError(error));
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);

  const change = (values: Partial<Course>) => {
    setCourse((previous) => ({ ...previous, ...values }));
    setReview(null);
    setMessage("");
  };
  const changeModule = (index: number, values: Partial<Module>) =>
    change({
      modules: course.modules.map((module, i) =>
        i === index ? { ...module, ...values } : module,
      ),
    });
  const changeLesson = (
    moduleIndex: number,
    lessonIndex: number,
    values: Partial<Lesson>,
  ) =>
    changeModule(moduleIndex, {
      lessons: course.modules[moduleIndex].lessons.map((lesson, i) =>
        i === lessonIndex ? { ...lesson, ...values } : lesson,
      ),
    });
  const prepare = (isPublished: boolean) => {
    setError("");
    setMessage("");
    if (!catalogReady) {
      setError("Wait for the course catalog to load, or try loading it again.");
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2) {
      setError(
        "Course slug: use at least two lowercase letters or digits, with hyphens between words.",
      );
      return;
    }
    if (!existing && catalog.some((item) => item.slug === slug)) {
      setError(
        "That course slug already exists. Choose a different slug, or open the existing course from All courses to edit it.",
      );
      return;
    }
    const modules = course.modules.map((module) => ({
      slug: module.slug,
      title: module.title,
      description: module.description,
      lessons: module.lessons.map((lesson) => ({
        slug: lesson.slug,
        title: lesson.title,
        summary: lesson.summary,
        content: lesson.content,
        estimatedMinutes: lesson.estimatedMinutes,
        problemSlugs: lesson.problemSlugs,
        resources: lesson.resources,
      })),
    }));
    setReview({
      slug,
      course: {
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        estimatedDays: course.estimatedDays,
        isPremium: course.isPremium,
        modules,
        isPublished,
      },
    });
  };
  const save = async () => {
    if (!review) return;
    setBusy(true);
    setError("");
    try {
      await api.put(
        `/admin/content/courses/${encodeURIComponent(review.slug)}`,
        review.course,
      );
      setPublished(review.course.isPublished);
      setExisting(true);
      setReview(null);
      setMessage(
        review.course.isPublished
          ? "Course published. Learners can open it from Courses."
          : "Draft saved. You can reopen it from Admin → Courses.",
      );
      void queryClient.invalidateQueries({
        queryKey: ["admin-content-courses"],
      });
      void queryClient.invalidateQueries({ queryKey: ["study-plans"] });
      void queryClient.invalidateQueries({ queryKey: ["study-plan"] });
    } catch (error) {
      setError(contentError(error));
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <p role="status">Loading course…</p>;
  if (loadFailed)
    return (
      <div className="space-y-3">
        <p role="alert" className="text-red-400">
          {error}
        </p>
        <Button onClick={() => setReload((value) => value + 1)}>
          Try again
        </Button>
      </div>
    );
  const filteredProblems = problems.filter((problem) =>
    `${problem.title} ${problem.slug} ${problem.number}`
      .toLowerCase()
      .includes(problemSearch.toLowerCase()),
  );
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const action = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        prepare(action?.value === "publish");
      }}
    >
      <div>
        <Link to="/admin/courses" className="text-sm text-coders-blue">
          ← All courses
        </Link>
        <h2 className="mt-2 text-xl font-bold">
          {existing ? "Edit course" : "Create a course"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add modules in learning order. Each module contains lessons, practice
          problems, and optional links.
        </p>
        {existing && (
          <p className="mt-2 text-sm">
            Current status: <strong>{published ? "Published" : "Draft"}</strong>
          </p>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="whitespace-pre-wrap rounded-lg border border-red-400/30 p-4 text-sm text-red-400"
        >
          {error}
        </p>
      )}
      {catalogError && (
        <p role="alert" className="text-sm text-red-400">
          {catalogError}{" "}
          <button
            type="button"
            className="underline"
            onClick={() => setReload((value) => value + 1)}
          >
            Try again
          </button>
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-coders-green">
          {message}{" "}
          {published && (
            <Link className="underline" to={`/study-plan/${slug}`}>
              Open course
            </Link>
          )}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Course title
          <input
            className={field}
            required
            minLength={3}
            maxLength={200}
            value={course.title}
            onChange={(event) => {
              change({ title: event.target.value });
              if (!existing && (!slug || slug === contentSlug(course.title)))
                setSlug(contentSlug(event.target.value));
            }}
          />
        </label>
        <label>
          Course slug
          <input
            className={field}
            required
            minLength={2}
            maxLength={160}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            disabled={existing}
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setReview(null);
            }}
          />
          <span className="text-xs text-muted-foreground">
            A stable, unique course URL.
          </span>
        </label>
        <label>
          Course level
          <select
            className={field}
            value={course.difficulty}
            onChange={(event) => change({ difficulty: event.target.value })}
          >
            {[
              ...new Set([
                "BEGINNER",
                "INTERMEDIATE",
                "ADVANCED",
                course.difficulty,
              ]),
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Estimated days
          <input
            className={field}
            required
            type="number"
            min={1}
            max={730}
            step={1}
            value={course.estimatedDays}
            onChange={(event) =>
              change({ estimatedDays: Number(event.target.value) })
            }
          />
        </label>
      </div>
      <label className="block">
        Course description
        <textarea
          className={field}
          rows={3}
          required
          minLength={10}
          maxLength={10000}
          value={course.description}
          onChange={(event) => change({ description: event.target.value })}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={course.isPremium}
          onChange={(event) => change({ isPremium: event.target.checked })}
        />
        Premium course
      </label>
      <div className="rounded-lg border border-coders-border p-4 space-y-2">
        <label className="text-sm">
          Search practice problems
          <input
            type="search"
            className={field}
            value={problemSearch}
            onChange={(event) => setProblemSearch(event.target.value)}
            placeholder="Filter by title, slug, or number"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Select the matching local problems inside each lesson below. Draft
          problems can be linked to draft courses; publish them before
          publishing the course.
        </p>
        {problemError && (
          <p role="alert" className="text-sm text-yellow-400">
            {problemError}
          </p>
        )}
      </div>
      <div className="space-y-5">
        {course.modules.map((module, moduleIndex) => (
          <fieldset
            key={module.key}
            className="rounded-xl border border-coders-border p-4 space-y-4"
          >
            <legend className="px-2 font-semibold">
              Module {moduleIndex + 1}
              {module.title && `: ${module.title}`}
            </legend>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={moduleIndex === 0}
                onClick={() =>
                  change({ modules: reorder(course.modules, moduleIndex, -1) })
                }
              >
                Move module {moduleIndex + 1} up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={moduleIndex === course.modules.length - 1}
                onClick={() =>
                  change({ modules: reorder(course.modules, moduleIndex, 1) })
                }
              >
                Move module {moduleIndex + 1} down
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={course.modules.length === 1}
                onClick={() =>
                  change({
                    modules: course.modules.filter((_, i) => i !== moduleIndex),
                  })
                }
              >
                Remove module {moduleIndex + 1}
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                Module {moduleIndex + 1} title
                <input
                  className={field}
                  required
                  minLength={3}
                  maxLength={200}
                  value={module.title}
                  onChange={(event) =>
                    changeModule(moduleIndex, {
                      title: event.target.value,
                      ...(!module.slug ||
                      (!existing && module.slug === contentSlug(module.title))
                        ? { slug: contentSlug(event.target.value) }
                        : {}),
                    })
                  }
                />
              </label>
              <label>
                Module {moduleIndex + 1} slug
                <input
                  className={field}
                  required
                  minLength={2}
                  maxLength={160}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  value={module.slug}
                  onChange={(event) =>
                    changeModule(moduleIndex, { slug: event.target.value })
                  }
                />
              </label>
            </div>
            <label className="block">
              Module {moduleIndex + 1} description
              <textarea
                className={field}
                rows={2}
                maxLength={10000}
                value={module.description}
                onChange={(event) =>
                  changeModule(moduleIndex, { description: event.target.value })
                }
              />
            </label>
            {module.lessons.map((lesson, lessonIndex) => {
              const name = `Module ${moduleIndex + 1}, lesson ${lessonIndex + 1}`;
              return (
                <fieldset
                  key={lesson.key}
                  className="rounded-lg border border-coders-border bg-coders-surface/30 p-4 space-y-3"
                >
                  <legend className="px-2 font-medium">
                    Lesson {lessonIndex + 1}
                    {lesson.title && `: ${lesson.title}`}
                  </legend>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={lessonIndex === 0}
                      onClick={() =>
                        changeModule(moduleIndex, {
                          lessons: reorder(module.lessons, lessonIndex, -1),
                        })
                      }
                    >
                      Move lesson {lessonIndex + 1} up
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={lessonIndex === module.lessons.length - 1}
                      onClick={() =>
                        changeModule(moduleIndex, {
                          lessons: reorder(module.lessons, lessonIndex, 1),
                        })
                      }
                    >
                      Move lesson {lessonIndex + 1} down
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={module.lessons.length === 1}
                      onClick={() =>
                        changeModule(moduleIndex, {
                          lessons: module.lessons.filter(
                            (_, i) => i !== lessonIndex,
                          ),
                        })
                      }
                    >
                      Remove lesson {lessonIndex + 1}
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label>
                      {name} title
                      <input
                        className={field}
                        required
                        minLength={3}
                        maxLength={200}
                        value={lesson.title}
                        onChange={(event) =>
                          changeLesson(moduleIndex, lessonIndex, {
                            title: event.target.value,
                            ...(!lesson.slug ||
                            (!existing &&
                              lesson.slug === contentSlug(lesson.title))
                              ? { slug: contentSlug(event.target.value) }
                              : {}),
                          })
                        }
                      />
                    </label>
                    <label>
                      {name} slug
                      <input
                        className={field}
                        required
                        minLength={2}
                        maxLength={160}
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        value={lesson.slug}
                        onChange={(event) =>
                          changeLesson(moduleIndex, lessonIndex, {
                            slug: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <label className="block">
                    {name} summary
                    <input
                      className={field}
                      maxLength={1000}
                      value={lesson.summary}
                      onChange={(event) =>
                        changeLesson(moduleIndex, lessonIndex, {
                          summary: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="block">
                    {name} content (Markdown)
                    <textarea
                      className={`${field} font-mono`}
                      rows={8}
                      required
                      minLength={80}
                      maxLength={65536}
                      value={lesson.content}
                      onChange={(event) =>
                        changeLesson(moduleIndex, lessonIndex, {
                          content: event.target.value,
                        })
                      }
                      placeholder={
                        "## What you will learn\n\nExplain the idea in your own words. Add a worked example, code, and the time and space complexity."
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      At least 80 characters. Include an explanation and a
                      worked example.
                    </span>
                  </label>
                  <div className="flex flex-wrap items-end gap-3">
                    <label>
                      {name} minutes
                      <input
                        className={field}
                        type="number"
                        min={1}
                        max={240}
                        step={1}
                        required
                        value={lesson.estimatedMinutes}
                        onChange={(event) =>
                          changeLesson(moduleIndex, lessonIndex, {
                            estimatedMinutes: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setPreview({
                          title: lesson.title || "Lesson preview",
                          content: lesson.content,
                        })
                      }
                    >
                      Preview lesson
                    </Button>
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="mb-2 text-sm font-medium">
                      Practice for {name.toLowerCase()}
                    </legend>
                    <div className="max-h-44 overflow-auto space-y-2 rounded border border-coders-border p-3">
                      {filteredProblems.length ? (
                        filteredProblems.map((problem) => (
                          <label
                            key={problem.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={lesson.problemSlugs.includes(
                                problem.slug,
                              )}
                              disabled={
                                !lesson.problemSlugs.includes(problem.slug) &&
                                lesson.problemSlugs.length >= 30
                              }
                              onChange={(event) =>
                                changeLesson(moduleIndex, lessonIndex, {
                                  problemSlugs: event.target.checked
                                    ? [...lesson.problemSlugs, problem.slug]
                                    : lesson.problemSlugs.filter(
                                        (s) => s !== problem.slug,
                                      ),
                                })
                              }
                            />
                            {problem.number}. {problem.title}
                            {!problem.isActive && (
                              <span className="text-xs text-yellow-400">
                                Draft
                              </span>
                            )}
                          </label>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {problemSearch
                            ? "No problems match your search."
                            : "No problems loaded. Create a problem first, then return here."}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {lesson.problemSlugs.length} selected
                      {lesson.problemSlugs.length > 0 &&
                        `: ${lesson.problemSlugs.join(", ")}`}
                    </p>
                  </fieldset>
                  <fieldset className="space-y-3">
                    <legend className="mb-2 text-sm font-medium">
                      External links for {name.toLowerCase()} (optional)
                    </legend>
                    {lesson.resources.map((resource, resourceIndex) => {
                      const update = (values: Partial<Resource>) =>
                        changeLesson(moduleIndex, lessonIndex, {
                          resources: lesson.resources.map((r, i) =>
                            i === resourceIndex ? { ...r, ...values } : r,
                          ),
                        });
                      return (
                        <div
                          key={resourceIndex}
                          className="rounded-lg border border-coders-border p-3 space-y-2"
                        >
                          <label className="block text-sm">
                            Link {resourceIndex + 1} title
                            <input
                              className={field}
                              required
                              maxLength={200}
                              value={resource.title}
                              onChange={(event) =>
                                update({ title: event.target.value })
                              }
                            />
                          </label>
                          <label className="block text-sm">
                            Link {resourceIndex + 1} HTTPS URL
                            <input
                              type="url"
                              className={field}
                              required
                              pattern="https://.*"
                              maxLength={2000}
                              value={resource.url}
                              onChange={(event) =>
                                update({ url: event.target.value })
                              }
                              placeholder="https://leetcode.com/problems/..."
                            />
                          </label>
                          <label className="block text-sm">
                            Link {resourceIndex + 1} type
                            <select
                              className={field}
                              value={resource.kind}
                              onChange={(event) =>
                                update({
                                  kind: event.target.value as Resource["kind"],
                                })
                              }
                            >
                              <option value="practice">Practice</option>
                              <option value="reading">Reading</option>
                              <option value="video">Video</option>
                            </select>
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              changeLesson(moduleIndex, lessonIndex, {
                                resources: lesson.resources.filter(
                                  (_, i) => i !== resourceIndex,
                                ),
                              })
                            }
                          >
                            Remove link {resourceIndex + 1}
                          </Button>
                        </div>
                      );
                    })}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={lesson.resources.length >= 20}
                      onClick={() =>
                        changeLesson(moduleIndex, lessonIndex, {
                          resources: [
                            ...lesson.resources,
                            { title: "", url: "", kind: "practice" },
                          ],
                        })
                      }
                    >
                      Add external link
                    </Button>
                  </fieldset>
                </fieldset>
              );
            })}
            <Button
              type="button"
              variant="outline"
              disabled={module.lessons.length >= 30}
              onClick={() =>
                changeModule(moduleIndex, {
                  lessons: [...module.lessons, newLesson()],
                })
              }
            >
              Add lesson to module {moduleIndex + 1}
            </Button>
          </fieldset>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        disabled={course.modules.length >= 40}
        onClick={() => change({ modules: [...course.modules, newModule()] })}
      >
        Add module
      </Button>
      <p className="text-sm text-muted-foreground">
        Keep existing module and lesson slugs to preserve reading progress.
        Removing a lesson or changing its slug removes its saved reading
        progress when you save.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" value="draft" variant="outline" disabled={busy}>
          Review draft
        </Button>
        <Button type="submit" value="publish" disabled={busy}>
          Review and publish
        </Button>
      </div>
      {review && (
        <section
          aria-label="Review course changes"
          className="rounded-xl border border-coders-blue/40 bg-coders-blue/5 p-4 space-y-3"
        >
          <h3 className="font-semibold">Review: {review.course.title}</h3>
          <p className="text-sm">
            {review.course.modules.length} modules ·{" "}
            {review.course.modules.reduce(
              (total, module) => total + module.lessons.length,
              0,
            )}{" "}
            lessons ·{" "}
            {review.course.modules.reduce(
              (total, module) =>
                total +
                module.lessons.reduce(
                  (count, lesson) => count + lesson.problemSlugs.length,
                  0,
                ),
              0,
            )}{" "}
            practice links
          </p>
          <p className="text-sm">
            This saves <strong>{review.slug}</strong> as{" "}
            {review.course.isPublished
              ? "a published course visible to learners"
              : "a private draft"}
            .
          </p>
          {existing && (
            <p className="text-sm text-yellow-400">
              Saving replaces the existing course. Omitted modules and lessons,
              including their reading progress, will be removed. Matching module
              and lesson slugs retain progress.
            </p>
          )}
          <Button type="button" disabled={busy} onClick={() => void save()}>
            {busy
              ? "Saving…"
              : review.course.isPublished
                ? "Confirm save and publish"
                : "Confirm save draft"}
          </Button>
        </section>
      )}
      {preview && (
        <section
          aria-label="Lesson preview"
          className="rounded-xl border border-coders-border p-5 space-y-3"
        >
          <div className="flex justify-between gap-3">
            <h3 className="font-semibold">{preview.title}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreview(null)}
            >
              Close preview
            </Button>
          </div>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{preview.content}</ReactMarkdown>
          </div>
        </section>
      )}
    </form>
  );
}
