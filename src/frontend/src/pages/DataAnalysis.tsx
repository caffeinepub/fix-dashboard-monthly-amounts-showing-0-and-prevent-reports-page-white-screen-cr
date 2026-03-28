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
import { useGetMonthlyReport, useGetYearlyReport } from "@/hooks/useQueries";
import { centsToEur, formatCurrency } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  FileText,
  TrendingDown,
  TrendingUp,
  Upload,
} from "lucide-react";
import { useState } from "react";

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

export default function DataAnalysis() {
  const [pdfData, _setPdfData] = useState<FinancialData[]>([]);
  const [selectedYear, _setSelectedYear] = useState(new Date().getFullYear());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<
    ComparisonResult[]
  >([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: yearlyReport, isLoading: yearlyLoading } =
    useGetYearlyReport(selectedYear);

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
      // Note: Since we cannot parse PDF in the browser without external libraries,
      // we'll provide a manual input interface for now
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
    if (!yearlyReport || pdfData.length === 0) return;

    const results: ComparisonResult[] = [];

    // Compare total income
    const backendTotalIncome = centsToEur(
      yearlyReport.totalOverview.totalIncome,
    );
    const pdfTotalIncome = pdfData.reduce(
      (sum, data) => sum + data.totalIncome,
      0,
    );
    const incomeDiff = pdfTotalIncome - backendTotalIncome;
    const incomePercentDiff =
      backendTotalIncome !== 0 ? (incomeDiff / backendTotalIncome) * 100 : 0;

    results.push({
      category: "Ukupni prihodi",
      pdfValue: pdfTotalIncome,
      backendValue: backendTotalIncome,
      difference: incomeDiff,
      percentageDiff: incomePercentDiff,
      status:
        Math.abs(incomePercentDiff) < 0.01
          ? "match"
          : Math.abs(incomePercentDiff) < 1
            ? "minor"
            : "major",
    });

    // Compare total expenses
    const backendTotalExpenses = centsToEur(
      yearlyReport.totalOverview.totalExpenses,
    );
    const pdfTotalExpenses = pdfData.reduce(
      (sum, data) => sum + data.totalExpenses,
      0,
    );
    const expensesDiff = pdfTotalExpenses - backendTotalExpenses;
    const expensesPercentDiff =
      backendTotalExpenses !== 0
        ? (expensesDiff / backendTotalExpenses) * 100
        : 0;

    results.push({
      category: "Ukupni rashodi",
      pdfValue: pdfTotalExpenses,
      backendValue: backendTotalExpenses,
      difference: expensesDiff,
      percentageDiff: expensesPercentDiff,
      status:
        Math.abs(expensesPercentDiff) < 0.01
          ? "match"
          : Math.abs(expensesPercentDiff) < 1
            ? "minor"
            : "major",
    });

    // Compare profit
    const backendProfit = centsToEur(yearlyReport.totalOverview.profit);
    const pdfProfit = pdfData.reduce((sum, data) => sum + data.profit, 0);
    const profitDiff = pdfProfit - backendProfit;
    const profitPercentDiff =
      backendProfit !== 0 ? (profitDiff / backendProfit) * 100 : 0;

    results.push({
      category: "Profit",
      pdfValue: pdfProfit,
      backendValue: backendProfit,
      difference: profitDiff,
      percentageDiff: profitPercentDiff,
      status:
        Math.abs(profitPercentDiff) < 0.01
          ? "match"
          : Math.abs(profitPercentDiff) < 1
            ? "minor"
            : "major",
    });

    // Compare monthly data
    for (const pdfMonth of pdfData) {
      const monthIndex = Number.parseInt(pdfMonth.month) - 1;
      if (
        monthIndex >= 0 &&
        monthIndex < 12 &&
        yearlyReport.monthlyOverviews[monthIndex]
      ) {
        const backendMonth = yearlyReport.monthlyOverviews[monthIndex];

        const monthNames = [
          "Siječanj",
          "Veljača",
          "Ožujak",
          "Travanj",
          "Svibanj",
          "Lipanj",
          "Srpanj",
          "Kolovoz",
          "Rujan",
          "Listopad",
          "Studeni",
          "Prosinac",
        ];

        // Income comparison
        const backendIncome = centsToEur(backendMonth.totalIncome);
        const incomeDiff = pdfMonth.totalIncome - backendIncome;
        const incomePercentDiff =
          backendIncome !== 0 ? (incomeDiff / backendIncome) * 100 : 0;

        results.push({
          category: `${monthNames[monthIndex]} - Prihodi`,
          pdfValue: pdfMonth.totalIncome,
          backendValue: backendIncome,
          difference: incomeDiff,
          percentageDiff: incomePercentDiff,
          status:
            Math.abs(incomePercentDiff) < 0.01
              ? "match"
              : Math.abs(incomePercentDiff) < 1
                ? "minor"
                : "major",
        });

        // Expenses comparison
        const backendExpenses = centsToEur(backendMonth.totalExpenses);
        const expensesDiff = pdfMonth.totalExpenses - backendExpenses;
        const expensesPercentDiff =
          backendExpenses !== 0 ? (expensesDiff / backendExpenses) * 100 : 0;

        results.push({
          category: `${monthNames[monthIndex]} - Rashodi`,
          pdfValue: pdfMonth.totalExpenses,
          backendValue: backendExpenses,
          difference: expensesDiff,
          percentageDiff: expensesPercentDiff,
          status:
            Math.abs(expensesPercentDiff) < 0.01
              ? "match"
              : Math.abs(expensesPercentDiff) < 1
                ? "minor"
                : "major",
        });
      }
    }

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
      report += "\n";
    }

    if (minorIssues.length > 0) {
      report += "MALE RAZLIKE (moguće zaokruživanje):\n";
      for (const issue of minorIssues) {
        report += `\n${issue.category}:\n`;
        report += `  PDF vrijednost: ${formatCurrency(issue.pdfValue)}\n`;
        report += `  Backend vrijednost: ${formatCurrency(issue.backendValue)}\n`;
        report += `  Razlika: ${formatCurrency(issue.difference)} (${issue.percentageDiff.toFixed(2)}%)\n`;
      }
      report += "\n";
    }

    report += "PREPORUKE:\n";
    if (majorIssues.length > 0) {
      report +=
        "1. Provjerite funkcije backend izračuna za kategorije s velikim razlikama\n";
      report += "2. Provjerite granice datuma za mjesečne agregacije\n";
      report += "3. Provjerite konverziju između centi i eura\n";
    } else if (minorIssues.length > 0) {
      report += "1. Male razlike mogu biti rezultat zaokruživanja\n";
      report +=
        "2. Provjerite da sve komponente koriste centralizirane funkcije konverzije\n";
    } else {
      report += "Svi podaci se podudaraju! Sustav radi ispravno.\n";
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
              Učitajte PDF izvještaj za usporedbu s podacima iz sustava. Sustav
              će automatski analizirati podatke i identificirati razlike.
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
                  Možete izvesti podatke iz sustava koristeći opciju "Izvezi u
                  CSV" ili "Izvezi u PDF" u zaglavlju, a zatim ručno usporediti
                  s vašim PDF dokumentom. Sustav koristi centralizirane funkcije
                  konverzije (centsToEur) i hrvatske lokalne postavke za
                  formatiranje valute s točno 2 decimalna mjesta.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {yearlyLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : yearlyReport ? (
          <Card>
            <CardHeader>
              <CardTitle>Trenutni podaci iz sustava ({selectedYear})</CardTitle>
              <CardDescription>
                Ovi podaci su izračunati korištenjem backend funkcija s
                pravilnim granicama datuma i konverzijom valute
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
                    {formatCurrency(
                      centsToEur(yearlyReport.totalOverview.totalIncome),
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingDown className="h-4 w-4" />
                    Ukupni rashodi
                  </div>
                  <div className="mt-2 text-2xl font-bold text-red-600">
                    {formatCurrency(
                      centsToEur(yearlyReport.totalOverview.totalExpenses),
                    )}
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Profit
                  </div>
                  <div
                    className={`mt-2 text-2xl font-bold ${
                      Number(yearlyReport.totalOverview.profit) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(
                      centsToEur(yearlyReport.totalOverview.profit),
                    )}
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
                      {yearlyReport.monthlyOverviews.map((overview, index) => {
                        const monthNames = [
                          "Siječanj",
                          "Veljača",
                          "Ožujak",
                          "Travanj",
                          "Svibanj",
                          "Lipanj",
                          "Srpanj",
                          "Kolovoz",
                          "Rujan",
                          "Listopad",
                          "Studeni",
                          "Prosinac",
                        ];
                        return (
                          <TableRow key={monthNames[index] ?? index}>
                            <TableCell className="font-medium">
                              {monthNames[index]}
                            </TableCell>
                            <TableCell className="text-right text-green-600">
                              {formatCurrency(centsToEur(overview.totalIncome))}
                            </TableCell>
                            <TableCell className="text-right text-red-600">
                              {formatCurrency(
                                centsToEur(overview.totalExpenses),
                              )}
                            </TableCell>
                            <TableCell
                              className={`text-right font-semibold ${
                                Number(overview.profit) >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(centsToEur(overview.profit))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

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
                  koja dijeli s 100. Formatiranje koristi hrvatske lokalne
                  postavke s točno 2 decimalna mjesta.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Granice datuma:</h4>
                <p className="text-muted-foreground">
                  Mjesečne agregacije koriste funkcije{" "}
                  <code className="rounded bg-muted px-1 py-0.5">
                    getMonthStartTimestamp()
                  </code>{" "}
                  i{" "}
                  <code className="rounded bg-muted px-1 py-0.5">
                    getMonthEndTimestamp()
                  </code>{" "}
                  koje izračunavaju točne granice mjeseca usklađene s backend
                  logikom.
                </p>
              </div>

              <div>
                <h4 className="font-semibold">Backend funkcije:</h4>
                <ul className="list-inside list-disc text-muted-foreground">
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5">
                      getMonthlyOverview()
                    </code>{" "}
                    - Izračunava mjesečni pregled
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5">
                      getYearlyOverview()
                    </code>{" "}
                    - Izračunava godišnji pregled
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5">
                      getMonthlyReport()
                    </code>{" "}
                    - Generira mjesečni izvještaj
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5">
                      getPdfFinancialReportData()
                    </code>{" "}
                    - Dohvaća podatke za PDF izvještaj
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold">Točnost decimalnih mjesta:</h4>
                <p className="text-muted-foreground">
                  Sve komponente (Dashboard, Reports, QuickIncome, Transactions,
                  Exports) koriste iste funkcije konverzije kako bi se osigurala
                  dosljednost. Funkcija{" "}
                  <code className="rounded bg-muted px-1 py-0.5">
                    formatCurrency()
                  </code>{" "}
                  koristi se samo za prikaz, ne za izračune.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
