import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Save, Loader2, Edit2, Trash2, X } from 'lucide-react';
import { useGetAllMonthlyIncomes, useAddMonthlyIncome, useUpdateMonthlyIncome, useDeleteMonthlyIncome } from '@/hooks/useQueries';
import { formatCurrency, centsToEur, eurToCents, MONTH_NAMES } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';

const MONTHS = MONTH_NAMES.map((label, index) => ({ value: index + 1, label }));

export default function QuickIncome() {
  const { isReadOnly } = useReadOnlyMode();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [monthlyAmounts, setMonthlyAmounts] = useState<Record<number, string>>({});
  const [editingMonths, setEditingMonths] = useState<Set<number>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [monthToDelete, setMonthToDelete] = useState<number | null>(null);

  const { data: allMonthlyIncomes, isLoading } = useGetAllMonthlyIncomes();
  const addMonthlyIncome = useAddMonthlyIncome();
  const updateMonthlyIncome = useUpdateMonthlyIncome();
  const deleteMonthlyIncome = useDeleteMonthlyIncome();

  const existingIncomes = allMonthlyIncomes?.filter((income) => Number(income.year) === selectedYear) || [];
  const existingIncomesMap = existingIncomes.reduce(
    (acc, income) => {
      acc[Number(income.month)] = centsToEur(income.amount);
      return acc;
    },
    {} as Record<number, number>
  );

  useEffect(() => {
    setMonthlyAmounts({});
    setEditingMonths(new Set());
  }, [selectedYear]);

  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - i);

  const handleAmountChange = (month: number, value: string) => {
    if (isReadOnly) return;
    const sanitized = value.replace(/[^\d.]/g, '');
    setMonthlyAmounts((prev) => ({
      ...prev,
      [month]: sanitized,
    }));
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
      const newAmounts = { ...prev };
      delete newAmounts[month];
      return newAmounts;
    });
    setEditingMonths((prev) => {
      const newSet = new Set(prev);
      newSet.delete(month);
      return newSet;
    });
  };

  const handleSaveMonth = async (month: number) => {
    if (isReadOnly) {
      toast.error('Operacija nije dostupna u načinu samo za čitanje');
      return;
    }

    const amountStr = monthlyAmounts[month];
    if (!amountStr || amountStr.trim() === '') {
      toast.error('Molimo unesite iznos');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 0) {
      toast.error('Molimo unesite valjan iznos');
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
      } else {
        await addMonthlyIncome.mutateAsync(input);
      }
      
      const monthName = MONTH_NAMES[month - 1];
      if (isEditing || existingAmount !== undefined) {
        toast.success(`Prihod za ${monthName} ažuriran`);
      } else {
        toast.success(`Prihod za ${monthName} spremljen`);
      }
      
      setMonthlyAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[month];
        return newAmounts;
      });
      setEditingMonths((prev) => {
        const newSet = new Set(prev);
        newSet.delete(month);
        return newSet;
      });
    } catch (error: any) {
      console.error('Error saving monthly income:', error);
      toast.error(`Greška pri spremanju: ${error.message || 'Nepoznata greška'}`);
    }
  };

  const handleDeleteClick = (month: number) => {
    if (isReadOnly) {
      toast.error('Operacija nije dostupna u načinu samo za čitanje');
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
      
      const monthName = MONTH_NAMES[monthToDelete - 1];
      toast.success(`Prihod za ${monthName} obrisan`);
      
      setMonthlyAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[monthToDelete];
        return newAmounts;
      });
      setEditingMonths((prev) => {
        const newSet = new Set(prev);
        newSet.delete(monthToDelete);
        return newSet;
      });
    } catch (error: any) {
      console.error('Error deleting monthly income:', error);
      toast.error(`Greška pri brisanju: ${error.message || 'Nepoznata greška'}`);
    } finally {
      setDeleteDialogOpen(false);
      setMonthToDelete(null);
    }
  };

  const handleSaveAll = async () => {
    if (isReadOnly) {
      toast.error('Operacija nije dostupna u načinu samo za čitanje');
      return;
    }

    const monthsToSave = Object.entries(monthlyAmounts).filter(([_, value]) => value.trim() !== '');

    if (monthsToSave.length === 0) {
      toast.error('Nema podataka za spremanje');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [monthStr, amountStr] of monthsToSave) {
      const month = parseInt(monthStr);
      const amount = parseFloat(amountStr);

      if (isNaN(amount) || amount < 0) {
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
      } catch (error) {
        errorCount++;
        console.error('Error saving monthly income:', error);
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
    if (monthlyAmounts[month] !== undefined) {
      return monthlyAmounts[month];
    }
    const existing = existingIncomesMap[month];
    if (existing !== undefined) {
      return existing.toFixed(2);
    }
    return '';
  };

  const hasChanges = Object.keys(monthlyAmounts).length > 0;
  const isSaving = addMonthlyIncome.isPending || updateMonthlyIncome.isPending || deleteMonthlyIncome.isPending;

  const totalIncome = Object.values(existingIncomesMap).reduce((sum, amount) => sum + amount, 0);
  const enteredMonthsCount = Object.keys(existingIncomesMap).length;

  return (
    <div className="container py-4 sm:py-8 px-4">
      <ReadOnlyBanner />

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Brzi unos mjesečnih prihoda</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Unesite ukupne mjesečne prihode za odabranu godinu. Ovi prihodi će biti uključeni u sve izvještaje i usporedbe.
        </p>
      </div>

      <Card className="mb-4 sm:mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            Odabir godine
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Odaberite godinu za unos mjesečnih prihoda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <Label htmlFor="year-select" className="text-sm sm:min-w-[80px]">
              Godina:
            </Label>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger id="year-select" className="w-full sm:w-[200px] h-10 sm:h-11">
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
              const hasUnsavedChanges = monthlyAmounts[month.value] !== undefined;
              const isEditing = editingMonths.has(month.value);

              return (
                <Card key={month.value} className={hasUnsavedChanges ? 'border-primary' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base sm:text-lg">{month.label}</CardTitle>
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
                            onChange={(e) => handleAmountChange(month.value, e.target.value)}
                            className="text-right h-10 sm:h-11 text-base"
                            disabled={isSaving || (hasExisting && !isEditing && !hasUnsavedChanges) || isReadOnly}
                          />
                        </div>
                        {hasUnsavedChanges ? (
                          <>
                            <Button
                              size="icon"
                              onClick={() => handleSaveMonth(month.value)}
                              disabled={isSaving || isReadOnly}
                              className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                            >
                              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                            {isEditing && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleCancelEdit(month.value)}
                                disabled={isSaving || isReadOnly}
                                className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
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
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              onClick={() => handleDeleteClick(month.value)}
                              disabled={isSaving || isReadOnly}
                              className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="icon"
                            onClick={() => handleSaveMonth(month.value)}
                            disabled={isSaving || !monthlyAmounts[month.value] || isReadOnly}
                            className="h-10 w-10 sm:h-11 sm:w-11 flex-shrink-0"
                          >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
              <Button size="lg" onClick={handleSaveAll} disabled={isSaving} className="w-full sm:w-auto">
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
              <CardTitle className="text-base sm:text-lg">Ukupni prihodi za {selectedYear}</CardTitle>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">Potvrda brisanja</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Jeste li sigurni da želite obrisati prihod za {monthToDelete ? MONTH_NAMES[monthToDelete - 1] : ''}?
              Ova radnja se ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">Odustani</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
