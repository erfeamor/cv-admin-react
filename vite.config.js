import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served under /admin/ from the shared CloudFront distribution;
// cv-public-vanilla owns the root path.
export default defineConfig({
  base: '/admin/',
  plugins: [react()],
  server: {
    port: 5173,
  },
});
