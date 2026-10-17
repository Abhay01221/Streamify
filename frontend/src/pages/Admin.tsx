import AdminProblemEditor from "./AdminProblemEditor";
import AdminCourseEditor from "./AdminCourseEditor";
import AdminContent from "./AdminContent";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  Code2,
  Users,
  Send,
  Settings,
  PlusCircle,
  BookOpen,
} from "lucide-react";
import { api } from "@/lib/api";
import { DifficultyBadge } from "@/components/DifficultyBadge";
import { Skeleton } from "@/components/ui/skeleton";

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => api.get("/admin/analytics").then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard</h2>
      <div className="glass-card p-5 space-y-3">
        <h3 className="font-semibold">Add learning content</h3>
        <p className="text-sm text-muted-foreground">
          1. Create a problem and save its examples and tests. 2. Publish it
          after verification. 3. Add lessons to a course and link the problem.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/problems/new"
            className="text-sm text-coders-blue underline"
          >
            Add a problem
          </Link>
          <Link
            to="/admin/courses/new"
            className="text-sm text-coders-blue underline"
          >
            Create a course
          </Link>
          <Link
            to="/admin/content"
            className="text-sm text-coders-blue underline"
          >
            Bulk import JSON
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: data?.totalUsers },
          { label: "Total Problems", value: data?.totalProblems },
          { label: "Total Submissions", value: data?.totalSubmissions },
          { label: "Today Submissions", value: data?.todaySubmissions },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4">
            <div className="text-2xl font-bold">
              {stat.value ?? <Skeleton className="h-8 w-16" />}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminProblems() {
  const [page, setPage] = useState(1);
  const { data, refetch, isPending, isError } = useQuery({
    queryKey: ["admin-problems", page],
    queryFn: () =>
      api.get(`/admin/problems?limit=50&page=${page}`).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Problems</h2>
        <Link
          to="/admin/problems/new"
          className="flex items-center gap-2 text-sm bg-coders-green text-black px-3 py-1.5 rounded-lg hover:bg-coders-green/90"
        >
          <PlusCircle className="w-4 h-4" />
          Add Problem
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Drafts stay here until verified and published. Only published problems
        appear in the public catalog.{" "}
        <Link to="/admin/content" className="text-coders-blue underline">
          Import many problems from JSON
        </Link>
      </p>
      {isPending && <p role="status">Loading problems…</p>}
      {isError && (
        <p role="alert">
          Could not load problems.{" "}
          <button onClick={() => refetch()} className="underline">
            Try again
          </button>
        </p>
      )}
      {!isPending && !isError && data?.problems?.length === 0 && (
        <p>No problems yet. Use Add Problem to create your first question.</p>
      )}
      <div className="rounded-xl border border-coders-border overflow-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-coders-border bg-coders-surface/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                #
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Title
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Difficulty
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Submissions
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.problems?.map(
              (p: {
                id: string;
                number: number;
                title: string;
                slug: string;
                isActive: boolean;
                difficulty: "EASY" | "MEDIUM" | "HARD";
                totalSubmissions: number;
              }) => (
                <tr
                  key={p.id}
                  className="border-b border-coders-border/50 hover:bg-white/3"
                >
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.number}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium">{p.title}</td>
                  <td className="px-4 py-3">
                    <DifficultyBadge difficulty={p.difficulty} />
                  </td>
                  <td
                    className={`px-4 py-3 text-xs ${p.isActive ? "text-coders-green" : "text-yellow-400"}`}
                  >
                    {p.isActive ? "Published" : "Draft"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {p.totalSubmissions}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/problems/${p.id}/edit`}
                      className="text-xs text-coders-blue hover:underline mr-3"
                    >
                      Edit
                    </Link>
                    {p.isActive && (
                      <button
                        className="text-xs text-red-400 hover:underline"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              "Unpublish this problem? Submission history will be retained.",
                            )
                          )
                            return;
                          try {
                            await api.delete(`/admin/problems/${p.id}`);
                            await refetch();
                          } catch {
                            window.alert("Could not unpublish problem");
                          }
                        }}
                      >
                        Unpublish
                      </button>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
      {data?.pagination && (
        <div className="flex items-center justify-between text-sm">
          <button
            disabled={page === 1}
            onClick={() => setPage((value) => value - 1)}
            className="disabled:opacity-40"
          >
            Previous
          </button>
          <span>
            Page {page} · {data.pagination.total} problems
          </span>
          <button
            disabled={page * 50 >= data.pagination.total}
            onClick={() => setPage((value) => value + 1)}
            className="disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function AdminUsers() {
  const { data } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get("/admin/users").then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Users</h2>
      <div className="rounded-xl border border-coders-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-coders-border bg-coders-surface/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                User
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Email
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.users?.map(
              (u: {
                id: string;
                username: string;
                email: string;
                isPremium: boolean;
                isAdmin: boolean;
                isBanned: boolean;
                createdAt: string;
              }) => (
                <tr
                  key={u.id}
                  className="border-b border-coders-border/50 hover:bg-white/3"
                >
                  <td className="px-4 py-3 text-sm font-medium">
                    {u.username}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {u.isAdmin && (
                        <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded px-1.5 py-0.5">
                          Admin
                        </span>
                      )}
                      {u.isPremium && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded px-1.5 py-0.5">
                          Pro
                        </span>
                      )}
                      {u.isBanned && (
                        <span className="text-xs bg-gray-500/20 text-gray-400 border border-gray-500/30 rounded px-1.5 py-0.5">
                          Banned
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const location = useLocation();

  const navItems = [
    { to: "/admin", icon: BarChart3, label: "Dashboard" },
    { to: "/admin/problems", icon: Code2, label: "Problems" },
    { to: "/admin/courses", icon: BookOpen, label: "Courses" },
    { to: "/admin/content", icon: BookOpen, label: "Content studio" },
    { to: "/admin/users", icon: Users, label: "Users" },
    { to: "/admin/submissions", icon: Send, label: "Submissions" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-coders-orange" />
        <h1 className="text-xl font-bold text-coders-orange">Admin Panel</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <nav className="md:w-48 shrink-0 flex flex-wrap md:block gap-1 md:space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                (
                  item.to === "/admin"
                    ? location.pathname === item.to
                    : location.pathname.startsWith(item.to)
                )
                  ? "bg-coders-orange/10 text-coders-orange"
                  : "text-muted-foreground hover:bg-white/5"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="problems" element={<AdminProblems />} />
            <Route path="problems/new" element={<AdminProblemEditor />} />
            <Route path="problems/:id/edit" element={<AdminProblemEditor />} />
            <Route path="courses" element={<AdminCourses />} />
            <Route path="courses/new" element={<AdminCourseEditor />} />
            <Route path="courses/:id/edit" element={<AdminCourseEditor />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="users" element={<AdminUsers />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function AdminCourses() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin-content-courses"],
    queryFn: () =>
      api.get("/admin/content/courses").then((response) => response.data),
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Courses</h2>
        <Link
          to="/admin/courses/new"
          className="rounded-lg bg-coders-green px-3 py-2 text-sm text-black"
        >
          Create a course
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">
        Create modules, write lessons, and select problems using the course
        form. Publish when the lessons are ready for learners.
      </p>
      {isPending ? (
        <p role="status">Loading courses…</p>
      ) : isError ? (
        <p role="alert">
          Could not load courses.{" "}
          <button className="underline" onClick={() => refetch()}>
            Try again
          </button>
        </p>
      ) : data?.courses?.length ? (
        <ul className="space-y-3">
          {data.courses.map(
            (course: {
              id: string;
              slug: string;
              title: string;
              isPublished: boolean;
            }) => (
              <li
                key={course.id}
                className="glass-card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <h3 className="font-medium">{course.title}</h3>
                  <p
                    className={`mt-1 text-xs ${course.isPublished ? "text-coders-green" : "text-yellow-400"}`}
                  >
                    {course.isPublished ? "Published" : "Draft"}
                  </p>
                </div>
                <div className="flex gap-3 text-sm">
                  <Link
                    to={`/admin/courses/${course.id}/edit`}
                    className="text-coders-blue"
                  >
                    Edit course
                  </Link>
                  {course.isPublished && (
                    <Link
                      to={`/study-plan/${course.slug}`}
                      className="text-coders-blue"
                    >
                      Open course
                    </Link>
                  )}
                </div>
              </li>
            ),
          )}
        </ul>
      ) : (
        <p>No courses yet. Create your first course above.</p>
      )}
    </div>
  );
}

function AdminSubmissions() {
  const { data, isError } = useQuery({
    queryKey: ["admin-submissions"],
    queryFn: () => api.get("/admin/submissions").then((r) => r.data),
  });
  if (isError) return <p role="alert">Could not load submissions</p>;
  return (
    <div className="space-y-3">
      <h2 className="text-xl">Submissions</h2>
      {data?.submissions?.map(
        (s: {
          id: string;
          status: string;
          user: { username: string };
          problem: { title: string };
          createdAt: string;
        }) => (
          <div key={s.id} className="border border-coders-border p-3 rounded">
            {s.user.username} · {s.problem.title} · {s.status} ·{" "}
            {new Date(s.createdAt).toLocaleString()}
          </div>
        ),
      )}
    </div>
  );
}
