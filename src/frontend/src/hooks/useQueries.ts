import {
  type BenchmarkPeriod,
  type BusinessProfile,
  type ExpenseShare,
  type MonthlyIncomeInput,
  type PerformanceAnalysis,
  type Projection,
  SimulationResult,
  type Transaction,
  type TransactionInput,
  type UserProfile,
} from "@/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useActor } from "./useActor";
import { useReadOnlyMode } from "./useReadOnlyMode";

// Enhanced query configuration with improved error handling and resync support
const queryConfig = {
  retry: (failureCount: number, error: any) => {
    // Don't retry on authorization errors
    if (
      error?.message?.includes("Unauthorized") ||
      error?.message?.includes("nauthorized")
    ) {
      return false;
    }
    // Retry up to 2 times for other errors
    return failureCount < 2;
  },
  retryDelay: (attemptIndex: number) =>
    Math.min(1000 * 2 ** attemptIndex, 3000),
  staleTime: 30000, // Data is fresh for 30 seconds
  gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
  refetchOnWindowFocus: false,
  refetchOnReconnect: true, // Critical for resync after backend changes
  refetchOnMount: true,
};

// Read-Only Mode Query
export function useCheckReadOnlyAccess() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ["readOnlyAccess"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasCallerReadOnlyAccess();
    },
    enabled: !!actor && !isFetching,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

// User Profile Queries
export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ["currentUserProfile"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUserProfile"] });
    },
  });
}

// Business Profile Queries
export function useGetBusinessProfile() {
  const { actor, isFetching } = useActor();

  return useQuery<BusinessProfile | null>({
    queryKey: ["businessProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerBusinessProfile();
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

export function useSaveBusinessProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async (profile: BusinessProfile) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      return actor.saveBusinessProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["businessProfile"] });
      queryClient.invalidateQueries({ queryKey: ["predictive-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["business-performance"] });
    },
  });
}

// Transaction Queries
export function useGetAllTransactions() {
  const { actor, isFetching } = useActor();

  return useQuery<Transaction[]>({
    queryKey: ["transactions", "all"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTransactions();
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

export function useGetRecentTransactions() {
  const { actor, isFetching } = useActor();

  return useQuery<Transaction[]>({
    queryKey: ["transactions", "recent"],
    queryFn: async () => {
      if (!actor) return [];
      const all = await actor.getAllTransactions();
      return all.slice(-10).reverse();
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

// Financial Overview Queries
export function useGetCurrentMonthOverview() {
  const { actor, isFetching } = useActor();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return useQuery({
    queryKey: ["overview", "monthly", year, month],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMonthlyOverview(BigInt(month), BigInt(year));
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

export function useGetCurrentMonthReport() {
  const { actor, isFetching } = useActor();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  return useQuery({
    queryKey: ["report", "monthly", year, month],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMonthlyReport(BigInt(month), BigInt(year));
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

export function useGetMonthlyReport(month: number, year: number) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["report", "monthly", year, month],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMonthlyReport(BigInt(month), BigInt(year));
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

export function useGetYearlyReport(year: number) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["report", "yearly", year],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getYearlyReport(BigInt(year));
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

export function useGetMonthlyIncomeExpenseByYear(year: number) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["report", "monthly-income-expense", year],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMonthlyIncomeExpenseByYear(BigInt(year));
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

export function useGetYearComparison(years: number[]) {
  const { actor, isFetching } = useActor();
  const sortedYears = years.sort((a, b) => b - a);

  return useQuery({
    queryKey: ["report", "year-comparison", sortedYears.join(",")],
    queryFn: async () => {
      if (!actor || years.length === 0) return [];
      const bigIntYears = years.map((y) => BigInt(y));
      return actor.getYearComparison(bigIntYears);
    },
    enabled: !!actor && !isFetching && years.length > 0,
    ...queryConfig,
  });
}

export function useGetExpenseShareByCategory(
  startDate: bigint,
  endDate: bigint,
) {
  const { actor, isFetching } = useActor();

  return useQuery<ExpenseShare[]>({
    queryKey: ["expense-share", startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getExpenseShareByCategory(startDate, endDate);
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

// Monthly Income Queries
export function useGetAllMonthlyIncomes() {
  const { actor, isFetching } = useActor();

  return useQuery<MonthlyIncomeInput[]>({
    queryKey: ["monthly-incomes", "all"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMonthlyIncomes();
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

// Predictive Analysis Queries
export function useGetPredictiveAnalysis() {
  const { actor, isFetching } = useActor();

  return useQuery<{
    projections: Projection[];
    historicalData: [bigint, bigint, bigint, bigint][];
  }>({
    queryKey: ["predictive-analysis"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPredictiveAnalysis();
    },
    enabled: !!actor && !isFetching,
    ...queryConfig,
  });
}

export function useRunSimulation() {
  const { actor } = useActor();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async ({
      incomeGrowthPercentage,
      expenseGrowthPercentage,
    }: {
      incomeGrowthPercentage: number;
      expenseGrowthPercentage: number;
    }) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      return actor.runSimulation(
        incomeGrowthPercentage,
        expenseGrowthPercentage,
      );
    },
    retry: 1,
    retryDelay: 1000,
  });
}

// Business Performance Analysis Query
export function useGetBusinessPerformanceAnalysis(
  period: "monthly" | "yearly" | "cumulative",
  month?: number,
  year?: number,
) {
  const { actor, isFetching } = useActor();

  // Build BenchmarkPeriod based on period type
  const benchmarkPeriod: BenchmarkPeriod | null = (() => {
    if (period === "cumulative") {
      return { __kind__: "cumulative", cumulative: null };
    }
    if (period === "monthly" && month !== undefined && year !== undefined) {
      return {
        __kind__: "monthly",
        monthly: { month: BigInt(month), year: BigInt(year) },
      };
    }
    if (period === "yearly" && year !== undefined) {
      return {
        __kind__: "yearly",
        yearly: { year: BigInt(year) },
      };
    }
    return null;
  })();

  return useQuery<PerformanceAnalysis>({
    queryKey: ["business-performance", period, month, year],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not available");
      if (!benchmarkPeriod) throw new Error("Invalid period parameters");

      console.log("[Benchmarking] Fetching analysis for period:", {
        period,
        month,
        year,
        benchmarkPeriod,
      });

      const result =
        await actor.getBusinessPerformanceAnalysis(benchmarkPeriod);

      console.log("[Benchmarking] Analysis result:", {
        hasData: !!result,
        userIncome: result?.userIncome?.toString(),
        userExpenses: result?.userExpenses?.toString(),
        diagnosticInfo: result?.diagnosticInfo,
      });

      return result;
    },
    enabled: !!actor && !isFetching && benchmarkPeriod !== null,
    ...queryConfig,
  });
}

// Export Queries
export function useExportData() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.exportData();
    },
    retry: 1,
    retryDelay: 1000,
  });
}

export function useGetPdfFinancialReportDataByYear() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (year: bigint | null) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getPdfFinancialReportData(year);
    },
    retry: 1,
    retryDelay: 1000,
  });
}

// DFINITY Technical Report Query
export function useGetDfinityTechnicalReport() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getDfinityTechnicalReport();
    },
    retry: 1,
    retryDelay: 1000,
  });
}

// DFINITY Technical Analysis Query
export function useGetDfinityTechnicalAnalysis() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getDfinityTechnicalAnalysis();
    },
    retry: 1,
    retryDelay: 1000,
  });
}

// DFINITY Voice Command Issue Report Query
export function useGetDfinityVoiceCommandIssueReport() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getDfinityVoiceCommandIssueReport();
    },
    retry: 1,
    retryDelay: 1000,
  });
}

