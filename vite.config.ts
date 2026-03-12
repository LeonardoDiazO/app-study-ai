import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const GEMINI_MODEL_PATH = '/v1beta/models/gemini-2.5-flash:generateContent';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env.local so GEMINI_API_KEY is available for the dev proxy
  const env = loadEnv(mode, process.cwd(), '');

  return {
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // In development, proxy /api/gemini to Gemini directly.
      // Supports both operator key (GEMINI_API_KEY in .env.local) and
      // user-provided key (Authorization header from the client).
      '/api/gemini': {
        target: 'https://generativelanguage.googleapis.com',
        changeOrigin: true,
        rewrite: () => GEMINI_MODEL_PATH,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Prefer operator key from env; fall back to user's Bearer token
            const operatorKey = env.GEMINI_API_KEY ?? '';
            const auth = (req as { headers: Record<string, string> }).headers['authorization'] ?? '';
            const key = operatorKey || (auth.startsWith('Bearer ') ? auth.slice(7).trim() : '');

            if (key) {
              proxyReq.path = `${GEMINI_MODEL_PATH}?key=${key}`;
              proxyReq.removeHeader('authorization');
            }
          });
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — cached independently, rarely changes
          'vendor-react': ['react', 'react-dom'],
          // Mermaid + all its heavy sub-dependencies (cytoscape, katex, etc.)
          'vendor-mermaid': ['mermaid'],
          // Markmap libraries for interactive mind maps
          'vendor-markmap': ['markmap-lib', 'markmap-view'],
        },
      },
    },
    // Raise warning threshold a bit since mermaid is intentionally large
    chunkSizeWarningLimit: 600,
  },
  };
})
