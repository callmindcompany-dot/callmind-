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
          // Split heavy, independently-cacheable libraries out of the main
          // bundle. These are only pulled in by the authenticated admin app
          // (charts, spreadsheet/PDF export, drag-and-drop), so isolating them
          // keeps them out of the vendor code a first-time marketing visitor
          // must parse, and lets them cache across deploys of app code.
          manualChunks: {
            'vendor-charts': ['recharts'],
            'vendor-export': ['xlsx', 'jspdf'],
            'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
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
