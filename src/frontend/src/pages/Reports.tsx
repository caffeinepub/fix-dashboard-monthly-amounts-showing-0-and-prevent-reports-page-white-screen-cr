import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, BarChart2, TrendingDown, TrendingUp } from "lucide-react";
import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetAllTransactions,
  useGetMonthlyReport,
  useGetYearlyReport,
} from "../hooks/useQueries";
import {
  CROATIAN_MONTHS,
  centsToEur,
  formatCurrency,
  getMonthName,
} from "../lib/utils";

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();

const CHART_COLORS = [
  "#f97316",
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#eab308",
  "#06b6d4",
];

function safeNumber(val: unknown, fallback = 0): number {
  if (val === null || val === undefined) return fallback;
  const n = typeof val === "bigint" ? Number(val) : Number(val);
  if (Number.isNaN(n) || !Number.isFinite(n)) return fallback;
  return n;
}

function safeCentsToEur(val: unknown, fallback = 0): number {
  return centsToEur(safeNumber(val, fallback));
}

export default function Reports() {
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
    isLoading: txLoading,
    isError: txError,
  } = useGetAllTransactions();

  // --- Monthly bar chart data ---
  const monthlyBarData = useMemo(() => {
    try {
      if (!yearlyReport?.monthlyOverviews) return [];
      return CROATIAN_MONTHS.map((label, idx) => {
        const overview = yearlyReport.monthlyOverviews?.[idx];
        return {
          name: label.slice(0, 3),
          prihodi: safeCentsToEur(overview?.totalIncome),
          rashodi: safeCentsToEur(overview?.totalExpenses),
        };
      });
    } catch {
      return [];
    }
  }, [yearlyReport]);

  // --- Expense pie chart data ---
  const expensePieData = useMemo(() => {
    try {
      if (!monthlyReport?.expensesByCategory) return [];
      return (monthlyReport.expensesByCategory ?? [])
        .filter((cat) => cat?.category && safeNumber(cat.total) > 0)
        .map((cat) => ({
          name: cat.category ?? "Ostalo",
          value: safeCentsToEur(cat.total),
        }));
    } catch {
      return [];
    }
  }, [monthlyReport]);

  // --- Payment method data ---
  const paymentMethodData = useMemo(() => {
    try {
      if (!monthlyReport?.incomeByPaymentMethod) return [];
      return (monthlyReport.incomeByPaymentMethod ?? [])
        .filter((pm) => pm?.paymentMethod && safeNumber(pm.total) > 0)
        .map((pm) => ({
          name: pm.paymentMethod ?? "Ostalo",
          value: safeCentsToEur(pm.total),
        }));
    } catch {
      return [];
    }
  }, [monthlyReport]);

  // --- Transaction trend (last 30 days) ---
  const transactionTrendData = useMemo(() => {
    try {
      if (!allTransactions || allTransactions.length === 0) return [];
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const recent = allTransactions.filter((tx) => {
        const ts = safeNumber(tx?.date) / 1_000_000;
        return ts >= thirtyDaysAgo;
      });

      const byDay: Record<string, { prihodi: number; rashodi: number }> = {};
      for (const tx of recent) {
        try {
          const ts = safeNumber(tx?.date) / 1_000_000;
          const dateKey = new Date(ts).toLocaleDateString("hr-HR", {
            day: "2-digit",
            month: "2-digit",
          });
          if (!byDay[dateKey]) byDay[dateKey] = { prihodi: 0, rashodi: 0 };
          const isIncome =
            tx?.transactionType === "prihod" ||
            (tx?.transactionType as unknown as { __kind__: string })
              ?.__kind__ === "prihod";
          const amount = safeCentsToEur(tx?.amount);
          if (isIncome) {
            byDay[dateKey].prihodi += amount;
          } else {
            byDay[dateKey].rashodi += amount;
          }
        } catch {
          // skip malformed transaction
        }
      }

      return Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, vals]) => ({ name, ...vals }));
    } catch {
      return [];
    }
  }, [allTransactions]);

  // --- Summary values ---
  const monthlyIncome = safeNumber(monthlyReport?.overview?.totalIncome);
  const monthlyExpenses = safeNumber(monthlyReport?.overview?.totalExpenses);
  const monthlyProfit = safeNumber(monthlyReport?.overview?.profit);
  const yearlyIncome = safeNumber(yearlyReport?.totalOverview?.totalIncome);
  const yearlyExpenses = safeNumber(yearlyReport?.totalOverview?.totalExpenses);
  const yearlyProfit = safeNumber(yearlyReport?.totalOverview?.profit);

  const isAnyLoading = monthlyLoading || yearlyLoading || txLoading;
  const isAnyError = monthlyError || yearlyError || txError;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Izvještaji</h1>
          <p className="text-sm text-muted-foreground">
            Financijska analiza – {getMonthName(currentMonth)} {currentYear}
          </p>
        </div>
        {isAnyLoading && (
          <Badge
            variant="outline"
            className="self-start sm:self-auto animate-pulse"
          >
            Učitavanje podataka...
          </Badge>
        )}
        {isAnyError && !isAnyLoading && (
          <Badge variant="destructive" className="self-start sm:self-auto">
            Greška pri učitavanju
          </Badge>
        )}
      </div>

      {/* KPI Summary Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          {
            label: "Prihodi (mj.)",
            value: monthlyIncome,
            loading: monthlyLoading,
            error: monthlyError,
            color: "text-green-600 dark:text-green-400",
            icon: <TrendingUp className="w-4 h-4" />,
          },
          {
            label: "Rashodi (mj.)",
            value: monthlyExpenses,
            loading: monthlyLoading,
            error: monthlyError,
            color: "text-red-600 dark:text-red-400",
            icon: <TrendingDown className="w-4 h-4" />,
          },
          {
            label: "Dobit (mj.)",
            value: monthlyProfit,
            loading: monthlyLoading,
            error: monthlyError,
            color: monthlyProfit >= 0 ? "text-primary" : "text-destructive",
            icon: <BarChart2 className="w-4 h-4" />,
          },
          {
            label: "Prihodi (god.)",
            value: yearlyIncome,
            loading: yearlyLoading,
            error: yearlyError,
            color: "text-green-600 dark:text-green-400",
            icon: <TrendingUp className="w-4 h-4" />,
          },
          {
            label: "Rashodi (god.)",
            value: yearlyExpenses,
            loading: yearlyLoading,
            error: yearlyError,
            color: "text-red-600 dark:text-red-400",
            icon: <TrendingDown className="w-4 h-4" />,
          },
          {
            label: "Dobit (god.)",
            value: yearlyProfit,
            loading: yearlyLoading,
            error: yearlyError,
            color: yearlyProfit >= 0 ? "text-primary" : "text-destructive",
            icon: <BarChart2 className="w-4 h-4" />,
          },
        ].map((kpi) => (
          <Card key={kpi.label} className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
              <span className={kpi.color}>{kpi.icon}</span>
            </div>
            {kpi.loading ? (
              <Skeleton className="h-6 w-full mt-1" />
            ) : kpi.error ? (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <AlertCircle className="w-3 h-3" />
                <span className="text-xs">N/A</span>
              </div>
            ) : (
              <div className={`text-base font-bold ${kpi.color}`}>
                {formatCurrency(kpi.value)}
              </div>
            )}
          </Card>
        ))}
      </section>

      {/* Monthly Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Prihodi i rashodi po mjesecima – {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {yearlyLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : yearlyError ? (
            <div className="flex items-center gap-2 text-muted-foreground h-64 justify-center">
              <AlertCircle className="w-5 h-5" />
              <span>Podaci nedostupni</span>
            </div>
          ) : monthlyBarData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Nema podataka za prikaz
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={monthlyBarData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)} €`, ""]}
                  labelStyle={{ color: "var(--foreground)" }}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar
                  dataKey="prihodi"
                  fill="#22c55e"
                  name="Prihodi"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="rashodi"
                  fill="#ef4444"
                  name="Rashodi"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Expense Pie + Payment Method */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Expense Categories Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Rashodi po kategorijama – {getMonthName(currentMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : monthlyError ? (
              <div className="flex items-center gap-2 text-muted-foreground h-56 justify-center">
                <AlertCircle className="w-5 h-5" />
                <span>Podaci nedostupni</span>
              </div>
            ) : expensePieData.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">
                Nema rashoda ovaj mjesec
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={expensePieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {expensePieData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)} €`, ""]}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Prihodi po načinu plaćanja – {getMonthName(currentMonth)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : monthlyError ? (
              <div className="flex items-center gap-2 text-muted-foreground h-56 justify-center">
                <AlertCircle className="w-5 h-5" />
                <span>Podaci nedostupni</span>
              </div>
            ) : paymentMethodData.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-muted-foreground text-sm">
                Nema podataka o načinu plaćanja
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={paymentMethodData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {paymentMethodData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)} €`, ""]}
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction Trend Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Trend transakcija – zadnjih 30 dana
          </CardTitle>
        </CardHeader>
        <CardContent>
          {txLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : txError ? (
            <div className="flex items-center gap-2 text-muted-foreground h-64 justify-center">
              <AlertCircle className="w-5 h-5" />
              <span>Podaci nedostupni</span>
            </div>
          ) : transactionTrendData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Nema transakcija u zadnjih 30 dana
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={transactionTrendData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-border"
                />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(2)} €`, ""]}
                  labelStyle={{ color: "var(--foreground)" }}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="prihodi"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                  name="Prihodi"
                />
                <Line
                  type="monotone"
                  dataKey="rashodi"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  name="Rashodi"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Expense Category Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Detalji rashoda – {getMonthName(currentMonth)} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyLoading ? (
            <div className="space-y-2">
              {["a", "b", "c", "d", "e"].map((k) => (
                <div key={k} className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : monthlyError ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">Podaci nedostupni</span>
            </div>
          ) : !monthlyReport?.expensesByCategory ||
            monthlyReport.expensesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nema rashoda ovaj mjesec
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">
                      Kategorija
                    </th>
                    <th className="text-right py-2 text-muted-foreground font-medium">
                      Iznos
                    </th>
                    <th className="text-right py-2 text-muted-foreground font-medium">
                      Udio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(monthlyReport.expensesByCategory ?? []).map((cat) => {
                    if (!cat) return null;
                    const total = safeNumber(cat.total);
                    const share =
                      monthlyExpenses > 0
                        ? ((total / monthlyExpenses) * 100).toFixed(1)
                        : "0.0";
                    return (
                      <tr
                        key={cat.category ?? "unknown"}
                        className="border-b border-border/50 last:border-0"
                      >
                        <td className="py-2 text-foreground">
                          {cat.category ?? "Ostalo"}
                        </td>
                        <td className="py-2 text-right font-medium">
                          {formatCurrency(total)}
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {share}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border">
                    <td className="py-2 font-semibold">Ukupno</td>
                    <td className="py-2 text-right font-semibold">
                      {formatCurrency(monthlyExpenses)}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">
                      100%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
