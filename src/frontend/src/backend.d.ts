import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface MonthlyReport {
    month: bigint;
    expensesByCategory: Array<CategorySummary>;
    overview: FinancialOverview;
    year: bigint;
    incomeByPaymentMethod: Array<PaymentMethodSummary>;
}
export interface PerformanceDeviation {
    status: DeviationStatus;
    industryAverage: bigint;
    deviationPercentage: number;
    category: string;
    userValue: bigint;
}
export interface PaymentMethodSummary {
    total: bigint;
    paymentMethod: string;
}
export interface MonthlyIncomeInput {
    month: bigint;
    year: bigint;
    amount: bigint;
}
export interface MonthlyIncomeExpense {
    month: bigint;
    year: bigint;
    totalIncome: bigint;
    totalExpenses: bigint;
}
export interface ExportData {
    monthlyIncomes: Array<MonthlyIncomeInput>;
    businessProfile?: BusinessProfile;
    transactions: Array<Transaction>;
}
export interface CategorySummary {
    total: bigint;
    category: string;
}
export interface DfinityTechnicalAnalysis {
    title: string;
    issueDescription: string;
    userExperienceImpact: string;
    recommendations: string;
    conclusion: string;
    dataPersistenceFindings: string;
    executiveSummary: string;
    recoveryAttempts: string;
    technicalAnalysis: string;
}
export type BenchmarkPeriod = {
    __kind__: "cumulative";
    cumulative: null;
} | {
    __kind__: "monthly";
    monthly: {
        month: bigint;
        year: bigint;
    };
} | {
    __kind__: "yearly";
    yearly: {
        year: bigint;
    };
};
export interface Transaction {
    id: bigint;
    paymentMethod?: PaymentMethod;
    transactionType: TransactionType;
    date: bigint;
    description: string;
    amount: bigint;
    expenseCategory?: ExpenseCategory;
}
export interface ExpenseShare {
    total: bigint;
    share: number;
    category: string;
}
export interface Projection {
    month: bigint;
    year: bigint;
    projectedIncome: bigint;
    projectedProfit: bigint;
    projectedExpenses: bigint;
}
export interface PdfReportData {
    monthlyIncomes: Array<MonthlyIncomeInput>;
    expensesByCategory: Array<CategorySummary>;
    overview: FinancialOverview;
    incomeByPaymentMethod: Array<PaymentMethodSummary>;
    businessProfile?: BusinessProfile;
    transactions: Array<Transaction>;
}
export interface YearComparison {
    year: bigint;
    totalIncome: bigint;
    totalExpenses: bigint;
    monthlyData: Array<MonthlyIncomeExpense>;
}
export interface DfinityVoiceCommandIssueReport {
    title: string;
    authenticationIntegrationProblems: string;
    implementationAttemptHistory: string;
    browserCompatibilityIssues: string;
    conclusion: string;
    rootCauseIdentification: string;
    technicalIssueAnalysis: string;
    introduction: string;
    comparativeAnalysis: string;
    connectivityPatternAnalysis: string;
    implementationTimeline: string;
    platformRecommendations: string;
    technicalArchitectureReview: string;
}
export interface FinancialOverview {
    totalIncome: bigint;
    totalExpenses: bigint;
    profit: bigint;
}
export interface TransactionInput {
    paymentMethod?: PaymentMethod;
    transactionType: TransactionType;
    date: bigint;
    description: string;
    amount: bigint;
    expenseCategory?: ExpenseCategory;
}
export interface PerformanceAnalysis {
    diagnosticInfo?: string;
    period: BenchmarkPeriod;
    recommendations: Array<string>;
    profitMarginDeviation: PerformanceDeviation;
    industryBenchmark: IndustryBenchmark;
    userIncome: bigint;
    userProfit: bigint;
    userExpenses: bigint;
    incomeDeviation: PerformanceDeviation;
    expenseDeviations: Array<PerformanceDeviation>;
}
export interface YearlyReport {
    monthlyOverviews: Array<FinancialOverview>;
    year: bigint;
    incomeByPaymentMethod: Array<PaymentMethodSummary>;
    totalOverview: FinancialOverview;
}
export interface IndustryBenchmark {
    revenuePerSeat?: bigint;
    averageIncome: bigint;
    averageExpenses: bigint;
    averageProfitMargin: number;
    expenseCategoryAverages: Array<[string, bigint]>;
}
export interface DfinityTechnicalReport {
    title: string;
    synchronizationImprovements: string;
    dateBoundaryHandling: string;
    summary: string;
    decimalPrecision: string;
    confirmation: string;
    consistencyVerification: string;
    finalVerification: string;
}
export interface SimulationResult {
    totalProjectedExpenses: bigint;
    projections: Array<Projection>;
    totalProjectedIncome: bigint;
    totalProjectedProfit: bigint;
}
export interface BusinessProfile {
    offerType: OfferType;
    seasonalActivity: SeasonalActivity;
    numberOfSeats: bigint;
    location: string;
}
export interface UserProfile {
    name: string;
    restaurantName: string;
}
export enum DeviationStatus {
    withinNormalRange = "withinNormalRange",
    belowAverage = "belowAverage",
    aboveAverage = "aboveAverage"
}
export enum ExpenseCategory {
    rezije = "rezije",
    oprema = "oprema",
    napojnica = "napojnica",
    pice = "pice",
    place = "place",
    ostalo = "ostalo",
    namirnice = "namirnice"
}
export enum OfferType {
    bar = "bar",
    brzaHrana = "brzaHrana",
    kafic = "kafic",
    ostalo = "ostalo",
    restoran = "restoran"
}
export enum PaymentMethod {
    kartica = "kartica",
    gotovina = "gotovina"
}
export enum SeasonalActivity {
    oboje = "oboje",
    zima = "zima",
    ljeto = "ljeto"
}
export enum TransactionType {
    prihod = "prihod",
    rashod = "rashod"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addMonthlyIncome(input: MonthlyIncomeInput): Promise<void>;
    addTransaction(input: TransactionInput): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    authorizeReadOnlyAccess(principal: Principal): Promise<void>;
    deleteMonthlyIncome(year: bigint, month: bigint): Promise<void>;
    deleteTransaction(id: bigint): Promise<void>;
    exportData(): Promise<ExportData>;
    getAllBusinessProfilesReadOnly(): Promise<Array<[Principal, BusinessProfile]>>;
    getAllMonthlyIncomes(): Promise<Array<MonthlyIncomeInput>>;
    getAllMonthlyIncomesReadOnly(): Promise<Array<MonthlyIncomeInput>>;
    migrateMonthlyIncomesToTransactions(): Promise<bigint>;
    clearMigratedMonthlyIncomes(): Promise<void>;
    getAllTransactions(): Promise<Array<Transaction>>;
    getAllTransactionsReadOnly(): Promise<Array<Transaction>>;
    getBusinessPerformanceAnalysis(period: BenchmarkPeriod): Promise<PerformanceAnalysis>;
    getBusinessProfile(user: Principal): Promise<BusinessProfile | null>;
    getCallerBusinessProfile(): Promise<BusinessProfile | null>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentTime(): Promise<bigint>;
    getDfinityTechnicalAnalysis(): Promise<DfinityTechnicalAnalysis>;
    getDfinityTechnicalReport(): Promise<DfinityTechnicalReport>;
    getDfinityVoiceCommandIssueReport(): Promise<DfinityVoiceCommandIssueReport>;
    getExpenseShareByCategory(startDate: bigint, endDate: bigint): Promise<Array<ExpenseShare>>;
    getMonthlyIncome(year: bigint, month: bigint): Promise<bigint>;
    getMonthlyIncomeCount(year: bigint, month: bigint): Promise<bigint>;
    getMonthlyIncomeExpenseByYear(year: bigint): Promise<Array<MonthlyIncomeExpense>>;
    getMonthlyOverview(month: bigint, year: bigint): Promise<FinancialOverview>;
    getMonthlyReport(month: bigint, year: bigint): Promise<MonthlyReport>;
    getPdfFinancialReportData(year: bigint | null): Promise<PdfReportData>;
    getPredictiveAnalysis(): Promise<{
        projections: Array<Projection>;
        historicalData: Array<[bigint, bigint, bigint, bigint]>;
    }>;
    getTotalMonthlyIncome(year: bigint, month: bigint): Promise<bigint>;
    getTransaction(id: bigint): Promise<Transaction | null>;
    getTransactionCountsByCategory(): Promise<Array<[string, bigint]>>;
    getTransactionsByCategory(transactionType: TransactionType, expenseCategory: ExpenseCategory | null): Promise<Array<Transaction>>;
    getTransactionsByDateRange(startDate: bigint, endDate: bigint): Promise<Array<Transaction>>;
    getTransactionsByFilters(transactionType: TransactionType | null, expenseCategory: ExpenseCategory | null, paymentMethod: PaymentMethod | null, startDate: bigint | null, endDate: bigint | null): Promise<Array<Transaction>>;
    getTransactionsByPaymentMethod(paymentMethod: PaymentMethod): Promise<Array<Transaction>>;
    getTransactionsByType(transactionType: TransactionType): Promise<Array<Transaction>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getYearComparison(years: Array<bigint>): Promise<Array<YearComparison>>;
    getYearlyOverview(year: bigint): Promise<FinancialOverview>;
    getYearlyReport(year: bigint): Promise<YearlyReport>;
    hasCallerReadOnlyAccess(): Promise<boolean>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    isWakeUpRoutineActive(): Promise<boolean>;
    revokeReadOnlyAccess(principal: Principal): Promise<void>;
    runSimulation(incomeGrowthPercentage: number, expenseGrowthPercentage: number): Promise<SimulationResult>;
    saveBusinessProfile(profile: BusinessProfile): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    startWakeUpRoutine(): Promise<void>;
    updateMonthlyIncome(input: MonthlyIncomeInput): Promise<void>;
    updateTransaction(id: bigint, input: TransactionInput): Promise<void>;
}
