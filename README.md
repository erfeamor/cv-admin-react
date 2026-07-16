# cv-admin-react

Admin CRUD UI for the Currículum Interactivo project. Talks directly to [cv-domain-service](../cv-domain-service), bypassing the BFF, since it needs full CRUD rather than the aggregated shape the public site consumes.

Part of the [cv-project](../README.md) multi-repo. Pipeline: DroneCI.

## Stack

- React 18 + Hooks, React Router, **TypeScript**
- Vite (dev/build)
- AWS Cognito Hosted UI / SDK for auth (see `src/auth/CognitoContext.tsx`)
- Jest + React Testing Library (TDD)

## Local development

```bash
cp .env.example .env      # fill in Cognito + domain-service settings
npm install
npm run dev                 # start on :5173
npm run typecheck           # tsc --noEmit
npm test                    # run the test suite
```

## Structure

- `src/pages/` — route-level components (list, create/edit form)
- `src/api/client.ts` — typed fetch wrapper for `cv-domain-service` (exports the `Person`/`PersonInput` types)
- `src/auth/CognitoContext.tsx` — auth context; swap its internals for the real Cognito Hosted UI redirect flow once the user pool exists
- `src/vite-env.d.ts` — typed `import.meta.env` (`VITE_*` vars)
- `tsconfig.json` — strict mode; `npm run typecheck` runs it standalone (Vite/Jest transpile via esbuild/Babel without type-checking, so CI runs this as its own gate)
