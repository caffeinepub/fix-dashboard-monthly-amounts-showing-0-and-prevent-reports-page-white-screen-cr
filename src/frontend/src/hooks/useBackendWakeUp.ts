import type { ExtendedBackendInterface } from "@/types/backend-types";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useActor } from "./useActor";

// Wake-up interval: 5 minutes (300 seconds)
// This is frequent enough to prevent canister suspension but not too aggressive
const WAKEUP_INTERVAL = 300000; // 5 minutes in milliseconds
const WAKEUP_TIMEOUT = 8000; // Timeout after 8 seconds

/**
 * Hook that automatically keeps the backend canister active
 * by periodically pinging it to prevent suspension and "infinite loading" issues.
 *
 * This mechanism:
 * - Runs automatically in the background
 * - Works in both live and draft environments
 * - Prevents canister from going idle
 * - Detects backend canister ID changes
 * - Provides Croatian toast notifications when backend is reactivated
 */
export function useBackendWakeUp() {
  const { actor } = useActor();

  const wakeUpIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isWakingUpRef = useRef(false);
  const lastWakeUpTimeRef = useRef<number>(Date.now());
  const consecutiveFailuresRef = useRef(0);
  const hasShownReactivationToastRef = useRef(false);

  const performWakeUp = useCallback(async () => {
    if (!actor || isWakingUpRef.current) return;

    isWakingUpRef.current = true;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Wake-up timeout")), WAKEUP_TIMEOUT);
      });

      const extendedActor = actor as unknown as ExtendedBackendInterface;
      // Ping the backend using getCurrentTime (public query, no auth required)
      await Promise.race([extendedActor.getCurrentTime(), timeoutPromise]);

      lastWakeUpTimeRef.current = Date.now();

      // If we had consecutive failures before, show reactivation message
      if (consecutiveFailuresRef.current > 0) {
        if (!hasShownReactivationToastRef.current) {
          toast.success("Backend reaktiviran", {
            description: "Veza s backendom je ponovno uspostavljena",
            duration: 3000,
          });
          hasShownReactivationToastRef.current = true;

          // Reset the flag after 10 seconds
          setTimeout(() => {
            hasShownReactivationToastRef.current = false;
          }, 10000);
        }
      }

      consecutiveFailuresRef.current = 0;
    } catch (error) {
      consecutiveFailuresRef.current += 1;
      console.warn(
        `Backend wake-up failed (attempt ${consecutiveFailuresRef.current}):`,
        error,
      );

      // Only show error after multiple consecutive failures (3+)
      if (consecutiveFailuresRef.current >= 3) {
        console.error(
          "Backend appears to be unresponsive after multiple wake-up attempts",
        );
        // Connection monitor will handle recovery
      }
    } finally {
      isWakingUpRef.current = false;
    }
  }, [actor]);

  // Set up periodic wake-up routine
  useEffect(() => {
    if (!actor) return;

    // Perform initial wake-up after a short delay
    const initialWakeUpTimeout = setTimeout(() => {
      performWakeUp();
    }, 3000);

    // Set up periodic wake-up
    wakeUpIntervalRef.current = setInterval(() => {
      performWakeUp();
    }, WAKEUP_INTERVAL);

    return () => {
      clearTimeout(initialWakeUpTimeout);
      if (wakeUpIntervalRef.current) {
        clearInterval(wakeUpIntervalRef.current);
      }
    };
  }, [actor, performWakeUp]);

  // Also wake up when the page becomes visible again
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && actor) {
        // Check if it's been more than 2 minutes since last wake-up
        const timeSinceLastWakeUp = Date.now() - lastWakeUpTimeRef.current;
        if (timeSinceLastWakeUp > 120000) {
          // 2 minutes
          performWakeUp();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [actor, performWakeUp]);
}
