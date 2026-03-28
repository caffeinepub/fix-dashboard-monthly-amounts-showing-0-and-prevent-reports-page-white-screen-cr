import {
  type ExpenseCategory,
  type PaymentMethod,
  type Transaction,
  TransactionType,
} from "@/backend";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAddTransaction, useUpdateTransaction } from "@/hooks/useQueries";
import { useReadOnlyMode } from "@/hooks/useReadOnlyMode";
import { centsToEur, eurToCents } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
}

export default function TransactionDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDialogProps) {
  const { isReadOnly } = useReadOnlyMode();
  const [transactionType, setTransactionType] = useState<"prihod" | "rashod">(
    "prihod",
  );
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [expenseCategory, setExpenseCategory] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  const addMutation = useAddTransaction();
  const updateMutation = useUpdateTransaction();

  // biome-ignore lint/correctness/useExhaustiveDependencies: open is needed to reset form state
  useEffect(() => {
    if (transaction) {
      setTransactionType(
        transaction.transactionType === TransactionType.prihod
          ? "prihod"
          : "rashod",
      );
      setAmount(centsToEur(transaction.amount).toString());
      const dateObj = new Date(Number(transaction.date) / 1000000);
      setDate(dateObj.toISOString().split("T")[0]);
      setDescription(transaction.description);
      setExpenseCategory(transaction.expenseCategory || "");
      setPaymentMethod(transaction.paymentMethod || "");
    } else {
      setTransactionType("prihod");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setExpenseCategory("");
      setPaymentMethod("");
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isReadOnly) {
      return;
    }

    const amountInCents = eurToCents(Number.parseFloat(amount));
    const dateTimestamp = BigInt(new Date(date).getTime() * 1000000);

    const input = {
      amount: amountInCents,
      transactionType:
        transactionType === "prihod"
          ? TransactionType.prihod
          : TransactionType.rashod,
      date: dateTimestamp,
      description,
      expenseCategory:
        transactionType === "rashod" && expenseCategory
          ? (expenseCategory as ExpenseCategory)
          : undefined,
      paymentMethod:
        transactionType === "prihod" && paymentMethod
          ? (paymentMethod as PaymentMethod)
          : undefined,
    };

    try {
      if (transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, input });
      } else {
        await addMutation.mutateAsync(input);
      }
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">
            {transaction ? "Uredi transakciju" : "Nova transakcija"}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {transaction
              ? "Izmijeni podatke o transakciji"
              : "Dodaj novu transakciju"}
          </DialogDescription>
        </DialogHeader>

        {isReadOnly && (
          <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-3 dark:bg-yellow-950/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Izmjene nisu moguće u načinu samo za čitanje
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm sm:text-base">
              Tip transakcije
            </Label>
            <Select
              value={transactionType}
              onValueChange={(value: "prihod" | "rashod") =>
                setTransactionType(value)
              }
              disabled={isReadOnly}
            >
              <SelectTrigger id="type" className="text-sm sm:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prihod">Prihod</SelectItem>
                <SelectItem value="rashod">Rashod</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm sm:text-base">
              Iznos (EUR)
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={isReadOnly}
              className="text-sm sm:text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm sm:text-base">
              Datum
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              disabled={isReadOnly}
              className="text-sm sm:text-base"
            />
          </div>

          {transactionType === "rashod" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm sm:text-base">
                  Kategorija
                </Label>
                <Select
                  value={expenseCategory}
                  onValueChange={setExpenseCategory}
                  disabled={isReadOnly}
                >
                  <SelectTrigger id="category" className="text-sm sm:text-base">
                    <SelectValue placeholder="Odaberi kategoriju" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="namirnice">Namirnice</SelectItem>
                    <SelectItem value="place">Plaće</SelectItem>
                    <SelectItem value="rezije">Režije</SelectItem>
                    <SelectItem value="oprema">Oprema</SelectItem>
                    <SelectItem value="pice">Piće</SelectItem>
                    <SelectItem value="napojnica">Napojnica</SelectItem>
                    <SelectItem value="ostalo">Ostalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm sm:text-base">
                  Opis
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Unesite opis rashoda"
                  disabled={isReadOnly}
                  className="text-sm sm:text-base min-h-[80px]"
                />
              </div>
            </>
          )}

          {transactionType === "prihod" && (
            <div className="space-y-2">
              <Label htmlFor="payment" className="text-sm sm:text-base">
                Način plaćanja
              </Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
                disabled={isReadOnly}
              >
                <SelectTrigger id="payment" className="text-sm sm:text-base">
                  <SelectValue placeholder="Odaberi način plaćanja" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gotovina">Gotovina</SelectItem>
                  <SelectItem value="kartica">Kartica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              Odustani
            </Button>
            <Button
              type="submit"
              disabled={
                addMutation.isPending || updateMutation.isPending || isReadOnly
              }
              className="w-full sm:w-auto text-sm sm:text-base"
            >
              {addMutation.isPending || updateMutation.isPending
                ? "Spremanje..."
                : "Spremi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
