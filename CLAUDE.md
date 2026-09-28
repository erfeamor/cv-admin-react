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

The deploy step's secrets (`aws_access_key_id`, `aws_secret_access_key`) belong to the `cv-project-drone-deploy` IAM user. Since T-008 (2026-09-28) the key is **Terraform-managed** and its source of truth is SSM (`/cv-project/dev/deploy/drone-deploy/*`), not the Drone UI. After any Drone rebuild or key rotation, set them with `cv-infra/scripts/drone-reseed-secrets.sh`, following the runbook `cv-infra/docs/drone-host-backup-and-cutover.md`. Don't hand-edit them in the Drone UI.

Storybook (`.storybook/`, framework `@storybook/react-vite`, addons docs + a11y): co-located `*.stories.tsx` per presentation component. Controlled components get a stateful harness in the story file (`PersonForm.stories.tsx` pattern); interaction tests are play functions using `storybook/test`. Jest remains the only CI test runner — stories are compile-checked by `build-storybook`, and play functions run in the Storybook UI.

## Architecture & conventions

- All source is TypeScript (`.ts`/`.tsx`); `tsconfig.json` has `strict: true`. **Hexagonal layering**, one directory per layer, dependency rule domain ← application ← composition → infrastructure:
  - `src/domain/` — entities (`person.ts`, `experience.ts`, `education.ts`, `project.ts`, `skill.ts` + draft/input helpers in `draft.ts`), structural error helpers (`errors.ts`: `errorStatus`/`errorDetail`, so upper layers never import `HttpError`) and ports (`ports.ts`: `CrudRepository` for people; `SectionRepository<TEntity, TInput>` for the person-scoped sections — every verb takes `personId`, no `get`, as the contract has no `GET /{id}`; `SkillCatalogRepository` + `PersonSkillRepository` for skills). Imports nothing from other layers.
  - Section forms edit a *draft* (all strings + an explicit `current` flag); `from…Draft` converts to the input: blank optionals → `null` (never `''`), `current` → `endDate: null`, a blank end date without `current` is a validation error, and an end date before the start date is rejected (the domain service has no cross-field check). Projects differ: with no start date, both dates may be blank (an *undated* project, saved as both `null`, never shown as current), and Current requires a start date.
  - `src/application/` — Zustand store factories taking a repository port (`createPeopleStore(repository)`, generic `createSectionStore(repository)` for experiences/educations/projects, `createSkillsStore(catalog, personSkills)`), framework-free. Section writes re-read the list so rows stay in server order (never sort client-side — contract § Ordering); a 404 on a write drops the stale row, then rethrows; a failed re-read after a successful write sets the non-blocking `notice`, not `error` (skills: `catalogNotice` + `assignmentsNotice`, one per list); a notice is cleared only by a later successful read of its own list, never by a write that does not re-read. Writes are refused while `loading` (`LoadInFlightError` from `collections.ts`; the pages also disable forms and delete/remove buttons). Only the latest list read lands (sequence counter) — including its failure, so a superseded load never raises `error`; writes that do not re-read (remove, unassign, in-place re-assign) are replayed onto any read issued before they settled (`createPendingEffects`) — and a write that settles after the person changed leaves the new person's list alone. Convention: read paths (`loadPeople`/`selectPerson`) record failures in store `error` state; write paths (`savePerson`/`removePerson`) throw to the calling form. `selectPerson` preloads from the list cache synchronously, then refreshes from the repository.
  - `src/infrastructure/` — adapters only: `http/httpClient.ts` (fetch, token injection via `getStoredToken`, `HttpError` with `status` + parsed `body`, 204 → null), `http/personHttpRepository.ts`, `http/sectionHttpRepository.ts` (one person-scoped adapter, three typed exports) and `http/skillHttpRepository.ts`.
  - `src/presentation/` — `components/` (pure controlled components, `PersonForm.tsx` style: `value`/`onChange`/`onSubmit` over a domain input type) and `pages/` (route-level, wired in `src/App.tsx`); pages only touch store hooks and domain types.
  - `src/store.ts` — the **composition root**: the only module that wires adapters into stores.
