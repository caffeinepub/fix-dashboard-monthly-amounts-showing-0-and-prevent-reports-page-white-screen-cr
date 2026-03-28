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
import { Check, Copy, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DeploymentInfoDialog() {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Get canister IDs from environment
  const frontendCanisterId = import.meta.env.VITE_CANISTER_ID_FRONTEND || "N/A";
  const backendCanisterId = import.meta.env.VITE_CANISTER_ID_BACKEND || "N/A";

  // Generate public URLs
  const frontendPublicUrl =
    frontendCanisterId !== "N/A"
      ? `https://${frontendCanisterId}.icp0.io`
      : "N/A";

  const backendPublicUrl =
    backendCanisterId !== "N/A"
      ? `https://${backendCanisterId}.icp0.io`
      : "N/A";

  const handleCopy = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      toast.success(`${fieldName} kopiran u međuspremnik`);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (_error) {
      toast.error("Greška pri kopiranju");
    }
  };

  return (
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
          {/* Frontend Section */}
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-bold text-primary">
              Frontend Canister
            </h3>

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
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    handleCopy(frontendCanisterId, "Frontend Canister ID")
                  }
                  disabled={frontendCanisterId === "N/A"}
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
            <h3 className="text-sm font-bold text-primary">Backend Canister</h3>

            {/* Backend Canister ID */}
            <div className="space-y-2">
              <Label htmlFor="backend-id" className="text-sm font-semibold">
                Backend Canister ID
              </Label>
              <div className="flex gap-2">
                <Input
                  id="backend-id"
                  value={backendCanisterId}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    handleCopy(backendCanisterId, "Backend Canister ID")
                  }
                  disabled={backendCanisterId === "N/A"}
                >
                  {copiedField === "Backend Canister ID" ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
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
                  className={`font-medium ${frontendCanisterId !== "N/A" ? "text-green-600" : "text-orange-600"}`}
                >
                  {frontendCanisterId !== "N/A"
                    ? "Aktivno"
                    : "Nije implementirano"}
                </span>
              </p>
              <p>
                <span className="font-medium">Backend status:</span>{" "}
                <span
                  className={`font-medium ${backendCanisterId !== "N/A" ? "text-green-600" : "text-orange-600"}`}
                >
                  {backendCanisterId !== "N/A"
                    ? "Aktivno"
                    : "Nije implementirano"}
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
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-primary">Napomena</p>
                <p className="text-muted-foreground">
                  Ove informacije prikazuju trenutnu implementaciju aplikacije
                  na Internet Computer blockchain mreži. Frontend javni URL
                  omogućava pristup aplikaciji s bilo kojeg uređaja putem
                  sigurne HTTPS veze. Backend javni URL omogućava direktan
                  pristup API-ju za napredne integracije.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
