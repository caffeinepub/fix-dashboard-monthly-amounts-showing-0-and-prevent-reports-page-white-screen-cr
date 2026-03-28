import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useResync } from "@/hooks/useResync";
import {
  getRecoveryState,
  subscribeToRecoveryState,
} from "@/state/connectionRecoveryStore";
import { AlertTriangle, Info, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import DeploymentInfoDialog from "./DeploymentInfoDialog";

/**
 * Persistent recovery banner that appears when backend connection fails
 * Provides immediate recovery actions and diagnostic information
 */
export default function CanisterMismatchRecoveryBanner() {
  const [recoveryState, setRecoveryState] = useState(getRecoveryState());
  const { resync, isResyncing } = useResync();

  useEffect(() => {
    const unsubscribe = subscribeToRecoveryState(setRecoveryState);
    return unsubscribe;
  }, []);

  // Don't render if no failure
  if (!recoveryState.hasFailure) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 w-full">
      <Alert
        variant="destructive"
        className="rounded-none border-x-0 border-t-0"
      >
        <AlertTriangle className="h-5 w-5" />
        <AlertTitle className="text-base font-semibold">
          {recoveryState.isCanisterMismatch
            ? "Backend Canister ID neusklađenost"
            : "Veza s backendom nije dostupna"}
        </AlertTitle>
        <AlertDescription className="mt-2 space-y-3">
          <p className="text-sm">
            {recoveryState.message ||
              "Backend ne odgovara. Ovo može biti uzrokovano starim canister ID-om ili mrežnim problemom."}
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={resync}
              disabled={isResyncing}
              size="sm"
              variant="secondary"
              className="flex-1"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isResyncing ? "animate-spin" : ""}`}
              />
              {isResyncing ? "Resinkronizacija..." : "Resinkroniziraj sada"}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1">
                  <Info className="h-4 w-4 mr-2" />
                  Prikaži Canister ID
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px]">
                <DeploymentInfoDialog />
              </DialogContent>
            </Dialog>
          </div>

          {recoveryState.isCanisterMismatch && (
            <p className="text-xs opacity-90">
              <strong>Savjet:</strong> Ako resinkronizacija ne uspije,
              provjerite je li backend canister ID ažuran u env.json datoteci i
              pokrenite{" "}
              <code className="bg-background/20 px-1 py-0.5 rounded">
                dfx generate backend
              </code>
              .
            </p>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
