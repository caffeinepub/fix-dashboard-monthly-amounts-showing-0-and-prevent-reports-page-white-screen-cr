/**
 * Single authoritative utility for reading, validating, and diagnosing
 * the backend canister ID from environment variables.
 */

const BUILD_TIMESTAMP = import.meta.env.VITE_BUILD_TIMESTAMP ?? "unknown";

/**
 * Returns the backend canister ID from environment variables.
 * Throws a descriptive error if the value is missing, empty, or 'N/A'.
 */
export function getBackendCanisterId(): string {
  const raw = import.meta.env.VITE_CANISTER_ID_BACKEND;

  if (
    !raw ||
    raw === "" ||
    raw === "N/A" ||
    raw === "undefined" ||
    raw === "null"
  ) {
    throw new Error(
      `Backend canister ID nije validan. Primljena vrijednost: "${raw ?? "nije postavljeno"}". Pokrenite: ./frontend/deploy.sh iz korijenskog direktorija projekta. Origin: ${typeof window !== "undefined" ? window.location.origin : "N/A"}`,
    );
  }

  return raw;
}

/**
 * Returns the backend canister ID or null if not available (no throw).
 */
export function getBackendCanisterIdSafe(): string | null {
  try {
    return getBackendCanisterId();
  } catch {
    return null;
  }
}

/**
 * Returns diagnostic information about the current canister ID configuration.
 * Also exported as getCanisterIdDiagnostics for compatibility.
 */
export function getCanisterIdDiagnostics(): string {
  const raw = import.meta.env.VITE_CANISTER_ID_BACKEND;
  const frontendId = import.meta.env.VITE_CANISTER_ID_FRONTEND;
  const origin = typeof window !== "undefined" ? window.location.origin : "N/A";
  const buildTimestamp = BUILD_TIMESTAMP;

  const lines = [
    "=== Dijagnostika Canister ID-a ===",
    "",
    `Backend Canister ID: ${raw ?? "nije postavljeno"}`,
    `Frontend Canister ID: ${frontendId ?? "nije postavljeno"}`,
    "",
    "Izvor: import.meta.env.VITE_CANISTER_ID_BACKEND",
    `Valjanost: ${isValidCanisterId(raw) ? "✓ Valjan" : "✗ Nevaljan"}`,
    "",
    `Build timestamp: ${buildTimestamp}`,
    `Origin: ${origin}`,
    "",
    "=== Upute za rješavanje ===",
    "1. Pokrenite: ./frontend/deploy.sh",
    "2. Ili: dfx generate backend && dfx deploy",
    "3. Osvježite stranicu (Ctrl+Shift+R)",
  ];

  return lines.join("\n");
}

/** @deprecated Use getCanisterIdDiagnostics instead */
export function getBackendCanisterIdDiagnostic(): {
  id: string;
  isValid: boolean;
  source: string;
  message: string;
  buildTimestamp: string;
  troubleshootingHint: string;
} {
  const raw = import.meta.env.VITE_CANISTER_ID_BACKEND;
  const id = raw || "N/A";
  const valid = isValidCanisterId(raw);

  let message = "";
  let troubleshootingHint = "";

  if (!raw) {
    message = "Environment variable VITE_CANISTER_ID_BACKEND is not set";
    troubleshootingHint =
      "Frontend je izgrađen bez ispravnog canister ID-a. Potreban je novi build s ispravnom konfiguracijom.";
  } else if (raw === "N/A") {
    message =
      'Backend canister ID je postavljen na placeholder vrijednost "N/A"';
    troubleshootingHint =
      "Ovo se događa kada frontend nije izgrađen s ispravnim canister ID-om. Pokrenite ./deploy.sh za novi build.";
  } else if (!valid) {
    message = `Backend canister ID "${raw}" izgleda nevažeći`;
    troubleshootingHint =
      "Provjerite je li canister ID ispravan format (npr. xxxxx-xxxxx-xxxxx-xxxxx-cai).";
  } else {
    message = "Backend canister ID je važeći";
    troubleshootingHint = "";
  }

  return {
    id,
    isValid: valid,
    source: "import.meta.env.VITE_CANISTER_ID_BACKEND",
    message,
    buildTimestamp: BUILD_TIMESTAMP,
    troubleshootingHint,
  };
}

/**
 * Returns a display-safe string for the backend canister ID ("N/A" if missing).
 * @deprecated Use getBackendCanisterIdSafe instead
 */
export function getBackendCanisterIdDisplay(): string {
  return getBackendCanisterIdSafe() ?? "N/A";
}

/**
 * Returns the public HTTPS URL for the backend canister.
 */
export function getBackendPublicUrl(): string {
  const id = getBackendCanisterIdSafe();
  return id ? `https://${id}.icp0.io` : "N/A";
}

function isValidCanisterId(value: string | undefined | null): boolean {
  if (!value) return false;
  if (
    value === "N/A" ||
    value === "undefined" ||
    value === "null" ||
    value === ""
  )
    return false;
  return value.length > 5;
}
