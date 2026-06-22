import {
  provideTanStackQuery,
  QueryClient,
} from '@tanstack/angular-query-experimental';
import { getLocalDB } from '../services/sync/local-db';

/**
 * Create a custom IndexedDB persister for TanStack Query.
 * Persists the serialized QueryClient cache to the `query_cache` store.
 */
function createIndexedDBPersister() {
  return {
    persistClient: async (client: unknown) => {
      try {
        const db = await getLocalDB();
        await db.put('query_cache', {
          key: 'tanstack-query',
          data: client,
          timestamp: Date.now(),
        });
      } catch {
        // Silently fail — persistence is a best-effort optimization
      }
    },
    restoreClient: async (): Promise<unknown | null> => {
      try {
        const db = await getLocalDB();
        const cached = await db.get('query_cache', 'tanstack-query');
        return cached?.data ?? null;
      } catch {
        return null;
      }
    },
    removeClient: async () => {
      try {
        const db = await getLocalDB();
        await db.delete('query_cache', 'tanstack-query');
      } catch {
        // Silently fail
      }
    },
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache for 5 minutes when online
      staleTime: 1000 * 60 * 5,
      // Retry 3 times with exponential backoff (capped at 30s)
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
      // Don't refetch on window focus when offline
      refetchOnWindowFocus: () => navigator.onLine,
    },
    mutations: {
      retry: 3,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

/**
 * Provide TanStack Query to the application.
 * Add to `bootstrapApplication` providers in main.ts.
 */
export const provideQuery = () => provideTanStackQuery(queryClient);
