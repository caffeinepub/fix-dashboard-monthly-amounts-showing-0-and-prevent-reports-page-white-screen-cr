import {
  type MonthlyIncomeInput,
  PaymentMethod,
  type Transaction,
  TransactionType,
} from "@/backend";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetAllMonthlyIncomes,
  useGetAllTransactions,
  useGetRecentTransactions,
} from "@/hooks/useQueries";
import {
  centsToEur,
  formatCurrency,
  getMonthEndTimestamp,
  getMonthStartTimestamp,
} from "@/lib/utils";
import {
  Banknote,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";

export default function Dashboard() {
  const {
    data: allTransactions,
    isLoading: allLoading,
    error: allError,
  } = useGetAllTransactions();
  const {
    data: recentTransactions,
    isLoading: transactionsLoading,
    error: transactionsError,
  } = useGetRecentTransactions();
  const { data: allMonthlyIncomes } = useGetAllMonthlyIncomes();

  const now = new Date();
  const currentMonthNum = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const currentMonth = now.toLocaleDateString("hr-HR", {
    month: "long",
    year: "numeric",
  });

  // Compute monthly totals client-side from all transactions + monthly incomes
  const monthlyTotals = useMemo(() => {
    const monthStart = getMonthStartTimestamp(currentMonthNum, currentYear);
    const monthEnd = getMonthEndTimestamp(currentMonthNum, currentYear);

    let totalIncome = BigInt(0);
    let totalExpenses = BigInt(0);
    let cashIncome = BigInt(0);
    let cardIncome = BigInt(0);

    // Sum from regular transactions
    if (allTransactions) {
      const monthTxns = allTransactions.filter(
        (t) => t.date >= monthStart && t.date <= monthEnd,
      );

      for (const t of monthTxns) {
        if (t.transactionType === TransactionType.prihod) {
          totalIncome += t.amount;
          if (t.paymentMethod === PaymentMethod.gotovina) {
            cashIncome += t.amount;
          } else if (t.paymentMethod === PaymentMethod.kartica) {
            cardIncome += t.amount;
          }
        } else if (t.transactionType === TransactionType.rashod) {
          totalExpenses += t.amount;
        }
      }
    }

    // Add monthly incomes entered via "Brzi unos prihoda"
    if (allMonthlyIncomes) {
      for (const income of allMonthlyIncomes) {
        if (
          Number(income.year) === currentYear &&
          Number(income.month) === currentMonthNum
        ) {
          totalIncome += income.amount;
        }
      }
    }

    return {
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      cashIncome,
      cardIncome,
    };
  }, [allTransactions, allMonthlyIncomes, currentMonthNum, currentYear]);

  const isLoading = allLoading;
  const hasError = allError || transactionsError;

  if (hasError) {
    return (
      <div className="container py-4 sm:py-8 px-4">
        <ReadOnlyBanner />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-6 text-center">
          <p className="text-sm sm:text-base text-red-800">
            Greška pri učitavanju podataka. Molimo pokušajte ponovno.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-8 px-4">
      <ReadOnlyBanner />

      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Nadzorna ploča
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          Pregled financija za {currentMonth}
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Ukupni prihodi
            </CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrency(centsToEur(monthlyTotals.totalIncome))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Ukupni rashodi
            </CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {formatCurrency(centsToEur(monthlyTotals.totalExpenses))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Profit
            </CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div
                className={`text-xl sm:text-2xl font-bold ${
                  monthlyTotals.profit >= BigInt(0)
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(centsToEur(monthlyTotals.profit))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Prihodi - Gotovina
            </CardTitle>
            <Banknote className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrency(centsToEur(monthlyTotals.cashIncome))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Prihodi - Kartica
            </CardTitle>
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrency(centsToEur(monthlyTotals.cardIncome))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 sm:mt-8">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Nedavne transakcije
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Pregled najnovijih 10 transakcija
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 sm:h-16 w-full" />
              <Skeleton className="h-14 sm:h-16 w-full" />
              <Skeleton className="h-14 sm:h-16 w-full" />
              <Skeleton className="h-14 sm:h-16 w-full" />
              <Skeleton className="h-14 sm:h-16 w-full" />
            </div>
          ) : recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {recentTransactions.map(
                (transaction: Transaction, idx: number) => (
                  <div
                    key={Number(transaction.id)}
                    data-ocid={`transactions.item.${idx + 1}`}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 sm:p-4"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                      <div
                        className={`flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full ${
                          transaction.transactionType === TransactionType.prihod
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {transaction.transactionType ===
                        TransactionType.prihod ? (
                          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">
                          {transaction.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          {transaction.transactionType ===
                            TransactionType.prihod &&
                            transaction.paymentMethod && (
                              <span className="flex items-center gap-1">
                                {transaction.paymentMethod ===
                                PaymentMethod.gotovina ? (
                                  <Banknote className="h-3 w-3" />
                                ) : (
                                  <CreditCard className="h-3 w-3" />
                                )}
                                {transaction.paymentMethod ===
                                PaymentMethod.gotovina
                                  ? "Gotovina"
                                  : "Kartica"}
                              </span>
                            )}
                          <Calendar className="h-3 w-3" />
                          <span className="whitespace-nowrap">
                            {new Date(
                              Number(transaction.date) / 1000000,
                            ).toLocaleDateString("hr-HR")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`text-base sm:text-lg font-semibold whitespace-nowrap ${
                        transaction.transactionType === TransactionType.prihod
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.transactionType === TransactionType.prihod
                        ? "+"
                        : "-"}
                      {formatCurrency(centsToEur(transaction.amount))}
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div
              data-ocid="transactions.empty_state"
              className="py-8 sm:py-12 text-center text-muted-foreground"
            >
              <p className="text-sm sm:text-base">Nema transakcija za prikaz</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
