import type { BusinessProfile, UserProfile } from "@/backend";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BenchmarkPeriod,
  DfinityTechnicalAnalysis,
  DfinityTechnicalReport,
  ExportData,
  ExtendedBackendInterface,
  MonthlyIncomeInput,
  MonthlyReport,
  PerformanceAnalysis,
  Transaction,
  TransactionInput,
  YearlyReport,
} from "../types/backend-types";
import { useActor } from "./useActor";

// ─── Query Keys ────────────────────────────────────────────────────────────────
export const QUERY_KEYS = {
  allTransactions: ["transactions", "all"] as const,
  monthlyReport: (year: number, month: number) =>
    ["report", "monthly", year, month] as const,
  yearlyReport: (year: number) => ["report", "yearly", year] as const,
  userProfile: ["userProfile"] as const,
  businessProfile: ["businessProfile"] as const,
  readOnlyMode: ["readOnlyMode"] as const,
  currentUserProfile: ["currentUserProfile"] as const,
  allMonthlyIncomes: ["monthlyIncomes", "all"] as const,
};

// ─── Actor helper ──────────────────────────────────────────────────────────────
function useBackendActor() {
  const { actor, isFetching } = useActor();
  return {
    actor: actor as unknown as ExtendedBackendInterface | null,
    isFetching,
  };
}

// ─── Transactions ──────────────────────────────────────────────────────────────
export function useGetAllTransactions() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<Transaction[]>({
    queryKey: QUERY_KEYS.allTransactions,
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await actor.getAllTransactions();
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error("[useGetAllTransactions] Error:", err);
        throw err;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

// ─── Monthly Report ────────────────────────────────────────────────────────────
export function useGetMonthlyReport(year: number, month: number) {
  const { actor, isFetching } = useBackendActor();

  return useQuery<MonthlyReport | null>({
    queryKey: QUERY_KEYS.monthlyReport(year, month),
    queryFn: async () => {
      if (!actor) return null;
      try {
        // ExtendedBackendInterface: getMonthlyReport(month: bigint, year: bigint)
        const result = await actor.getMonthlyReport(
          BigInt(month),
          BigInt(year),
        );
        return result ?? null;
      } catch (err) {
        console.error("[useGetMonthlyReport] Error:", err);
        throw err;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

// ─── Yearly Report ─────────────────────────────────────────────────────────────
export function useGetYearlyReport(year: number) {
  const { actor, isFetching } = useBackendActor();

  return useQuery<YearlyReport | null>({
    queryKey: QUERY_KEYS.yearlyReport(year),
    queryFn: async () => {
      if (!actor) return null;
      try {
        const result = await actor.getYearlyReport(BigInt(year));
        return result ?? null;
      } catch (err) {
        console.error("[useGetYearlyReport] Error:", err);
        throw err;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

// ─── User Profile ──────────────────────────────────────────────────────────────
export function useGetCallerUserProfile() {
  const { isFetching: actorFetching } = useBackendActor();

  // Access user profile via the base actor (backendInterface has getCallerUserProfile)
  const { actor: baseActor } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: QUERY_KEYS.currentUserProfile,
    queryFn: async () => {
      if (!baseActor) throw new Error("Actor not available");
      return baseActor.getCallerUserProfile();
    },
    enabled: !!baseActor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!baseActor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor: baseActor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!baseActor) throw new Error("Actor not available");
      return baseActor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.currentUserProfile,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.userProfile });
    },
  });
}

// ─── Business Profile ──────────────────────────────────────────────────────────
export function useGetCallerBusinessProfile() {
  const { actor: baseActor, isFetching } = useActor();

  return useQuery<BusinessProfile | null>({
    queryKey: QUERY_KEYS.businessProfile,
    queryFn: async () => {
      if (!baseActor) return null;
      try {
        return await baseActor.getCallerBusinessProfile();
      } catch (err) {
        console.error("[useGetCallerBusinessProfile] Error:", err);
        throw err;
      }
    },
    enabled: !!baseActor && !isFetching,
    staleTime: 120_000,
  });
}

// Alias for backward compatibility
export const useGetBusinessProfile = useGetCallerBusinessProfile;

export function useSaveCallerBusinessProfile() {
  const { actor: baseActor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: BusinessProfile) => {
      if (!baseActor) throw new Error("Actor not available");
      return baseActor.saveBusinessProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.businessProfile });
    },
  });
}

// Alias for backward compatibility
export const useSaveBusinessProfile = useSaveCallerBusinessProfile;

// ─── Read-Only Mode ────────────────────────────────────────────────────────────
export function useGetReadOnlyMode() {
  const { actor: baseActor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: QUERY_KEYS.readOnlyMode,
    queryFn: async () => {
      if (!baseActor) return false;
      try {
        return await baseActor.hasCallerReadOnlyAccess();
      } catch {
        return false;
      }
    },
    enabled: !!baseActor && !isFetching,
    staleTime: 300_000,
  });
}

// Alias for backward compatibility
export const useCheckReadOnlyAccess = useGetReadOnlyMode;

// ─── Add Transaction ───────────────────────────────────────────────────────────
export function useAddTransaction() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addTransaction(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allTransactions });
      queryClient.invalidateQueries({ queryKey: ["report"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ─── Update Transaction ────────────────────────────────────────────────────────
export function useUpdateTransaction() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: { id: bigint; input: TransactionInput }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateTransaction(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allTransactions });
      queryClient.invalidateQueries({ queryKey: ["report"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ─── Delete Transaction ────────────────────────────────────────────────────────
export function useDeleteTransaction() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteTransaction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allTransactions });
      queryClient.invalidateQueries({ queryKey: ["report"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ─── Monthly Incomes ───────────────────────────────────────────────────────────
export function useGetAllMonthlyIncomes() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<MonthlyIncomeInput[]>({
    queryKey: QUERY_KEYS.allMonthlyIncomes,
    queryFn: async () => {
      if (!actor) return [];
      try {
        const result = await actor.getAllMonthlyIncomes();
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error("[useGetAllMonthlyIncomes] Error:", err);
        throw err;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

export function useAddMonthlyIncome() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MonthlyIncomeInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addMonthlyIncome(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allMonthlyIncomes });
      queryClient.invalidateQueries({ queryKey: ["report"] });
    },
  });
}

export function useUpdateMonthlyIncome() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MonthlyIncomeInput) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateMonthlyIncome(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allMonthlyIncomes });
      queryClient.invalidateQueries({ queryKey: ["report"] });
    },
  });
}

