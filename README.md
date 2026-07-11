# cv-admin-react

Admin CRUD UI for the Currículum Interactivo project. Talks directly to [cv-domain-service](../cv-domain-service), bypassing the BFF, since it needs full CRUD rather than the aggregated shape the public site consumes.

Part of the [cv-project](../README.md) multi-repo. Pipeline: DroneCI.

## Stack

- React + Hooks, React Router
- Vite (dev/build)
- AWS Cognito Hosted UI / SDK for auth (see `src/auth/CognitoContext.jsx`)
- Jest + React Testing Library (TDD)

## Local development

```bash
cp .env.example .env      # fill in Cognito + domain-service settings
npm install
npm run dev                 # start on :5173
npm test                    # run the test suite
```

## Structure

- `src/pages/` — route-level components (list, create/edit form)
- `src/api/client.js` — typed fetch wrapper for `cv-domain-service`
- `src/auth/CognitoContext.jsx` — auth context; swap its internals for the real Cognito Hosted UI redirect flow once the user pool exists
