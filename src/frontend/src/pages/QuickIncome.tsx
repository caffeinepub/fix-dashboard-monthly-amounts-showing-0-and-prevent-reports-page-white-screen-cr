import { ExpenseCategory, TransactionType } from "@/backend";
import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAddTransaction,
  useClearMigratedMonthlyIncomes,
  useDeleteTransaction,
  useGetAllMonthlyIncomes,
  useGetAllTransactions,
  useMigrateMonthlyIncomes,
} from "@/hooks/useQueries";
import { useReadOnlyMode } from "@/hooks/useReadOnlyMode";
import {
  MONTH_NAMES,
  centsToEur,
  eurToCents,
  formatCurrency,
  getMonthEndTimestamp,
  getMonthStartTimestamp,
} from "@/lib/utils";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Edit2,
  Loader2,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const MONTHS = MONTH_NAMES.map((label, index) => ({ value: index + 1, label }));

const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string }[] = [
  { key: ExpenseCategory.namirnice, label: "Namirnice" },
  { key: ExpenseCategory.pice, label: "Piće" },
  { key: ExpenseCategory.place, label: "Plaće" },
  { key: ExpenseCategory.rezije, label: "Režije" },
  { key: ExpenseCategory.oprema, label: "Oprema" },
  { key: ExpenseCategory.napojnica, label: "Napojnica" },
  { key: ExpenseCategory.ostalo, label: "Ostalo" },
];

type CategoryAmounts = Record<string, string>;

