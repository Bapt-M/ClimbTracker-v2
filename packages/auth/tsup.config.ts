import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: ['src/index.ts', 'src/client.ts'],
  format: ['esm'],
  dts: true,
  clean: !options.watch, // Don't clean in watch mode to preserve .d.ts files
  sourcemap: true,
}));
