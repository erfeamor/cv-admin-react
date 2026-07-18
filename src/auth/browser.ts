// jsdom cannot perform real navigations, so tests mock this module instead of
// fighting window.location.
export function redirectTo(url: string): void {
  window.location.assign(url);
}
