import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    css: {
      postcss: './postcss.config.js'
    },
    define: {
      'process.env': {
        GOOGLE_SDK_NODE_LOGGING: 'false',
        NODE_ENV: mode,
        VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY
      },
      'process.stdout': {
        isTTY: false
      },
      'process.stderr': {
        isTTY: false
      },
      'process.stdin': {
        isTTY: false
      },
      global: {},
    },
    resolve: {
      alias: {
        'node:events': 'events',
        'node:stream': 'stream-browserify',
        'node:buffer': 'buffer',
        'node:util': 'util',
        'node:url': 'url',
        'node:path': 'path-browserify',
        'node:fs': 'path',
        'node:net': 'path',
        'node:tls': 'path',
        'node:crypto': 'crypto-browserify',
        'googleapis': path.resolve(__dirname, './src/mocks/googleapis.ts'),
        'google-auth-library': path.resolve(__dirname, './src/mocks/googleapis.ts'),
        'gcp-metadata': path.resolve(__dirname, './src/mocks/googleapis.ts'),
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: 'globalThis'
        }
      }
    }
  }
}); 