import type { ExportData } from "@/types/backend-types";
import { toast } from "sonner";
import { centsToEur, formatCurrency } from "./utils";

export function exportToCSV(data: ExportData): string {
  const rows: string[] = [];

  // Header
  rows.push("Tip,Datum,Iznos (EUR),Kategorija,Način plaćanja,Opis");

  // Transactions
  for (const t of data.transactions) {
    const type = t.transactionType === "prihod" ? "Prihod" : "Rashod";
    const date = new Date(Number(t.date) / 1000000).toLocaleDateString("hr-HR");
    const amount = centsToEur(t.amount);
    const category = t.expenseCategory || "";
    const paymentMethod = t.paymentMethod || "";
    const description = t.description.replace(/,/g, ";"); // Replace commas in description

    rows.push(
      `${type},${date},${amount},${category},${paymentMethod},"${description}"`,
    );
  }

  // Monthly incomes
  rows.push(""); // Empty line
  rows.push("Mjesečni prihodi");
  rows.push("Godina,Mjesec,Iznos (EUR)");

  for (const mi of data.monthlyIncomes) {
    const amount = centsToEur(mi.amount);
    rows.push(`${mi.year},${mi.month},${amount}`);
  }

  return rows.join("\n");
}

export async function exportToJSON(data: ExportData) {
  try {
    // Retry logic for robust export
    let exportData = data;

    // Validate data
    if (
      !exportData ||
      (!exportData.transactions && !exportData.monthlyIncomes)
    ) {
      throw new Error("Nema podataka za izvoz");
    }

    const jsonString = JSON.stringify(
      exportData,
      (_key, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    );

    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Podaci uspješno izvezeni u JSON formatu");
  } catch (error: any) {
    console.error("JSON export error:", error);
    toast.error("Greška pri izvozu podataka", {
      description: error?.message || "Molimo pokušajte ponovno",
    });
    throw error;
  }
}

export async function exportToPDFByYear(
  _data: ExportData,
  restaurantName: string,
  year: number | null,
  getPdfData: (year: bigint | null) => Promise<any>,
) {
  try {
    const pdfData = await getPdfData(year === null ? null : BigInt(year));

    // Create a simple text-based report since jsPDF is not available
    const reportLines: string[] = [];

    reportLines.push(restaurantName);
    reportLines.push("");
    const reportTitle =
      year === null
        ? "Financijski izvještaj - Sve godine"
        : `Financijski izvještaj - ${year}`;
    reportLines.push(reportTitle);
    reportLines.push("=".repeat(50));
    reportLines.push("");

    // Overview
    reportLines.push("PREGLED:");
    reportLines.push(
      `Ukupni prihodi: ${formatCurrency(centsToEur(pdfData.overview.totalIncome))}`,
    );
    reportLines.push(
      `Ukupni rashodi: ${formatCurrency(centsToEur(pdfData.overview.totalExpenses))}`,
    );
    reportLines.push(
      `Profit: ${formatCurrency(centsToEur(pdfData.overview.profit))}`,
    );
    reportLines.push("");

    // Transactions
    if (pdfData.transactions && pdfData.transactions.length > 0) {
      reportLines.push("TRANSAKCIJE:");
      reportLines.push("-".repeat(50));
      for (const t of pdfData.transactions as any[]) {
        const type = t.transactionType === "prihod" ? "Prihod" : "Rashod";
        const date = new Date(Number(t.date) / 1000000).toLocaleDateString(
          "hr-HR",
        );
        const amount = formatCurrency(centsToEur(t.amount));
        const category = t.expenseCategory || "";
        reportLines.push(
          `${type} | ${date} | ${amount} | ${category} | ${t.description}`,
        );
      }
      reportLines.push("");
    }

    // Monthly incomes
    if (pdfData.monthlyIncomes && pdfData.monthlyIncomes.length > 0) {
      reportLines.push("MJESEČNI PRIHODI:");
      reportLines.push("-".repeat(50));
      for (const mi of pdfData.monthlyIncomes as any[]) {
        const amount = formatCurrency(centsToEur(mi.amount));
        reportLines.push(`${mi.year} | Mjesec ${mi.month} | ${amount}`);
      }
    }

    const reportText = reportLines.join("\n");
    const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "report.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Izvještaj uspješno generiran (TXT format)");
  } catch (error) {
    console.error("Report export error:", error);
    toast.error("Greška pri generiranju izvještaja");
    throw error;
  }
}

// Placeholder functions for technical reports
export async function exportDfinityTechnicalReportPDF(reportData: any) {
  console.log("DFINITY Technical Report:", reportData);
  toast.info("PDF generiranje nije još implementirano");
}

export async function exportDfinityTechnicalAnalysisPDF(analysisData: any) {
  console.log("DFINITY Technical Analysis:", analysisData);
  toast.info("PDF generiranje nije još implementirano");
}

export async function exportInternalTechnicalDocumentationPDF() {
  console.log("Internal Technical Documentation");
  toast.info("PDF generiranje nije još implementirano");
}

export async function exportExternalDfinitySupportPDF() {
  console.log("External DFINITY Support Report");
  toast.info("PDF generiranje nije još implementirano");
}
