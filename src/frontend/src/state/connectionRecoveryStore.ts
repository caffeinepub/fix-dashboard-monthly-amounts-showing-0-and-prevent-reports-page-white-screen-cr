/**
 * Lightweight global state for connection recovery UI
 * Tracks backend connection failures and canister ID mismatch scenarios
 * No dependencies on React Query or other heavy libraries
 */

interface ConnectionRecoveryState {
  hasFailure: boolean;
  isCanisterMismatch: boolean;
  message: string;
  timestamp: number;
}

let state: ConnectionRecoveryState = {
  hasFailure: false,
  isCanisterMismatch: false,
  message: "",
  timestamp: 0,
};

type Listener = (state: ConnectionRecoveryState) => void;
const listeners = new Set<Listener>();

/**
 * Subscribe to connection recovery state changes
 */
export function subscribeToRecoveryState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get current recovery state
 */
export function getRecoveryState(): ConnectionRecoveryState {
  return { ...state };
}

/**
 * Set connection failure state with optional canister mismatch flag
 */
export function setConnectionFailure(
  message: string,
  isCanisterMismatch = false,
): void {
  state = {
    hasFailure: true,
    isCanisterMismatch,
    message,
    timestamp: Date.now(),
  };

  console.warn("[ConnectionRecovery] Failure recorded:", {
    message,
    isCanisterMismatch,
  });
  notifyListeners();
}

/**
 * Clear connection failure state (call on successful reconnection)
 */
export function clearConnectionFailure(): void {
  const hadFailure = state.hasFailure;

  state = {
    hasFailure: false,
    isCanisterMismatch: false,
    message: "",
    timestamp: 0,
  };

  if (hadFailure) {
    console.log("[ConnectionRecovery] Failure cleared - connection restored");
    notifyListeners();
  }
}

/**
 * Check if there's an active connection failure
 */
export function hasActiveFailure(): boolean {
  return state.hasFailure;
}

/**
 * Check if the failure is likely a canister ID mismatch
 */
export function isLikelyCanisterMismatch(): boolean {
  return state.hasFailure && state.isCanisterMismatch;
}

function notifyListeners(): void {
  const currentState = { ...state };
  for (const listener of listeners) {
    try {
      listener(currentState);
    } catch (error) {
      console.error("[ConnectionRecovery] Listener error:", error);
    }
  }
}
