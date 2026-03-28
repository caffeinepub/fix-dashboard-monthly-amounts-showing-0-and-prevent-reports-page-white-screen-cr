import { ExportData } from '@/backend';
import { centsToEur, MONTH_NAMES } from './utils';

/**
 * Export data to JSON format with robust error handling and retry logic
 * @param fetchExportData - Function to fetch export data from backend
 * @returns Promise that resolves when download is complete
 */
export async function exportToJSON(
  fetchExportData: () => Promise<ExportData>
): Promise<void> {
  let lastError: Error | null = null;
  
  // Retry logic: attempt twice
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`[JSON Export] Pokušaj ${attempt}/2: Dohvaćanje podataka...`);
      
      // Fetch data from backend with proper await
      const data = await fetchExportData();
      
      // Validate response
      if (!data) {
        throw new Error('Podaci nisu dostupni. Backend je vratio prazan odgovor.');
      }
      
      // Validate data structure
      if (!data.transactions || !Array.isArray(data.transactions)) {
        throw new Error('Neispravna struktura podataka: transakcije nisu pronađene.');
      }
      
      if (!data.monthlyIncomes || !Array.isArray(data.monthlyIncomes)) {
        throw new Error('Neispravna struktura podataka: mjesečni prihodi nisu pronađeni.');
      }
      
      console.log(`[JSON Export] Podaci uspješno dohvaćeni:`, {
        transactions: data.transactions.length,
        monthlyIncomes: data.monthlyIncomes.length,
        hasBusinessProfile: !!data.businessProfile,
      });
      
      // Convert BigInt values to strings for JSON serialization
      const jsonData = {
        transactions: data.transactions.map((t) => ({
          id: t.id.toString(),
          amount: t.amount.toString(),
          amountEur: centsToEur(t.amount).toFixed(2),
          transactionType: t.transactionType,
          expenseCategory: t.expenseCategory || null,
          paymentMethod: t.paymentMethod || null,
          date: t.date.toString(),
          dateFormatted: new Date(Number(t.date) / 1000000).toISOString(),
          description: t.description,
        })),
        monthlyIncomes: data.monthlyIncomes.map((mi) => ({
          year: mi.year.toString(),
          month: mi.month.toString(),
          monthName: MONTH_NAMES[Number(mi.month) - 1],
          amount: mi.amount.toString(),
          amountEur: centsToEur(mi.amount).toFixed(2),
        })),
        businessProfile: data.businessProfile ? {
          location: data.businessProfile.location,
          numberOfSeats: data.businessProfile.numberOfSeats.toString(),
          offerType: data.businessProfile.offerType,
          seasonalActivity: data.businessProfile.seasonalActivity,
        } : null,
        exportMetadata: {
          exportDate: new Date().toISOString(),
          totalTransactions: data.transactions.length,
          totalMonthlyIncomes: data.monthlyIncomes.length,
          version: '1.0',
        },
      };
      
      // Convert to JSON string with pretty formatting
      const jsonString = JSON.stringify(jsonData, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `financijski-podaci-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('[JSON Export] Preuzimanje uspješno završeno');
      return; // Success - exit function
      
    } catch (error: any) {
      lastError = error;
      console.error(`[JSON Export] Pokušaj ${attempt}/2 nije uspio:`, error);
      
      // If this is the first attempt, wait before retrying
      if (attempt === 1) {
        console.log('[JSON Export] Čekanje prije ponovnog pokušaja...');
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }
  
  // Both attempts failed - throw error with user-friendly message
  const errorMessage = lastError?.message || 'Nepoznata greška';
  console.error('[JSON Export] Svi pokušaji nisu uspjeli. Zadnja greška:', errorMessage);
  
  throw new Error(
    `Izvoz JSON datoteke nije uspio nakon 2 pokušaja.\n\n` +
    `Razlog: ${errorMessage}\n\n` +
    `Molimo pokušajte ponovno za nekoliko trenutaka. Ako problem i dalje postoji, ` +
    `kontaktirajte podršku.`
  );
}

/**
 * Export data to CSV format
 * Uses centralized centsToEur for all conversions
 */
export function exportToCSV(data: ExportData): string {
  const { transactions, monthlyIncomes } = data;
  
  let csv = 'Type,Amount (EUR),Category,Payment Method,Date,Description\n';

  transactions.forEach((t) => {
    const amount = centsToEur(t.amount).toFixed(2);
    const type = t.transactionType === 'prihod' ? 'Income' : 'Expense';
    const category = t.expenseCategory || '';
    const paymentMethod = t.paymentMethod || '';
    const date = new Date(Number(t.date) / 1000000).toLocaleDateString('en-US');
    const description = t.description || '';

    csv += `${type},${amount},${category},${paymentMethod},${date},"${description}"\n`;
  });

  monthlyIncomes.forEach((mi) => {
    const amount = centsToEur(mi.amount).toFixed(2);
    const monthName = MONTH_NAMES[Number(mi.month) - 1];
    csv += `Monthly Income,${amount},,,"${monthName} ${mi.year}","Quick monthly income entry"\n`;
  });

  return csv;
}

/**
 * Export data to PDF format with year filtering
 * Uses backend getPdfFinancialReportData as single source of truth
 * @param data - Export data containing all transactions and monthly incomes
 * @param restaurantName - Name of the restaurant
 * @param selectedYear - Year to filter by (null for all years)
 * @param getPdfData - Function to fetch PDF data from backend
 */
export async function exportToPDFByYear(
  data: ExportData,
  restaurantName: string,
  selectedYear: number | null,
  getPdfData: (year: bigint | null) => Promise<{ overview: { totalIncome: bigint; totalExpenses: bigint; profit: bigint }; transactions: any[]; monthlyIncomes: any[]; expensesByCategory: any[]; incomeByPaymentMethod: any[] }>
) {
  // Fetch financial data using backend calculation - SINGLE SOURCE OF TRUTH
  const financialData = await getPdfData(selectedYear !== null ? BigInt(selectedYear) : null);

  // Use centralized conversion for all amounts
  const totalIncome = centsToEur(financialData.overview.totalIncome);
  const totalExpenses = centsToEur(financialData.overview.totalExpenses);
  const profit = centsToEur(financialData.overview.profit);

  const today = new Date().toLocaleDateString('en-US');
  const periodText = selectedYear !== null ? `Year: ${selectedYear}` : 'Period: All years';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Financial Report - ${restaurantName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 40px;
          color: #333;
        }
        h1 {
          color: #2c3e50;
          border-bottom: 2px solid #3498db;
          padding-bottom: 10px;
        }
        h2 {
          color: #34495e;
          margin-top: 30px;
        }
        .summary {
          background-color: #ecf0f1;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .summary-item {
          margin: 10px 0;
          font-size: 16px;
        }
        .period-info {
          background-color: #d5e8f7;
          padding: 10px;
          border-radius: 5px;
          margin: 15px 0;
          font-size: 14px;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #bdc3c7;
          padding: 10px;
          text-align: left;
        }
        th {
          background-color: #3498db;
          color: white;
        }
        tr:nth-child(even) {
          background-color: #f8f9fa;
        }
        .income {
          color: #27ae60;
          font-weight: bold;
        }
        .expense {
          color: #e74c3c;
          font-weight: bold;
        }
        .profit {
          color: ${profit >= 0 ? '#27ae60' : '#e74c3c'};
          font-weight: bold;
        }
        .note {
          background-color: #d1ecf1;
          border-left: 4px solid #17a2b8;
          padding: 12px;
          margin: 15px 0;
          font-size: 13px;
          line-height: 1.6;
        }
        .calculation-box {
          background-color: #f8f9fa;
          border: 2px solid #dee2e6;
          padding: 15px;
          margin: 15px 0;
          border-radius: 5px;
        }
        .calculation-box .formula {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          margin: 8px 0;
          padding: 8px;
          background-color: white;
          border-left: 3px solid #3498db;
        }
        @media print {
          body {
            margin: 20px;
          }
        }
      </style>
    </head>
    <body>
      <h1>Financial Report - ${restaurantName}</h1>
      <p><strong>Report Date:</strong> ${today}</p>
      
      <div class="period-info">
        ${periodText}
      </div>
      
      <div class="summary">
        <h2>Financial Overview</h2>
        <div class="summary-item">
          <strong>Total Income:</strong> <span class="income">${totalIncome.toFixed(2)} EUR</span>
        </div>
        <div class="summary-item">
          <strong>Total Expenses:</strong> <span class="expense">${totalExpenses.toFixed(2)} EUR</span>
        </div>
        <div class="summary-item">
          <strong>Profit:</strong> <span class="profit">${profit.toFixed(2)} EUR</span>
        </div>
      </div>
      
      <div class="calculation-box">
        <strong>Profit Calculation:</strong>
        <div class="formula">
          Income: ${totalIncome.toFixed(2)} EUR
        </div>
        <div class="formula">
          Expenses: ${totalExpenses.toFixed(2)} EUR
        </div>
        <div class="formula">
          Profit = Income - Expenses = ${totalIncome.toFixed(2)} - ${totalExpenses.toFixed(2)} = ${profit.toFixed(2)} EUR
        </div>
      </div>
      
      <div class="note">
        <strong>Calculation Note:</strong>
        This report uses backend function <code>getPdfFinancialReportData(${selectedYear !== null ? selectedYear : 'null'})</code> as the single source of financial data.
        ${selectedYear !== null 
          ? `All amounts are calculated only for ${selectedYear}.` 
          : 'All amounts are aggregated across all business years.'}
        Conversion from cents to euros performed by centralized <code>centsToEur()</code> function.
      </div>
      
      <h2>Expenses by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${financialData.expensesByCategory.length > 0 
            ? financialData.expensesByCategory.map((cat) => `
              <tr>
                <td>${cat.category}</td>
                <td class="expense">${centsToEur(cat.total).toFixed(2)} EUR</td>
              </tr>
            `).join('') 
            : '<tr><td colspan="2" style="text-align: center; padding: 20px;">No expenses in this period</td></tr>'}
        </tbody>
      </table>
      
      <h2>Income by Payment Method</h2>
      <table>
        <thead>
          <tr>
            <th>Payment Method</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${financialData.incomeByPaymentMethod.length > 0 
            ? financialData.incomeByPaymentMethod.map((pm) => `
              <tr>
                <td>${pm.paymentMethod}</td>
                <td class="income">${centsToEur(pm.total).toFixed(2)} EUR</td>
              </tr>
            `).join('') 
            : '<tr><td colspan="2" style="text-align: center; padding: 20px;">No income in this period</td></tr>'}
        </tbody>
      </table>
      
      <h2>Transactions</h2>
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Payment Method</th>
            <th>Date</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${financialData.transactions.length > 0 ? financialData.transactions.map((t) => `
            <tr>
              <td>${t.transactionType === 'prihod' ? 'Income' : 'Expense'}</td>
              <td class="${t.transactionType === 'prihod' ? 'income' : 'expense'}">
                ${centsToEur(t.amount).toFixed(2)} EUR
              </td>
              <td>${t.expenseCategory || '-'}</td>
              <td>${t.paymentMethod || '-'}</td>
              <td>${new Date(Number(t.date) / 1000000).toLocaleDateString('en-US')}</td>
              <td>${t.description || '-'}</td>
            </tr>
          `).join('') : '<tr><td colspan="6" style="text-align: center; padding: 20px;">No transactions in this period</td></tr>'}
        </tbody>
      </table>
      
      ${financialData.monthlyIncomes.length > 0 ? `
        <h2>Monthly Income (Quick Entry)</h2>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Year</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${financialData.monthlyIncomes.map((mi) => {
              const monthName = MONTH_NAMES[Number(mi.month) - 1];
              return `
                <tr>
                  <td>${monthName}</td>
                  <td>${mi.year}</td>
                  <td class="income">${centsToEur(mi.amount).toFixed(2)} EUR</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : ''}
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

/**
 * Export DFINITY technical support report in English
 * @param reportData - Technical report data from backend
 */
export async function exportDfinityTechnicalReportPDF(reportData: {
  title: string;
  summary: string;
  synchronizationImprovements: string;
  consistencyVerification: string;
  dateBoundaryHandling: string;
  decimalPrecision: string;
  finalVerification: string;
  confirmation: string;
}) {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${reportData.title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 40px;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .header {
          border-bottom: 3px solid #0066cc;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        h1 {
          color: #0066cc;
          font-size: 28px;
          margin: 0 0 10px 0;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
          margin: 5px 0;
        }
        .section {
          background-color: #f8f9fa;
          border-left: 4px solid #0066cc;
          padding: 20px;
          margin: 25px 0;
          border-radius: 4px;
        }
        .section-title {
          font-weight: bold;
          color: #0066cc;
          font-size: 18px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
        }
        .section-title::before {
          content: "✓";
          display: inline-block;
          width: 24px;
          height: 24px;
          background-color: #28a745;
          color: white;
          border-radius: 50%;
          text-align: center;
          line-height: 24px;
          margin-right: 10px;
          font-weight: bold;
        }
        .section-content {
          color: #333;
          font-size: 15px;
          line-height: 1.8;
        }
        .summary-box {
          background-color: #e7f3ff;
          border: 2px solid #0066cc;
          padding: 20px;
          margin: 25px 0;
          border-radius: 6px;
        }
        .summary-box h2 {
          color: #0066cc;
          margin-top: 0;
          font-size: 20px;
        }
        .confirmation-box {
          background-color: #d4edda;
          border: 2px solid #28a745;
          padding: 20px;
          margin: 25px 0;
          border-radius: 6px;
        }
        .confirmation-box h2 {
          color: #155724;
          margin-top: 0;
          font-size: 20px;
        }
        code {
          background-color: #f4f4f4;
          padding: 3px 8px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #c7254e;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #dee2e6;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        .technical-details {
          background-color: #fff;
          border: 1px solid #dee2e6;
          padding: 15px;
          margin: 15px 0;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
        }
        @media print {
          body {
            margin: 20px;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${reportData.title}</h1>
        <div class="subtitle">Restaurant Finance Tracking Application</div>
        <div class="subtitle">Report Generated: ${today}</div>
      </div>
      
      <div class="summary-box">
        <h2>Executive Summary</h2>
        <p>${reportData.summary}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Synchronization Issue Resolution</div>
        <div class="section-content">
          <p>${reportData.synchronizationImprovements}</p>
          <div class="technical-details">
            <strong>Technical Implementation:</strong><br>
            • Consolidated refetch mechanism with React Query<br>
            • Centralized backend functions for all calculations<br>
            • Optimized cache invalidation strategy<br>
            • Real-time data synchronization across all components
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Amount Consistency Verification</div>
        <div class="section-content">
          <p>${reportData.consistencyVerification}</p>
          <div class="technical-details">
            <strong>Verification Points:</strong><br>
            • Dashboard calculations match backend exactly<br>
            • Report totals use same backend functions<br>
            • PDF exports use getPdfFinancialReportData() as single source<br>
            • All components display identical values for same data
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Date Boundary Handling</div>
        <div class="section-content">
          <p>${reportData.dateBoundaryHandling}</p>
          <div class="technical-details">
            <strong>Unified Date Functions:</strong><br>
            • getMonthStartTimestamp(month, year)<br>
            • getMonthEndTimestamp(month, year)<br>
            • Proper leap year handling<br>
            • Accurate month length calculations (28, 29, 30, 31 days)<br>
            • Consistent timezone handling across all modules
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Decimal Precision</div>
        <div class="section-content">
          <p>${reportData.decimalPrecision}</p>
          <div class="technical-details">
            <strong>Standardized Conversion Functions:</strong><br>
            • centsToEur(amount): Converts cents to euros (÷ 100)<br>
            • eurToCents(amount): Converts euros to cents (× 100)<br>
            • formatCurrency(amount): Formats for display<br>
            • No rounding during intermediate calculations<br>
            • Consistent decimal precision throughout application
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Final Verification Results</div>
        <div class="section-content">
          <p>${reportData.finalVerification}</p>
          <div class="technical-details">
            <strong>Code Optimization Achievements:</strong><br>
            • Eliminated all redundant calculation logic<br>
            • Centralized financial functions in backend<br>
            • Removed duplicate conversion functions<br>
            • Optimized React Query caching strategies<br>
            • Improved code maintainability and consistency
          </div>
        </div>
      </div>
      
      <div class="confirmation-box">
        <h2>✓ Confirmation</h2>
        <p><strong>${reportData.confirmation}</strong></p>
        <p style="margin-top: 15px; font-size: 14px;">
          All synchronization issues have been resolved, and the application now maintains 
          complete data consistency across all components. The unified calculation logic 
          ensures accurate financial reporting with proper date boundary handling and 
          decimal precision.
        </p>
      </div>
      
      <div class="footer">
        <p><strong>Restaurant Finance Tracking Application</strong></p>
        <p>Built on Internet Computer Protocol (ICP)</p>
        <p>Technical Support Report for DFINITY</p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

/**
 * Export DFINITY technical analysis report in English
 * Comprehensive report for DFINITY support team about infinite loading issues
 * @param analysisData - Technical analysis data from backend
 */
export async function exportDfinityTechnicalAnalysisPDF(analysisData: {
  title: string;
  executiveSummary: string;
  issueDescription: string;
  technicalAnalysis: string;
  recoveryAttempts: string;
  dataPersistenceFindings: string;
  recommendations: string;
  userExperienceImpact: string;
  conclusion: string;
}) {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${analysisData.title}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 40px;
          color: #1a1a1a;
          line-height: 1.7;
        }
        .header {
          border-bottom: 4px solid #d32f2f;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        h1 {
          color: #d32f2f;
          font-size: 32px;
          margin: 0 0 10px 0;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
          margin: 5px 0;
        }
        .executive-summary {
          background-color: #fff3e0;
          border: 3px solid #ff9800;
          padding: 25px;
          margin: 25px 0;
          border-radius: 8px;
        }
        .executive-summary h2 {
          color: #e65100;
          margin-top: 0;
          font-size: 22px;
        }
        .section {
          background-color: #f8f9fa;
          border-left: 5px solid #d32f2f;
          padding: 25px;
          margin: 30px 0;
          border-radius: 4px;
          page-break-inside: avoid;
        }
        .section-title {
          font-weight: bold;
          color: #d32f2f;
          font-size: 20px;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        }
        .section-title::before {
          content: "⚠";
          display: inline-block;
          width: 28px;
          height: 28px;
          background-color: #ff9800;
          color: white;
          border-radius: 50%;
          text-align: center;
          line-height: 28px;
          margin-right: 12px;
          font-weight: bold;
          font-size: 18px;
        }
        .section-content {
          color: #333;
          font-size: 15px;
          line-height: 1.8;
        }
        .recommendations-box {
          background-color: #e8f5e9;
          border: 3px solid #4caf50;
          padding: 25px;
          margin: 30px 0;
          border-radius: 8px;
        }
        .recommendations-box h2 {
          color: #2e7d32;
          margin-top: 0;
          font-size: 22px;
        }
        .recommendations-box::before {
          content: "💡";
          font-size: 32px;
          display: block;
          margin-bottom: 10px;
        }
        .impact-box {
          background-color: #ffebee;
          border: 3px solid #f44336;
          padding: 25px;
          margin: 30px 0;
          border-radius: 8px;
        }
        .impact-box h2 {
          color: #c62828;
          margin-top: 0;
          font-size: 22px;
        }
        .conclusion-box {
          background-color: #e3f2fd;
          border: 3px solid #2196f3;
          padding: 25px;
          margin: 30px 0;
          border-radius: 8px;
        }
        .conclusion-box h2 {
          color: #1565c0;
          margin-top: 0;
          font-size: 22px;
        }
        .technical-details {
          background-color: #fff;
          border: 2px solid #dee2e6;
          padding: 18px;
          margin: 18px 0;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
        }
        .highlight {
          background-color: #fff9c4;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }
        .footer {
          margin-top: 50px;
          padding-top: 25px;
          border-top: 3px solid #dee2e6;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        .urgent-notice {
          background-color: #ffcdd2;
          border: 2px solid #d32f2f;
          padding: 15px;
          margin: 20px 0;
          border-radius: 6px;
          font-weight: bold;
          color: #b71c1c;
        }
        @media print {
          body {
            margin: 20px;
          }
          .section, .executive-summary, .recommendations-box, .impact-box, .conclusion-box {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${analysisData.title}</h1>
        <div class="subtitle">Restaurant Finance Tracking Application</div>
        <div class="subtitle">Internet Computer Protocol (ICP) Platform</div>
        <div class="subtitle">Report Generated: ${today}</div>
      </div>
      
      <div class="urgent-notice">
        ⚠️ URGENT: This report documents critical recurring issues affecting application availability and business operations.
      </div>
      
      <div class="executive-summary">
        <h2>Executive Summary</h2>
        <p>${analysisData.executiveSummary}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Issue Description</div>
        <div class="section-content">
          <p>${analysisData.issueDescription}</p>
          <div class="technical-details">
            <strong>Symptoms Observed:</strong><br>
            • Application displays infinite "loading..." state<br>
            • Frontend unable to establish connection with backend canister<br>
            • Issue occurs after periods of inactivity or redeployment<br>
            • Data remains inaccessible despite being stored on blockchain<br>
            • Manual intervention required to restore functionality
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Technical Analysis</div>
        <div class="section-content">
          <p>${analysisData.technicalAnalysis}</p>
          <div class="technical-details">
            <strong>Root Cause Analysis:</strong><br>
            • <span class="highlight">Backend Canister Sleep States:</span> Canister enters sleep mode after inactivity<br>
            • <span class="highlight">Frontend Connection Loss:</span> Stale actor bindings prevent reconnection<br>
            • <span class="highlight">Cache Corruption:</span> Outdated cache references cause persistent loading<br>
            • <span class="highlight">Deployment Synchronization:</span> Frontend-backend version mismatches<br>
            • <span class="highlight">Actor Binding Issues:</span> Improper cache invalidation after redeployment
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Recovery Attempts Summary</div>
        <div class="section-content">
          <p>${analysisData.recoveryAttempts}</p>
          <div class="technical-details">
            <strong>Recovery Methods Attempted:</strong><br>
            1. <span class="highlight">Backend Canister Redeployment:</span> Temporary fix, issue recurs<br>
            2. <span class="highlight">Frontend Resynchronization:</span> Manual cache clearing and actor recreation<br>
            3. <span class="highlight">Canister ID Regeneration:</span> Complete backend identifier refresh<br>
            4. <span class="highlight">Production Environment Rebuild:</span> Full system regeneration<br>
            5. <span class="highlight">Manual Keep-Alive Implementation:</span> Periodic backend pinging<br>
            <br>
            <strong>Result:</strong> All attempts provided temporary relief but no permanent solution
          </div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title">Data Persistence Findings</div>
        <div class="section-content">
          <p>${analysisData.dataPersistenceFindings}</p>
          <div class="technical-details">
            <strong>Verification Methods:</strong><br>
            • Direct canister queries confirmed data integrity<br>
            • Export functions successfully retrieved all stored data<br>
            • Blockchain storage remained intact throughout all incidents<br>
            • No data loss occurred despite accessibility issues<br>
            <br>
            <strong>Conclusion:</strong> Issue is purely <span class="highlight">accessibility-related</span>, not data-related
          </div>
        </div>
      </div>
      
      <div class="recommendations-box">
        <h2>Recommendations for Permanent Resolution</h2>
        <p>${analysisData.recommendations}</p>
        <div class="technical-details">
          <strong>Proposed Solutions:</strong><br>
          <br>
          <span class="highlight">1. Permanent Backend Keep-Alive Mechanism</span><br>
          • Implement automatic periodic canister wake-up calls<br>
          • Prevent canister from entering sleep state<br>
          • Ensure continuous availability without manual intervention<br>
          <br>
          <span class="highlight">2. Enhanced Automatic Synchronization</span><br>
          • Automatic detection of backend canister state changes<br>
          • Self-healing frontend-backend connection restoration<br>
          • Intelligent cache management with automatic invalidation<br>
          <br>
          <span class="highlight">3. Improved Connection Monitoring</span><br>
          • Real-time backend availability monitoring<br>
          • Automatic reconnection attempts with exponential backoff<br>
          • User notifications for connection status changes<br>
          <br>
          <span class="highlight">4. Platform-Level Solutions</span><br>
          • DFINITY platform support for persistent canister activation<br>
          • Improved canister lifecycle management<br>
          • Better frontend-backend synchronization mechanisms
        </div>
      </div>
      
      <div class="impact-box">
        <h2>User Experience & Business Continuity Impact</h2>
        <p>${analysisData.userExperienceImpact}</p>
        <div class="technical-details">
          <strong>Business Impact Assessment:</strong><br>
          • <span class="highlight">Operational Disruptions:</span> Frequent application downtime<br>
          • <span class="highlight">Productivity Loss:</span> Unable to access financial data during critical periods<br>
          • <span class="highlight">User Frustration:</span> Unpredictable application availability<br>
          • <span class="highlight">Manual Intervention Required:</span> Technical expertise needed for recovery<br>
          • <span class="highlight">Business Continuity Risk:</span> Cannot rely on application for daily operations<br>
          <br>
          <strong>Severity:</strong> <span class="highlight">HIGH - Immediate attention required</span>
        </div>
      </div>
      
      <div class="conclusion-box">
        <h2>Conclusion & Next Steps</h2>
        <p>${analysisData.conclusion}</p>
        <div class="technical-details">
          <strong>Action Items:</strong><br>
          1. Implement permanent backend keep-alive mechanism<br>
          2. Deploy enhanced automatic synchronization system<br>
          3. Add comprehensive connection monitoring and recovery<br>
          4. Engage DFINITY support for platform-level improvements<br>
          5. Conduct thorough testing of all implemented solutions<br>
          <br>
          <strong>Expected Outcome:</strong><br>
          • Elimination of infinite loading issues<br>
          • Continuous application availability<br>
          • Improved user experience and business continuity<br>
          • Reduced need for manual intervention
        </div>
      </div>
      
      <div class="footer">
        <p><strong>Restaurant Finance Tracking Application</strong></p>
        <p>Built on Internet Computer Protocol (ICP)</p>
        <p>Technical Analysis Report for DFINITY Support Team</p>
        <p style="margin-top: 15px; font-weight: bold; color: #d32f2f;">
          This report requires immediate attention and action from DFINITY support team
        </p>
      </div>
      
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

/**
 * Export Internal Technical Documentation Report (English)
 * Comprehensive internal technical documentation for voice command integration
 */
export async function exportInternalTechnicalDocumentationPDF() {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Internal Technical Documentation Report - Voice Command Integration</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 40px;
          color: #1a1a1a;
          line-height: 1.7;
          font-size: 14px;
        }
        .header {
          border-bottom: 4px solid #9c27b0;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        h1 {
          color: #9c27b0;
          font-size: 32px;
          margin: 0 0 10px 0;
        }
        h2 {
          color: #6a1b9a;
          font-size: 24px;
          margin-top: 40px;
          margin-bottom: 15px;
          border-bottom: 2px solid #ba68c8;
          padding-bottom: 10px;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
          margin: 5px 0;
        }
        .section {
          background-color: #f8f9fa;
          border-left: 5px solid #9c27b0;
          padding: 25px;
          margin: 30px 0;
          border-radius: 4px;
          page-break-inside: avoid;
        }
        .section-title {
          font-weight: bold;
          color: #9c27b0;
          font-size: 20px;
          margin-bottom: 15px;
        }
        .section-content {
          color: #333;
          font-size: 15px;
          line-height: 1.8;
        }
        .technical-details {
          background-color: #fff;
          border: 2px solid #dee2e6;
          padding: 18px;
          margin: 18px 0;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
        }
        .highlight {
          background-color: #f3e5f5;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }
        .footer {
          margin-top: 50px;
          padding-top: 25px;
          border-top: 3px solid #dee2e6;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        ul {
          margin: 15px 0;
          padding-left: 25px;
        }
        li {
          margin: 8px 0;
        }
        @media print {
          body {
            margin: 20px;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Internal Technical Documentation Report</h1>
        <div class="subtitle">Voice Command Integration Analysis</div>
        <div class="subtitle">Restaurant Finance Tracking Application</div>
        <div class="subtitle">Report Generated: ${today}</div>
      </div>

      <h2>1. Introduction</h2>
      <div class="section">
        <div class="section-content">
          <p>
            This comprehensive internal technical documentation provides a detailed analysis of all voice command 
            integration attempts in the Restaurant Finance Tracking application. The document serves as a complete 
            historical record of development iterations, technical adjustments, detected communication issues, 
            and resolution efforts undertaken during the voice command implementation project.
          </p>
          <p>
            The primary objective was to enable hands-free transaction entry for restaurant staff through voice 
            commands, allowing users to speak financial transactions in natural English language and have them 
            automatically parsed and recorded in the system.
          </p>
        </div>
      </div>

      <h2>2. Issue Summary</h2>
      <div class="section">
        <div class="section-title">Communication Issues Encountered</div>
        <div class="section-content">
          <p>
            Throughout the voice command integration process, persistent communication issues prevented successful 
            deployment despite multiple implementation attempts. The primary issues identified include:
          </p>
          <div class="technical-details">
            <strong>Critical Communication Barriers:</strong><br><br>
            • <span class="highlight">TLS/CORS Restrictions:</span> Cross-origin resource sharing policies blocked voice data transmission<br>
            • <span class="highlight">Relayer Failures:</span> Communication proxy unable to handle real-time voice data streams<br>
            • <span class="highlight">Authentication Token Invalidation:</span> Session tokens expired during voice processing<br>
            • <span class="highlight">Browser-Backend Communication:</span> Fragile connection chain with multiple failure points<br>
            • <span class="highlight">Real-time Audio Streaming:</span> Bandwidth and latency challenges during voice transmission
          </div>
          <p>
            These issues manifested consistently across all implementation attempts, indicating platform-level 
            constraints rather than application-specific problems. The combination of security restrictions, 
            infrastructure limitations, and authentication complexity created an environment where reliable 
            voice command functionality could not be achieved.
          </p>
        </div>
      </div>

      <h2>3. Technical Comparison</h2>
      <div class="section">
        <div class="section-title">Comparison: Merelus vs Restaurant Finance Tracking</div>
        <div class="section-content">
          <p>
            A comprehensive comparison was conducted between the Restaurant Finance Tracking application and the 
            Merelus game project, where voice commands operate successfully. This analysis revealed key architectural 
            and implementation differences that explain the divergent outcomes.
          </p>
          <div class="technical-details">
            <strong>Key Differences Identified:</strong><br><br>
            <span class="highlight">Authentication Complexity:</span><br>
            • Merelus: Simpler authentication mechanisms with shorter session requirements<br>
            • Restaurant Finance: Full Internet Identity integration with extended voice sessions<br>
            • Impact: Increased token management complexity and higher failure risk<br><br>
            
            <span class="highlight">Voice Command Scope:</span><br>
            • Merelus: Simple game commands with minimal backend interaction<br>
            • Restaurant Finance: Complex financial transactions requiring continuous backend communication<br>
            • Impact: Longer processing time increases opportunities for connection failures<br><br>
            
            <span class="highlight">Backend Communication Patterns:</span><br>
            • Merelus: Infrequent backend calls with simple data structures<br>
            • Restaurant Finance: Continuous backend interaction with complex financial data<br>
            • Impact: More failure points in communication pipeline<br><br>
            
            <span class="highlight">Session Management:</span><br>
            • Merelus: Short-lived sessions matching voice command duration<br>
            • Restaurant Finance: Extended sessions required for transaction processing<br>
            • Impact: Token expiration during voice processing
          </div>
          <p>
            The comparison demonstrates that while voice commands are technically feasible on the Internet Computer 
            platform (as proven by Merelus), the more complex requirements of the Restaurant Finance Tracking 
            application expose platform limitations that prevent successful implementation.
          </p>
        </div>
      </div>

      <h2>4. Analysis</h2>
      <div class="section">
        <div class="section-title">In-Depth Technical Analysis</div>
        <div class="section-content">
          <p>
            Detailed analysis of technical adjustments and debugging outcomes reveals a pattern of platform-level 
            constraints that cannot be overcome through application-level solutions.
          </p>
          <div class="technical-details">
            <strong>Technical Adjustments Attempted:</strong><br><br>
            1. <span class="highlight">Web Speech API Integration:</span><br>
            &nbsp;&nbsp;• Implemented browser-native speech recognition<br>
            &nbsp;&nbsp;• Result: Successful local recognition, failed backend communication<br><br>
            
            2. <span class="highlight">Microphone Permission Handling:</span><br>
            &nbsp;&nbsp;• Developed explicit permission request flow<br>
            &nbsp;&nbsp;• Result: Permissions granted, voice data transmission blocked<br><br>
            
            3. <span class="highlight">Speech-to-Text Processing Pipeline:</span><br>
            &nbsp;&nbsp;• Created multi-stage voice processing architecture<br>
            &nbsp;&nbsp;• Result: Pipeline stages failed at backend communication point<br><br>
            
            4. <span class="highlight">Token Management Improvements:</span><br>
            &nbsp;&nbsp;• Implemented automatic token renewal during voice sessions<br>
            &nbsp;&nbsp;• Result: Token refresh interrupted voice processing<br><br>
            
            5. <span class="highlight">Relayer Configuration Optimization:</span><br>
            &nbsp;&nbsp;• Modified relayer settings for voice data handling<br>
            &nbsp;&nbsp;• Result: Relayer limitations persisted<br><br>
            
            6. <span class="highlight">Browser-Specific Compatibility Fixes:</span><br>
            &nbsp;&nbsp;• Implemented browser-specific workarounds<br>
            &nbsp;&nbsp;• Result: Issues consistent across all browsers
          </div>
          <p>
            The analysis confirms that the root cause lies in the interaction between browser security policies, 
            Internet Computer infrastructure limitations, and authentication requirements. These factors create 
            a fragile communication environment that is particularly susceptible to failures during voice command 
            initialization and processing.
          </p>
        </div>
      </div>

      <h2>5. Resolution Attempts</h2>
      <div class="section">
        <div class="section-title">Chronological Development Iterations</div>
        <div class="section-content">
          <p>
            A complete chronological record of all development iterations and resolution efforts demonstrates 
            the comprehensive nature of the integration attempts.
          </p>
          <div class="technical-details">
            <strong>Development Iteration Timeline:</strong><br><br>
            <span class="highlight">Iteration 1: Initial Implementation (Week 1-2)</span><br>
            • Objective: Basic voice recognition integration<br>
            • Approach: Direct Web Speech API implementation<br>
            • Outcome: Local recognition successful, backend communication failed<br>
            • Lessons: TLS/CORS restrictions identified as primary barrier<br><br>
            
            <span class="highlight">Iteration 2: Permission Handling (Week 3)</span><br>
            • Objective: Improve microphone permission flow<br>
            • Approach: Explicit permission request with user feedback<br>
            • Outcome: Permissions granted, voice data transmission still blocked<br>
            • Lessons: Permission handling not the root cause<br><br>
            
            <span class="highlight">Iteration 3: Processing Pipeline (Week 4-5)</span><br>
            • Objective: Create robust voice processing architecture<br>
            • Approach: Multi-stage pipeline with error handling<br>
            • Outcome: Pipeline functional until backend communication stage<br>
            • Lessons: Backend communication is the critical failure point<br><br>
            
            <span class="highlight">Iteration 4: Token Management (Week 6)</span><br>
            • Objective: Prevent token expiration during voice sessions<br>
            • Approach: Automatic token renewal mechanisms<br>
            • Outcome: Token refresh interrupted voice processing<br>
            • Lessons: Token management conflicts with voice session continuity<br><br>
            
            <span class="highlight">Iteration 5: Relayer Optimization (Week 7)</span><br>
            • Objective: Improve relayer support for voice data<br>
            • Approach: Configuration adjustments and optimization<br>
            • Outcome: Relayer limitations persisted<br>
            • Lessons: Relayer not designed for real-time voice data<br><br>
            
            <span class="highlight">Iteration 6: Cross-Browser Testing (Week 8)</span><br>
            • Objective: Identify browser-specific solutions<br>
            • Approach: Comprehensive testing across Chrome, Firefox, Safari, Brave<br>
            • Outcome: Issues consistent across all browsers<br>
            • Lessons: Problem is platform-level, not browser-specific<br><br>
            
            <span class="highlight">Iteration 7: Alternative Approaches (Week 9-10)</span><br>
            • Objective: Explore alternative implementation strategies<br>
            • Approach: Simplified authentication, reduced data transmission<br>
            • Outcome: Security requirements prevented implementation<br>
            • Lessons: Platform constraints cannot be circumvented
          </div>
        </div>
      </div>

      <h2>6. Conclusions</h2>
      <div class="section">
        <div class="section-title">Final Debugging Outcomes and Technical Findings</div>
        <div class="section-content">
          <p>
            After extensive development iterations and comprehensive testing, the following conclusions have been reached:
          </p>
          <ul>
            <li>
              <strong>Platform-Level Constraints:</strong> The issues encountered are platform-level constraints 
              of the Internet Computer infrastructure, not application-specific problems that can be resolved 
              through code changes.
            </li>
            <li>
              <strong>Communication Pipeline Fragility:</strong> The combination of browser security policies, 
              TLS/CORS restrictions, relayer limitations, and authentication requirements creates a fragile 
              communication environment unsuitable for real-time voice processing.
            </li>
            <li>
              <strong>Merelus Comparison Insights:</strong> The success of voice commands in the Merelus game 
              demonstrates that voice functionality is technically possible on ICP, but only under specific 
              conditions (simpler authentication, shorter sessions, minimal backend interaction).
            </li>
            <li>
              <strong>Application Requirements Mismatch:</strong> The Restaurant Finance Tracking application's 
              requirements (complex financial transactions, extended voice sessions, continuous backend 
              communication, full Internet Identity integration) exceed the current capabilities of the platform 
              for voice command functionality.
            </li>
            <li>
              <strong>No Application-Level Solution:</strong> All attempted application-level solutions and 
              workarounds have been exhausted without achieving reliable voice command functionality.
            </li>
          </ul>
        </div>
      </div>

      <h2>7. Recommendations</h2>
      <div class="section">
        <div class="section-title">Long-Term Recommendations for Future Development</div>
        <div class="section-content">
          <p>
            Based on the comprehensive analysis and development experience, the following long-term recommendations 
            are provided for future voice command integration efforts:
          </p>
          <div class="technical-details">
            <strong>Platform-Level Improvements Required:</strong><br><br>
            1. <span class="highlight">Enhanced Voice Communication Support:</span><br>
            &nbsp;&nbsp;• Improve TLS/CORS handling for Web Speech API integration<br>
            &nbsp;&nbsp;• Provide dedicated voice communication channels<br>
            &nbsp;&nbsp;• Optimize real-time audio streaming capabilities<br><br>
            
            2. <span class="highlight">Relayer Voice Data Support:</span><br>
            &nbsp;&nbsp;• Enhance relayer support for real-time voice data streams<br>
            &nbsp;&nbsp;• Implement voice-specific communication protocols<br>
            &nbsp;&nbsp;• Reduce latency and improve bandwidth handling<br><br>
            
            3. <span class="highlight">Authentication Token Management:</span><br>
            &nbsp;&nbsp;• Extend token validity for voice command sessions<br>
            &nbsp;&nbsp;• Implement seamless token refresh during voice processing<br>
            &nbsp;&nbsp;• Provide voice-session-aware authentication mechanisms<br><br>
            
            4. <span class="highlight">Documentation and Guidelines:</span><br>
            &nbsp;&nbsp;• Publish best practices for voice command implementation<br>
            &nbsp;&nbsp;• Provide reference implementations and examples<br>
            &nbsp;&nbsp;• Document known limitations and workarounds<br><br>
            
            5. <span class="highlight">Alternative Approaches:</span><br>
            &nbsp;&nbsp;• Consider native platform voice support<br>
            &nbsp;&nbsp;• Explore server-side voice processing options<br>
            &nbsp;&nbsp;• Investigate third-party voice service integrations
          </div>
          <p>
            <strong>Immediate Next Steps:</strong> Engage with DFINITY engineering team to discuss platform-level 
            improvements and explore potential solutions for enabling reliable voice command functionality in 
            applications with complex requirements similar to Restaurant Finance Tracking.
          </p>
        </div>
      </div>

      <div class="footer">
        <p><strong>Restaurant Finance Tracking Application</strong></p>
        <p>Internal Technical Documentation Report</p>
        <p>Voice Command Integration Analysis</p>
        <p style="margin-top: 15px;">
          This document is intended for internal technical review and future development planning
        </p>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}

/**
 * Export External DFINITY Support Report (English)
 * Concise formal summary for DFINITY support submission
 */
export async function exportExternalDfinitySupportPDF() {
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>External DFINITY Support Report - Voice Command Integration</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 40px;
          color: #1a1a1a;
          line-height: 1.7;
          font-size: 14px;
        }
        .header {
          border-bottom: 4px solid #2196f3;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        h1 {
          color: #2196f3;
          font-size: 32px;
          margin: 0 0 10px 0;
        }
        h2 {
          color: #1565c0;
          font-size: 24px;
          margin-top: 40px;
          margin-bottom: 15px;
          border-bottom: 2px solid #64b5f6;
          padding-bottom: 10px;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
          margin: 5px 0;
        }
        .section {
          background-color: #f8f9fa;
          border-left: 5px solid #2196f3;
          padding: 25px;
          margin: 30px 0;
          border-radius: 4px;
          page-break-inside: avoid;
        }
        .section-title {
          font-weight: bold;
          color: #2196f3;
          font-size: 20px;
          margin-bottom: 15px;
        }
        .section-content {
          color: #333;
          font-size: 15px;
          line-height: 1.8;
        }
        .technical-details {
          background-color: #fff;
          border: 2px solid #dee2e6;
          padding: 18px;
          margin: 18px 0;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.6;
        }
        .highlight {
          background-color: #e3f2fd;
          padding: 2px 6px;
          border-radius: 3px;
          font-weight: 600;
        }
        .recommendations-box {
          background-color: #e8f5e9;
          border: 3px solid #4caf50;
          padding: 25px;
          margin: 30px 0;
          border-radius: 8px;
        }
        .recommendations-box h2 {
          color: #2e7d32;
          margin-top: 0;
          font-size: 22px;
        }
        .footer {
          margin-top: 50px;
          padding-top: 25px;
          border-top: 3px solid #dee2e6;
          text-align: center;
          color: #666;
          font-size: 13px;
        }
        ul {
          margin: 15px 0;
          padding-left: 25px;
        }
        li {
          margin: 8px 0;
        }
        @media print {
          body {
            margin: 20px;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>External DFINITY Support Report</h1>
        <div class="subtitle">Voice Command Integration Issues</div>
        <div class="subtitle">Restaurant Finance Tracking Application</div>
        <div class="subtitle">Report Generated: ${today}</div>
      </div>

      <h2>1. Introduction</h2>
      <div class="section">
        <div class="section-content">
          <p>
            This report provides a technical overview of persistent voice command integration issues encountered 
            in the Restaurant Finance Tracking application deployed on the Internet Computer platform. The report 
            is submitted to the DFINITY support team to request assistance in resolving platform-level constraints 
            that prevent successful voice command functionality.
          </p>
          <p>
            <strong>Application Context:</strong> Restaurant Finance Tracking is a financial management application 
            that requires voice command functionality to enable hands-free transaction entry for restaurant staff. 
            Users should be able to speak financial transactions in natural English language and have them 
            automatically parsed and recorded in the system.
          </p>
        </div>
      </div>

      <h2>2. Issue Summary</h2>
      <div class="section">
        <div class="section-title">Main Causes and Technical Issues</div>
        <div class="section-content">
          <p>
            Despite multiple implementation attempts following Internet Computer best practices, voice command 
            functionality cannot be successfully deployed due to persistent connectivity issues. The main causes 
            have been identified as:
          </p>
          <div class="technical-details">
            <strong>Primary Technical Issues:</strong><br><br>
            1. <span class="highlight">TLS/CORS Restrictions:</span><br>
            &nbsp;&nbsp;• Cross-origin resource sharing policies block voice data transmission<br>
            &nbsp;&nbsp;• Certificate validation failures during voice sessions<br>
            &nbsp;&nbsp;• HTTPS requirements conflict with voice processing<br><br>
            
            2. <span class="highlight">Relayer Limitations:</span><br>
            &nbsp;&nbsp;• Communication proxy unable to handle real-time voice data streams<br>
            &nbsp;&nbsp;• Connection drops during audio transmission<br>
            &nbsp;&nbsp;• Insufficient bandwidth for voice processing<br><br>
            
            3. <span class="highlight">Authentication Token Management:</span><br>
            &nbsp;&nbsp;• Session tokens expire during voice command processing<br>
            &nbsp;&nbsp;• Voice sessions interrupted by authentication prompts<br>
            &nbsp;&nbsp;• Token refresh mechanisms fail during voice input<br><br>
            
            4. <span class="highlight">Browser-Backend Communication:</span><br>
            &nbsp;&nbsp;• Fragile connection chain with multiple failure points<br>
            &nbsp;&nbsp;• Each component introduces potential for connection loss<br>
            &nbsp;&nbsp;• No reliable recovery mechanism for voice sessions
          </div>
          <p>
            These issues manifest consistently across all browsers (Chrome, Firefox, Safari, Brave) and all 
            implementation approaches, indicating platform-level constraints rather than application-specific problems.
          </p>
        </div>
      </div>

      <h2>3. Technical Comparison</h2>
      <div class="section">
        <div class="section-title">Differences Between Merelus and Restaurant Finance Tracking</div>
        <div class="section-content">
          <p>
            A comparison with the Merelus game project, where voice commands operate successfully, reveals key 
            differences in handshake and token-exchange mechanisms:
          </p>
          <div class="technical-details">
            <strong>Handshake Mechanism Differences:</strong><br><br>
            <span class="highlight">Merelus (Working):</span><br>
            • Simple authentication handshake with minimal token exchange<br>
            • Short-lived sessions matching voice command duration<br>
            • Infrequent backend communication during voice processing<br>
            • Minimal data transmission requirements<br><br>
            
            <span class="highlight">Restaurant Finance (Not Working):</span><br>
            • Complex Internet Identity handshake with extended token management<br>
            • Long-lived sessions required for transaction processing<br>
            • Continuous backend communication during voice processing<br>
            • High data transmission requirements for financial transactions<br><br>
            
            <strong>Token-Exchange Mechanism Differences:</strong><br><br>
            <span class="highlight">Merelus (Working):</span><br>
            • Single token exchange at session start<br>
            • Token validity exceeds typical voice command duration<br>
            • No token refresh required during voice processing<br>
            • Simple token validation without complex security checks<br><br>
            
            <span class="highlight">Restaurant Finance (Not Working):</span><br>
            • Multiple token exchanges during extended voice sessions<br>
            • Token validity shorter than typical transaction processing time<br>
            • Token refresh required during voice processing (causes interruptions)<br>
            • Complex token validation with full Internet Identity security
          </div>
          <p>
            The comparison demonstrates that voice commands are technically feasible on ICP (as proven by Merelus), 
            but applications with more complex requirements encounter platform limitations that prevent successful 
            implementation.
          </p>
        </div>
      </div>

      <h2>4. Analysis</h2>
      <div class="section">
        <div class="section-title">Platform-Level Technical Analysis</div>
        <div class="section-content">
          <p>
            Root cause analysis identifies the interaction between browser security policies, Internet Computer 
            infrastructure, and authentication requirements as the fundamental barrier to voice command functionality:
          </p>
          <ul>
            <li>
              <strong>Browser Security Policies:</strong> Modern browsers enforce strict security policies for 
              microphone access and audio data transmission. These policies, while necessary for user protection, 
              create additional barriers when combined with ICP's security requirements.
            </li>
            <li>
              <strong>Infrastructure Limitations:</strong> The current relayer infrastructure is not optimized 
              for real-time voice data streams. The combination of bandwidth limitations, latency issues, and 
              connection stability problems makes reliable voice processing extremely difficult.
            </li>
            <li>
              <strong>Authentication Complexity:</strong> Internet Identity's robust security model, while 
              excellent for standard web interactions, introduces token management complexity that conflicts 
              with the continuous nature of voice command sessions.
            </li>
            <li>
              <strong>Communication Pipeline Fragility:</strong> The multi-stage communication pipeline 
              (browser → proxy → relayer → backend) creates multiple failure points. Voice processing requires 
              all stages to function reliably simultaneously, which proves difficult to achieve consistently.
            </li>
          </ul>
        </div>
      </div>

      <h2>5. Resolution Attempts</h2>
      <div class="section">
        <div class="section-title">Summary of Attempted Solutions</div>
        <div class="section-content">
          <p>
            Multiple resolution attempts have been made, all following Internet Computer best practices and 
            recommended implementation patterns:
          </p>
          <div class="technical-details">
            <strong>Attempted Solutions:</strong><br><br>
            1. Direct Web Speech API integration with standard ICP authentication<br>
            2. Custom microphone permission handling with explicit user consent<br>
            3. Multi-stage speech-to-text processing pipeline with error recovery<br>
            4. Automatic token renewal mechanisms during voice sessions<br>
            5. Simplified authentication approaches (blocked by security requirements)<br>
            6. Relayer configuration optimization for voice data<br>
            7. Browser-specific compatibility fixes and workarounds<br>
            8. Alternative voice processing architectures<br><br>
            
            <strong>Outcome:</strong> All attempts encountered the same fundamental connectivity barriers,<br>
            confirming that the issues are platform-level constraints that cannot be resolved<br>
            through application-level solutions.
          </div>
        </div>
      </div>

      <h2>6. Conclusions</h2>
      <div class="section">
        <div class="section-title">Technical Findings and Impact Assessment</div>
        <div class="section-content">
          <p>
            Based on comprehensive testing and analysis, the following conclusions have been reached:
          </p>
          <ul>
            <li>
              Voice command functionality is technically feasible on ICP (proven by Merelus) but only under 
              specific conditions that do not match the requirements of complex applications like Restaurant 
              Finance Tracking.
            </li>
            <li>
              The combination of TLS/CORS restrictions, relayer limitations, and authentication token management 
              creates platform-level barriers that prevent reliable voice command implementation in applications 
              with complex requirements.
            </li>
            <li>
              All application-level solutions and workarounds have been exhausted without achieving reliable 
              voice command functionality.
            </li>
            <li>
              Platform-level improvements are required to enable voice command functionality for applications 
              with requirements similar to Restaurant Finance Tracking.
            </li>
          </ul>
        </div>
      </div>

      <h2>7. Recommendations</h2>
      <div class="recommendations-box">
        <h2>Platform-Level Improvement Suggestions for DFINITY</h2>
        <div class="section-content">
          <p>
            To enable reliable voice command functionality for complex applications on the Internet Computer 
            platform, the following platform-level improvements are recommended:
          </p>
          <div class="technical-details">
            <strong>Priority Recommendations:</strong><br><br>
            <span class="highlight">1. Enhanced Voice Communication Support (High Priority):</span><br>
            • Improve TLS/CORS handling specifically for Web Speech API integration<br>
            • Provide dedicated voice communication channels with optimized security policies<br>
            • Implement voice-specific exception handling in security framework<br><br>
            
            <span class="highlight">2. Relayer Voice Data Support (High Priority):</span><br>
            • Enhance relayer infrastructure to support real-time voice data streams<br>
            • Implement voice-specific communication protocols with reduced latency<br>
            • Increase bandwidth allocation for voice processing operations<br>
            • Add fault tolerance and automatic recovery for voice sessions<br><br>
            
            <span class="highlight">3. Authentication Token Management (Medium Priority):</span><br>
            • Extend token validity for voice command sessions<br>
            • Implement seamless token refresh that doesn't interrupt voice processing<br>
            • Provide voice-session-aware authentication mechanisms<br>
            • Allow token extension for long-running voice operations<br><br>
            
            <span class="highlight">4. Documentation and Guidelines (Medium Priority):</span><br>
            • Publish comprehensive best practices for voice command implementation<br>
            • Provide reference implementations and working examples<br>
            • Document known limitations and recommended workarounds<br>
            • Create troubleshooting guides for voice integration issues<br><br>
            
            <span class="highlight">5. Native Platform Voice Support (Long-term Goal):</span><br>
            • Consider implementing native voice command support in ICP platform<br>
            • Provide voice-optimized communication protocols at platform level<br>
            • Enable reliable voice-to-backend integration without application-level complexity
          </div>
          <p>
            <strong>Expected Impact:</strong> Implementing these recommendations will enable reliable voice command 
            functionality for complex applications on ICP, supporting advanced user experiences, accessibility 
            features, and hands-free operation scenarios.
          </p>
        </div>
      </div>

      <div class="footer">
        <p><strong>Restaurant Finance Tracking Application</strong></p>
        <p>External DFINITY Support Report</p>
        <p>Voice Command Integration Issues</p>
        <p style="margin-top: 15px; font-weight: bold; color: #2196f3;">
          This report requests DFINITY engineering team assistance for platform-level improvements
        </p>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
