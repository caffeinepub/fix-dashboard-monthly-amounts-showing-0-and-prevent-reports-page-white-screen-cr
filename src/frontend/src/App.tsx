import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import AuthGuard from "@/components/AuthGuard";
import BackendCanisterIdGuard from "@/components/BackendCanisterIdGuard";
import CanisterMismatchRecoveryBanner from "@/components/CanisterMismatchRecoveryBanner";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import { useBackendWakeUp } from "@/hooks/useBackendWakeUp";
import { useConnectionMonitor } from "@/hooks/useConnectionMonitor";
import BusinessProfile from "@/pages/BusinessProfile";
import Dashboard from "@/pages/Dashboard";
import DataAnalysis from "@/pages/DataAnalysis";
import QuickIncome from "@/pages/QuickIncome";
import Reports from "@/pages/Reports";
import SupportReport from "@/pages/SupportReport";
import TextualInput from "@/pages/TextualInput";
import Transactions from "@/pages/Transactions";
import VoiceInput from "@/pages/VoiceInput";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (failureCount, error: any) => {
        if (
          error?.message?.includes("Unauthorized") ||
          error?.message?.includes("nauthorized")
        ) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    },
    mutations: {
      retry: false,
    },
  },
});

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

function Layout() {
  useConnectionMonitor();
  useBackendWakeUp();

  const navigate = useNavigate();
  const routerState = useRouterState();

  const getCurrentPage = (): Page => {
    const path = routerState.location.pathname;
    if (path === "/") return "dashboard";
    if (path === "/transactions") return "transactions";
    if (path === "/reports") return "reports";
    if (path === "/quick-income") return "quick-income";
    if (path === "/textual-input") return "textual-input";
    if (path === "/voice-input") return "voice-input";
    if (path === "/business-profile") return "business-profile";
    if (path === "/data-analysis") return "data-analysis";
    if (path === "/support-report") return "support-report";
    return "dashboard";
  };

  const handleNavigate = (page: Page) => {
    const routes: Record<Page, string> = {
      dashboard: "/",
      transactions: "/transactions",
      reports: "/reports",
      "quick-income": "/quick-income",
      "textual-input": "/textual-input",
      "voice-input": "/voice-input",
      "business-profile": "/business-profile",
      "data-analysis": "/data-analysis",
      "support-report": "/support-report",
    };
    navigate({ to: routes[page] });
  };

  return (
    <BackendCanisterIdGuard>
      <div className="flex min-h-screen flex-col">
        <Header currentPage={getCurrentPage()} onNavigate={handleNavigate} />
        <CanisterMismatchRecoveryBanner />
        <main className="flex-1">
          <AppErrorBoundary>
            <Outlet />
          </AppErrorBoundary>
        </main>
        <Footer />
      </div>
    </BackendCanisterIdGuard>
  );
}

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  ),
});

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions",
  component: () => (
    <AuthGuard>
      <Transactions />
    </AuthGuard>
  ),
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: () => (
    <AuthGuard>
      <Reports />
    </AuthGuard>
  ),
});

const quickIncomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/quick-income",
  component: () => (
    <AuthGuard>
      <QuickIncome />
    </AuthGuard>
  ),
});

const textualInputRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/textual-input",
  component: () => (
    <AuthGuard>
      <TextualInput />
    </AuthGuard>
  ),
});

const voiceInputRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/voice-input",
  component: () => (
    <AuthGuard>
      <VoiceInput />
    </AuthGuard>
  ),
});

const businessProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/business-profile",
  component: () => (
    <AuthGuard>
      <BusinessProfile />
    </AuthGuard>
  ),
});

const dataAnalysisRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data-analysis",
  component: () => (
    <AuthGuard>
      <DataAnalysis />
    </AuthGuard>
  ),
});

const supportReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/support-report",
  component: () => (
    <AuthGuard>
      <SupportReport />
    </AuthGuard>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  transactionsRoute,
  reportsRoute,
  quickIncomeRoute,
  textualInputRoute,
  voiceInputRoute,
  businessProfileRoute,
  dataAnalysisRoute,
  supportReportRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
