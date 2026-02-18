import { defineConfig } from 'vite';

export default defineConfig({
  base: '/meltdown-game/',
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
  },
});