export function useDeleteMonthlyIncome() {
  const { actor } = useBackendActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ year, month }: { year: bigint; month: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteMonthlyIncome(year, month);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allMonthlyIncomes });
      queryClient.invalidateQueries({ queryKey: ["report"] });
    },
  });
}

// ─── Business Performance Analysis ────────────────────────────────────────────
export function useGetBusinessPerformanceAnalysis(
  period: BenchmarkPeriod | null,
) {
  const { actor, isFetching } = useBackendActor();

  return useQuery<PerformanceAnalysis | null>({
    queryKey: ["businessPerformanceAnalysis", JSON.stringify(period)],
    queryFn: async () => {
      if (!actor || !period) return null;
      try {
        return await actor.getBusinessPerformanceAnalysis(period);
      } catch (err) {
        console.error("[useGetBusinessPerformanceAnalysis] Error:", err);
        return null;
      }
    },
    enabled: !!actor && !isFetching && period !== null,
    staleTime: 120_000,
  });
}

// ─── Year Comparison ───────────────────────────────────────────────────────────
export function useGetYearComparison(years: number[]) {
  const { actor, isFetching } = useBackendActor();
  const sortedYears = [...years].sort((a, b) => b - a);

  return useQuery({
    queryKey: ["yearComparison", sortedYears.join(",")],
    queryFn: async () => {
      if (!actor || years.length === 0) return [];
      try {
        // getYearComparison takes bigint[] per ExtendedBackendInterface
        return await actor.getYearComparison(years.map((y) => BigInt(y)));
      } catch (err) {
        console.error("[useGetYearComparison] Error:", err);
        return [];
      }
    },
    enabled: !!actor && !isFetching && years.length > 0,
    staleTime: 120_000,
  });
}

