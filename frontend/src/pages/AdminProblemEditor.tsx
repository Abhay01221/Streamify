import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { contentError, contentSlug } from "@/lib/contentErrors";

interface TestCase {
  input: string;
  output: string;
  isSample: boolean;
  explanation: string;
}
const blankCase = (isSample: boolean): TestCase => ({
  input: "",
  output: "",
  isSample,
  explanation: "",
});
const field =
  "mt-1 block w-full rounded-lg border border-coders-border bg-coders-surface p-3 text-sm focus-visible:outline-coders-blue";

export default function AdminProblemEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [number, setNumber] = useState(1);
  const [difficulty, setDifficulty] = useState("EASY");
  const [description, setDescription] = useState("");
  const [constraints, setConstraints] = useState<string[]>([""]);
  const [published, setPublished] = useState(false);
  const [reference, setReference] = useState("");
  const [starter, setStarter] = useState(
    "# Read standard input and print the answer.\n",
  );
  const [tests, setTests] = useState<TestCase[]>([
    blankCase(true),
    blankCase(false),
  ]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    setLoadFailed(false);
    if (!id) {
      setLoading(false);
      setTitle("");
      setSlug("");
      setNumber(1);
      setDifficulty("EASY");
      setDescription("");
      setConstraints([""]);
      setPublished(false);
      setReference("");
      setStarter("# Read standard input and print the answer.\n");
      setTests([blankCase(true), blankCase(false)]);
      api
        .get("/admin/problems?limit=100")
        .then(({ data }) => {
          if (active)
            setNumber((current) =>
              current === 1
                ? Math.max(
                    0,
                    ...(data.problems || []).map(
                      (p: { number: number }) => p.number,
                    ),
                  ) + 1
                : current,
            );
        })
        .catch(() => {
          /* The author can supply a unique number manually. */
        });
      return () => {
        active = false;
      };
    }
    setLoading(true);
    api
      .get(`/admin/problems/${id}`)
      .then(({ data }) => {
        if (!active) return;
        setTitle(data.title);
        setSlug(data.slug);
        setNumber(data.number);
        setDifficulty(data.difficulty);
        setReference(data.referenceSolution || "");
        setDescription(data.description);
        setPublished(data.isActive);
        setStarter(
          data.starterCode.find(
            (s: { language: string }) => s.language === "python",
          )?.code || "",
        );
        setConstraints(
          data.constraints?.length
            ? data.constraints.map((c: { text: string }) => c.text)
            : [""],
        );
        let sample = 0;
        setTests(
          data.testCases.map((test: TestCase) => ({
            ...test,
            explanation: test.isSample
              ? data.examples?.[sample++]?.explanation || ""
              : "",
          })),
        );
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

  const save = async (publish: boolean) => {
    setError("");
    if (publish && !reference.trim()) {
      setError(
        "Add a Python reference solution before publishing, or save a draft now.",
      );
      return;
    }
    if (publish && !tests.some((test) => test.isSample)) {
      setError("Add at least one sample test case before publishing.");
      return;
    }
    setBusy(true);
    try {
      const data = {
        referenceSolution: reference,
        title: title.trim(),
        difficulty,
        description,
        isActive: publish,
        constraints: constraints.map((c) => c.trim()).filter(Boolean),
        starterCode: { python: starter },
        testCases: tests.map(({ input, output, isSample }) => ({
          input,
          output,
          isSample,
        })),
        examples: tests
          .filter((test) => test.isSample)
          .map((test) => ({
            inputText: test.input,
            outputText: test.output,
            explanation: test.explanation,
          })),
      };
      if (id) await api.patch(`/admin/problems/${id}`, data);
      else await api.post("/admin/problems", { ...data, slug, number });
      navigate("/admin/problems");
    } catch (error) {
      setError(contentError(error));
    } finally {
      setBusy(false);
    }
  };
  const updateTest = (index: number, values: Partial<TestCase>) =>
    setTests((previous) =>
      previous.map((test, i) => (i === index ? { ...test, ...values } : test)),
    );
  if (loading) return <p role="status">Loading problem…</p>;
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
  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const action = (event.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement | null;
        void save(action?.value === "publish");
      }}
    >
      <div>
        <Link to="/admin/problems" className="text-sm text-coders-blue">
          ← All problems
        </Link>
        <h2 className="mt-2 text-xl font-bold">
          {id ? "Edit problem" : "Add a problem"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Write the question, add example inputs and expected answers, then
          save. No JSON needed.
        </p>
        {id && (
          <p className="mt-2 text-sm">
            Current status: <strong>{published ? "Published" : "Draft"}</strong>
          </p>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-400 whitespace-pre-wrap"
        >
          {error}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          Title
          <input
            className={field}
            required
            minLength={3}
            maxLength={200}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (!id && (!slug || slug === contentSlug(title)))
                setSlug(contentSlug(event.target.value));
            }}
          />
        </label>
        <label>
          Difficulty
          <select
            className={field}
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            {["EASY", "MEDIUM", "HARD"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Slug
          <input
            className={field}
            required
            minLength={3}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            value={slug}
            disabled={Boolean(id)}
            onChange={(event) => setSlug(event.target.value)}
          />
          <span className="text-xs text-muted-foreground">
            Used in the problem URL. Must be unique.
          </span>
        </label>
        <label>
          Problem number
          <input
            className={field}
            type="number"
            min={1}
            step={1}
            required
            value={number}
            disabled={Boolean(id)}
            onChange={(event) => setNumber(Number(event.target.value))}
          />
          <span className="text-xs text-muted-foreground">
            Choose an unused positive number.
          </span>
        </label>
      </div>
      <label className="block">
        Problem statement and input/output format
        <textarea
          className={field}
          rows={10}
          required
          minLength={10}
          maxLength={65536}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={
            "Describe the task.\n\n## Input\nWhat will be provided on standard input?\n\n## Output\nWhat must the program print?"
          }
        />
        <span className="text-xs text-muted-foreground">
          Markdown headings, lists, and code blocks are supported.
        </span>
      </label>
      <fieldset className="space-y-2">
        <legend className="mb-2 font-medium">Constraints</legend>
        {constraints.map((constraint, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              aria-label={`Constraint ${index + 1}`}
              className={field}
              value={constraint}
              maxLength={2000}
              onChange={(event) =>
                setConstraints((previous) =>
                  previous.map((c, i) =>
                    i === index ? event.target.value : c,
                  ),
                )
              }
              placeholder="For example: 1 ≤ n ≤ 100000"
            />
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove constraint ${index + 1}`}
              onClick={() =>
                setConstraints((previous) =>
                  previous.filter((_, i) => i !== index),
                )
              }
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setConstraints((previous) => [...previous, ""])}
          disabled={constraints.length >= 100}
        >
          Add constraint
        </Button>
      </fieldset>
      <fieldset className="space-y-4">
        <legend className="mb-2 font-medium">
          Sample and hidden test cases
        </legend>
        <p className="text-sm text-muted-foreground">
          Samples appear on the question page. Hidden cases are used by the
          judge. Enter raw text exactly as the program will read and print it.
        </p>
        {tests.map((test, index) => (
          <div
            key={index}
            className="rounded-xl border border-coders-border p-4 space-y-3"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h3 className="font-medium">Test case {index + 1}</h3>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setTests((previous) => previous.filter((_, i) => i !== index))
                }
              >
                Remove test case {index + 1}
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={test.isSample}
                onChange={(event) =>
                  updateTest(index, { isSample: event.target.checked })
                }
              />
              Sample visible to learners (test case {index + 1})
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Input for test case {index + 1}
                <textarea
                  className={`${field} font-mono`}
                  rows={4}
                  value={test.input}
                  onChange={(event) =>
                    updateTest(index, { input: event.target.value })
                  }
                />
              </label>
              <label className="text-sm">
                Expected output for test case {index + 1}
                <textarea
                  className={`${field} font-mono`}
                  rows={4}
                  value={test.output}
                  onChange={(event) =>
                    updateTest(index, { output: event.target.value })
                  }
                />
              </label>
            </div>
            {test.isSample && (
              <label className="block text-sm">
                Explanation for sample {index + 1} (optional)
                <textarea
                  className={field}
                  rows={2}
                  value={test.explanation}
                  onChange={(event) =>
                    updateTest(index, { explanation: event.target.value })
                  }
                />
              </label>
            )}
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={tests.length >= 100}
            onClick={() =>
              setTests((previous) => [...previous, blankCase(true)])
            }
          >
            Add sample case
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={tests.length >= 100}
            onClick={() =>
              setTests((previous) => [...previous, blankCase(false)])
            }
          >
            Add hidden case
          </Button>
        </div>
      </fieldset>
      <label className="block">
        Python starter code
        <textarea
          className={`${field} font-mono`}
          rows={5}
          value={starter}
          onChange={(event) => setStarter(event.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          This code opens in the learner's editor. Use standard input and
          output.
        </span>
      </label>
      <label className="block">
        Private Python reference solution
        <textarea
          className={`${field} font-mono`}
          rows={8}
          maxLength={65536}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
        />
        <span className="text-xs text-muted-foreground">
          A correct solution used to verify every test before publication.
          Learners cannot see it.
        </span>
      </label>
      <div className="rounded-lg border border-coders-border p-4 text-sm text-muted-foreground space-y-2">
        <p>
          Save a draft at any time. Drafts are visible only in Admin → Problems.
        </p>
        <p>
          Publishing checks the reference solution against every case and needs
          a working Judge0 service. If verification fails, fix the reported
          issue or use Save draft.
        </p>
        {id && (
          <p>
            Saving the test cases replaces previous cases and stored per-test
            results. Submission verdicts remain.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" value="draft" variant="outline" disabled={busy}>
          {busy ? "Saving…" : "Save draft"}
        </Button>
        <Button type="submit" value="publish" disabled={busy}>
          {busy ? "Verifying…" : "Verify and publish"}
        </Button>
      </div>
    </form>
  );
}
