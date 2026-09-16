import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    restoreMocks: true,
    env: {
      // jsdom has no page origin for fetch: RTK Query builds a Request object, and
      // Node's Request constructor rejects relative URLs. Tests match on the path.
      VITE_API_URL: 'http://localhost/api/v1',
    },
  },
});
