import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import Components from 'unplugin-vue-components/vite';

const SERVICE_WORKER_ENTRY = 'src/service-worker.ts';
const SERVICE_WORKER_URL = '/sw.js';

/**
 * Serves the service worker from the site root, the only place its scope
 * covers the whole app: from source during development, as a fixed-name,
 * unhashed file in builds so browsers can check it for updates.
 */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === SERVICE_WORKER_URL) {
          req.url = `/${SERVICE_WORKER_ENTRY}`;
        }
        next();
      });
    },
    config: () => ({
      build: {
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html'),
            sw: path.resolve(__dirname, SERVICE_WORKER_ENTRY),
          },
          output: {
            entryFileNames: (chunk) =>
              chunk.name === 'sw'
                ? SERVICE_WORKER_URL.slice(1)
                : 'assets/[name]-[hash].js',
          },
        },
      },
    }),
  };
}

export default defineConfig({
  plugins: [
    vue(),
    serviceWorker(),
    tailwindcss(),
    Components({
      dirs: ['src/common/components'],
      extensions: ['vue'],
      dts: true,
    }),
  ],
  // Lets vue-i18n tree-shake its legacy (Options) API, which the app never uses.
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: { host: 'localhost', port: 5173 },
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
