import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true,
    // HTTPS is NOT required for getUserMedia on localhost
  },
  build: {
    target: 'esnext',
  },
});
