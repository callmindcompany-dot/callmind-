import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    build: {
      target: 'esnext',
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          // Only framer-motion is split by hand, because the public marketing
          // pages genuinely use it — it belongs in the eager graph, and naming
          // it lets it stay cached across deploys of app code.
          //
          // recharts, xlsx/jspdf and @dnd-kit are deliberately NOT listed.
          // Forcing them into named chunks made Rollup emit them as top-level
          // chunks, which Vite then advertised with <link rel="modulepreload">
          // — so a marketing visitor still downloaded ~1.2 MB of charting and
          // export code before touching the app. Left unlisted, they are pulled
          // into the lazily-imported dashboard chunks that actually use them
          // and are not fetched until someone opens those screens.
          manualChunks: {
            'vendor-motion': ['framer-motion'],
          },
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        'firebase/app': path.resolve(__dirname, './src/firebase.ts'),
        'firebase/auth': path.resolve(__dirname, './src/firebase.ts'),
        'firebase/firestore': path.resolve(__dirname, './src/firebase.ts'),
        'firebase/functions': path.resolve(__dirname, './src/firebase.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
