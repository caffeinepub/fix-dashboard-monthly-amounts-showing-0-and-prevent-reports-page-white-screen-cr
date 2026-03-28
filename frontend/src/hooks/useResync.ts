import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const ACTOR_QUERY_KEY = 'actor';

/**
 * Enhanced hook for comprehensive frontend-backend resynchronization
 * Performs complete cache clearing, actor recreation, backend verification, and query client reinitialization
 * Handles backend canister ID regeneration and connection state restoration
 */
export function useResync() {
  const queryClient = useQueryClient();
  const [isResyncing, setIsResyncing] = useState(false);

  const resync = useCallback(async () => {
    if (isResyncing) return;

    setIsResyncing(true);
    const toastId = toast.loading('Potpuna resinkronizacija u tijeku...', {
      duration: Infinity,
      description: 'Korak 1/12: Priprema...',
    });

    try {
      // Step 1: Cancel all ongoing queries to prevent conflicts
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 1/12: Zaustavljanje aktivnih upita...',
      });
      await queryClient.cancelQueries();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 2: Clear entire query cache (removes all stale data and actor bindings)
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 2/12: Brisanje cache memorije...',
      });
      queryClient.clear();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 3: Remove all query defaults to reset configuration
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 3/12: Resetiranje konfiguracije...',
      });
      queryClient.removeQueries();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Step 4: Reset actor query to force complete recreation with new bindings
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 4/12: Resetiranje actor veze...',
      });
      await queryClient.resetQueries({
        queryKey: [ACTOR_QUERY_KEY],
        exact: false,
      });
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Step 5: Invalidate actor to ensure fresh creation
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 5/12: Invalidacija actor cache-a...',
      });
      await queryClient.invalidateQueries({
        queryKey: [ACTOR_QUERY_KEY],
        exact: false,
      });
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Step 6: Refetch the actor (this will create a new connection with updated canister ID)
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 6/12: Kreiranje nove actor veze...',
      });
      await queryClient.refetchQueries({
        queryKey: [ACTOR_QUERY_KEY],
        exact: false,
      });
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 7: Get the actor and verify backend connectivity
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 7/12: Provjera backend dostupnosti...',
      });
      const actorQueryData = queryClient.getQueryData([ACTOR_QUERY_KEY]);
      
      if (!actorQueryData) {
        throw new Error('Actor nije dostupan nakon rekreacije. Provjerite je li backend canister ID ažuran u env.json datoteci.');
      }
      
      const actor = actorQueryData as any;
      
      // Step 8: Verify backend is responsive with timeout
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 8/12: Testiranje backend odgovora...',
      });
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Backend timeout')), 12000);
        });
        await Promise.race([actor.getCurrentTime(), timeoutPromise]);
      } catch (error: any) {
        if (error?.message === 'Backend timeout') {
          throw new Error('Backend ne odgovara - provjerite je li canister aktivan i dostupan');
        }
        throw new Error('Backend nije dostupan - provjerite canister ID i mrežnu vezu');
      }
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Step 9: Invalidate all other queries to trigger fresh data fetch
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 9/12: Invalidacija svih podataka...',
      });
      await queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 10: Refetch all active queries with fresh backend connection
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 10/12: Osvježavanje aktivnih podataka...',
      });
      await queryClient.refetchQueries({
        type: 'active',
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Step 11: Verify user profile access (tests full authentication flow)
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 11/12: Provjera autentifikacije...',
      });
      try {
        await actor.getCallerUserProfile();
      } catch (error: any) {
        // Ignore unauthorized errors (user not logged in) - this is expected for anonymous users
        if (!error?.message?.includes('Unauthorized') && !error?.message?.includes('nauthorized')) {
          console.warn('Profile verification warning:', error);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Step 12: Final verification - ensure query client is in healthy state
      toast.loading('Potpuna resinkronizacija u tijeku...', {
        id: toastId,
        description: 'Korak 12/12: Finalna provjera...',
      });
      const queryCache = queryClient.getQueryCache();
      const queriesCount = queryCache.getAll().length;
      
      if (queriesCount === 0) {
        console.warn('No queries in cache after resync - this may indicate an issue');
      }
      
      await new Promise(resolve => setTimeout(resolve, 300));

      toast.success('Potpuna resinkronizacija uspješna! ✓', {
        id: toastId,
        description: `Veza uspostavljena, svi podaci osvježeni (${queriesCount} upita aktivno)`,
        duration: 5000,
      });
    } catch (error: any) {
      console.error('Resync error:', error);
      toast.error('Greška pri resinkronizaciji', {
        id: toastId,
        description: error?.message || 'Pokušajte ponovno ili osvježite stranicu (F5). Provjerite je li backend canister ID ažuran u env.json datoteci.',
        duration: 10000,
      });
    } finally {
      setIsResyncing(false);
    }
  }, [isResyncing, queryClient]);

  return {
    resync,
    isResyncing,
  };
}

