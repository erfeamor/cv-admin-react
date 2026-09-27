/**
 * Structural read of an error's HTTP-ish status. The application and
 * presentation layers need to tell a 404 (row gone) or 409 (duplicate) from
 * other failures without importing the infrastructure's HttpError class —
 * any error carrying a numeric `status` qualifies.
 */
export function errorStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null && 'status' in err) {
    const { status } = err as { status: unknown };
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

/**
 * A human-readable detail from an error's `body`, when the server sent one:
 * a plain-text body, or a `detail`/`message` string on a JSON body. Spring's
 * bare default body (`{ status, error, path }`) has neither and yields
 * undefined.
 */
export function errorDetail(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('body' in err)) {
    return undefined;
  }
  const { body } = err as { body: unknown };
  if (typeof body === 'string') {
    return body.trim() || undefined;
  }
  if (typeof body === 'object' && body !== null) {
    for (const key of ['detail', 'message'] as const) {
      const value = (body as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }
  }
  return undefined;
}
