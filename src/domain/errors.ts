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
