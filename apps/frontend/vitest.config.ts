import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  plugins: [
    angular({
      tsconfig: path.resolve(__dirname, 'tsconfig.spec.json'),
    }),
    viteTsConfigPaths({
      root: path.resolve(__dirname, '../../'),
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'src/test-setup.ts')],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
});
