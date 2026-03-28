import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGetMonthlyReport, useGetYearlyReport, useGetMonthlyIncomeExpenseByYear, useGetYearComparison, useGetExpenseShareByCategory, useExportData, useGetPdfFinancialReportDataByYear, useGetCallerUserProfile, useGetPredictiveAnalysis, useRunSimulation, useGetBusinessProfile, useGetBusinessPerformanceAnalysis } from '@/hooks/useQueries';
import { formatCurrency, centsToEur, getMonthStartTimestamp, getMonthEndTimestamp, MONTH_NAMES, getMonthName } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { CreditCard, Banknote, FileText, TrendingUp, RotateCcw, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { exportToPDFByYear } from '@/lib/export-utils';
import { toast } from 'sonner';

export default function Reports() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [yearlyReportYear, setYearlyReportYear] = useState(currentYear);
  const [comparisonYears, setComparisonYears] = useState<number[]>([currentYear, currentYear - 1]);
  const [pdfExportYear, setPdfExportYear] = useState<number | null>(currentYear);

  // Predictive analysis state
  const [incomeGrowth, setIncomeGrowth] = useState<string>('0');
  const [expenseGrowth, setExpenseGrowth] = useState<string>('0');
  const [simulationResult, setSimulationResult] = useState<any>(null);

  // Business performance analysis state
  const [analysisPeriod, setAnalysisPeriod] = useState<'monthly' | 'yearly' | 'cumulative'>('monthly');
  const [analysisMonth, setAnalysisMonth] = useState(currentMonth);
  const [analysisYear, setAnalysisYear] = useState(currentYear);

  const { data: monthlyReport, isLoading: monthlyLoading } = useGetMonthlyReport(
    selectedMonth,
    selectedYear
  );
  const { data: yearlyReport, isLoading: yearlyLoading } = useGetYearlyReport(yearlyReportYear);
  const { data: monthlyIncomeExpense, isLoading: monthlyIncomeExpenseLoading } = useGetMonthlyIncomeExpenseByYear(selectedYear);
  const { data: yearComparison, isLoading: yearComparisonLoading } = useGetYearComparison(comparisonYears);
  const { data: userProfile } = useGetCallerUserProfile();
  const { data: businessProfile } = useGetBusinessProfile();
  const { data: predictiveData, isLoading: predictiveLoading } = useGetPredictiveAnalysis();
  const exportDataMutation = useExportData();
  const getPdfDataMutation = useGetPdfFinancialReportDataByYear();
  const runSimulationMutation = useRunSimulation();

  // Business performance analysis query with proper parameters
  const { data: performanceAnalysis, isLoading: performanceLoading, error: performanceError } = useGetBusinessPerformanceAnalysis(
    analysisPeriod,
    analysisPeriod === 'monthly' ? analysisMonth : undefined,
    analysisPeriod !== 'cumulative' ? analysisYear : undefined
  );

  const { startDate, endDate } = useMemo(() => {
    return {
      startDate: getMonthStartTimestamp(selectedMonth, selectedYear),
      endDate: getMonthEndTimestamp(selectedMonth, selectedYear),
    };
  }, [selectedMonth, selectedYear]);

  const { data: expenseShare, isLoading: expenseShareLoading } = useGetExpenseShareByCategory(startDate, endDate);

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const monthlyIncomeExpenseChartData = monthlyIncomeExpense
    ? monthlyIncomeExpense.map((data) => ({
        name: getMonthName(Number(data.month) - 1).substring(0, 3),
        Prihodi: centsToEur(data.totalIncome),
        Rashodi: centsToEur(data.totalExpenses),
      }))
    : [];

  const yearlyChartData = yearlyReport
    ? yearlyReport.monthlyOverviews.map((overview, index) => ({
        name: getMonthName(index).substring(0, 3),
        Prihodi: centsToEur(overview.totalIncome),
        Rashodi: centsToEur(overview.totalExpenses),
        Profit: centsToEur(overview.profit),
      }))
    : [];

  const comparisonChartData = yearComparison && yearComparison.length > 0
    ? MONTH_NAMES.map((_, monthIndex) => {
        const dataPoint: any = { name: getMonthName(monthIndex).substring(0, 3) };
        yearComparison.forEach((yearData) => {
          const monthData = yearData.monthlyData[monthIndex];
          dataPoint[`Prihodi ${yearData.year}`] = centsToEur(monthData.totalIncome);
          dataPoint[`Rashodi ${yearData.year}`] = centsToEur(monthData.totalExpenses);
        });
        return dataPoint;
      })
    : [];

  const doughnutChartData = expenseShare
    ? expenseShare
        .filter((item) => Number(item.total) > 0)
        .map((item) => ({
          name: item.category,
          value: centsToEur(item.total),
          share: item.share,
        }))
    : [];

  // Predictive analysis chart data
  const projectionsToUse = simulationResult?.projections || predictiveData?.projections || [];
  const predictiveChartData = projectionsToUse.map((proj: any) => ({
    name: `${getMonthName(Number(proj.month) - 1).substring(0, 3)} ${proj.year}`,
    'Predviđeni prihodi': centsToEur(proj.projectedIncome),
    'Predviđeni rashodi': centsToEur(proj.projectedExpenses),
    'Predviđena dobit': centsToEur(proj.projectedProfit),
  }));

  // Business performance analysis chart data - using expenseDeviations from backend
  const performanceChartData = performanceAnalysis?.expenseDeviations?.map((deviation: any) => ({
    name: deviation.category,
    'Vaši rashodi': centsToEur(deviation.userValue),
    'Prosjek industrije': centsToEur(deviation.industryAverage),
  })) || [];

  const yearColors = [
    'hsl(142, 76%, 36%)',
    'hsl(217, 91%, 60%)',
    'hsl(280, 65%, 60%)',
    'hsl(25, 95%, 53%)',
    'hsl(340, 82%, 52%)',
  ];

  const categoryColors = [
    'hsl(0, 84%, 60%)',
    'hsl(280, 65%, 60%)',
    'hsl(25, 95%, 53%)',
    'hsl(217, 91%, 60%)',
    'hsl(142, 76%, 36%)',
    'hsl(45, 93%, 47%)',
    'hsl(340, 82%, 52%)',
  ];

  const handleYearToggle = (year: number) => {
    setComparisonYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      } else {
        return [...prev, year].sort((a, b) => b - a);
      }
    });
  };

  const handleExportPDF = async () => {
    try {
      const data = await exportDataMutation.mutateAsync();
      const restaurantName = userProfile?.restaurantName || 'Restoran';
      await exportToPDFByYear(data, restaurantName, pdfExportYear, async (year) => {
        return await getPdfDataMutation.mutateAsync(year);
      });
      toast.success('PDF izvještaj generiran');
    } catch (error) {
      toast.error('Greška pri generiranju PDF izvještaja');
    }
  };

  const handleRunSimulation = async () => {
    try {
      const result = await runSimulationMutation.mutateAsync({
        incomeGrowthPercentage: parseFloat(incomeGrowth) || 0,
        expenseGrowthPercentage: parseFloat(expenseGrowth) || 0,
      });
      setSimulationResult(result);
      toast.success('Simulacija izvršena');
    } catch (error) {
      toast.error('Greška pri izvršavanju simulacije');
    }
  };

  const handleResetSimulation = () => {
    setSimulationResult(null);
    setIncomeGrowth('0');
    setExpenseGrowth('0');
    toast.success('Simulacija resetirana');
  };

  const renderCustomLabel = (entry: any) => {
    const percent = (entry.share * 100).toFixed(1);
    return `${entry.name}: ${percent}%`;
  };

  const getPerformanceIcon = (deviation: number) => {
    if (deviation > 10) return <TrendingDown className="h-5 w-5 text-red-600" />;
    if (deviation < -10) return <TrendingUp className="h-5 w-5 text-green-600" />;
    return <CheckCircle className="h-5 w-5 text-yellow-600" />;
  };

  const getPerformanceBadge = (deviation: number) => {
    if (deviation > 10) return <Badge variant="destructive">Iznad prosjeka</Badge>;
    if (deviation < -10) return <Badge className="bg-green-600">Ispod prosjeka</Badge>;
    return <Badge variant="secondary">U prosjeku</Badge>;
  };

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Izvještaji</h2>
          <p className="text-muted-foreground">Detaljni financijski pregledi</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="pdf-year-select" className="text-sm font-medium">
              Godina za PDF izvoz:
            </Label>
            <Select
              value={pdfExportYear === null ? 'all' : pdfExportYear.toString()}
              onValueChange={(v) => setPdfExportYear(v === 'all' ? null : Number(v))}
            >
              <SelectTrigger id="pdf-year-select" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sve godine</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button
            onClick={handleExportPDF}
            disabled={exportDataMutation.isPending || getPdfDataMutation.isPending}
            className="mt-6"
          >
            <FileText className="mr-2 h-4 w-4" />
            Izvezi PDF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList className="mb-6">
          <TabsTrigger value="monthly">Mjesečni izvještaj</TabsTrigger>
          <TabsTrigger value="yearly">Godišnji izvještaj</TabsTrigger>
          <TabsTrigger value="comparison">Usporedba godina</TabsTrigger>
          <TabsTrigger value="predictive">Prediktivna analiza</TabsTrigger>
          <TabsTrigger value="performance">Analiza poslovanja</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-6">
          <div className="flex gap-4">
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {monthlyLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : monthlyReport ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Ukupni prihodi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(centsToEur(monthlyReport.overview.totalIncome))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Ukupni rashodi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(centsToEur(monthlyReport.overview.totalExpenses))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${
                        Number(monthlyReport.overview.profit) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(centsToEur(monthlyReport.overview.profit))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Prihodi po načinu plaćanja</CardTitle>
                    <CardDescription>Raspodjela prihoda prema načinu plaćanja</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {monthlyReport.incomeByPaymentMethod.map((pm, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            {pm.paymentMethod === 'Gotovina' ? (
                              <Banknote className="h-5 w-5 text-green-600" />
                            ) : (
                              <CreditCard className="h-5 w-5 text-green-600" />
                            )}
                            <span className="font-medium">{pm.paymentMethod}</span>
                          </div>
                          <span className="text-lg font-semibold text-green-600">
                            {formatCurrency(centsToEur(pm.total))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Rashodi po kategorijama</CardTitle>
                    <CardDescription>Raspodjela rashoda</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {monthlyReport.expensesByCategory.map((cat, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{cat.category}</span>
                          <span className="text-sm font-semibold text-red-600">
                            {formatCurrency(centsToEur(cat.total))}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Udio rashoda po kategorijama</CardTitle>
                  <CardDescription>
                    Vizualni prikaz udjela svake kategorije rashoda za {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {expenseShareLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                  ) : doughnutChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={400}>
                      <PieChart>
                        <Pie
                          data={doughnutChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomLabel}
                          outerRadius={120}
                          innerRadius={70}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {doughnutChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                      Nema rashoda za odabrani period
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Godišnji pregled prihoda i rashoda</CardTitle>
                  <CardDescription>Usporedba ukupnih prihoda i rashoda po mjesecima za {selectedYear}. godinu</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyIncomeExpenseLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthlyIncomeExpenseChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar dataKey="Prihodi" fill="hsl(142, 76%, 36%)" name="Prihodi" />
                        <Bar dataKey="Rashodi" fill="hsl(0, 84%, 60%)" name="Rashodi" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nema podataka za odabrani mjesec
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="yearly" className="space-y-6">
          <div className="flex gap-4">
            <Select
              value={yearlyReportYear.toString()}
              onValueChange={(v) => setYearlyReportYear(Number(v))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {yearlyLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : yearlyReport ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Ukupni prihodi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(centsToEur(yearlyReport.totalOverview.totalIncome))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Ukupni rashodi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(centsToEur(yearlyReport.totalOverview.totalExpenses))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Profit</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div
                      className={`text-2xl font-bold ${
                        Number(yearlyReport.totalOverview.profit) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(centsToEur(yearlyReport.totalOverview.profit))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Prihodi po načinu plaćanja</CardTitle>
                  <CardDescription>Godišnja raspodjela prihoda prema načinu plaćanja</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {yearlyReport.incomeByPaymentMethod.map((pm, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          {pm.paymentMethod === 'Gotovina' ? (
                            <Banknote className="h-5 w-5 text-green-600" />
                          ) : (
                            <CreditCard className="h-5 w-5 text-green-600" />
                          )}
                          <span className="font-medium">{pm.paymentMethod}</span>
                        </div>
                        <span className="text-lg font-semibold text-green-600">
                          {formatCurrency(centsToEur(pm.total))}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Mjesečni pregled</CardTitle>
                  <CardDescription>Prihodi, rashodi i profit kroz godinu</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={yearlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="Prihodi" fill="hsl(142, 76%, 36%)" name="Prihodi" />
                      <Bar dataKey="Rashodi" fill="hsl(0, 84%, 60%)" name="Rashodi" />
                      <Bar dataKey="Profit" fill="hsl(217, 91%, 60%)" name="Profit" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nema podataka za odabranu godinu
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Odabir godina za usporedbu</CardTitle>
              <CardDescription>Odaberite dvije ili više godina za usporedbu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {years.map((year) => (
                  <div key={year} className="flex items-center space-x-2">
                    <Checkbox
                      id={`year-${year}`}
                      checked={comparisonYears.includes(year)}
                      onCheckedChange={() => handleYearToggle(year)}
                    />
                    <Label
                      htmlFor={`year-${year}`}
                      className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {year}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {comparisonYears.length < 2 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Odaberite najmanje dvije godine za usporedbu
              </CardContent>
            </Card>
          ) : yearComparisonLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : yearComparison && yearComparison.length > 0 ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {yearComparison.map((yearData) => (
                  <Card key={yearData.year}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">{yearData.year}. godina</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Prihodi:</span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(centsToEur(yearData.totalIncome))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Rashodi:</span>
                        <span className="text-sm font-semibold text-red-600">
                          {formatCurrency(centsToEur(yearData.totalExpenses))}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium">Profit:</span>
                        <span
                          className={`text-sm font-bold ${
                            Number(yearData.totalIncome) - Number(yearData.totalExpenses) >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(centsToEur(yearData.totalIncome) - centsToEur(yearData.totalExpenses))}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Usporedba prihoda po mjesecima</CardTitle>
                  <CardDescription>Mjesečni prihodi za odabrane godine</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      {yearComparison.map((yearData, index) => (
                        <Line
                          key={`income-${yearData.year}`}
                          type="monotone"
                          dataKey={`Prihodi ${yearData.year}`}
                          stroke={yearColors[index % yearColors.length]}
                          strokeWidth={2}
                          name={`Prihodi ${yearData.year}`}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usporedba rashoda po mjesecima</CardTitle>
                  <CardDescription>Mjesečni rashodi za odabrane godine</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={comparisonChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      {yearComparison.map((yearData, index) => (
                        <Line
                          key={`expense-${yearData.year}`}
                          type="monotone"
                          dataKey={`Rashodi ${yearData.year}`}
                          stroke={yearColors[index % yearColors.length]}
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          name={`Rashodi ${yearData.year}`}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nema podataka za odabrane godine
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          {predictiveLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : predictiveData ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Prediktivna analiza
                  </CardTitle>
                  <CardDescription>
                    Projekcije prihoda, rashoda i profita za sljedeća tri mjeseca na temelju povijesnih podataka
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border bg-muted/50 p-4">
                      <p className="text-sm text-muted-foreground">
                        Projekcije se temelje na analizi trendova i prosjeka iz posljednja tri mjeseca. 
                        Koristite simulaciju za testiranje različitih scenarija rasta ili pada.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      {projectionsToUse.map((proj: any, index: number) => (
                        <Card key={index}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {getMonthName(Number(proj.month) - 1)} {proj.year}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Prihodi:</span>
                              <span className="text-sm font-semibold text-green-600">
                                {formatCurrency(centsToEur(proj.projectedIncome))}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Rashodi:</span>
                              <span className="text-sm font-semibold text-red-600">
                                {formatCurrency(centsToEur(proj.projectedExpenses))}
                              </span>
                            </div>
                            <div className="flex justify-between border-t pt-2">
                              <span className="text-sm font-medium">Profit:</span>
                              <span
                                className={`text-sm font-bold ${
                                  Number(proj.projectedProfit) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {formatCurrency(centsToEur(proj.projectedProfit))}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Simulacija scenarija</CardTitle>
                  <CardDescription>
                    Prilagodite postotke rasta ili pada prihoda i rashoda za testiranje različitih scenarija
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="income-growth">Rast prihoda (%)</Label>
                        <Input
                          id="income-growth"
                          type="number"
                          step="0.1"
                          value={incomeGrowth}
                          onChange={(e) => setIncomeGrowth(e.target.value)}
                          placeholder="npr. 10 za +10%"
                        />
                        <p className="text-xs text-muted-foreground">
                          Pozitivna vrijednost za rast, negativna za pad
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expense-growth">Rast rashoda (%)</Label>
                        <Input
                          id="expense-growth"
                          type="number"
                          step="0.1"
                          value={expenseGrowth}
                          onChange={(e) => setExpenseGrowth(e.target.value)}
                          placeholder="npr. 5 za +5%"
                        />
                        <p className="text-xs text-muted-foreground">
                          Pozitivna vrijednost za rast, negativna za pad
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleRunSimulation}
                        disabled={runSimulationMutation.isPending}
                        className="flex-1"
                      >
                        <TrendingUp className="mr-2 h-4 w-4" />
                        {runSimulationMutation.isPending ? 'Izvršavanje...' : 'Pokreni simulaciju'}
                      </Button>
                      
                      {simulationResult && (
                        <Button
                          onClick={handleResetSimulation}
                          variant="outline"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Resetiraj
                        </Button>
                      )}
                    </div>

                    {simulationResult && (
                      <div className="rounded-lg border bg-primary/5 p-4">
                        <p className="text-sm font-medium">Rezultati simulacije:</p>
                        <div className="mt-2 grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ukupni predviđeni prihodi:</span>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(centsToEur(simulationResult.totalProjectedIncome))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ukupni predviđeni rashodi:</span>
                            <span className="font-semibold text-red-600">
                              {formatCurrency(centsToEur(simulationResult.totalProjectedExpenses))}
                            </span>
                          </div>
                          <div className="flex justify-between border-t pt-2">
                            <span className="font-medium">Ukupna predviđena dobit:</span>
                            <span
                              className={`font-bold ${
                                Number(simulationResult.totalProjectedProfit) >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {formatCurrency(centsToEur(simulationResult.totalProjectedProfit))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grafički prikaz projekcija</CardTitle>
                  <CardDescription>
                    {simulationResult
                      ? 'Vizualizacija simuliranih projekcija'
                      : 'Vizualizacija osnovnih projekcija'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={predictiveChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="Predviđeni prihodi"
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="Predviđeni rashodi"
                        stroke="hsl(0, 84%, 60%)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Line
                        type="monotone"
                        dataKey="Predviđena dobit"
                        stroke="hsl(217, 91%, 60%)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usporedba projekcija</CardTitle>
                  <CardDescription>Stupčasti prikaz predviđenih prihoda i rashoda</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={predictiveChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="Predviđeni prihodi" fill="hsl(142, 76%, 36%)" />
                      <Bar dataKey="Predviđeni rashodi" fill="hsl(0, 84%, 60%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nema dovoljno povijesnih podataka za generiranje projekcija
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Analiza poslovanja
              </CardTitle>
              <CardDescription>
                Usporedba vašeg poslovanja s prosjekom industrije ugostiteljstva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Analiza uspoređuje vaše financijske pokazatelje s verificiranim prosjekom industrije (Eurostat/DZS).
                    Rezultati su prilagođeni prema parametrima vašeg profila objekta.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="analysis-period">Period analize</Label>
                    <Select
                      value={analysisPeriod}
                      onValueChange={(v: any) => setAnalysisPeriod(v)}
                    >
                      <SelectTrigger id="analysis-period">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Mjesečno</SelectItem>
                        <SelectItem value="yearly">Godišnje</SelectItem>
                        <SelectItem value="cumulative">Kumulativno (svi mjeseci)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {analysisPeriod === 'monthly' && (
                    <div className="space-y-2">
                      <Label htmlFor="analysis-month">Mjesec</Label>
                      <Select
                        value={analysisMonth.toString()}
                        onValueChange={(v) => setAnalysisMonth(Number(v))}
                      >
                        <SelectTrigger id="analysis-month">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((month, index) => (
                            <SelectItem key={index} value={(index + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {analysisPeriod !== 'cumulative' && (
                    <div className="space-y-2">
                      <Label htmlFor="analysis-year">Godina</Label>
                      <Select
                        value={analysisYear.toString()}
                        onValueChange={(v) => setAnalysisYear(Number(v))}
                      >
                        <SelectTrigger id="analysis-year">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {performanceAnalysis?.diagnosticInfo && (
                  <div className="rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Dijagnostika:
                    </p>
                    <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                      {performanceAnalysis.diagnosticInfo}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {!businessProfile ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-600" />
                <p className="text-lg font-medium">Profil objekta nije postavljen</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Za analizu poslovanja potrebno je prvo postaviti profil objekta s parametrima lokacije, broja sjedala, vrste ponude i sezonske aktivnosti.
                </p>
              </CardContent>
            </Card>
          ) : performanceLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : performanceError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-600" />
                <p className="text-lg font-medium">Greška pri učitavanju analize</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {performanceError.message || 'Molimo pokušajte ponovno'}
                </p>
              </CardContent>
            </Card>
          ) : performanceAnalysis ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Performanse prihoda</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(centsToEur(performanceAnalysis.userIncome))}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Prosjek: {formatCurrency(centsToEur(performanceAnalysis.industryBenchmark.averageIncome))}
                        </div>
                      </div>
                      {getPerformanceIcon(performanceAnalysis.incomeDeviation.deviationPercentage)}
                    </div>
                    <div className="mt-2">
                      {getPerformanceBadge(performanceAnalysis.incomeDeviation.deviationPercentage)}
                      <span className="ml-2 text-sm font-medium">
                        {performanceAnalysis.incomeDeviation.deviationPercentage > 0 ? '+' : ''}
                        {performanceAnalysis.incomeDeviation.deviationPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Marža profita</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {(Number(performanceAnalysis.profitMarginDeviation.userValue) / 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Prosjek: {(Number(performanceAnalysis.profitMarginDeviation.industryAverage) / 100).toFixed(1)}%
                        </div>
                      </div>
                      {getPerformanceIcon(performanceAnalysis.profitMarginDeviation.deviationPercentage)}
                    </div>
                    <div className="mt-2">
                      {getPerformanceBadge(performanceAnalysis.profitMarginDeviation.deviationPercentage)}
                      <span className="ml-2 text-sm font-medium">
                        {performanceAnalysis.profitMarginDeviation.deviationPercentage > 0 ? '+' : ''}
                        {performanceAnalysis.profitMarginDeviation.deviationPercentage.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {performanceAnalysis.industryBenchmark.revenuePerSeat && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Prihod po sjedalu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold">
                            {formatCurrency(centsToEur(performanceAnalysis.userIncome / BigInt(businessProfile.numberOfSeats)))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Prosjek: {formatCurrency(centsToEur(performanceAnalysis.industryBenchmark.revenuePerSeat))}
                          </div>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Analiza rashoda po kategorijama</CardTitle>
                  <CardDescription>
                    Usporedba vaših rashoda s prosjekom industrije
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceAnalysis.expenseDeviations.map((deviation: any, index: number) => (
                      <div key={index} className="rounded-lg border p-4">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{deviation.category}</span>
                            {getPerformanceBadge(deviation.deviationPercentage)}
                          </div>
                          <div className="flex items-center gap-2">
                            {getPerformanceIcon(deviation.deviationPercentage)}
                            <span className="text-sm font-medium">
                              {deviation.deviationPercentage > 0 ? '+' : ''}
                              {deviation.deviationPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="grid gap-2 text-sm md:grid-cols-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Vaši rashodi:</span>
                            <span className="font-semibold">{formatCurrency(centsToEur(deviation.userValue))}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Prosjek industrije:</span>
                            <span className="font-semibold">{formatCurrency(centsToEur(deviation.industryAverage))}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {performanceChartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Grafička usporedba rashoda</CardTitle>
                    <CardDescription>Vizualni prikaz vaših rashoda u odnosu na prosjek industrije</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={performanceChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                        <Bar dataKey="Vaši rashodi" fill="hsl(0, 84%, 60%)" />
                        <Bar dataKey="Prosjek industrije" fill="hsl(217, 91%, 60%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {performanceAnalysis.recommendations && performanceAnalysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Preporuke za poboljšanje</CardTitle>
                    <CardDescription>
                      Specifične preporuke temeljene na analizi vašeg poslovanja
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {performanceAnalysis.recommendations.map((rec: string, index: number) => (
                        <div key={index} className="flex gap-3 rounded-lg border p-3">
                          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                          <p className="text-sm">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Nema dovoljno podataka za analizu poslovanja
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
