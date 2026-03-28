import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useReadOnlyMode } from "@/hooks/useReadOnlyMode";
import { AlertCircle } from "lucide-react";

export function ReadOnlyBanner() {
  const { isReadOnly } = useReadOnlyMode();

  if (!isReadOnly) return null;

  return (
    <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertTitle className="text-yellow-900 dark:text-yellow-100">
        Način samo za čitanje
      </AlertTitle>
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        Pristupate produkcijskim podacima u načinu samo za čitanje. Sve funkcije
        pregleda i analize su dostupne, ali izmjene podataka nisu moguće.
      </AlertDescription>
    </Alert>
  );
}
