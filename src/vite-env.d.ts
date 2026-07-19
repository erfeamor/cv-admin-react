/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_ENABLED?: string;
  readonly VITE_DOMAIN_SERVICE_URL: string;
  readonly VITE_COGNITO_USER_POOL_ID: string;
  readonly VITE_COGNITO_CLIENT_ID: string;
  readonly VITE_COGNITO_HOSTED_UI_DOMAIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
