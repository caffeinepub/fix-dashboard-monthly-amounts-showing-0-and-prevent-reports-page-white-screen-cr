import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Banknote, Calendar } from 'lucide-react';
import { useGetCurrentMonthOverview, useGetRecentTransactions, useGetCurrentMonthReport } from '@/hooks/useQueries';
import { formatCurrency, centsToEur } from '@/lib/utils';
import { Transaction, TransactionType } from '@/backend';
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner';

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useGetCurrentMonthOverview();
  const { data: recentTransactions, isLoading: transactionsLoading, error: transactionsError } = useGetRecentTransactions();
  const { data: monthlyReport, isLoading: reportLoading, error: reportError } = useGetCurrentMonthReport();

  const currentMonth = new Date().toLocaleDateString('hr-HR', { month: 'long', year: 'numeric' });

  const cashIncome = monthlyReport?.incomeByPaymentMethod.find((pm) => pm.paymentMethod === 'Gotovina')?.total || BigInt(0);
  const cardIncome = monthlyReport?.incomeByPaymentMethod.find((pm) => pm.paymentMethod === 'Kartica')?.total || BigInt(0);

  const hasError = overviewError || transactionsError || reportError;
  if (hasError) {
    return (
      <div className="container py-4 sm:py-8 px-4">
        <ReadOnlyBanner />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-6 text-center">
          <p className="text-sm sm:text-base text-red-800">Greška pri učitavanju podataka. Molimo pokušajte ponovno.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 sm:py-8 px-4">
      <ReadOnlyBanner />
      
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Nadzorna ploča</h2>
        <p className="text-sm sm:text-base text-muted-foreground">Pregled financija za {currentMonth}</p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Ukupni prihodi</CardTitle>
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrency(centsToEur(overview?.totalIncome || 0))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Ukupni rashodi</CardTitle>
            <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-red-600">
                {formatCurrency(centsToEur(overview?.totalExpenses || 0))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Profit</CardTitle>
            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div
                className={`text-xl sm:text-2xl font-bold ${
                  Number(overview?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {formatCurrency(centsToEur(overview?.profit || 0))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Prihodi - Gotovina</CardTitle>
            <Banknote className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(centsToEur(cashIncome))}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Prihodi - Kartica</CardTitle>
            <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {reportLoading ? (
              <Skeleton className="h-6 sm:h-8 w-24 sm:w-32" />
            ) : (
              <div className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrency(centsToEur(cardIncome))}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Ovaj mjesec</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 sm:mt-8">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Nedavne transakcije</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Pregled najnovijih 10 transakcija</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 sm:h-16 w-full" />
              ))}
            </div>
          ) : recentTransactions && recentTransactions.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {recentTransactions.map((transaction: Transaction) => (
                <div
                  key={Number(transaction.id)}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border p-3 sm:p-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div
                      className={`flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full ${
                        transaction.transactionType === TransactionType.prihod ? 'bg-green-100' : 'bg-red-100'
                      }`}
                    >
                      {transaction.transactionType === TransactionType.prihod ? (
                        <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base truncate">{transaction.description}</p>
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                        {transaction.transactionType === TransactionType.prihod && transaction.paymentMethod && (
                          <span className="flex items-center gap-1">
                            {transaction.paymentMethod === 'gotovina' ? (
                              <Banknote className="h-3 w-3" />
                            ) : (
                              <CreditCard className="h-3 w-3" />
                            )}
                            {transaction.paymentMethod === 'gotovina' ? 'Gotovina' : 'Kartica'}
                          </span>
                        )}
                        <Calendar className="h-3 w-3" />
                        <span className="whitespace-nowrap">{new Date(Number(transaction.date) / 1000000).toLocaleDateString('hr-HR')}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-base sm:text-lg font-semibold whitespace-nowrap ${
                      transaction.transactionType === TransactionType.prihod ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.transactionType === TransactionType.prihod ? '+' : '-'}
                    {formatCurrency(centsToEur(transaction.amount))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 sm:py-12 text-center text-muted-foreground">
              <p className="text-sm sm:text-base">Nema transakcija za prikaz</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
