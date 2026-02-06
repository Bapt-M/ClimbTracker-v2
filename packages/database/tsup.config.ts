import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  entry: {
    index: 'src/index.ts',
    schema: 'src/schema/index.ts'
  },
  format: ['esm'],
  dts: true,
  clean: !options.watch, // Don't clean in watch mode to preserve .d.ts files
  sourcemap: true,
}));
