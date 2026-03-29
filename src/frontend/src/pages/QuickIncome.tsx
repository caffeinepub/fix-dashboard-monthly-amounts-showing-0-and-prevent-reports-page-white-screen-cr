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
  useAddMonthlyIncome,
  useAddTransaction,
  useDeleteMonthlyIncome,
  useDeleteTransaction,
  useGetAllMonthlyIncomes,
  useGetAllTransactions,
  useUpdateMonthlyIncome,
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

  const { data: allMonthlyIncomes, isLoading } = useGetAllMonthlyIncomes();
  const { data: allTransactions } = useGetAllTransactions();
  const addMonthlyIncome = useAddMonthlyIncome();
  const updateMonthlyIncome = useUpdateMonthlyIncome();
  const deleteMonthlyIncome = useDeleteMonthlyIncome();
  const addTransaction = useAddTransaction();
  const deleteTransaction = useDeleteTransaction();

  const existingIncomes =
    allMonthlyIncomes?.filter(
      (income) => Number(income.year) === selectedYear,
    ) || [];
  const existingIncomesMap = existingIncomes.reduce(
    (acc, income) => {
      acc[Number(income.month)] = centsToEur(income.amount);
      return acc;
    },
    {} as Record<number, number>,
  );

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

  // ---- Income handlers ----
  const handleAmountChange = (month: number, value: string) => {
    if (isReadOnly) return;
    const sanitized = value.replace(/[^\d.]/g, "");
    setMonthlyAmounts((prev) => ({ ...prev, [month]: sanitized }));
  };

  const handleEditMonth = (month: number) => {
    if (isReadOnly) return;
    const existingAmount = existingIncomesMap[month];
    if (existingAmount !== undefined) {
      setMonthlyAmounts((prev) => ({
        ...prev,
        [month]: existingAmount.toFixed(2),
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

    const input = {
      year: BigInt(selectedYear),
      month: BigInt(month),
      amount: eurToCents(amount),
    };
    const isEditing = editingMonths.has(month);
    const existingAmount = existingIncomesMap[month];

    try {
      if (isEditing || existingAmount !== undefined) {
        await updateMonthlyIncome.mutateAsync(input);
        toast.success(`Prihod za ${MONTH_NAMES[month - 1]} ažuriran`);
      } else {
        await addMonthlyIncome.mutateAsync(input);
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
    try {
      await deleteMonthlyIncome.mutateAsync({
        year: BigInt(selectedYear),
        month: BigInt(monthToDelete),
      });
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
      const input = {
        year: BigInt(selectedYear),
        month: BigInt(month),
        amount: eurToCents(amount),
      };
      const isEditing = editingMonths.has(month);
      const existingAmount = existingIncomesMap[month];
      try {
        if (isEditing || existingAmount !== undefined) {
          await updateMonthlyIncome.mutateAsync(input);
        } else {
          await addMonthlyIncome.mutateAsync(input);
        }
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
    if (existing !== undefined) return existing.toFixed(2);
    return "";
  };

  const hasChanges = Object.keys(monthlyAmounts).length > 0;
  const isSaving =
    addMonthlyIncome.isPending ||
    updateMonthlyIncome.isPending ||
    deleteMonthlyIncome.isPending;
  const totalIncome = Object.values(existingIncomesMap).reduce(
    (sum, a) => sum + a,
    0,
  );
  const enteredMonthsCount = Object.keys(existingIncomesMap).length;

  // ---- Expense handlers ----
  const toggleExpenseMonth = (month: number) => {
    setExpandedExpenseMonths((prev) => {
      const s = new Set(prev);
      if (s.has(month)) {
        s.delete(month);
        // Also remove from editing if closing
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
    // Init category amounts if not set
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

    // Load existing category amounts into state
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

    // Collect all transaction IDs for this month
    const allIds: bigint[] = Object.values(byCategory).flatMap(
      (c) => c.transactionIds,
    );

    try {
      await Promise.all(allIds.map((id) => deleteTransaction.mutateAsync(id)));
      toast.success(
        `Rashodi za ${MONTH_NAMES[month - 1]} ${selectedYear} obrisani`,
      );
      // Clean up local state
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
        `Greška pri brisanju: ${error.message || "Nepoznata greška"}`,
      );
    } finally {
      setDeleteExpenseDialogOpen(false);
      setMonthToDeleteExpenses(null);
    }
  };

  const handleExpenseTotalChange = (month: number, value: string) => {
    if (isReadOnly) return;
    const sanitized = value.replace(/[^\d.]/g, "");
    setExpenseTotals((prev) => ({ ...prev, [month]: sanitized }));
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
      // If editing, first delete all existing transactions for this month
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

      // Then create new transactions for non-zero categories
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

      // Reset this month
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
                  const existingAmount = existingIncomesMap[month.value];
                  const hasExisting = existingAmount !== undefined;
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
                            Trenutni prihod: {formatCurrency(existingAmount)}
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
                                  variant="destructive"
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

              {hasChanges && !isReadOnly && (
                <div className="mt-4 sm:mt-6 flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className="w-full sm:w-auto"
                    data-ocid="quickincome.prihodi.primary_button"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        Spremanje...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                        Spremi sve promjene
                      </>
                    )}
                  </Button>
                </div>
              )}

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

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {MONTHS.map((month) => {
              const existingTotal = existingExpensesMap[month.value];
              const hasExisting = existingTotal !== undefined;
              const isExpanded = expandedExpenseMonths.has(month.value);
              const isEditingExpense = editingExpenseMonths.has(month.value);
              const enteredTotal = getEnteredTotal(month.value);
              const distributedTotal = getDistributedTotal(month.value);
              const valid = isDistributionValid(month.value);
              const isSavingThis = savingExpenseMonth === month.value;
              const cats = expenseCategoryAmounts[month.value] || {};
              const diff = enteredTotal - distributedTotal;

              return (
                <Card
                  key={month.value}
                  className={
                    isExpanded
                      ? "border-primary sm:col-span-2 lg:col-span-3"
                      : ""
                  }
                  data-ocid={`quickincome.rashodi.item.${month.value}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base sm:text-lg">
                          {month.label}
                        </CardTitle>
                        {hasExisting && (
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            Evidentirani rashodi:{" "}
                            {formatCurrency(existingTotal)}
                          </CardDescription>
                        )}
                        {!hasExisting && (
                          <CardDescription className="text-xs sm:text-sm mt-1">
                            Nema evidentiranih rashoda
                          </CardDescription>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1 flex-shrink-0">
                        {hasExisting && !isExpanded ? (
                          // Existing data, not expanded: show Edit + Delete
                          <>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                handleEditExpenseMonth(month.value)
                              }
                              disabled={isReadOnly || isSavingThis}
                              className="h-9 w-9"
                              data-ocid={`quickincome.rashodi.edit_button.${month.value}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() =>
                                handleDeleteExpenseClick(month.value)
                              }
                              disabled={isReadOnly || isSavingThis}
                              className="h-9 w-9"
                              data-ocid={`quickincome.rashodi.delete_button.${month.value}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : isExpanded ? (
                          // Expanded (new or edit): show close/cancel
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (isEditingExpense) {
                                handleCancelEditExpense(month.value);
                              } else {
                                toggleExpenseMonth(month.value);
                              }
                            }}
                            disabled={isReadOnly || isSavingThis}
                            className="flex-shrink-0 gap-1"
                            data-ocid={`quickincome.rashodi.cancel_button.${month.value}`}
                          >
                            <ChevronUp className="h-4 w-4" />
                            {isEditingExpense ? "Odustani" : "Zatvori"}
                          </Button>
                        ) : (
                          // No existing data, not expanded: show entry button
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleExpenseMonth(month.value)}
                            disabled={isReadOnly}
                            className="flex-shrink-0 gap-1"
                            data-ocid={`quickincome.rashodi.open_modal_button.${month.value}`}
                          >
                            <ChevronDown className="h-4 w-4" />
                            Unesi rashode
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="border-t pt-4">
                      {isEditingExpense && (
                        <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                          Uređivanje rashoda — prethodni podaci bit će
                          zamijenjeni novim unosom.
                        </div>
                      )}

                      {/* Total field */}
                      <div className="mb-4">
                        <Label className="text-sm font-semibold mb-1 block">
                          Ukupni rashodi (EUR)
                        </Label>
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={expenseTotals[month.value] || ""}
                          onChange={(e) =>
                            handleExpenseTotalChange(
                              month.value,
                              e.target.value,
                            )
                          }
                          className="text-right h-10 sm:h-11 text-base max-w-[200px]"
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
