import { TransactionType } from "@/backend";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetAllMonthlyIncomes,
  useGetAllTransactions,
} from "@/hooks/useQueries";
import {
  CROATIAN_MONTHS,
  centsToEur,
  formatCurrency,
  getMonthEndTimestamp,
  getMonthStartTimestamp,
} from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  FileText,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useMemo, useState } from "react";

interface FinancialData {
  month: string;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
}

interface ComparisonResult {
  category: string;
  pdfValue: number;
  backendValue: number;
  difference: number;
  percentageDiff: number;
  status: "match" | "minor" | "major";
}

interface MonthlyOverview {
  monthIndex: number;
  monthName: string;
  totalIncome: number;
  totalExpenses: number;
  profit: number;
}

export default function DataAnalysis() {
  const [pdfData, _setPdfData] = useState<FinancialData[]>([]);
  const [selectedYear, _setSelectedYear] = useState(new Date().getFullYear());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<
    ComparisonResult[]
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: allTransactions, isLoading: txLoading } =
    useGetAllTransactions();
  const { data: allMonthlyIncomes } = useGetAllMonthlyIncomes();

  // Compute yearly totals and monthly breakdown directly from transactions
  const yearlyData = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    const monthlyMap: Record<number, { income: number; expenses: number }> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyMap[m] = { income: 0, expenses: 0 };
    }

    // Regular transactions
    if (allTransactions) {
      for (const t of allTransactions) {
        const date = new Date(Number(t.date) / 1_000_000);
        const tYear = date.getFullYear();
        const tMonth = date.getMonth() + 1;
        if (tYear !== selectedYear) continue;

        const amountEur = centsToEur(t.amount);
        if (t.transactionType === TransactionType.prihod) {
          totalIncome += amountEur;
          monthlyMap[tMonth].income += amountEur;
        } else if (t.transactionType === TransactionType.rashod) {
          totalExpenses += amountEur;
          monthlyMap[tMonth].expenses += amountEur;
        }
      }
    }

    // Monthly incomes from "Brzi unos prihoda"
    if (allMonthlyIncomes) {
      for (const inc of allMonthlyIncomes) {
        if (Number(inc.year) !== selectedYear) continue;
        const m = Number(inc.month);
        const amountEur = centsToEur(inc.amount);
        totalIncome += amountEur;
        if (monthlyMap[m]) monthlyMap[m].income += amountEur;
      }
    }

    const monthlyOverviews: MonthlyOverview[] = CROATIAN_MONTHS.map(
      (name, idx) => {
        const m = idx + 1;
        const inc = monthlyMap[m].income;
        const exp = monthlyMap[m].expenses;
        return {
          monthIndex: idx,
          monthName: name,
          totalIncome: inc,
          totalExpenses: exp,
          profit: inc - exp,
        };
      },
    );

    return {
      totalIncome,
      totalExpenses,
      profit: totalIncome - totalExpenses,
      monthlyOverviews,
    };
  }, [allTransactions, allMonthlyIncomes, selectedYear]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setUploadError("Molimo učitajte PDF datoteku");
      return;
    }
    setIsAnalyzing(true);
    setUploadError(null);
    try {
      setUploadError(
        "Automatsko parsiranje PDF-a nije dostupno. Molimo koristite ručni unos podataka ispod ili izvezite podatke iz sustava za usporedbu.",
      );
    } catch (_error) {
      setUploadError("Greška pri obradi PDF datoteke");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const _performComparison = () => {
    if (pdfData.length === 0) return;
    const results: ComparisonResult[] = [];

    const incomeDiff =
      pdfData.reduce((s, d) => s + d.totalIncome, 0) - yearlyData.totalIncome;
    const expDiff =
      pdfData.reduce((s, d) => s + d.totalExpenses, 0) -
      yearlyData.totalExpenses;
    const profitDiff =
      pdfData.reduce((s, d) => s + d.profit, 0) - yearlyData.profit;

    const mkStatus = (pct: number): "match" | "minor" | "major" =>
      Math.abs(pct) < 0.01 ? "match" : Math.abs(pct) < 1 ? "minor" : "major";

    results.push({
      category: "Ukupni prihodi",
      pdfValue: pdfData.reduce((s, d) => s + d.totalIncome, 0),
      backendValue: yearlyData.totalIncome,
      difference: incomeDiff,
      percentageDiff:
        yearlyData.totalIncome !== 0
          ? (incomeDiff / yearlyData.totalIncome) * 100
          : 0,
      status: mkStatus(
        yearlyData.totalIncome !== 0
          ? (incomeDiff / yearlyData.totalIncome) * 100
          : 0,
      ),
    });
    results.push({
      category: "Ukupni rashodi",
      pdfValue: pdfData.reduce((s, d) => s + d.totalExpenses, 0),
      backendValue: yearlyData.totalExpenses,
      difference: expDiff,
      percentageDiff:
        yearlyData.totalExpenses !== 0
          ? (expDiff / yearlyData.totalExpenses) * 100
          : 0,
      status: mkStatus(
        yearlyData.totalExpenses !== 0
          ? (expDiff / yearlyData.totalExpenses) * 100
          : 0,
      ),
    });
    results.push({
      category: "Profit",
      pdfValue: pdfData.reduce((s, d) => s + d.profit, 0),
      backendValue: yearlyData.profit,
      difference: profitDiff,
      percentageDiff:
        yearlyData.profit !== 0 ? (profitDiff / yearlyData.profit) * 100 : 0,
      status: mkStatus(
        yearlyData.profit !== 0 ? (profitDiff / yearlyData.profit) * 100 : 0,
      ),
    });

    setComparisonResults(results);
  };

  const getStatusBadge = (status: "match" | "minor" | "major") => {
    switch (status) {
      case "match":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Podudaranje
          </Badge>
        );
      case "minor":
        return (
          <Badge variant="secondary">
            <AlertCircle className="mr-1 h-3 w-3" />
            Mala razlika
          </Badge>
        );
      case "major":
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Velika razlika
          </Badge>
        );
    }
  };

  const generateReport = () => {
    const majorIssues = comparisonResults.filter((r) => r.status === "major");
    const minorIssues = comparisonResults.filter((r) => r.status === "minor");
    const matches = comparisonResults.filter((r) => r.status === "match");

    let report = "IZVJEŠTAJ O USPOREDBI FINANCIJSKIH PODATAKA\n";
    report += `Datum: ${new Date().toLocaleDateString("hr-HR")}\n`;
    report += `Godina: ${selectedYear}\n\n`;
    report += "SAŽETAK:\n";
    report += `- Ukupno usporedbi: ${comparisonResults.length}\n`;
    report += `- Podudaranja: ${matches.length}\n`;
    report += `- Male razlike: ${minorIssues.length}\n`;
    report += `- Velike razlike: ${majorIssues.length}\n\n`;

    if (majorIssues.length > 0) {
      report += "VELIKE RAZLIKE (zahtijevaju pažnju):\n";
      for (const issue of majorIssues) {
        report += `\n${issue.category}:\n`;
        report += `  PDF vrijednost: ${formatCurrency(issue.pdfValue)}\n`;
        report += `  Backend vrijednost: ${formatCurrency(issue.backendValue)}\n`;
        report += `  Razlika: ${formatCurrency(issue.difference)} (${issue.percentageDiff.toFixed(2)}%)\n`;
      }
    }

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `analiza-podataka-${selectedYear}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Analiza podataka</h2>
        <p className="text-muted-foreground">
          Usporedba PDF podataka s backend izračunima
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Učitaj PDF datoteku</CardTitle>
            <CardDescription>
              Učitajte PDF izvještaj za usporedbu s podacima iz sustava.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <label className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Odaberi PDF datoteku
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isAnalyzing}
                    />
                  </label>
                </Button>
                {isAnalyzing && (
                  <span className="text-sm text-muted-foreground">
                    Analiziram...
                  </span>
                )}
              </div>
              {uploadError && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Napomena</AlertTitle>
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertTitle>Alternativa: Ručna usporedba</AlertTitle>
                <AlertDescription>
                  Možete izvesti podatke iz sustava korištenjem opcije "Izvezi u
                  CSV" ili "Izvezi u PDF" u zaglavlju, a zatim ručno usporediti
                  s vašim PDF dokumentom.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {txLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Trenutni podaci iz sustava ({selectedYear})</CardTitle>
              <CardDescription>
                Podaci izračunati direktno iz svih transakcija
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Ukupni prihodi
                  </div>
                  <div className="mt-2 text-2xl font-bold text-green-600">
                    {formatCurrency(yearlyData.totalIncome)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingDown className="h-4 w-4" />
                    Ukupni rashodi
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-600">
                    {formatCurrency(yearlyData.totalExpenses)}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Profit
                  </div>
                  <div
                    className={`mt-2 text-2xl font-bold ${
                      yearlyData.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {formatCurrency(yearlyData.profit)}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="mb-3 font-semibold">Mjesečni pregled</h4>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mjesec</TableHead>
                        <TableHead className="text-right">Prihodi</TableHead>
                        <TableHead className="text-right">Rashodi</TableHead>
                        <TableHead className="text-right">Profit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {yearlyData.monthlyOverviews.map((overview) => (
                        <TableRow key={overview.monthName}>
                          <TableCell className="font-medium">
                            {overview.monthName}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(overview.totalIncome)}
                          </TableCell>
                          <TableCell className="text-right text-red-600">
                            {formatCurrency(overview.totalExpenses)}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              overview.profit >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(overview.profit)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {comparisonResults.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Rezultati usporedbe</CardTitle>
                  <CardDescription>
                    Detaljni pregled razlika između PDF-a i backend podataka
                  </CardDescription>
                </div>
                <Button onClick={generateReport}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generiraj izvještaj
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategorija</TableHead>
                      <TableHead className="text-right">
                        PDF vrijednost
                      </TableHead>
                      <TableHead className="text-right">
                        Backend vrijednost
                      </TableHead>
                      <TableHead className="text-right">Razlika</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonResults.map((result) => (
                      <TableRow key={result.category}>
                        <TableCell className="font-medium">
                          {result.category}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(result.pdfValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(result.backendValue)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            Math.abs(result.difference) < 0.01
                              ? "text-green-600"
                              : Math.abs(result.difference) < 10
                                ? "text-yellow-600"
                                : "text-red-600"
                          }`}
                        >
                          {result.difference >= 0 ? "+" : ""}
                          {formatCurrency(result.difference)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {result.percentageDiff.toFixed(2)}%
                        </TableCell>
                        <TableCell>{getStatusBadge(result.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-900">
                      Podudaranja
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-bold text-green-600">
                    {
                      comparisonResults.filter((r) => r.status === "match")
                        .length
                    }
                  </div>
                </div>
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <span className="font-semibold text-yellow-900">
                      Male razlike
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-bold text-yellow-600">
                    {
                      comparisonResults.filter((r) => r.status === "minor")
                        .length
                    }
                  </div>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="font-semibold text-red-900">
                      Velike razlike
                    </span>
                  </div>
                  <div className="mt-2 text-3xl font-bold text-red-600">
                    {
                      comparisonResults.filter((r) => r.status === "major")
                        .length
                    }
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Tehnički detalji</CardTitle>
            <CardDescription>
              Informacije o implementaciji i izračunima
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold">Konverzija valute:</h4>
                <p className="text-muted-foreground">
                  Svi iznosi se pohranjuju u backend-u kao centi (Int) i
                  konvertiraju se u eure korištenjem centralizirane funkcije{" "}
                  <code className="rounded bg-muted px-1 py-0.5">
                    centsToEur()
                  </code>{" "}
                  koja dijeli s 100.
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Izvor podataka:</h4>
                <p className="text-muted-foreground">
                  Podaci se izračunavaju direktno iz svih transakcija i
                  mjesečnih prihoda, osiguravajući da se svaka nova transakcija
                  odmah odražava u ovom pregledu.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