- **Adding a person-scoped section resource** (shapes are ratified in meta-repo `docs/api-contract.md`): entity + input + draft helpers in `domain/` (`experience.ts` pattern, `from…Draft` owning blank → `null` and the Current rule); a `SectionRepository` type alias in `ports.ts`; a typed export over `createSectionHttpRepository` in `sectionHttpRepository.ts` (the path segment is in its `SectionSegment` union); a store via `createSectionStore(repository)` wired in `src/store.ts`; a controlled form (`ExperienceForm.tsx` pattern, dates through `PeriodFields`); a thin route page that configures `SectionPage`, plus its route in `App.tsx` and a link on `PersonSectionsPage` — each layer with its own tests (fake repository for stores, mocked `global.fetch` for adapters/pages). Skills are the exception (global catalog + person assignment): `skillHttpRepository.ts`, `createSkillsStore`, `SkillsPage`. People stay on `CrudRepository`/`createPeopleStore`.
- Forms: controlled inputs with `<label>` wrapping the input (`PersonForm.tsx` style) — RTL queries depend on this.
- Auth: `src/auth/CognitoContext.tsx` implements the Cognito Hosted UI flow (authorization code + PKCE; access token kept in sessionStorage, verifier consumed before the exchange so StrictMode can't spend the code twice). Consumers depend only on `AuthContextValue` `{ token, isAuthenticated, login, logout }`; `App.tsx`'s `AuthGate` shows the sign-in screen until authenticated. Redirects go through `src/auth/browser.ts` so tests can mock navigation; the callback URL is always `<origin>/admin/` and must stay registered on the app client (cv-infra `auth.tf`).
- Env vars are Vite-style `VITE_*` via `import.meta.env`, accessed only in `src/store.ts` (composition root) and `src/auth/cognitoConfig.ts`. Their types are declared in `src/vite-env.d.ts` (`ImportMetaEnv`) — add new `VITE_*` vars there too.
- Build (`vite build`) type-strips via esbuild and does **not** type-check — `npm run typecheck` is the actual type gate, run separately in CI before `build`.

## Critical gotcha — Jest vs `import.meta`

Jest compiles ESM→CJS where `import.meta` is illegal syntax. `babel-plugin-transform-vite-meta-env` (in `babel.config.cjs`) rewrites `import.meta.env.*` to `process.env` equivalents. **Don't remove it, and don't use `import.meta` features beyond `.env`** — url/resolve are not transformed and will break every test that transitively imports the file. If tests suddenly fail with "Cannot use 'import.meta' outside a module", that's this. `@babel/preset-typescript` (also in `babel.config.cjs`) strips TS types for Jest the same way Vite/esbuild does for dev/build — it does not type-check either, which is why `npm run typecheck` exists as its own step.

## Testing conventions

RTL with mocked `global.fetch` (restore in `afterEach` — see `App.test.tsx`; `src/testing/mockFetch.ts` routes by method + path and records request bodies for page tests). Wrap routed components in `MemoryRouter`. Query by role/label, not test-ids. Every component and page has a test file beside it; stores are tested with a fake repository through the port, never fetch. The wired store in `src/store.ts` is module-level state — page tests must reset it in `afterEach` (`usePeopleStore.setState({ people: [], selectedPerson: null, loading: false, error: null })`; section stores: `setState({ personId: null, items: [], loading: false, error: null, notice: null })`; skills: `catalog: [], assignments: [], catalogNotice: null, assignmentsNotice: null` instead of `items`/`notice`). Page tests that write must first await the loaded state — forms are disabled while `loading`.

## Code review guidance

Priorities, ranked:

1. **Layering violations.** `presentation/` importing directly from `infrastructure/`, or any adapter wired outside `src/store.ts` (the composition root) — the dependency rule `domain ← application ← composition → infrastructure` is the whole point of this structure.
2. **RTL query style.** Tests using test-ids or querying inputs not wrapped by a `<label>` — this repo's forms and RTL queries depend on the `<label>` wrapping the input.
3. **Stale module-level store in page tests.** A new page test that doesn't reset `usePeopleStore` (or its section-store equivalent) in `afterEach` will leak state into other tests.
4. New `VITE_*` env var not added to `ImportMetaEnv` in `src/vite-env.d.ts`.

Don't flag:
- `import.meta.env` usage limited to `.env` values — this is the one `import.meta` feature Jest can handle via the babel transform; don't suggest broader `import.meta` (url/resolve) since it breaks tests.
- The Cognito PKCE flow's sessionStorage-based verifier handling in `CognitoContext.tsx` — intentional, guards against StrictMode double-invoking the code exchange.

## Git workflow

`master` is protected — feature branch (`feat/…`) → push → PR via `gh`. Definition of done: tests for new pages/flows, lint clean.
