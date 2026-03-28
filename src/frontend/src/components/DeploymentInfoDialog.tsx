import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getBackendCanisterIdDiagnostic,
  getBackendCanisterIdDisplay,
  getBackendPublicUrl,
} from "@/lib/canisterId";
import { AlertTriangle, Check, Copy, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DeploymentInfoDialog() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Get canister IDs from environment (frontend) and centralized utility (backend)
  const frontendCanisterId = import.meta.env.VITE_CANISTER_ID_FRONTEND || "N/A";
  const backendCanisterId = getBackendCanisterIdDisplay();
  const backendDiagnostic = getBackendCanisterIdDiagnostic();

  const isBackendIdMissing = backendCanisterId === "N/A" || !backendCanisterId;
  const isFrontendIdMissing =
    frontendCanisterId === "N/A" || !frontendCanisterId;

  // Generate public URLs
  const frontendPublicUrl =
    frontendCanisterId !== "N/A"
      ? `https://${frontendCanisterId}.icp0.io`
      : "N/A";

  const backendPublicUrl = getBackendPublicUrl();

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} kopiran u međuspremnik`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error("Greška pri kopiranju");
    }
  };

  return (
    <TooltipProvider>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Info className="mr-2 h-4 w-4" />
            Informacije o implementaciji
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Informacije o implementaciji</DialogTitle>
            <DialogDescription>
              Detalji o trenutnoj implementaciji aplikacije na Internet Computer
              mreži
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Rebuild Required Warning */}
            {(isBackendIdMissing || isFrontendIdMissing) && (
              <Alert className="border-destructive/50 bg-destructive/5">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  <strong>Rebuild Required:</strong> Jedan ili više canister
                  ID-ova nedostaje ili je nevažeći. Pokrenite{" "}
                  <code className="bg-destructive/20 px-1 rounded text-xs">
                    ./frontend/deploy.sh
                  </code>{" "}
                  za novi build s ispravnom konfiguracijom.
                </AlertDescription>
              </Alert>
            )}

            {/* Frontend Section */}
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary">
                  Frontend Canister
                </h3>
                {isFrontendIdMissing && (
                  <Badge variant="destructive" className="text-xs">
                    Nije konfiguriran
                  </Badge>
                )}
              </div>

              {/* Frontend Canister ID */}
              <div className="space-y-2">
                <Label htmlFor="frontend-id" className="text-sm font-semibold">
                  Frontend Canister ID
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="frontend-id"
                    value={frontendCanisterId}
                    readOnly
                    className={`font-mono text-sm ${isFrontendIdMissing ? "border-destructive text-destructive" : ""}`}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleCopy(frontendCanisterId, "Frontend Canister ID")
                    }
                    disabled={isFrontendIdMissing}
                  >
                    {copiedField === "Frontend Canister ID" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Frontend Public URL */}
              <div className="space-y-2">
                <Label htmlFor="frontend-url" className="text-sm font-semibold">
                  Frontend javni URL pristup
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="frontend-url"
                    value={frontendPublicUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleCopy(frontendPublicUrl, "Frontend javni URL")
                    }
                    disabled={frontendPublicUrl === "N/A"}
                  >
                    {copiedField === "Frontend javni URL" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {frontendPublicUrl !== "N/A" && (
                  <p className="text-xs text-muted-foreground">
                    Kliknite na URL za otvaranje u novom prozoru:{" "}
                    <a
                      href={frontendPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {frontendPublicUrl}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Backend Section */}
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-primary">
                  Backend Canister
                </h3>
                {isBackendIdMissing ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="destructive"
                        className="text-xs cursor-help flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        Rebuild Required
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">
                        Backend canister ID nedostaje ili je nevažeći. Ovo znači
                        da frontend nije izgrađen s ispravnim canister ID-om.
                        Pokrenite ./frontend/deploy.sh za novi build.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs text-green-600 border-green-600"
                  >
                    Konfiguriran
                  </Badge>
                )}
              </div>

              {/* Backend Canister ID */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="backend-id" className="text-sm font-semibold">
                    Backend Canister ID
                  </Label>
                  {isBackendIdMissing && (
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-destructive cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          {backendDiagnostic.troubleshootingHint}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="backend-id"
                    value={backendCanisterId}
                    readOnly
                    className={`font-mono text-sm ${isBackendIdMissing ? "border-destructive text-destructive" : ""}`}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleCopy(backendCanisterId, "Backend Canister ID")
                    }
                    disabled={isBackendIdMissing}
                  >
                    {copiedField === "Backend Canister ID" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {isBackendIdMissing && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Vrijednost "N/A" ukazuje na stari ili neispravan build.
                    Potreban je novi deployment.
                  </p>
                )}
              </div>

              {/* Backend Public URL */}
              <div className="space-y-2">
                <Label htmlFor="backend-url" className="text-sm font-semibold">
                  Backend javni URL pristup
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="backend-url"
                    value={backendPublicUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      handleCopy(backendPublicUrl, "Backend javni URL")
                    }
                    disabled={backendPublicUrl === "N/A"}
                  >
                    {copiedField === "Backend javni URL" ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {backendPublicUrl !== "N/A" && (
                  <p className="text-xs text-muted-foreground">
                    Backend canister URL za direktan pristup API-ju
                  </p>
                )}
              </div>

              {/* Build info */}
              {backendDiagnostic.buildTimestamp && (
                <div className="text-xs text-muted-foreground pt-1 border-t">
                  <span className="font-medium">Build timestamp:</span>{" "}
                  {backendDiagnostic.buildTimestamp}
                </div>
              )}
            </div>

            {/* Deployment Status */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <h4 className="mb-2 text-sm font-semibold">
                Status implementacije
              </h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium">Mreža:</span> Internet Computer
                  (Mainnet)
                </p>
                <p>
                  <span className="font-medium">Frontend status:</span>{" "}
                  <span
                    className={`font-medium ${!isFrontendIdMissing ? "text-green-600" : "text-destructive"}`}
                  >
                    {!isFrontendIdMissing ? "Aktivno" : "Nije implementirano"}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Backend status:</span>{" "}
                  <span
                    className={`font-medium ${!isBackendIdMissing ? "text-green-600" : "text-destructive"}`}
                  >
                    {!isBackendIdMissing
                      ? "Aktivno"
                      : "Nije implementirano / Rebuild Required"}
                  </span>
                </p>
                <p>
                  <span className="font-medium">Protokol:</span> HTTPS (TLS)
                </p>
              </div>
            </div>

            {/* Information Note */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-primary">Napomena</p>
                  <p className="text-muted-foreground">
                    Ove informacije prikazuju trenutnu implementaciju aplikacije
                    na Internet Computer blockchain mreži. Ako backend canister
                    ID prikazuje "N/A", potrebno je pokrenuti novi build
                    frontenda s ispravnom konfiguracijom. Koristite{" "}
                    <code className="bg-muted px-1 rounded text-xs">
                      ./frontend/deploy.sh
                    </code>{" "}
                    za automatski deployment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
