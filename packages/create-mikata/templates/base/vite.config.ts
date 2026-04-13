import { defineConfig } from 'vite';
import mikata from '@mikata/compiler';

export default defineConfig({
  plugins: [mikata()],
});
