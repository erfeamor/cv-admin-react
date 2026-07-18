// Composition root: the only module that wires infrastructure adapters into
// application stores. Pages import store hooks from here, never adapters.

import { createPeopleStore } from './application/peopleStore';
import { getStoredToken } from './auth/tokenStorage';
import { createHttpClient } from './infrastructure/http/httpClient';
import { createPersonHttpRepository } from './infrastructure/http/personHttpRepository';

// ?? not ||: the deployed build sets this to the empty string on purpose, so
// requests go same-origin through CloudFront's /api/* behavior.
const DOMAIN_SERVICE_URL = import.meta.env.VITE_DOMAIN_SERVICE_URL ?? 'http://localhost:8080';

const httpClient = createHttpClient(DOMAIN_SERVICE_URL, getStoredToken);

export const usePeopleStore = createPeopleStore(createPersonHttpRepository(httpClient));
