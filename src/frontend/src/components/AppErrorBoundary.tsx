import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { useResync } from "@/hooks/useResync";
import { AlertCircle, Info, RefreshCw, RotateCcw } from "lucide-react";
import type React from "react";
import { Component, type ReactNode } from "react";
import DeploymentInfoDialog from "./DeploymentInfoDialog";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundaryClass extends Component<
  Props & { onReset: () => void; onResync: () => void; isResyncing: boolean },
  State
> {
  constructor(
    props: Props & {
      onReset: () => void;
      onResync: () => void;
      isResyncing: boolean;
    },
  ) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error boundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Nepoznata greška";

      // Check if error is related to backend canister ID or actor issues
      const isCanisterIdIssue =
        errorMessage.includes("canister") ||
        errorMessage.includes("Canister") ||
        errorMessage.includes("Actor") ||
        errorMessage.includes("actor") ||
        errorMessage.includes("backend") ||
        errorMessage.includes("Backend");

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-2xl w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <div>
                  <CardTitle className="text-2xl">
                    Nešto je pošlo po zlu
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Došlo je do neočekivane greške pri prikazivanju stranice
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Detalji greške:</p>
                <p className="text-sm text-muted-foreground font-mono break-all">
                  {errorMessage}
                </p>
              </div>

              {isCanisterIdIssue && (
                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
                  <div className="flex gap-2">
                    <Info className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p className="font-medium text-orange-900 dark:text-orange-100">
                        Moguća neusklađenost Backend Canister ID-a
                      </p>
                      <p className="text-orange-800 dark:text-orange-200">
                        Ova greška može biti uzrokovana starim ili nevažećim
                        backend canister ID-om. Pokušajte resinkronizaciju ili
                        provjerite je li backend canister ID ažuran u
                        konfiguraciji.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => {
                    this.setState({
                      hasError: false,
                      error: null,
                      errorInfo: null,
                    });
                    this.props.onReset();
                  }}
                  className="flex-1"
                  variant="default"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Osvježi stranicu
                </Button>
                <Button
                  onClick={() => {
                    this.setState({
                      hasError: false,
                      error: null,
                      errorInfo: null,
                    });
                    this.props.onResync();
                  }}
                  className="flex-1"
                  variant="outline"
                  disabled={this.props.isResyncing}
                >
                  <RotateCcw
                    className={`h-4 w-4 mr-2 ${this.props.isResyncing ? "animate-spin" : ""}`}
                  />
                  {this.props.isResyncing
                    ? "Resinkronizacija..."
                    : "Resinkroniziraj podatke"}
                </Button>
              </div>

              {isCanisterIdIssue && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Info className="h-4 w-4 mr-2" />
                      Prikaži Backend Canister ID
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[650px]">
                    <DeploymentInfoDialog />
                  </DialogContent>
                </Dialog>
              )}

              <p className="text-xs text-muted-foreground text-center">
                Ako problem i dalje postoji, pokušajte osvježiti cijelu stranicu
                (F5) ili se odjaviti i ponovno prijaviti.
                {isCanisterIdIssue &&
                  " Provjerite je li backend canister ID ažuran u env.json datoteci."}
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: Props) {
  const { resync, isResyncing } = useResync();

  const handleReset = () => {
    window.location.reload();
  };

  const handleResync = () => {
    resync();
  };

  return (
    <ErrorBoundaryClass
      onReset={handleReset}
      onResync={handleResync}
      isResyncing={isResyncing}
    >
      {children}
    </ErrorBoundaryClass>
  );
}
