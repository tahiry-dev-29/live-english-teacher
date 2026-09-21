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
  resolve: {
    alias: [
      {
        // Exact key (vite-tsconfig-paths maps wildcards only): bare barrel…
        find: /^@shared\/constants$/,
        replacement: path.resolve(__dirname, '../../libs/shared/constants/index.ts'),
      },
      {
        // …and subpath imports (@shared/constants/api-config etc.).
        find: /^@shared\/constants\/(.*)$/,
        replacement: path.resolve(__dirname, '../../libs/shared/constants/$1'),
      },
      {
        // Exact key declared in apps/frontend/tsconfig.json (baseUrl: src).
        find: '@environment',
        replacement: path.resolve(__dirname, 'src/environments/environment.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, 'src/test-setup.ts')],
    include: ['src/**/*.spec.ts'],
    reporters: ['default'],
  },
});
