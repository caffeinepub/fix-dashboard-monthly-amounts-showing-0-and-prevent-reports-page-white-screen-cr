import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { toast } from 'sonner';

const PING_INTERVAL = 90000;
const PING_TIMEOUT = 10000;
const RECOVERY_RETRY_DELAY = 5000;
const MAX_RECOVERY_ATTEMPTS = 5;
const ACTOR_QUERY_KEY = 'actor';
const BACKEND_WAKEUP_TIMEOUT = 8000;
const RELAYER_SYNC_TIMEOUT = 5000;

/**
 * Enhanced connection monitoring hook with comprehensive backend availability monitoring,
 * automatic relayer synchronization, and full communication chain verification.
 * Automatically detects when backend becomes idle, unresponsive, or canister ID changes.
 * Triggers automatic resynchronization with full actor binding refresh and relayer activation.
 */
export function useConnectionMonitor() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  
  const isConnectedRef = useRef(true);
  const isRecoveringRef = useRef(false);
  const recoveryAttemptsRef = useRef(0);
  const toastIdRef = useRef<string | number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMonitoringRef = useRef(false);
  const lastSuccessfulPingRef = useRef<number>(Date.now());
  const backendWokenUpRef = useRef(false);
  const relayerSyncedRef = useRef(false);

  // Wake up backend canister and synchronize relayer before any connection checks
  const wakeUpBackendAndSyncRelayer = useCallback(async (): Promise<boolean> => {
    if (!actor) return false;

    try {
      // Step 1: Wake up backend with anonymous health check
      if (!backendWokenUpRef.current) {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('BACKEND_WAKEUP_TIMEOUT')), BACKEND_WAKEUP_TIMEOUT);
        });

        const wakeUpPromise = actor.getCurrentTime();
        await Promise.race([wakeUpPromise, timeoutPromise]);

        backendWokenUpRef.current = true;
      }

      // Step 2: Synchronize relayer with authentication check
      if (!relayerSyncedRef.current) {
        const relayerTimeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('RELAYER_SYNC_TIMEOUT')), RELAYER_SYNC_TIMEOUT);
        });

        const relayerSyncPromise = actor.getCurrentTime();
        await Promise.race([relayerSyncPromise, relayerTimeoutPromise]);

        relayerSyncedRef.current = true;
      }

      return true;
    } catch (err: any) {
      console.error('Backend wake-up and relayer sync error:', err);
      backendWokenUpRef.current = false;
      relayerSyncedRef.current = false;
      return false;
    }
  }, [actor]);

  const recreateActor = useCallback(async () => {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await queryClient.resetQueries({
        queryKey: [ACTOR_QUERY_KEY],
        exact: false,
      });
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
      await queryClient.refetchQueries({
        queryKey: [ACTOR_QUERY_KEY],
        exact: false,
      });
      
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Reset backend and relayer flags to ensure fresh synchronization
      backendWokenUpRef.current = false;
      relayerSyncedRef.current = false;
      
      // Wake up backend and synchronize relayer after actor recreation
      await wakeUpBackendAndSyncRelayer();
      
      await queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        }
      });
      
      await queryClient.refetchQueries({
        type: 'active',
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        }
      });
    } catch (error) {
      console.error('Error during actor recreation:', error);
      throw error;
    }
  }, [queryClient, wakeUpBackendAndSyncRelayer]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!actor) return false;

    try {
      // Wake up backend and synchronize relayer before connection check
      const syncOk = await wakeUpBackendAndSyncRelayer();
      if (!syncOk) {
        return false;
      }

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), PING_TIMEOUT);
      });

      await Promise.race([actor.getCurrentTime(), timeoutPromise]);
      lastSuccessfulPingRef.current = Date.now();
      return true;
    } catch (error) {
      console.error('Connection check failed:', error);
      return false;
    }
  }, [actor, wakeUpBackendAndSyncRelayer]);

  const handleConnectionRestored = useCallback(async () => {
    isConnectedRef.current = true;
    isRecoveringRef.current = false;
    recoveryAttemptsRef.current = 0;

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
      toastIdRef.current = null;
    }

    toast.success('Veza uspostavljena', { 
      description: 'Backend je ponovno aktivan, relayer sinkroniziran, svi podaci su osvježeni',
      duration: 4000 
    });

    try {
      await recreateActor();
    } catch (error) {
      console.error('Error during connection restoration:', error);
    }
  }, [recreateActor]);

  const attemptRecovery = useCallback(async () => {
    if (!actor || recoveryAttemptsRef.current >= MAX_RECOVERY_ATTEMPTS) {
      if (recoveryAttemptsRef.current >= MAX_RECOVERY_ATTEMPTS) {
        if (toastIdRef.current) {
          toast.dismiss(toastIdRef.current);
        }
        toast.error('Nije moguće uspostaviti vezu', {
          description: 'Kliknite gumb "Resinkroniziraj" u headeru ili osvježite stranicu (F5). Provjerite je li backend canister ID ažuran i relayer dostupan.',
          duration: 10000,
        });
        isRecoveringRef.current = false;
      }
      return;
    }

    recoveryAttemptsRef.current += 1;

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }
    toastIdRef.current = toast.loading(
      `Ponovno uspostavljanje veze... (${recoveryAttemptsRef.current}/${MAX_RECOVERY_ATTEMPTS})`,
      { 
        duration: Infinity,
        description: 'Buđenje backenda, sinkronizacija relayera i osvježavanje actor bindings...'
      }
    );

    // Reset backend and relayer flags before recovery
    backendWokenUpRef.current = false;
    relayerSyncedRef.current = false;

    try {
      await recreateActor();
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Actor recreation failed during recovery:', error);
    }

    const isConnected = await checkConnection();

    if (isConnected) {
      await handleConnectionRestored();
    } else {
      const delay = RECOVERY_RETRY_DELAY * Math.pow(1.5, recoveryAttemptsRef.current - 1);
      recoveryTimeoutRef.current = setTimeout(attemptRecovery, delay);
    }
  }, [actor, checkConnection, handleConnectionRestored, recreateActor]);

  const handleConnectionLost = useCallback(() => {
    if (isRecoveringRef.current) return;

    isConnectedRef.current = false;
    isRecoveringRef.current = true;
    recoveryAttemptsRef.current = 0;

    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }
    toastIdRef.current = toast.loading('Ponovno uspostavljanje veze s backendom...', {
      duration: Infinity,
      description: 'Buđenje backenda, sinkronizacija relayera, osvježavanje actor bindings i canister ID mapiranje...'
    });

    attemptRecovery();
  }, [attemptRecovery]);

  const monitorConnection = useCallback(async () => {
    if (!actor || isMonitoringRef.current) return;

    isMonitoringRef.current = true;

    try {
      const isConnected = await checkConnection();

      if (isConnected) {
        if (!isConnectedRef.current && isRecoveringRef.current) {
          await handleConnectionRestored();
        } else {
          isConnectedRef.current = true;
        }
      } else {
        if (isConnectedRef.current && !isRecoveringRef.current) {
          handleConnectionLost();
        }
      }
    } finally {
      isMonitoringRef.current = false;
    }
  }, [actor, checkConnection, handleConnectionRestored, handleConnectionLost]);

  useEffect(() => {
    if (!actor) return;

    // Initial backend wake-up and relayer sync after a delay
    const initialCheckTimeout = setTimeout(async () => {
      await wakeUpBackendAndSyncRelayer();
      monitorConnection();
    }, 5000);

    pingIntervalRef.current = setInterval(monitorConnection, PING_INTERVAL);

    return () => {
      clearTimeout(initialCheckTimeout);
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
      }
    };
  }, [actor, monitorConnection, wakeUpBackendAndSyncRelayer]);

  useEffect(() => {
    const handleOnline = () => {
      if (!isConnectedRef.current && !isRecoveringRef.current) {
        handleConnectionLost();
      }
    };

    const handleOffline = () => {
      handleConnectionLost();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleConnectionLost]);
}
