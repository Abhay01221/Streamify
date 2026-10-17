import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AdminProblemEditor from "../src/pages/AdminProblemEditor";
import AdminCourseEditor from "../src/pages/AdminCourseEditor";
import { api } from "../src/lib/api";

vi.mock("../src/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn() },
}));
const practice = {
  id: "practice-id",
  slug: "parcel-total",
  title: "Parcel total",
  number: 27,
  isActive: true,
};
const content =
  "## Running totals\n\nVisit each value once and add it to an accumulator. For [2, 4, 6], the total is 12. Time: O(n), space: O(1).";
function page(component: React.ReactNode, route: string) {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path="/admin/problems/new" element={component} />
          <Route path="/admin/problems/:id/edit" element={component} />
          <Route path="/admin/courses/new" element={component} />
          <Route path="/admin/courses/:id/edit" element={component} />
          <Route path="/admin/problems" element={<p>Problem catalog</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(api.get).mockResolvedValue({
    data: { problems: [practice], pagination: { total: 1 } },
  });
});
function fillProblem() {
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "Count the parcels" },
  });
  fireEvent.change(screen.getByLabelText(/Problem statement and input/), {
    target: {
      value:
        "Read n integers and print their sum. Input: n then n values. Output: one total.",
    },
  });
  fireEvent.change(screen.getByLabelText("Constraint 1"), {
    target: { value: "1 <= n <= 1000" },
  });
  fireEvent.change(screen.getByLabelText("Input for test case 1"), {
    target: { value: "3\n2 4 6" },
  });
  fireEvent.change(screen.getByLabelText("Expected output for test case 1"), {
    target: { value: "12" },
  });
  fireEvent.change(screen.getByLabelText(/Explanation for sample 1/), {
    target: { value: "2 + 4 + 6 = 12" },
  });
  fireEvent.change(screen.getByLabelText("Input for test case 2"), {
    target: { value: "1\n-7" },
  });
  fireEvent.change(screen.getByLabelText("Expected output for test case 2"), {
    target: { value: "-7" },
  });
  fireEvent.change(screen.getByLabelText(/Private Python reference/), {
    target: {
      value:
        "import sys\na=list(map(int,sys.stdin.read().split()))\nprint(sum(a[1:]))",
    },
  });
}

test("plain problem fields save sample examples and hidden cases as an unpublished draft", async () => {
  vi.mocked(api.post).mockResolvedValue({
    data: { problem: { id: "created" } },
  });
  page(<AdminProblemEditor />, "/admin/problems/new");
  await waitFor(() =>
    expect(screen.getByLabelText(/Problem number/)).toHaveValue(28),
  );
  fillProblem();
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/admin/problems",
      expect.objectContaining({
        slug: "count-the-parcels",
        number: 28,
        isActive: false,
        constraints: ["1 <= n <= 1000"],
        examples: [
          {
            inputText: "3\n2 4 6",
            outputText: "12",
            explanation: "2 + 4 + 6 = 12",
          },
        ],
        testCases: [
          { input: "3\n2 4 6", output: "12", isSample: true },
          { input: "1\n-7", output: "-7", isSample: false },
        ],
      }),
    ),
  );
  expect(await screen.findByText("Problem catalog")).toBeInTheDocument();
});