export default function QuickIncome() {
  const { isReadOnly } = useReadOnlyMode();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // --- Income state ---
  const [monthlyAmounts, setMonthlyAmounts] = useState<Record<number, string>>(
    {},
  );
  const [editingMonths, setEditingMonths] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [monthToDelete, setMonthToDelete] = useState<number | null>(null);

  // --- Expense state ---
  const [expandedExpenseMonths, setExpandedExpenseMonths] = useState<
    Set<number>
  >(new Set());
  const [expenseTotals, setExpenseTotals] = useState<Record<number, string>>(
    {},
  );
  const [expenseCategoryAmounts, setExpenseCategoryAmounts] = useState<
    Record<number, CategoryAmounts>
  >({});
  const [savingExpenseMonth, setSavingExpenseMonth] = useState<number | null>(
    null,
  );
  const [editingExpenseMonths, setEditingExpenseMonths] = useState<Set<number>>(
    new Set(),
  );
  const [deleteExpenseDialogOpen, setDeleteExpenseDialogOpen] = useState(false);
  const [monthToDeleteExpenses, setMonthToDeleteExpenses] = useState<
    number | null
  >(null);
  const [isMigrating, setIsMigrating] = useState(false);

  const { data: allMonthlyIncomes, isLoading } = useGetAllMonthlyIncomes();
  const { data: allTransactions } = useGetAllTransactions();
  const migrateMonthlyIncomes = useMigrateMonthlyIncomes();
  const clearMigratedMonthlyIncomes = useClearMigratedMonthlyIncomes();
  const addTransaction = useAddTransaction();
  const deleteTransaction = useDeleteTransaction();

  // Compute existing incomes from standard transactions (by description pattern)
  const existingIncomesMap = useMemo(() => {
    if (!allTransactions)
      return {} as Record<number, { amount: number; id: bigint }>;
    const result: Record<number, { amount: number; id: bigint }> = {};
    for (let m = 1; m <= 12; m++) {
      const desc = `Brzi unos - ${m}/${selectedYear}`;
      const t = allTransactions.find(
        (tx) =>
          tx.transactionType === TransactionType.prihod &&
          tx.description === desc,
      );
      if (t) result[m] = { amount: centsToEur(t.amount), id: t.id };
    }
    return result;
  }, [allTransactions, selectedYear]);

  // Compute existing expenses per month from transactions
  const existingExpensesMap = useMemo(() => {
    if (!allTransactions) return {} as Record<number, number>;
    const result: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      const start = getMonthStartTimestamp(m, selectedYear);
      const end = getMonthEndTimestamp(m, selectedYear);
      const monthExpenses = allTransactions.filter(
        (t) =>
          t.transactionType === TransactionType.rashod &&
          t.date >= start &&
          t.date <= end,
      );
      if (monthExpenses.length > 0) {
        result[m] = monthExpenses.reduce(
          (sum, t) => sum + centsToEur(t.amount),
          0,
        );
      }
    }
    return result;
  }, [allTransactions, selectedYear]);

  // Compute existing expenses per category per month for editing
  const existingExpensesByCategoryMap = useMemo(() => {
    if (!allTransactions)
      return {} as Record<
        number,
        Record<string, { amount: number; transactionIds: bigint[] }>
      >;
    const result: Record<
      number,
      Record<string, { amount: number; transactionIds: bigint[] }>
    > = {};
    for (let m = 1; m <= 12; m++) {
      const start = getMonthStartTimestamp(m, selectedYear);
      const end = getMonthEndTimestamp(m, selectedYear);
      const monthExpenses = allTransactions.filter(
        (t) =>
          t.transactionType === TransactionType.rashod &&
          t.date >= start &&
          t.date <= end,
      );
      if (monthExpenses.length > 0) {
        const byCategory: Record<
          string,
          { amount: number; transactionIds: bigint[] }
        > = {};
        for (const t of monthExpenses) {
          const catKey =
            t.expenseCategory && t.expenseCategory.length > 0
              ? String(t.expenseCategory[0])
              : "ostalo";
          if (!byCategory[catKey]) {
            byCategory[catKey] = { amount: 0, transactionIds: [] };
          }
          byCategory[catKey].amount += centsToEur(t.amount);
          byCategory[catKey].transactionIds.push(t.id);
        }
        result[m] = byCategory;
      }
    }
    return result;
  }, [allTransactions, selectedYear]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: selectedYear is the trigger
  useEffect(() => {
    setMonthlyAmounts({});
    setEditingMonths(new Set());
    setExpandedExpenseMonths(new Set());
    setExpenseTotals({});
    setExpenseCategoryAmounts({});
    setEditingExpenseMonths(new Set());
  }, [selectedYear]);

  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);

  // ---- Migration handler ----
  const handleMigration = async () => {
    if (isReadOnly) {
      toast.error("Operacija nije dostupna u načinu samo za čitanje");
      return;
    }
    setIsMigrating(true);
    try {
      const count = await migrateMonthlyIncomes.mutateAsync();
      await clearMigratedMonthlyIncomes.mutateAsync();
      toast.success(
        `Migracija završena! Prebačeno ${count} prihoda u standardne transakcije.`,
      );
    } catch (error: any) {
      toast.error(
        `Greška pri migraciji: ${error.message || "Nepoznata greška"}`,
      );
    } finally {
      setIsMigrating(false);
    }
  };

  // ---- Income handlers ----
  const handleAmountChange = (month: number, value: string) => {
    if (isReadOnly) return;
    const sanitized = value.replace(/[^\d.]/g, "");
    setMonthlyAmounts((prev) => ({ ...prev, [month]: sanitized }));
  };

  const handleEditMonth = (month: number) => {
    if (isReadOnly) return;
    const existing = existingIncomesMap[month];
    if (existing !== undefined) {
      setMonthlyAmounts((prev) => ({
        ...prev,
        [month]: existing.amount.toFixed(2),
      }));
      setEditingMonths((prev) => new Set(prev).add(month));
    }
  };

  const handleCancelEdit = (month: number) => {
    setMonthlyAmounts((prev) => {
      const n = { ...prev };
      delete n[month];
      return n;
    });
    setEditingMonths((prev) => {
      const s = new Set(prev);
      s.delete(month);
      return s;
    });
  };

  const handleSaveMonth = async (month: number) => {
    if (isReadOnly) {
      toast.error("Operacija nije dostupna u načinu samo za čitanje");
      return;
    }
    const amountStr = monthlyAmounts[month];
    if (!amountStr || amountStr.trim() === "") {
      toast.error("Molimo unesite iznos");
      return;
    }
    const amount = Number.parseFloat(amountStr);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error("Molimo unesite valjan iznos");
      return;
    }

    const isEditing = editingMonths.has(month);
    const existing = existingIncomesMap[month];

    try {
      // If editing, delete old transaction first
      if (isEditing && existing !== undefined) {
        await deleteTransaction.mutateAsync(existing.id);
      }

      await addTransaction.mutateAsync({
        transactionType: TransactionType.prihod,
        amount: eurToCents(amount),
        date: getMonthStartTimestamp(month, selectedYear),
        description: `Brzi unos - ${month}/${selectedYear}`,
      });

      if (isEditing || existing !== undefined) {
        toast.success(`Prihod za ${MONTH_NAMES[month - 1]} ažuriran`);
      } else {
        toast.success(`Prihod za ${MONTH_NAMES[month - 1]} spremljen`);
      }

      setMonthlyAmounts((prev) => {
        const n = { ...prev };
        delete n[month];
        return n;
      });
      setEditingMonths((prev) => {
        const s = new Set(prev);
        s.delete(month);
        return s;
      });
    } catch (error: any) {
      toast.error(
        `Greška pri spremanju: ${error.message || "Nepoznata greška"}`,
      );
    }
  };

  const handleDeleteClick = (month: number) => {
    if (isReadOnly) {
      toast.error("Operacija nije dostupna u načinu samo za čitanje");
      return;
    }
    setMonthToDelete(month);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (monthToDelete === null || isReadOnly) return;
    const existing = existingIncomesMap[monthToDelete];
    if (!existing) {
      setDeleteDialogOpen(false);
      setMonthToDelete(null);
      return;
    }
    try {
      await deleteTransaction.mutateAsync(existing.id);
      toast.success(`Prihod za ${MONTH_NAMES[monthToDelete - 1]} obrisan`);
      setMonthlyAmounts((prev) => {
        const n = { ...prev };
        delete n[monthToDelete!];
        return n;
      });
      setEditingMonths((prev) => {
        const s = new Set(prev);
        s.delete(monthToDelete!);
        return s;
      });
    } catch (error: any) {
      toast.error(
        `Greška pri brisanju: ${error.message || "Nepoznata greška"}`,
      );
    } finally {
      setDeleteDialogOpen(false);
      setMonthToDelete(null);
    }
  };

  const handleSaveAll = async () => {
    if (isReadOnly) {
      toast.error("Operacija nije dostupna u načinu samo za čitanje");
      return;
    }
    const monthsToSave = Object.entries(monthlyAmounts).filter(
      ([_, v]) => v.trim() !== "",
    );
    if (monthsToSave.length === 0) {
      toast.error("Nema podataka za spremanje");
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    for (const [monthStr, amountStr] of monthsToSave) {
      const month = Number.parseInt(monthStr);
      const amount = Number.parseFloat(amountStr);
      if (Number.isNaN(amount) || amount < 0) {
        errorCount++;
        continue;
      }
      const isEditing = editingMonths.has(month);
      const existing = existingIncomesMap[month];
      try {
        if (isEditing && existing !== undefined) {
          await deleteTransaction.mutateAsync(existing.id);
        }
        await addTransaction.mutateAsync({
          transactionType: TransactionType.prihod,
          amount: eurToCents(amount),
          date: getMonthStartTimestamp(month, selectedYear),
          description: `Brzi unos - ${month}/${selectedYear}`,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }
    if (successCount > 0) {
      toast.success(`Spremljeno ${successCount} mjesečnih prihoda`);
      setMonthlyAmounts({});
      setEditingMonths(new Set());
    }
    if (errorCount > 0) {
      toast.error(`Greška pri spremanju ${errorCount} prihoda`);
    }
  };

  const getDisplayAmount = (month: number): string => {
    if (monthlyAmounts[month] !== undefined) return monthlyAmounts[month];
    const existing = existingIncomesMap[month];
    if (existing !== undefined) return existing.amount.toFixed(2);
    return "";
  };

  const hasChanges = Object.keys(monthlyAmounts).length > 0;
  const isSaving = addTransaction.isPending || deleteTransaction.isPending;
  const totalIncome = Object.values(existingIncomesMap).reduce(
    (sum, e) => sum + e.amount,
    0,
  );
  const enteredMonthsCount = Object.keys(existingIncomesMap).length;

  // Check if old monthly incomes exist (migration banner)
  const hasOldMonthlyIncomes =
    allMonthlyIncomes !== undefined && allMonthlyIncomes.length > 0;

  // ---- Expense handlers ----
  const toggleExpenseMonth = (month: number) => {
    setExpandedExpenseMonths((prev) => {
      const s = new Set(prev);
      if (s.has(month)) {
        s.delete(month);
        setEditingExpenseMonths((ep) => {
          const es = new Set(ep);
          es.delete(month);
          return es;
        });
      } else {
        s.add(month);
      }
      return s;
    });
    if (!expenseCategoryAmounts[month]) {
      setExpenseCategoryAmounts((prev) => ({
        ...prev,
        [month]: Object.fromEntries(
          EXPENSE_CATEGORIES.map((c) => [c.key, ""]),
        ) as CategoryAmounts,
      }));
    }
  };

  const handleEditExpenseMonth = (month: number) => {
    if (isReadOnly) return;
    const byCategory = existingExpensesByCategoryMap[month];
    if (!byCategory) return;

    const newCategoryAmounts: CategoryAmounts = Object.fromEntries(
      EXPENSE_CATEGORIES.map((c) => [c.key, ""]),
    );
    let total = 0;
    for (const cat of EXPENSE_CATEGORIES) {
      const catData = byCategory[String(cat.key)];
      if (catData) {
        newCategoryAmounts[cat.key] = catData.amount.toFixed(2);
        total += catData.amount;
      }
    }

    setExpenseCategoryAmounts((prev) => ({
      ...prev,
      [month]: newCategoryAmounts,
    }));
    setExpenseTotals((prev) => ({ ...prev, [month]: total.toFixed(2) }));
    setEditingExpenseMonths((prev) => new Set(prev).add(month));
    setExpandedExpenseMonths((prev) => new Set(prev).add(month));
  };

  const handleCancelEditExpense = (month: number) => {
    setEditingExpenseMonths((prev) => {
      const s = new Set(prev);
      s.delete(month);
      return s;
    });
    setExpandedExpenseMonths((prev) => {
      const s = new Set(prev);
      s.delete(month);
      return s;
    });
    setExpenseTotals((prev) => {
      const n = { ...prev };
      delete n[month];
      return n;
    });
    setExpenseCategoryAmounts((prev) => {
      const n = { ...prev };
      delete n[month];
      return n;
    });
  };

  const handleDeleteExpenseClick = (month: number) => {
    if (isReadOnly) {
      toast.error("Operacija nije dostupna u načinu samo za čitanje");
      return;
    }
    setMonthToDeleteExpenses(month);
    setDeleteExpenseDialogOpen(true);
  };

  const handleDeleteExpenseConfirm = async () => {
    if (monthToDeleteExpenses === null || isReadOnly) return;
    const month = monthToDeleteExpenses;
    const byCategory = existingExpensesByCategoryMap[month];
    if (!byCategory) {
      setDeleteExpenseDialogOpen(false);
      setMonthToDeleteExpenses(null);
      return;
    }

    const allIds: bigint[] = Object.values(byCategory).flatMap(
      (c) => c.transactionIds,
    );

    try {
      await Promise.all(allIds.map((id) => deleteTransaction.mutateAsync(id)));
      toast.success(
        `Rashodi za ${MONTH_NAMES[month - 1]} ${selectedYear} obrisani`,
      );
      setExpenseTotals((prev) => {
        const n = { ...prev };
        delete n[month];
        return n;
      });
      setExpenseCategoryAmounts((prev) => {
        const n = { ...prev };
        delete n[month];
        return n;
      });
      setExpandedExpenseMonths((prev) => {
        const s = new Set(prev);
        s.delete(month);
        return s;
      });
      setEditingExpenseMonths((prev) => {
        const s = new Set(prev);
        s.delete(month);
        return s;
      });
    } catch (error: any) {
      toast.error(
        `Greška pri brisanju rashoda: ${error.message || "Nepoznata greška"}`,
      );
    } finally {
      setDeleteExpenseDialogOpen(false);
      setMonthToDeleteExpenses(null);
    }
  };

  const handleCategoryAmountChange = (
    month: number,
    category: string,
    value: string,
  ) => {
    if (isReadOnly) return;
    const sanitized = value.replace(/[^\d.]/g, "");
    setExpenseCategoryAmounts((prev) => ({
      ...prev,
      [month]: { ...(prev[month] || {}), [category]: sanitized },
    }));
  };

  const getDistributedTotal = (month: number): number => {
    const cats = expenseCategoryAmounts[month] || {};
    return Object.values(cats).reduce(
      (sum, v) => sum + (Number.parseFloat(v) || 0),
      0,
    );
  };

  const getEnteredTotal = (month: number): number => {
    return Number.parseFloat(expenseTotals[month] || "0") || 0;
  };

  const isDistributionValid = (month: number): boolean => {
    const entered = getEnteredTotal(month);
    const distributed = getDistributedTotal(month);
    if (entered <= 0) return false;
    return Math.abs(entered - distributed) < 0.01;
  };

  const handleSaveExpenses = async (month: number) => {
    if (isReadOnly) {
      toast.error("Operacija nije dostupna u načinu samo za čitanje");
      return;
    }
    if (!isDistributionValid(month)) {
      toast.error("Raspoređeni iznos mora odgovarati ukupnom iznosu");
      return;
    }

    const cats = expenseCategoryAmounts[month] || {};
    const date =
      BigInt(new Date(selectedYear, month - 1, 1).getTime()) *
      BigInt(1_000_000);
    const monthName = MONTH_NAMES[month - 1];
    const isEditing = editingExpenseMonths.has(month);

    setSavingExpenseMonth(month);
    try {
      if (isEditing) {
        const byCategory = existingExpensesByCategoryMap[month];
        if (byCategory) {
          const allIds: bigint[] = Object.values(byCategory).flatMap(
            (c) => c.transactionIds,
          );
          await Promise.all(
            allIds.map((id) => deleteTransaction.mutateAsync(id)),
          );
        }
      }

      const saves = EXPENSE_CATEGORIES.filter((c) => {
        const val = Number.parseFloat(cats[c.key] || "0");
        return val > 0;
      }).map((c) =>
        addTransaction.mutateAsync({
          transactionType: TransactionType.rashod,
          expenseCategory: c.key,
          amount: eurToCents(Number.parseFloat(cats[c.key])),
          date,
          description: `Brzi unos - ${c.label} - ${monthName} ${selectedYear}`,
        }),
      );

      await Promise.all(saves);
      toast.success(
        isEditing
          ? `Rashodi za ${monthName} ${selectedYear} ažurirani`
          : `Rashodi za ${monthName} ${selectedYear} spremljeni`,
      );

      setExpenseTotals((prev) => {
        const n = { ...prev };
        delete n[month];
        return n;
      });
      setExpenseCategoryAmounts((prev) => {
        const n = { ...prev };
        delete n[month];
        return n;
      });
      setExpandedExpenseMonths((prev) => {
        const s = new Set(prev);
        s.delete(month);
        return s;
      });
      setEditingExpenseMonths((prev) => {
        const s = new Set(prev);
        s.delete(month);
        return s;
      });
    } catch (error: any) {
      toast.error(
        `Greška pri spremanju rashoda: ${error.message || "Nepoznata greška"}`,
      );
    } finally {
      setSavingExpenseMonth(null);
    }
  };

  const totalExpenses = Object.values(existingExpensesMap).reduce(
    (sum, a) => sum + a,
    0,
  );
  const expenseMonthsCount = Object.keys(existingExpensesMap).length;

  // Year selector card shared
  const YearSelector = (
    <Card className="mb-4 sm:mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
          Odabir godine
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Odaberite godinu za unos podataka
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <Label htmlFor="year-select" className="text-sm sm:min-w-[80px]">
            Godina:
          </Label>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(Number.parseInt(value))}
          >
            <SelectTrigger
              id="year-select"
              className="w-full sm:w-[200px] h-10 sm:h-11"
              data-ocid="quickincome.select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container py-4 sm:py-8 px-4">
      <ReadOnlyBanner />

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Brzi unos podataka</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Brzi unos mjesečnih prihoda i rashoda po kategorijama
        </p>
      </div>

      {/* Migration banner */}
      {hasOldMonthlyIncomes && (
        <Card
          className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/20"
          data-ocid="quickincome.migration.panel"
        >
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-start gap-2 flex-1">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Pronađeni su stari prihodi iz brzih unosa
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    Pronađeni su stari prihodi iz brzih unosa koji nisu vidljivi
                    u svim modulima. Kliknite &ldquo;Pokreni migraciju&rdquo; da
                    ih prebacite u standardne transakcije.
                  </p>
                </div>
              </div>
              <Button
                onClick={handleMigration}
                disabled={isMigrating || isReadOnly}
                className="flex-shrink-0 gap-2"
                data-ocid="quickincome.migration.button"
              >
                {isMigrating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Migracija u tijeku...
                  </>
                ) : (
                  "Pokreni migraciju"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="prihodi" data-ocid="quickincome.tab">
        <TabsList className="mb-6 w-full sm:w-auto">
          <TabsTrigger
            value="prihodi"
            className="flex-1 sm:flex-none"
            data-ocid="quickincome.prihodi.tab"
          >
            Prihodi
          </TabsTrigger>
          <TabsTrigger
            value="rashodi"
            className="flex-1 sm:flex-none"
            data-ocid="quickincome.rashodi.tab"
          >
            Rashodi
          </TabsTrigger>
        </TabsList>

        {/* ============ PRIHODI TAB ============ */}
        <TabsContent value="prihodi">
          {YearSelector}
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8 sm:py-12">
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {MONTHS.map((month) => {
                  const existing = existingIncomesMap[month.value];
                  const hasExisting = existing !== undefined;
                  const displayAmount = getDisplayAmount(month.value);
                  const hasUnsavedChanges =
                    monthlyAmounts[month.value] !== undefined;
                  const isEditing = editingMonths.has(month.value);

                  return (
                    <Card
                      key={month.value}
                      className={hasUnsavedChanges ? "border-primary" : ""}
                    >
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base sm:text-lg">
                          {month.label}
                        </CardTitle>
                        {hasExisting && !hasUnsavedChanges && (
                          <CardDescription className="text-xs sm:text-sm">
                            Trenutni prihod: {formatCurrency(existing.amount)}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input
                                type="text"
                                placeholder="0.00"
                                value={displayAmount}
                                onChange={(e) =>
                                  handleAmountChange(
                                    month.value,
                                    e.target.value,
                                  )
                                }
                                className="text-right h-10 sm:h-11 text-base"
                                disabled={
                                  isSaving ||
                                  (hasExisting &&
                                    !isEditing &&
                                    !hasUnsavedChanges) ||
                                  isReadOnly
                                }
                                data-ocid={`quickincome.prihodi.input.${month.value}`}
                              />
                            </div>
                            {hasUnsavedChanges ? (
                              <>
                                <Button
                                  size="icon"
                                  onClick={() => handleSaveMonth(month.value)}
                                  disabled={isSaving || isReadOnly}
                                  className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                                  data-ocid={`quickincome.prihodi.save_button.${month.value}`}
                                >
                                  {isSaving ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Save className="h-4 w-4" />
                                  )}
                                </Button>
                                {isEditing && (
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() =>
                                      handleCancelEdit(month.value)
                                    }
                                    disabled={isSaving || isReadOnly}
                                    className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                                    data-ocid={`quickincome.prihodi.cancel_button.${month.value}`}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            ) : hasExisting ? (
                              <>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleEditMonth(month.value)}
                                  disabled={isSaving || isReadOnly}
                                  className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                                  data-ocid={`quickincome.prihodi.edit_button.${month.value}`}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => handleDeleteClick(month.value)}
                                  disabled={isSaving || isReadOnly}
                                  className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                                  data-ocid={`quickincome.prihodi.delete_button.${month.value}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="icon"
                                onClick={() => handleSaveMonth(month.value)}
                                disabled={
                                  isSaving ||
                                  !monthlyAmounts[month.value] ||
                                  isReadOnly
                                }
                                className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                                data-ocid={`quickincome.prihodi.save_button.${month.value}`}
                              >
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Save All button */}
              {hasChanges && (
                <div className="mt-4 sm:mt-6 flex justify-end">
                  <Button
                    onClick={handleSaveAll}
                    disabled={isSaving || isReadOnly}
                    className="gap-2"
                    data-ocid="quickincome.prihodi.primary_button"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Spremanje...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Spremi sve izmjene
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Summary */}
              <Card className="mt-6 sm:mt-8">
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">
                    Ukupni prihodi za {selectedYear}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {formatCurrency(totalIncome)}
                  </div>
                  <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                    Uneseno {enteredMonthsCount} od 12 mjeseci
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ============ RASHODI TAB ============ */}
        <TabsContent value="rashodi">
          {YearSelector}

          <div className="grid gap-3 sm:gap-4">
            {MONTHS.map((month) => {
              const existingExpenseAmount = existingExpensesMap[month.value];
              const hasExistingExpenses = existingExpenseAmount !== undefined;
              const isExpanded = expandedExpenseMonths.has(month.value);
              const isEditingExpense = editingExpenseMonths.has(month.value);
              const isSavingThis = savingExpenseMonth === month.value;
              const enteredTotal = getEnteredTotal(month.value);
              const distributedTotal = getDistributedTotal(month.value);
              const valid = isDistributionValid(month.value);
              const diff = enteredTotal - distributedTotal;
              const cats = expenseCategoryAmounts[month.value] || {};

              return (
                <Card key={month.value}>
                  <CardHeader
                    className="pb-3 cursor-pointer select-none"
                    onClick={() => {
                      if (!hasExistingExpenses || isEditingExpense) {
                        toggleExpenseMonth(month.value);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg">
                        {month.label}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        {hasExistingExpenses && (
                          <span className="text-sm font-medium text-red-600">
                            {formatCurrency(existingExpenseAmount)}
                          </span>
                        )}
                        {hasExistingExpenses && !isEditingExpense && (
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditExpenseMonth(month.value);
                              }}
                              disabled={isSavingThis || isReadOnly}
                              className="h-8 w-8"
                              data-ocid={`quickincome.rashodi.edit_button.${month.value}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExpenseClick(month.value);
                              }}
                              disabled={isSavingThis || isReadOnly}
                              className="h-8 w-8"
                              data-ocid={`quickincome.rashodi.delete_button.${month.value}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {!hasExistingExpenses || isEditingExpense ? (
                          isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>

                  {(isExpanded || isEditingExpense) && (
                    <CardContent>
                      {/* Total amount input */}
                      <div className="mb-4">
                        <Label className="text-sm mb-1 block">
                          Ukupni rashod za {month.label} (EUR)
                        </Label>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={expenseTotals[month.value] || ""}
                          onChange={(e) => {
                            if (isReadOnly) return;
                            const sanitized = e.target.value.replace(
                              /[^\d.]/g,
                              "",
                            );
                            setExpenseTotals((prev) => ({
                              ...prev,
                              [month.value]: sanitized,
                            }));
                          }}
                          className="text-right h-10 text-base"
                          disabled={isReadOnly || isSavingThis}
                          data-ocid={`quickincome.rashodi.input.${month.value}`}
                        />
                      </div>

                      {/* Category breakdown */}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-4">
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <div key={cat.key} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              {cat.label}
                            </Label>
                            <Input
                              type="text"
                              placeholder="0.00"
                              value={cats[cat.key] || ""}
                              onChange={(e) =>
                                handleCategoryAmountChange(
                                  month.value,
                                  cat.key,
                                  e.target.value,
                                )
                              }
                              className="text-right h-9 text-sm"
                              disabled={isReadOnly || isSavingThis}
                              data-ocid={`quickincome.rashodi.category_input.${month.value}`}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Progress indicator */}
                      {enteredTotal > 0 && (
                        <div
                          className={`mb-4 rounded-md px-3 py-2 text-sm font-medium ${
                            valid
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : distributedTotal > enteredTotal
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          Raspoređeno: {formatCurrency(distributedTotal)} /
                          Ukupno: {formatCurrency(enteredTotal)}
                          {!valid && (
                            <span className="ml-2">
                              {distributedTotal > enteredTotal
                                ? `(prekoračenje ${formatCurrency(distributedTotal - enteredTotal)})`
                                : `(preostalo ${formatCurrency(Math.abs(diff))})`}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Save button */}
                      <div className="flex justify-end gap-2">
                        {isEditingExpense && (
                          <Button
                            variant="outline"
                            onClick={() => handleCancelEditExpense(month.value)}
                            disabled={isSavingThis}
                            className="gap-2"
                            data-ocid={`quickincome.rashodi.cancel_button.${month.value}`}
                          >
                            <X className="h-4 w-4" />
                            Odustani
                          </Button>
                        )}
                        <Button
                          onClick={() => handleSaveExpenses(month.value)}
                          disabled={!valid || isReadOnly || isSavingThis}
                          className="gap-2"
                          data-ocid={`quickincome.rashodi.save_button.${month.value}`}
                        >
                          {isSavingThis ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Spremanje...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              {isEditingExpense
                                ? `Ažuriraj rashode za ${month.label}`
                                : `Spremi rashode za ${month.label}`}
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Summary */}
          <Card className="mt-6 sm:mt-8">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Ukupni rashodi za {selectedYear}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl font-bold text-red-600">
                {formatCurrency(totalExpenses)}
              </div>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
                Evidentirani rashodi u {expenseMonthsCount} od 12 mjeseci
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Income delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              Potvrda brisanja
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Jeste li sigurni da želite obrisati prihod za{" "}
              {monthToDelete ? MONTH_NAMES[monthToDelete - 1] : ""}? Ova radnja
              se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              className="w-full sm:w-auto"
              data-ocid="quickincome.cancel_button"
            >
              Odustani
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="quickincome.confirm_button"
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Expense delete dialog */}
      <AlertDialog
        open={deleteExpenseDialogOpen}
        onOpenChange={setDeleteExpenseDialogOpen}
      >
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              Obriši rashode za{" "}
              {monthToDeleteExpenses
                ? MONTH_NAMES[monthToDeleteExpenses - 1]
                : ""}
              ?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Ova akcija će trajno obrisati sve rashode za{" "}
              {monthToDeleteExpenses
                ? MONTH_NAMES[monthToDeleteExpenses - 1]
                : ""}{" "}
              {selectedYear}. Jeste li sigurni?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              className="w-full sm:w-auto"
              data-ocid="quickincome.rashodi.cancel_button"
            >
              Odustani
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExpenseConfirm}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="quickincome.rashodi.confirm_button"
            >
              Obriši rashode
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
