import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Dashboard from '@/pages/Dashboard';
import Transactions from '@/pages/Transactions';
import Reports from '@/pages/Reports';
import QuickIncome from '@/pages/QuickIncome';
import TextualInput from '@/pages/TextualInput';
import VoiceInput from '@/pages/VoiceInput';
import BusinessProfile from '@/pages/BusinessProfile';
import DataAnalysis from '@/pages/DataAnalysis';
import AuthGuard from '@/components/AuthGuard';
import { useConnectionMonitor } from '@/hooks/useConnectionMonitor';
import { useBackendWakeUp } from '@/hooks/useBackendWakeUp';

type Page =
  | 'dashboard'
  | 'transactions'
  | 'reports'
  | 'quick-income'
  | 'data-analysis'
  | 'textual-input'
  | 'voice-input'
  | 'business-profile';

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

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  useConnectionMonitor();
  useBackendWakeUp();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'transactions':
        return <Transactions />;
      case 'reports':
        return <Reports />;
      case 'quick-income':
        return <QuickIncome />;
      case 'textual-input':
        return <TextualInput />;
      case 'voice-input':
        return <VoiceInput />;
      case 'business-profile':
        return <BusinessProfile />;
      case 'data-analysis':
        return <DataAnalysis />;
      default:
        return <Dashboard />;
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
