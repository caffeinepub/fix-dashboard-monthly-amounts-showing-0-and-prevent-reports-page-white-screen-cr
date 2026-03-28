import type React from "react";

interface BackendCanisterIdGuardProps {
  children: React.ReactNode;
}

export default function BackendCanisterIdGuard({
  children,
}: BackendCanisterIdGuardProps) {
  // Opcija A: Ne blokiramo aplikaciju ako canister ID nije dostupan.
  // Connection monitor u pozadini će detektirati problem i prikazati toast poruke.
  return <>{children}</>;
}
