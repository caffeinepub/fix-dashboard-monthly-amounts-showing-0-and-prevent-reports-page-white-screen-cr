import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  BarChart2,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetAllTransactions,
  useGetMonthlyReport,
  useGetYearlyReport,
} from "../hooks/useQueries";
import { CROATIAN_MONTHS, formatCurrency, getMonthName } from "../lib/utils";

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

// KPI Card with three-state rendering: loading, error/unavailable, success
interface KpiCardProps {
  title: string;
  value: number | bigint | null | undefined;
  isLoading: boolean;
  isError: boolean;
  icon: React.ReactNode;
  colorClass?: string;
  formatter?: (v: number | bigint) => string;
}

function KpiCard({
  title,
  value,
  isLoading,
  isError,
  icon,
  colorClass = "text-foreground",
  formatter = (v) => formatCurrency(v),
}: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`${colorClass} opacity-80`}>{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        ) : isError || value === null || value === undefined ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">Nedostupno</span>
          </div>
        ) : (
          <div className={`text-2xl font-bold ${colorClass}`}>
            {formatter(value)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Category row with loading/error states
interface CategoryRowProps {
  label: string;
  value: number | bigint | null | undefined;
  isLoading: boolean;
  isError: boolean;
}

function CategoryRow({ label, value, isLoading, isError }: CategoryRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      {isLoading ? (
        <Skeleton className="h-4 w-20" />
      ) : isError || value === null || value === undefined ? (
        <span className="text-xs text-muted-foreground">Nedostupno</span>
      ) : (
        <span className="text-sm font-medium">{formatCurrency(value)}</span>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { identity } = useInternetIdentity();

  const {
    data: monthlyReport,
    isLoading: monthlyLoading,
    isError: monthlyError,
  } = useGetMonthlyReport(currentYear, currentMonth);

  const {
    data: yearlyReport,
    isLoading: yearlyLoading,
    isError: yearlyError,
  } = useGetYearlyReport(currentYear);

  const {
    data: allTransactions,
    isLoading: transactionsLoading,
    isError: transactionsError,
  } = useGetAllTransactions();

  // Monthly KPIs
  const monthlyIncome = useMemo(() => {
    if (!monthlyReport) return null;
    return monthlyReport.overview?.totalIncome ?? null;
  }, [monthlyReport]);

  const monthlyExpenses = useMemo(() => {
    if (!monthlyReport) return null;
    return monthlyReport.overview?.totalExpenses ?? null;
  }, [monthlyReport]);

  const monthlyProfit = useMemo(() => {
    if (!monthlyReport) return null;
    return monthlyReport.overview?.profit ?? null;
  }, [monthlyReport]);

  // Yearly KPIs
  const yearlyIncome = useMemo(() => {
    if (!yearlyReport) return null;
    return yearlyReport.totalOverview?.totalIncome ?? null;
  }, [yearlyReport]);

  const yearlyExpenses = useMemo(() => {
    if (!yearlyReport) return null;
    return yearlyReport.totalOverview?.totalExpenses ?? null;
  }, [yearlyReport]);

  const yearlyProfit = useMemo(() => {
    if (!yearlyReport) return null;
    return yearlyReport.totalOverview?.profit ?? null;
  }, [yearlyReport]);

  // Expense categories
  const expenseCategories = useMemo(() => {
    if (!monthlyReport?.expensesByCategory) return null;
    return monthlyReport.expensesByCategory;
  }, [monthlyReport]);

  // Recent transactions (last 5)
  const recentTransactions = useMemo(() => {
    if (!allTransactions) return null;
    return [...allTransactions]
      .sort((a, b) => Number(b.date) - Number(a.date))
      .slice(0, 5);
  }, [allTransactions]);

  const monthName = getMonthName(currentMonth);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {monthName} {currentYear} – pregled financija
          </p>
        </div>
        <Badge variant="outline" className="self-start sm:self-auto">
          {identity?.getPrincipal().toString().slice(0, 12)}...
        </Badge>
      </div>

      {/* Monthly KPI Cards */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Ovaj mjesec – {monthName}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Prihodi"
            value={monthlyIncome}
            isLoading={monthlyLoading}
            isError={monthlyError}
            icon={<TrendingUp className="w-5 h-5" />}
            colorClass="text-green-600 dark:text-green-400"
          />
          <KpiCard
            title="Rashodi"
            value={monthlyExpenses}
            isLoading={monthlyLoading}
            isError={monthlyError}
            icon={<TrendingDown className="w-5 h-5" />}
            colorClass="text-red-600 dark:text-red-400"
          />
          <KpiCard
            title="Neto dobit"
            value={monthlyProfit}
            isLoading={monthlyLoading}
            isError={monthlyError}
            icon={<DollarSign className="w-5 h-5" />}
            colorClass={
              monthlyProfit !== null &&
              monthlyProfit !== undefined &&
              Number(monthlyProfit) >= 0
                ? "text-primary"
                : "text-destructive"
            }
          />
        </div>
      </section>

      {/* Yearly KPI Cards */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Ova godina – {currentYear}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Ukupni prihodi"
            value={yearlyIncome}
            isLoading={yearlyLoading}
            isError={yearlyError}
            icon={<TrendingUp className="w-5 h-5" />}
            colorClass="text-green-600 dark:text-green-400"
          />
          <KpiCard
            title="Ukupni rashodi"
            value={yearlyExpenses}
            isLoading={yearlyLoading}
            isError={yearlyError}
            icon={<TrendingDown className="w-5 h-5" />}
            colorClass="text-red-600 dark:text-red-400"
          />
          <KpiCard
            title="Godišnja dobit"
            value={yearlyProfit}
            isLoading={yearlyLoading}
            isError={yearlyError}
            icon={<BarChart2 className="w-5 h-5" />}
            colorClass={
              yearlyProfit !== null &&
              yearlyProfit !== undefined &&
              Number(yearlyProfit) >= 0
                ? "text-primary"
                : "text-destructive"
            }
          />
        </div>
      </section>

      {/* Expense Categories */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rashodi po kategorijama</CardTitle>
            <p className="text-xs text-muted-foreground">
              {monthName} {currentYear}
            </p>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <div className="space-y-3">
                {["a", "b", "c", "d", "e"].map((k) => (
                  <div key={k} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : monthlyError ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Podaci nedostupni</span>
              </div>
            ) : !expenseCategories || expenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nema rashoda ovaj mjesec
              </p>
            ) : (
              <div className="space-y-1">
                {expenseCategories.map((cat) => (
                  <CategoryRow
                    key={cat.category}
                    label={cat.category}
                    value={cat.total}
                    isLoading={false}
                    isError={false}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nedavne transakcije</CardTitle>
            <p className="text-xs text-muted-foreground">Posljednjih 5 unosa</p>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-3">
                {["a", "b", "c", "d", "e"].map((k) => (
                  <div key={k} className="flex justify-between items-center">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : transactionsError ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Podaci nedostupni</span>
              </div>
            ) : !recentTransactions || recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nema transakcija
              </p>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map((tx) => {
                  const isIncome =
                    tx.transactionType === "prihod" ||
                    (tx.transactionType as unknown as { __kind__: string })
                      ?.__kind__ === "prihod";
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate text-foreground">
                          {tx.description || "Bez opisa"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            Number(tx.date) / 1_000_000,
                          ).toLocaleDateString("hr-HR")}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-medium ml-2 shrink-0 ${
                          isIncome
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Monthly trend (yearly overview) */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Mjesečni pregled – {currentYear}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Prihodi i rashodi po mjesecima
            </p>
          </CardHeader>
          <CardContent>
            {yearlyLoading ? (
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                {[
                  "a",
                  "b",
                  "c",
                  "d",
                  "e",
                  "f",
                  "g",
                  "h",
                  "i",
                  "j",
                  "k",
                  "l",
                ].map((k) => (
                  <div key={k} className="space-y-1">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : yearlyError ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Podaci nedostupni</span>
              </div>
            ) : !yearlyReport?.monthlyOverviews ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nema podataka za ovu godinu
              </p>
            ) : (
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                {CROATIAN_MONTHS.map((monthLabel, idx) => {
                  const overview = yearlyReport.monthlyOverviews?.[idx];
                  const income = overview?.totalIncome ?? 0;
                  const expenses = overview?.totalExpenses ?? 0;
                  const isCurrentMonth = idx + 1 === currentMonth;
                  return (
                    <div
                      key={monthLabel}
                      className={`text-center p-1 rounded-lg ${
                        isCurrentMonth
                          ? "bg-primary/10 ring-1 ring-primary/30"
                          : ""
                      }`}
                    >
                      <div className="text-xs text-muted-foreground mb-1 truncate">
                        {monthLabel.slice(0, 3)}
                      </div>
                      <div className="text-xs font-medium text-green-600 dark:text-green-400">
                        {income > 0 ? formatCurrency(income) : "–"}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400">
                        {expenses > 0 ? formatCurrency(expenses) : "–"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
