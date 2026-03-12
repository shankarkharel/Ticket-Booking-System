import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  optimizeDeps: {
    include: ['@ticket/contracts']
  },
  build: {
    commonjsOptions: {
      include: [/packages\/contracts/, /node_modules/]
    }
  },
  resolve: {
    alias: {
      '@ticket/contracts': path.resolve(__dirname, '../../packages/contracts/dist/index.js')
    }
  }
});
