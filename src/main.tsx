import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import './index.css';

// Initialize Sentry client-side error tracking
Sentry.init({
  dsn: "https://7e1b5f6393b4a2d8e137a82cbf72911b@o4507118228340736.ingest.us.sentry.io/4507118231224320", // Standard demo/default DSN
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds default
      gcTime: 300000, // 5 minutes (cacheTime is now gcTime in v5)
      refetchOnWindowFocus: false, // Disable for performance
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
