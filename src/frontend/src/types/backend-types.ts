// Local type definitions for backend types that are not yet exported in the generated interface
// These types match the Motoko backend implementation

export enum TransactionType {
  prihod = "prihod",
  rashod = "rashod",
}

export enum ExpenseCategory {
  namirnice = "namirnice",
  place = "place",
  rezije = "rezije",
  oprema = "oprema",
  pice = "pice",
  napojnica = "napojnica",
  ostalo = "ostalo",
}

export enum PaymentMethod {
  gotovina = "gotovina",
  kartica = "kartica",
}

export interface Transaction {
  id: bigint;
  amount: bigint;
  transactionType: TransactionType;
  expenseCategory: ExpenseCategory | null;
  paymentMethod: PaymentMethod | null;
  date: bigint;
  description: string;
}

export interface TransactionInput {
  amount: bigint;
  transactionType: TransactionType;
  expenseCategory: ExpenseCategory | null;
  paymentMethod: PaymentMethod | null;
  date: bigint;
  description: string;
}

export interface MonthlyIncomeInput {
  year: bigint;
  month: bigint;
  amount: bigint;
}

export interface FinancialOverview {
  totalIncome: bigint;
  totalExpenses: bigint;
  profit: bigint;
}

export interface CategorySummary {
  category: string;
  total: bigint;
}

export interface PaymentMethodSummary {
  paymentMethod: string;
  total: bigint;
}

export interface MonthlyReport {
  month: bigint;
  year: bigint;
  overview: FinancialOverview;
  expensesByCategory: CategorySummary[];
  incomeByPaymentMethod: PaymentMethodSummary[];
}

export interface YearlyReport {
  year: bigint;
  monthlyOverviews: FinancialOverview[];
  totalOverview: FinancialOverview;
  incomeByPaymentMethod: PaymentMethodSummary[];
}

export interface MonthlyIncomeExpense {
  month: bigint;
  year: bigint;
  totalIncome: bigint;
  totalExpenses: bigint;
}

export interface YearComparison {
  year: bigint;
  monthlyData: MonthlyIncomeExpense[];
  totalIncome: bigint;
  totalExpenses: bigint;
}

export interface ExpenseShare {
  category: string;
  total: bigint;
  share: number;
}

export interface Projection {
  month: bigint;
  year: bigint;
  projectedIncome: bigint;
  projectedExpenses: bigint;
  projectedProfit: bigint;
}

export interface SimulationResult {
  projections: Projection[];
  totalProjectedIncome: bigint;
  totalProjectedExpenses: bigint;
  totalProjectedProfit: bigint;
}

export type BenchmarkPeriod =
  | { __kind__: "monthly"; monthly: { month: bigint; year: bigint } }
  | { __kind__: "yearly"; yearly: { year: bigint } }
  | { __kind__: "cumulative"; cumulative: null };

export interface PerformanceDeviation {
  category: string;
  userValue: bigint;
  industryAverage: bigint;
  deviationPercentage: number;
  status:
    | { __kind__: "aboveAverage" }
    | { __kind__: "belowAverage" }
    | { __kind__: "withinNormalRange" };
}

export interface IndustryBenchmark {
  averageIncome: bigint;
  averageExpenses: bigint;
  averageProfitMargin: number;
  expenseCategoryAverages: [string, bigint][];
  revenuePerSeat: bigint | null;
}

export interface PerformanceAnalysis {
  period: BenchmarkPeriod;
  userIncome: bigint;
  userExpenses: bigint;
  userProfit: bigint;
  industryBenchmark: IndustryBenchmark;
  incomeDeviation: PerformanceDeviation;
  expenseDeviations: PerformanceDeviation[];
  profitMarginDeviation: PerformanceDeviation;
  recommendations: string[];
  diagnosticInfo: string | null;
}

export interface ExportData {
  transactions: Transaction[];
  monthlyIncomes: MonthlyIncomeInput[];
  businessProfile: any;
}

export interface PdfReportData {
  overview: FinancialOverview;
  transactions: Transaction[];
  monthlyIncomes: MonthlyIncomeInput[];
  expensesByCategory: CategorySummary[];
  incomeByPaymentMethod: PaymentMethodSummary[];
  businessProfile: any;
}

export interface DfinityTechnicalReport {
  title: string;
  summary: string;
  synchronizationImprovements: string;
  consistencyVerification: string;
  dateBoundaryHandling: string;
  decimalPrecision: string;
  finalVerification: string;
  confirmation: string;
}

export interface DfinityTechnicalAnalysis {
  title: string;
  executiveSummary: string;
  issueDescription: string;
  technicalAnalysis: string;
  recoveryAttempts: string;
  dataPersistenceFindings: string;
  recommendations: string;
  userExperienceImpact: string;
  conclusion: string;
}

export interface DfinityVoiceCommandIssueReport {
  title: string;
  introduction: string;
  implementationTimeline: string;
  technicalIssueAnalysis: string;
  comparativeAnalysis: string;
  rootCauseIdentification: string;
  platformRecommendations: string;
  implementationAttemptHistory: string;
  connectivityPatternAnalysis: string;
  browserCompatibilityIssues: string;
  authenticationIntegrationProblems: string;
  technicalArchitectureReview: string;
  conclusion: string;
}

// Extended backend interface with all methods
export interface ExtendedBackendInterface {
  getCurrentTime(): Promise<bigint>;
  getAllTransactions(): Promise<Transaction[]>;
  addTransaction(input: TransactionInput): Promise<bigint>;
  updateTransaction(id: bigint, input: TransactionInput): Promise<void>;
  deleteTransaction(id: bigint): Promise<void>;
  getMonthlyOverview(month: bigint, year: bigint): Promise<FinancialOverview>;
  getMonthlyReport(month: bigint, year: bigint): Promise<MonthlyReport>;
  getYearlyReport(year: bigint): Promise<YearlyReport>;
  getMonthlyIncomeExpenseByYear(year: bigint): Promise<MonthlyIncomeExpense[]>;
  getYearComparison(years: bigint[]): Promise<YearComparison[]>;
  getExpenseShareByCategory(
    startDate: bigint,
    endDate: bigint,
  ): Promise<ExpenseShare[]>;
  getAllMonthlyIncomes(): Promise<MonthlyIncomeInput[]>;
  addMonthlyIncome(input: MonthlyIncomeInput): Promise<void>;
  updateMonthlyIncome(input: MonthlyIncomeInput): Promise<void>;
  deleteMonthlyIncome(year: bigint, month: bigint): Promise<void>;
  getPredictiveAnalysis(): Promise<{
    projections: Projection[];
    historicalData: [bigint, bigint, bigint, bigint][];
  }>;
  runSimulation(
    incomeGrowthPercentage: number,
    expenseGrowthPercentage: number,
  ): Promise<SimulationResult>;
  getBusinessPerformanceAnalysis(
    period: BenchmarkPeriod,
  ): Promise<PerformanceAnalysis>;
  exportData(): Promise<ExportData>;
  getPdfFinancialReportData(year: bigint | null): Promise<PdfReportData>;
  getDfinityTechnicalReport(): Promise<DfinityTechnicalReport>;
  getDfinityTechnicalAnalysis(): Promise<DfinityTechnicalAnalysis>;
  getDfinityVoiceCommandIssueReport(): Promise<DfinityVoiceCommandIssueReport>;
}
