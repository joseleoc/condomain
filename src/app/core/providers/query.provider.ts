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
 * Wire IndexedDB persistence to the QueryClient.
 * Restores cached state on init and persists on every cache update.
 * Call this once during app initialization.
 */
export async function initQueryPersistence(): Promise<void> {
  const persister = createIndexedDBPersister();

  // Restore cached data on startup
  const restored = await persister.restoreClient();
  if (restored) {
    const cacheData = (restored as Record<string, unknown>)['cache'];
    if (cacheData && typeof cacheData === 'object') {
      // Restore individual query data from persisted cache
      for (const [key, value] of Object.entries(
        cacheData as Record<string, unknown>,
      )) {
        try {
          queryClient.setQueryData(JSON.parse(key), value);
        } catch {
          // Skip malformed cache entries
        }
      }
    }
  }

  // Persist on every cache change (debounced to avoid excessive writes)
  let persistTimeout: ReturnType<typeof setTimeout> | null = null;
  queryClient.getQueryCache().subscribe(() => {
    if (persistTimeout) clearTimeout(persistTimeout);
    persistTimeout = setTimeout(() => {
      persister.persistClient(queryClient);
    }, 500);
  });
}

/**
 * Provide TanStack Query to the application.
 * Add to `bootstrapApplication` providers in main.ts.
 */
export const provideQuery = () => provideTanStackQuery(queryClient);
