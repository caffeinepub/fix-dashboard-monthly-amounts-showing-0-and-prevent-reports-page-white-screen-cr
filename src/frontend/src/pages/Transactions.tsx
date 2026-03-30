import { ExpenseCategory, type Transaction, TransactionType } from "@/backend";
import TransactionDialog from "@/components/TransactionDialog";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteTransaction,
  useGetAllTransactions,
} from "@/hooks/useQueries";
import { centsToEur, formatCurrency } from "@/lib/utils";
import {
  Calendar,
  Edit,
  Filter,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

const categoryLabels: Record<string, string> = {
  namirnice: "Namirnice",
  place: "Plaće",
  rezije: "Režije",
  oprema: "Oprema",
  pice: "Piće",
  napojnica: "Napojnica",
  ostalo: "Ostalo",
};

const paymentMethodLabels: Record<string, string> = {
  gotovina: "Gotovina",
  kartica: "Kartica",
};

export default function Transactions() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<bigint | null>(
    null,
  );

  // Filter states
  const [filterType, setFilterType] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: transactions, isLoading } = useGetAllTransactions();
  const deleteTransaction = useDeleteTransaction();

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedTransaction(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: bigint) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (transactionToDelete !== null) {
      await deleteTransaction.mutateAsync(transactionToDelete);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const handleClearFilters = () => {
    setFilterType("all");
    setFilterCategory("all");
  };

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = [...transactions];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.transactionType === filterType);
    }

    // Filter by category (only for expenses)
    if (filterCategory !== "all") {
      filtered = filtered.filter((t) => {
        if (t.transactionType === TransactionType.rashod && t.expenseCategory) {
          return t.expenseCategory === filterCategory;
        }
        return false;
      });
    }

    return filtered;
  }, [transactions, filterType, filterCategory]);

  const sortedTransactions = filteredTransactions.sort(
    (a, b) => Number(b.date) - Number(a.date),
  );

  const hasActiveFilters = filterType !== "all" || filterCategory !== "all";

  return (
    <div className="container py-4 sm:py-8 px-4">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Transakcije
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Upravljanje prihodima i rashodima
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="default"
            className="flex-1 sm:flex-none"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filteri
            {hasActiveFilters && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              >
                {(filterType !== "all" ? 1 : 0) +
                  (filterCategory !== "all" ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <Button
            onClick={handleAdd}
            size="default"
            className="flex-1 sm:flex-none"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova transakcija
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base sm:text-lg">Filteri</CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Očisti
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type Filter */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Tip transakcije</span>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Svi tipovi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Svi tipovi</SelectItem>
                    <SelectItem value={TransactionType.prihod}>
                      Prihod
                    </SelectItem>
                    <SelectItem value={TransactionType.rashod}>
                      Rashod
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Kategorija rashoda</span>
                <Select
                  value={filterCategory}
                  onValueChange={setFilterCategory}
                  disabled={filterType === TransactionType.prihod}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sve kategorije" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Sve kategorije</SelectItem>
                    <SelectItem value={ExpenseCategory.namirnice}>
                      Namirnice
                    </SelectItem>
                    <SelectItem value={ExpenseCategory.pice}>Piće</SelectItem>
                    <SelectItem value={ExpenseCategory.place}>Plaće</SelectItem>
                    <SelectItem value={ExpenseCategory.rezije}>
                      Režije
                    </SelectItem>
                    <SelectItem value={ExpenseCategory.oprema}>
                      Oprema
                    </SelectItem>
                    <SelectItem value={ExpenseCategory.napojnica}>
                      Napojnica
                    </SelectItem>
                    <SelectItem value={ExpenseCategory.ostalo}>
                      Ostalo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            {hasActiveFilters ? "Filtrirane transakcije" : "Sve transakcije"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {hasActiveFilters
              ? `Prikazano ${sortedTransactions.length} od ${transactions?.length || 0} transakcija`
              : "Pregled svih prihoda i rashoda"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton list
                <Skeleton key={i} className="h-16 sm:h-20 w-full" />
              ))}
            </div>
          ) : sortedTransactions.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {sortedTransactions.map((transaction) => (
                <div
                  key={Number(transaction.id)}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border p-3 sm:p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div
                      className={`flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full ${
                        transaction.transactionType === TransactionType.prihod
                          ? "bg-green-100"
                          : "bg-red-100"
                      }`}
                    >
                      {transaction.transactionType ===
                      TransactionType.prihod ? (
                        <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                        <p className="font-medium text-sm sm:text-base">
                          {transaction.description || "Bez opisa"}
                        </p>
                        <Badge
                          variant={
                            transaction.transactionType ===
                            TransactionType.prihod
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {transaction.transactionType ===
                          TransactionType.prihod
                            ? "Prihod"
                            : "Rashod"}
                        </Badge>
                        {transaction.transactionType ===
                          TransactionType.rashod &&
                          transaction.expenseCategory && (
                            <Badge variant="outline" className="text-xs">
                              {categoryLabels[transaction.expenseCategory]}
                            </Badge>
                          )}
                        {transaction.transactionType ===
                          TransactionType.prihod &&
                          transaction.paymentMethod && (
                            <Badge variant="secondary" className="text-xs">
                              {paymentMethodLabels[transaction.paymentMethod]}
                            </Badge>
                          )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(
                          Number(transaction.date) / 1000000,
                        ).toLocaleDateString("hr-HR")}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                    <div
                      className={`text-lg sm:text-xl font-semibold ${
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
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleEdit(transaction)}
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDeleteClick(transaction.id)}
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 sm:py-12 text-center text-muted-foreground">
              {hasActiveFilters ? (
                <>
                  <p className="text-sm sm:text-base">
                    Nema transakcija koje odgovaraju filterima
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={handleClearFilters}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Očisti filtere
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm sm:text-base">
                    Nema transakcija za prikaz
                  </p>
                  <Button className="mt-4" onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Dodaj prvu transakciju
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={selectedTransaction}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base sm:text-lg">
              Potvrda brisanja
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm">
              Jeste li sigurni da želite obrisati ovu transakciju? Ova radnja se
              ne može poništiti.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">
              Odustani
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
