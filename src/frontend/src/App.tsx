import AuthGuard from "@/components/AuthGuard";
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
import TextualInput from "@/pages/TextualInput";
import Transactions from "@/pages/Transactions";
import VoiceInput from "@/pages/VoiceInput";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";

type Page =
  | "dashboard"
  | "transactions"
  | "reports"
  | "quick-income"
  | "data-analysis"
  | "textual-input"
  | "voice-input"
  | "business-profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center text-red-500">
          Greška pri učitavanju stranice. Osvježite stranicu.
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  useConnectionMonitor();
  useBackendWakeUp();

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <ErrorBoundary>
            <Dashboard />
          </ErrorBoundary>
        );
      case "transactions":
        return <Transactions />;
      case "reports":
        return (
          <ErrorBoundary>
            <Reports />
          </ErrorBoundary>
        );
      case "quick-income":
        return <QuickIncome />;
      case "textual-input":
        return <TextualInput />;
      case "voice-input":
        return <VoiceInput />;
      case "business-profile":
        return <BusinessProfile />;
      case "data-analysis":
        return <DataAnalysis />;
      default:
        return (
          <ErrorBoundary>
            <Dashboard />
          </ErrorBoundary>
        );
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col">
        <Header currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1">
          <AuthGuard>{renderPage()}</AuthGuard>
        </main>
        <Footer />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;
