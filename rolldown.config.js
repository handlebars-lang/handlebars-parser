import { defineConfig } from 'rolldown';

export default defineConfig({
  input: 'lib/index.js',
  platform: 'node',
  output: [
    {
      format: 'esm',
      file: 'dist/esm/index.js',
      sourcemap: true,
    },
    {
      format: 'cjs',
      file: 'dist/cjs/index.cjs',
      sourcemap: true,
      exports: 'named',
    },
  ],
});
