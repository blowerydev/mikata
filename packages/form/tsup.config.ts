import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/resolvers/zod.ts',
    'src/resolvers/yup.ts',
    'src/resolvers/valibot.ts',
    'src/resolvers/superstruct.ts',
    'src/resolvers/joi.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
});