test("failed problem publication shows the field-specific server validation and retains form data", async () => {
  vi.mocked(api.post).mockRejectedValue({
    response: {
      data: {
        error: "Validation error",
        details: [
          {
            field: "testCases.1.output",
            message: "Expected output must match the reference solution",
          },
        ],
      },
    },
  });
  page(<AdminProblemEditor />, "/admin/problems/new");
  fillProblem();
  fireEvent.click(screen.getByRole("button", { name: "Verify and publish" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "testCases.1.output: Expected output must match the reference solution",
  );
  expect(screen.getByLabelText("Title")).toHaveValue("Count the parcels");
  expect(api.post).toHaveBeenCalledWith(
    "/admin/problems",
    expect.objectContaining({ isActive: true }),
  );
});

test("course form reviews then saves the API payload without form keys or raw JSON", async () => {
  vi.mocked(api.put).mockResolvedValue({ data: { course: { id: "created" } } });
  page(<AdminCourseEditor />, "/admin/courses/new");
  fireEvent.change(screen.getByLabelText("Course title"), {
    target: { value: "Array foundations" },
  });
  fireEvent.change(screen.getByLabelText("Course description"), {
    target: {
      value: "Learn array traversal and build correct linear algorithms.",
    },
  });
  fireEvent.change(screen.getByLabelText("Module 1 title"), {
    target: { value: "Array basics" },
  });
  fireEvent.change(screen.getByLabelText("Module 1, lesson 1 title"), {
    target: { value: "Running totals" },
  });
  fireEvent.change(screen.getByLabelText(/Module 1, lesson 1 content/), {
    target: { value: content },
  });
  fireEvent.click(await screen.findByLabelText("27. Parcel total"));
  fireEvent.click(screen.getByRole("button", { name: "Add external link" }));
  fireEvent.change(screen.getByLabelText("Link 1 title"), {
    target: { value: "External array practice" },
  });
  fireEvent.change(screen.getByLabelText("Link 1 HTTPS URL"), {
    target: { value: "https://leetcode.com/problemset/" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Review and publish" }));
  expect(api.put).not.toHaveBeenCalled();
  expect(
    screen.getByRole("region", { name: "Review course changes" }),
  ).toHaveTextContent("1 modules · 1 lessons · 1 practice links");
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm save and publish" }),
  );
  await waitFor(() =>
    expect(api.put).toHaveBeenCalledWith(
      "/admin/content/courses/array-foundations",
      {
        title: "Array foundations",
        description:
          "Learn array traversal and build correct linear algorithms.",
        difficulty: "BEGINNER",
        estimatedDays: 7,
        isPremium: false,
        isPublished: true,
        modules: [
          {
            slug: "array-basics",
            title: "Array basics",
            description: "",
            lessons: [
              {
                slug: "running-totals",
                title: "Running totals",
                summary: "",
                content,
                estimatedMinutes: 20,
                problemSlugs: ["parcel-total"],
                resources: [
                  {
                    title: "External array practice",
                    url: "https://leetcode.com/problemset/",
                    kind: "practice",
                  },
                ],
              },
            ],
          },
        ],
      },
    ),
  );
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Course published.",
  );
});

test("editing a course preserves module and lesson slugs when titles change and explains replacement", async () => {
  vi.mocked(api.get).mockImplementation((url) => {
    if (url === "/admin/content/courses/course-id")
      return Promise.resolve({
        data: {
          course: {
            title: "Existing course",
            description: "Existing course description",
            difficulty: "BEGINNER",
            estimatedDays: 7,
            isPremium: false,
            isPublished: true,
            modules: [
              {
                slug: "array-basics",
                title: "Array basics",
                description: "",
                lessons: [
                  {
                    slug: "running-totals",
                    title: "Running totals",
                    summary: "",
                    content,
                    estimatedMinutes: 20,
                    problemSlugs: ["parcel-total"],
                    resources: [],
                  },
                ],
              },
            ],
          },
        },
      });
    if (url === "/admin/content/courses")
      return Promise.resolve({
        data: { courses: [{ id: "course-id", slug: "existing-course" }] },
      });
    return Promise.resolve({
      data: { problems: [practice], pagination: { total: 1 } },
    });
  });
  vi.mocked(api.put).mockRejectedValue({
    response: {
      data: {
        error: "Validation error",
        details: [
          {
            field: "modules.0.lessons.0.content",
            message: "Add a worked example",
          },
        ],
      },
    },
  });
  page(<AdminCourseEditor />, "/admin/courses/course-id/edit");
  await screen.findByDisplayValue("Existing course");
  fireEvent.change(screen.getByLabelText("Module 1 title"), {
    target: { value: "Renamed module" },
  });
  fireEvent.change(screen.getByLabelText("Module 1, lesson 1 title"), {
    target: { value: "Renamed lesson" },
  });
  expect(screen.getByLabelText("Module 1 slug")).toHaveValue("array-basics");
  expect(screen.getByLabelText("Module 1, lesson 1 slug")).toHaveValue(
    "running-totals",
  );
  fireEvent.click(screen.getByRole("button", { name: "Review draft" }));
  expect(
    screen.getByText(
      /Omitted modules and lessons, including their reading progress/,
    ),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Confirm save draft" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "modules.0.lessons.0.content: Add a worked example",
  );
});