// ─── Simulation ────────────────────────────────────────────────────────────────
export function useRunSimulation() {
  const { actor } = useBackendActor();

  return useMutation({
    mutationFn: async (input: {
      incomeGrowthPercentage: number;
      expenseGrowthPercentage: number;
    }) => {
      if (!actor) throw new Error("Actor not available");
      // runSimulation takes two separate number args per ExtendedBackendInterface
      return actor.runSimulation(
        input.incomeGrowthPercentage,
        input.expenseGrowthPercentage,
      );
    },
  });
}

// ─── Export Data (mutation) ────────────────────────────────────────────────────
export function useExportData() {
  const { actor } = useBackendActor();

  return useMutation<ExportData>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.exportData();
    },
  });
}

// ─── Export Data (query) ───────────────────────────────────────────────────────
export function useGetExportData() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<ExportData | null>({
    queryKey: ["exportData"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.exportData();
      } catch (err) {
        console.error("[useGetExportData] Error:", err);
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// ─── DFINITY Technical Report ──────────────────────────────────────────────────
export function useGetDfinityTechnicalReport() {
  const { actor } = useBackendActor();

  return useMutation<DfinityTechnicalReport>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getDfinityTechnicalReport();
    },
  });
}

// ─── DFINITY Technical Analysis ────────────────────────────────────────────────
export function useGetDfinityTechnicalAnalysis() {
  const { actor } = useBackendActor();

  return useMutation<DfinityTechnicalAnalysis>({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not available");
      return actor.getDfinityTechnicalAnalysis();
    },
  });
}

// ─── PDF Financial Report Data ─────────────────────────────────────────────────
export function useGetPdfFinancialReportDataByYear() {
  const { actor } = useBackendActor();

  return useMutation({
    mutationFn: async (year: bigint | null) => {
      if (!actor) throw new Error("Actor not available");
      return actor.getPdfFinancialReportData(year);
    },
  });
}

// ─── Predictive Analysis ───────────────────────────────────────────────────────
export function useGetPredictiveAnalysis() {
  const { actor, isFetching } = useBackendActor();

  return useQuery({
    queryKey: ["predictiveAnalysis"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getPredictiveAnalysis();
      } catch (err) {
        console.error("[useGetPredictiveAnalysis] Error:", err);
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 120_000,
  });
}

// ─── Expense Share by Category ─────────────────────────────────────────────────
export function useGetExpenseShareByCategory(
  startDate: bigint,
  endDate: bigint,
) {
  const { actor, isFetching } = useBackendActor();

  return useQuery({
    queryKey: ["expenseShare", startDate.toString(), endDate.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getExpenseShareByCategory(startDate, endDate);
      } catch (err) {
        console.error("[useGetExpenseShareByCategory] Error:", err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// ─── Monthly Income Expense by Year ───────────────────────────────────────────
export function useGetMonthlyIncomeExpenseByYear(year: number) {
  const { actor, isFetching } = useBackendActor();

  return useQuery({
    queryKey: ["monthlyIncomeExpense", year],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return await actor.getMonthlyIncomeExpenseByYear(BigInt(year));
      } catch (err) {
        console.error("[useGetMonthlyIncomeExpenseByYear] Error:", err);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

// ─── Current Time ──────────────────────────────────────────────────────────────
export function useGetCurrentTime() {
  const { actor, isFetching } = useBackendActor();

  return useQuery<bigint | null>({
    queryKey: ["currentTime"],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getCurrentTime();
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching,
    staleTime: 10_000,
  });
}
