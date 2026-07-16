# CLAUDE.md — cv-admin-react

Admin CRUD UI for cv-project: React 18 + Hooks, React Router 6, **TypeScript**, Vite. Talks **directly to cv-domain-service** (:8080) — it deliberately bypasses the BFF because it needs full CRUD, not the public read shape. Cross-repo context: meta repo CLAUDE.md one directory up.

## Commands

```bash
npm install
npm test                   # Jest + React Testing Library (jsdom)
npm run typecheck          # tsc --noEmit (strict mode; separate gate from build)
npm run lint               # eslint (react + react-hooks + @typescript-eslint plugins)
npm run dev                # :5173 (cp .env.example .env first)
npm run build              # production bundle (deploy target: S3+CloudFront)
```

CI: `.drone.yml` (install → lint + typecheck + test → build).

## Architecture & conventions

- All source is TypeScript (`.ts`/`.tsx`); `tsconfig.json` has `strict: true`. `src/pages/` route-level components, wired in `src/App.tsx`; `src/api/client.ts` is the **only** place fetch happens — extend it with new `<resource>Api` objects following `peopleApi` (token pass-through, single generic `request<T>()` helper, 204 → null). Domain types (e.g. `Person`, `PersonInput`) are defined and exported alongside their `*Api` object in `client.ts`, not in a separate types file.
- Forms: controlled inputs with `<label>` wrapping the input (`PersonFormPage.tsx` style) — RTL queries depend on this.
- Auth: `src/auth/CognitoContext.tsx` is a **stub** exposing `{ token, isAuthenticated, login, logout }` (typed as `AuthContextValue`). Consumers must depend only on that interface; the real Cognito Hosted UI flow will replace the internals (backlog item), not the shape.
- Env vars are Vite-style `VITE_*` via `import.meta.env`, accessed only in `client.ts`/config code. Their types are declared in `src/vite-env.d.ts` (`ImportMetaEnv`) — add new `VITE_*` vars there too.
- Build (`vite build`) type-strips via esbuild and does **not** type-check — `npm run typecheck` is the actual type gate, run separately in CI before `build`.

## Critical gotcha — Jest vs `import.meta`

Jest compiles ESM→CJS where `import.meta` is illegal syntax. `babel-plugin-transform-vite-meta-env` (in `babel.config.cjs`) rewrites `import.meta.env.*` to `process.env` equivalents. **Don't remove it, and don't use `import.meta` features beyond `.env`** — url/resolve are not transformed and will break every test that transitively imports the file. If tests suddenly fail with "Cannot use 'import.meta' outside a module", that's this. `@babel/preset-typescript` (also in `babel.config.cjs`) strips TS types for Jest the same way Vite/esbuild does for dev/build — it does not type-check either, which is why `npm run typecheck` exists as its own step.

## Testing conventions

RTL with mocked `global.fetch` (restore in `afterEach` — see `App.test.tsx`). Wrap routed components in `MemoryRouter`. Query by role/label, not test-ids. Every page ships with at least render + primary-action coverage.

## Git workflow

`master` is protected — feature branch (`feat/…`) → push → PR via `gh`. Definition of done: tests for new pages/flows, lint clean.
