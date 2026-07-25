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
npm run storybook          # component workbench on :6006
npm run build-storybook    # static Storybook (CI gate only, not deployed)
```

CI: `.drone.yml` (install → lint → typecheck → test → build → build-storybook, sequential to fit the 1 GB Drone runner host; master pushes then deploy to S3 `/admin/` + CloudFront invalidation).

Storybook (`.storybook/`, framework `@storybook/react-vite`, addons docs + a11y): co-located `*.stories.tsx` per presentation component. Controlled components get a stateful harness in the story file (`PersonForm.stories.tsx` pattern); interaction tests are play functions using `storybook/test`. Jest remains the only CI test runner — stories are compile-checked by `build-storybook`, and play functions run in the Storybook UI.

## Architecture & conventions

- All source is TypeScript (`.ts`/`.tsx`); `tsconfig.json` has `strict: true`. **Hexagonal layering**, one directory per layer, dependency rule domain ← application ← composition → infrastructure:
  - `src/domain/` — entities (`person.ts` + input helpers) and ports (`ports.ts`: `CrudRepository<TEntity, TInput>`, the shape every section repository implements). Imports nothing from other layers.
  - `src/application/` — Zustand store factories taking a repository port (`createPeopleStore(repository)`), framework-free. Convention: read paths (`loadPeople`/`selectPerson`) record failures in store `error` state; write paths (`savePerson`/`removePerson`) throw to the calling form. `selectPerson` preloads from the list cache synchronously, then refreshes from the repository.
  - `src/infrastructure/` — adapters only: `http/httpClient.ts` (fetch, token injection via `getStoredToken`, `HttpError`, 204 → null) and `http/personHttpRepository.ts` implementing the port.
  - `src/presentation/` — `components/` (pure controlled components, `PersonForm.tsx` style: `value`/`onChange`/`onSubmit` over a domain input type) and `pages/` (route-level, wired in `src/App.tsx`); pages only touch store hooks and domain types.
  - `src/store.ts` — the **composition root**: the only module that wires adapters into stores.
- **Adding a section resource** (experience, education, projects, skills — shapes are ratified in meta-repo `docs/api-contract.md`): entity + input in domain, an adapter implementing `CrudRepository`, a store from a factory like `createPeopleStore`, a controlled form component, pages — each layer with its own tests (fake repository for stores, mocked `global.fetch` for adapters/pages).
- Forms: controlled inputs with `<label>` wrapping the input (`PersonForm.tsx` style) — RTL queries depend on this.
- Auth: `src/auth/CognitoContext.tsx` implements the Cognito Hosted UI flow (authorization code + PKCE; access token kept in sessionStorage, verifier consumed before the exchange so StrictMode can't spend the code twice). Consumers depend only on `AuthContextValue` `{ token, isAuthenticated, login, logout }`; `App.tsx`'s `AuthGate` shows the sign-in screen until authenticated. Redirects go through `src/auth/browser.ts` so tests can mock navigation; the callback URL is always `<origin>/admin/` and must stay registered on the app client (cv-infra `auth.tf`).
- Env vars are Vite-style `VITE_*` via `import.meta.env`, accessed only in `src/store.ts` (composition root) and `src/auth/cognitoConfig.ts`. Their types are declared in `src/vite-env.d.ts` (`ImportMetaEnv`) — add new `VITE_*` vars there too.
- Build (`vite build`) type-strips via esbuild and does **not** type-check — `npm run typecheck` is the actual type gate, run separately in CI before `build`.

## Critical gotcha — Jest vs `import.meta`

Jest compiles ESM→CJS where `import.meta` is illegal syntax. `babel-plugin-transform-vite-meta-env` (in `babel.config.cjs`) rewrites `import.meta.env.*` to `process.env` equivalents. **Don't remove it, and don't use `import.meta` features beyond `.env`** — url/resolve are not transformed and will break every test that transitively imports the file. If tests suddenly fail with "Cannot use 'import.meta' outside a module", that's this. `@babel/preset-typescript` (also in `babel.config.cjs`) strips TS types for Jest the same way Vite/esbuild does for dev/build — it does not type-check either, which is why `npm run typecheck` exists as its own step.

## Testing conventions

RTL with mocked `global.fetch` (restore in `afterEach` — see `App.test.tsx`). Wrap routed components in `MemoryRouter`. Query by role/label, not test-ids. Every component and page has a test file beside it; stores are tested with a fake repository through the port, never fetch. The wired store in `src/store.ts` is module-level state — page tests must reset it in `afterEach` (`usePeopleStore.setState({ people: [], selectedPerson: null, loading: false, error: null })`).

## Git workflow

`master` is protected — feature branch (`feat/…`) → push → PR via `gh`. Definition of done: tests for new pages/flows, lint clean.
