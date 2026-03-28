import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useExportData } from "@/hooks/useQueries";
import { useResync } from "@/hooks/useResync";
import {
  exportExternalDfinitySupportPDF,
  exportInternalTechnicalDocumentationPDF,
  exportToCSV,
} from "@/lib/export-utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileCode,
  FileDown,
  Menu,
  Mic,
  RefreshCw,
  User,
} from "lucide-react";
import { toast } from "sonner";
import DeploymentInfoDialog from "./DeploymentInfoDialog";

type Page =
  | "dashboard"
  | "transactions"
  | "reports"
  | "quick-income"
  | "data-analysis"
  | "textual-input"
  | "voice-input"
  | "business-profile"
  | "support-report";

interface HeaderProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { resync, isResyncing } = useResync();
  const exportDataMutation = useExportData();

  const isAuthenticated = !!identity;
  const disabled = loginStatus === "logging-in";
  const text =
    loginStatus === "logging-in"
      ? "Prijava..."
      : isAuthenticated
        ? "Odjava"
        : "Prijava";

  const handleAuth = async () => {
    if (isAuthenticated) {
      await clear();
      queryClient.clear();
    } else {
      try {
        await login();
      } catch (error: any) {
        console.error("Login error:", error);
        if (error.message === "User is already authenticated") {
          await clear();
          setTimeout(() => login(), 300);
        }
      }
    }
  };

  const handleExportJSON = async () => {
    try {
      const data = await exportDataMutation.mutateAsync();
      const jsonString = JSON.stringify(
        data,
        (_key, value) => (typeof value === "bigint" ? value.toString() : value),
        2,
      );
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "data.json";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Podaci uspješno izvezeni u JSON formatu");
    } catch {
      toast.error("Greška pri izvozu podataka");
    }
  };

  const handleExportCSV = async () => {
    try {
      const data = await exportDataMutation.mutateAsync();
      const csvString = exportToCSV(data);
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "data.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Podaci uspješno izvezeni u CSV formatu");
    } catch {
      toast.error("Greška pri izvozu podataka");
    }
  };

  const handleExportInternalDocumentation = async () => {
    try {
      await exportInternalTechnicalDocumentationPDF();
      toast.success("Interni tehnički izvještaj uspješno generiran");
    } catch {
      toast.error("Greška pri generiranju internog tehničkog izvještaja");
    }
  };

  const handleExportExternalSupport = async () => {
    try {
      await exportExternalDfinitySupportPDF();
      toast.success("Vanjski izvještaj za DFINITY Support uspješno generiran");
    } catch {
      toast.error(
        "Greška pri generiranju vanjskog izvještaja za DFINITY Support",
      );
    }
  };

  const navItems = [
    { id: "dashboard" as Page, label: "Nadzorna ploča" },
    { id: "transactions" as Page, label: "Transakcije" },
    { id: "reports" as Page, label: "Izvještaji" },
    { id: "quick-income" as Page, label: "Brzi unos prihoda" },
    { id: "textual-input" as Page, label: "Tekstualni unos" },
    { id: "voice-input" as Page, label: "Glasovni unos" },
    { id: "business-profile" as Page, label: "Poslovni profil" },
    { id: "data-analysis" as Page, label: "Analiza podataka" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/restaurant-finance-icon-transparent.dim_64x64.png"
            alt="Restaurant Finance"
            className="h-10 w-10 sm:h-12 sm:w-12"
          />
          <div className="flex flex-col">
            <h1 className="text-base font-bold text-primary sm:text-xl">
              Financije restorana
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Praćenje prihoda i rashoda
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={currentPage === item.id ? "default" : "ghost"}
              onClick={() => onNavigate(item.id)}
              className="text-sm"
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Resync Button */}
          {isAuthenticated && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={resync}
                    disabled={isResyncing}
                    className="hidden sm:flex"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isResyncing ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Resinkroniziraj podatke s backendom</p>
                  <p className="text-xs text-muted-foreground">
                    Koristi ako podaci nisu ažurirani
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* User Menu */}
          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="hidden sm:flex"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Izvoz podataka</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleExportJSON}
                  disabled={exportDataMutation.isPending}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Izvezi podatke (JSON)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportCSV}
                  disabled={exportDataMutation.isPending}
                >
                  <FileDown className="mr-2 h-4 w-4" />
                  Izvezi podatke (CSV)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={resync} disabled={isResyncing}>
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isResyncing ? "animate-spin" : ""}`}
                  />
                  Resinkroniziraj
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Tehnički izvještaji</DropdownMenuLabel>
                <DropdownMenuItem onClick={handleExportInternalDocumentation}>
                  <FileCode className="mr-2 h-4 w-4" />
                  Interni tehnički izvještaj
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportExternalSupport}>
                  <Mic className="mr-2 h-4 w-4" />
                  Vanjski izvještaj za DFINITY Support
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate("support-report")}>
                  <AlertTriangle className="mr-2 h-4 w-4 text-destructive" />
                  <span className="text-destructive font-medium">
                    Caffeine Support Izvještaj
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Informacije</DropdownMenuLabel>
                <DeploymentInfoDialog />
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Auth Button */}
          <Button
            onClick={handleAuth}
            disabled={disabled}
            variant={isAuthenticated ? "outline" : "default"}
            className="hidden sm:inline-flex"
          >
            {text}
          </Button>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-4 py-4">
                <div className="flex flex-col gap-2 border-b pb-4">
                  <h2 className="text-lg font-semibold">Navigacija</h2>
                </div>

                {/* Mobile Navigation Items */}
                <div className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={currentPage === item.id ? "default" : "ghost"}
                      onClick={() => onNavigate(item.id)}
                      className="w-full justify-start text-base"
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>

                {/* Mobile Actions */}
                {isAuthenticated && (
                  <>
                    <div className="flex flex-col gap-2 border-t pt-4">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Alati
                      </h3>
                      <Button
                        variant="outline"
                        onClick={resync}
                        disabled={isResyncing}
                        className="w-full justify-start"
                      >
                        <RefreshCw
                          className={`mr-2 h-4 w-4 ${isResyncing ? "animate-spin" : ""}`}
                        />
                        Resinkroniziraj
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2 border-t pt-4">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Izvoz podataka
                      </h3>
                      <Button
                        variant="outline"
                        onClick={handleExportJSON}
                        disabled={exportDataMutation.isPending}
                        className="w-full justify-start"
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Izvezi podatke (JSON)
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleExportCSV}
                        disabled={exportDataMutation.isPending}
                        className="w-full justify-start"
                      >
                        <FileDown className="mr-2 h-4 w-4" />
                        Izvezi podatke (CSV)
                      </Button>
                    </div>

                    <div className="flex flex-col gap-2 border-t pt-4">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Tehnički izvještaji
                      </h3>
                      <Button
                        variant="outline"
                        onClick={handleExportInternalDocumentation}
                        className="w-full justify-start"
                      >
                        <FileCode className="mr-2 h-4 w-4" />
                        Interni tehnički izvještaj
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleExportExternalSupport}
                        className="w-full justify-start"
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Vanjski izvještaj za DFINITY Support
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => onNavigate("support-report")}
                        className="w-full justify-start"
                      >
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Caffeine Support Izvještaj
                      </Button>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-2 border-t pt-4">
                  <Button
                    onClick={handleAuth}
                    disabled={disabled}
                    variant={isAuthenticated ? "outline" : "default"}
                    className="w-full"
                  >
                    {text}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
