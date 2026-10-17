export function contentError(error: unknown): string {
  const failure = error as {
    response?: {
      data?: {
        error?: unknown;
        details?: Array<{ field?: string; message?: string }>;
      };
    };
    message?: string;
  };
  const data = failure?.response?.data;
  const message =
    typeof data?.error === "string"
      ? data.error
      : failure?.message || "Could not save. Please try again.";
  const details = Array.isArray(data?.details)
    ? data.details.map(
        (detail) =>
          `${detail.field || "Form"}: ${detail.message || "Check this value."}`,
      )
    : [];
  return [message, ...details].join("\n");
}

export function contentSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