/**
 * Centralized query invalidation
 * Invalidates all financial data queries to ensure fresh data after mutations
 * Enhanced to support full resynchronization scenarios
 */
function invalidateFinancialQueries(queryClient: any) {
  queryClient.invalidateQueries({ queryKey: ["overview"] });
  queryClient.invalidateQueries({ queryKey: ["report"] });
  queryClient.invalidateQueries({ queryKey: ["report", "yearly"] });
  queryClient.invalidateQueries({ queryKey: ["report", "monthly"] });
  queryClient.invalidateQueries({ queryKey: ["transactions"] });
  queryClient.invalidateQueries({ queryKey: ["expense-share"] });
  queryClient.invalidateQueries({ queryKey: ["monthly-incomes"] });
  queryClient.invalidateQueries({ queryKey: ["predictive-analysis"] });
  queryClient.invalidateQueries({ queryKey: ["business-performance"] });
}

// Transaction Mutations
export function useAddTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      return actor.addTransaction(input);
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Transaction added");
    },
    onError: (error: any) => {
      toast.error("Error adding transaction", {
        description: error?.message || "Please try again",
      });
    },
  });
}

export function useUpdateTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: bigint; input: TransactionInput }) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateTransaction(id, input);
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Transaction updated");
    },
    onError: (error: any) => {
      toast.error("Error updating transaction", {
        description: error?.message || "Please try again",
      });
    },
  });
}

export function useDeleteTransaction() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteTransaction(id);
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Transaction deleted");
    },
    onError: (error: any) => {
      toast.error("Error deleting transaction", {
        description: error?.message || "Please try again",
      });
    },
  });
}

// Monthly Income Mutations
export function useAddMonthlyIncome() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async (input: MonthlyIncomeInput) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      await actor.addMonthlyIncome(input);
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Monthly income added");
    },
    onError: (error: any) => {
      toast.error("Error adding monthly income", {
        description: error?.message || "Please try again",
      });
    },
  });
}

export function useUpdateMonthlyIncome() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async (input: MonthlyIncomeInput) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateMonthlyIncome(input);
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Monthly income updated");
    },
    onError: (error: any) => {
      toast.error("Error updating monthly income", {
        description: error?.message || "Please try again",
      });
    },
  });
}

export function useDeleteMonthlyIncome() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  const { isReadOnly } = useReadOnlyMode();

  return useMutation({
    mutationFn: async ({ year, month }: { year: bigint; month: bigint }) => {
      if (isReadOnly) {
        throw new Error(
          "Operacija nije dostupna u na\u010dinu samo za \u010ditanje",
        );
      }
      if (!actor) throw new Error("Actor not initialized");
      await actor.deleteMonthlyIncome(year, month);
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
      toast.success("Monthly income deleted");
    },
    onError: (error: any) => {
      toast.error("Error deleting monthly income", {
        description: error?.message || "Please try again",
      });
    },
  });
}

export function useMigrateMonthlyIncomes() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<bigint> => {
      if (!actor) throw new Error("Actor not initialized");
      // Cast to any because backend.d.ts may not yet include migration functions
      return await (actor as any).migrateMonthlyIncomesToTransactions();
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
    },
    onError: (error: any) => {
      toast.error("Gre\u0161ka pri migraciji", {
        description: error?.message || "Poku\u0161ajte ponovo",
      });
    },
  });
}

export function useClearMigratedMonthlyIncomes() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      // Cast to any because backend.d.ts may not yet include migration functions
      await (actor as any).clearMigratedMonthlyIncomes();
    },
    onSuccess: () => {
      invalidateFinancialQueries(queryClient);
    },
    onError: (error: any) => {
      toast.error("Gre\u0161ka pri \u010di\u0161\u0107enju starih podataka", {
        description: error?.message || "Poku\u0161ajte ponovo",
      });
    },
  });
}
