import { ReadOnlyBanner } from "@/components/ReadOnlyBanner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAddTransaction } from "@/hooks/useQueries";
import { useReadOnlyMode } from "@/hooks/useReadOnlyMode";
import { eurToCentsBigInt, formatCurrency } from "@/lib/utils";
import {
  ExpenseCategory,
  PaymentMethod,
  type TransactionInput,
  TransactionType,
} from "@/types/backend-types";
import { AlertCircle, Info, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ParsedTransaction {
  id: string;
  amount: number;
  transactionType: TransactionType;
  expenseCategory?: ExpenseCategory;
  paymentMethod?: PaymentMethod;
  date: Date;
  description: string;
}

export default function TextualInput() {
  const { isReadOnly } = useReadOnlyMode();
  const [inputText, setInputText] = useState("");
  const [parsedTransactions, setParsedTransactions] = useState<
    ParsedTransaction[]
  >([]);
  const [errors, setErrors] = useState<string[]>([]);
  const addTransactionMutation = useAddTransaction();

  const parseText = () => {
    const text = inputText.trim().toLowerCase();
    if (!text) {
      setErrors(["Unesite tekst za parsiranje"]);
      return;
    }

    const newTransactions: ParsedTransaction[] = [];
    const newErrors: string[] = [];

    const sentences = text.split(/[.\n;]+/).filter((s) => s.trim());

    sentences.forEach((sentence, idx) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      try {
        const parsed = parseSentence(trimmed);
        if (parsed.length > 0) {
          newTransactions.push(...parsed);
        } else {
          newErrors.push(
            `Rečenica ${idx + 1}: Nije prepoznat tip transakcije ili iznos`,
          );
        }
      } catch (error: any) {
        newErrors.push(`Rečenica ${idx + 1}: ${error.message}`);
      }
    });

    setParsedTransactions(newTransactions);
    setErrors(newErrors);

    if (newTransactions.length > 0) {
      toast.success(`Prepoznato ${newTransactions.length} transakcija`);
    }
  };

  const parseSentence = (sentence: string): ParsedTransaction[] => {
    const transactions: ParsedTransaction[] = [];

    let date = new Date();
    if (sentence.includes("danas")) {
      date = new Date();
    } else if (sentence.includes("jučer") || sentence.includes("jucer")) {
      date = new Date();
      date.setDate(date.getDate() - 1);
    }

    let transactionType: TransactionType | null = null;
    if (sentence.includes("prihod")) {
      transactionType = TransactionType.prihod;
    } else if (sentence.includes("rashod")) {
      transactionType = TransactionType.rashod;
    }

    if (!transactionType) return [];

    const hasBreakdownKeywords =
      transactionType === TransactionType.rashod &&
      (/od\s+toga|uključuje/i.test(sentence) ||
        /,\s*\w+\s+\d+(?:[.,]\d+)?(?:\s*(?:eur(?:a)?|€))?/i.test(sentence));

    let expenseCategory: ExpenseCategory | undefined;

    if (transactionType === TransactionType.rashod) {
      const categoryPatterns = [
        { regex: /namirnic/i, category: ExpenseCategory.namirnice },
        { regex: /pić|pic/i, category: ExpenseCategory.pice },
        { regex: /plać|plac/i, category: ExpenseCategory.place },
        { regex: /re[žz]ij/i, category: ExpenseCategory.rezije },
        { regex: /oprem/i, category: ExpenseCategory.oprema },
        { regex: /napojnic/i, category: ExpenseCategory.napojnica },
        { regex: /ostal/i, category: ExpenseCategory.ostalo },
      ];

      for (const pattern of categoryPatterns) {
        if (pattern.regex.test(sentence)) {
          expenseCategory = pattern.category;
          break;
        }
      }
    }

    const amountPattern =
      /(\d+(?:[.,]\d+)?)(?:\s*(?:eur(?:a)?|€))?(?:\s+(gotovina|kartica))?/gi;
    const matches = Array.from(sentence.matchAll(amountPattern));

    const validMatches = matches.filter((match) => {
      const beforeMatch = sentence.substring(0, match.index || 0);
      return (
        beforeMatch.includes("prihod") ||
        beforeMatch.includes("rashod") ||
        /(?:gotovina|kartica|namirnic|pić|pic|plać|plac|re[žz]ij|oprem|napojnic|ostal|od\s+toga|uključuje)/i.test(
          beforeMatch,
        )
      );
    });

    if (validMatches.length === 0) return [];

    if (hasBreakdownKeywords && validMatches.length > 1) {
      const totalAmountStr = validMatches[0][1].replace(",", ".");
      const totalAmount = Number.parseFloat(totalAmountStr);
      const mainPaymentMethod = validMatches[0][2];

      let paymentMethod: PaymentMethod | undefined;
      if (mainPaymentMethod) {
        if (mainPaymentMethod.includes("gotovina"))
          paymentMethod = PaymentMethod.gotovina;
        else if (mainPaymentMethod.includes("kartica"))
          paymentMethod = PaymentMethod.kartica;
      }

      const breakdownParts: string[] = [];
      const firstAmountIndex = sentence.indexOf(validMatches[0][0]);
      let breakdownText = sentence.substring(
        firstAmountIndex + validMatches[0][0].length,
      );
      breakdownText = breakdownText.replace(
        /\s*(od\s+toga|uključuje)\s*/gi,
        " ",
      );

      for (let i = 1; i < validMatches.length; i++) {
        const match = validMatches[i];
        const amount = match[1].replace(",", ".");
        const amountIndex = breakdownText.indexOf(match[0]);

        if (amountIndex > 0) {
          let itemText = breakdownText.substring(0, amountIndex).trim();
          itemText = itemText.replace(/^[,:\-\s]+/, "").trim();
          const parts = itemText.split(",");
          itemText = parts[parts.length - 1].trim();
          breakdownParts.push(
            itemText ? `${itemText} ${amount} EUR` : `${amount} EUR`,
          );
          breakdownText = breakdownText.substring(
            amountIndex + match[0].length,
          );
        }
      }

      const categoryName = expenseCategory
        ? getCategoryDisplayName(expenseCategory)
        : "Ostalo";
      let description = categoryName;
      if (breakdownParts.length > 0)
        description += `: ${breakdownParts.join(", ")}`;

      transactions.push({
        id: `${Date.now()}-${Math.random()}`,
        amount: totalAmount,
        transactionType,
        expenseCategory,
        paymentMethod,
        date,
        description,
      });
    } else {
      validMatches.forEach((match, matchIndex) => {
        const amountStr = match[1].replace(",", ".");
        const amount = Number.parseFloat(amountStr);
        const paymentMethodStr = match[2];

        let paymentMethod: PaymentMethod | undefined;
        if (paymentMethodStr) {
          if (paymentMethodStr.includes("gotovina"))
            paymentMethod = PaymentMethod.gotovina;
          else if (paymentMethodStr.includes("kartica"))
            paymentMethod = PaymentMethod.kartica;
        }

        let description = "";
        const matchEndIndex = (match.index || 0) + match[0].length;
        const afterAmount = sentence.substring(matchEndIndex);

        const linkingWordPattern =
          /(?:kao|za)\s+([a-zčćžšđA-ZČĆŽŠĐ]+(?:\s+[a-zčćžšđA-ZČĆŽŠĐ]+)*)/i;
        const linkingMatch = afterAmount.match(linkingWordPattern);

        let extractedText = "";
        if (linkingMatch) {
          extractedText = linkingMatch[1].trim();
        } else {
          const commaPattern =
            /,\s*([a-zčćžšđA-ZČĆŽŠĐ]+(?:\s+[a-zčćžšđA-ZČĆŽŠĐ]+)*?)(?=\s*\d|$)/i;
          const commaMatch = afterAmount.match(commaPattern);
          if (commaMatch) extractedText = commaMatch[1].trim();
        }

        if (transactionType === TransactionType.rashod) {
          const categoryName = expenseCategory
            ? getCategoryDisplayName(expenseCategory)
            : "Ostalo";
          if (extractedText) {
            extractedText =
              extractedText.charAt(0).toUpperCase() + extractedText.slice(1);
            description = extractedText;
          } else {
            description = `${categoryName} - tekstualni unos`;
          }
        } else {
          if (extractedText) {
            extractedText =
              extractedText.charAt(0).toUpperCase() + extractedText.slice(1);
            description = extractedText;
          } else {
            description = "Prihod - tekstualni unos";
          }
        }

        transactions.push({
          id: `${Date.now()}-${Math.random()}-${matchIndex}`,
          amount,
          transactionType,
          expenseCategory,
          paymentMethod,
          date,
          description,
        });
      });
    }

    return transactions;
  };

  const getCategoryDisplayName = (category: ExpenseCategory): string => {
    const map: Record<ExpenseCategory, string> = {
      [ExpenseCategory.namirnice]: "Namirnice",
      [ExpenseCategory.pice]: "Piće",
      [ExpenseCategory.place]: "Plaće",
      [ExpenseCategory.rezije]: "Režije",
      [ExpenseCategory.oprema]: "Oprema",
      [ExpenseCategory.napojnica]: "Napojnica",
      [ExpenseCategory.ostalo]: "Ostalo",
    };
    return map[category];
  };

  const getPaymentMethodDisplayName = (method: PaymentMethod): string => {
    return method === PaymentMethod.gotovina ? "Gotovina" : "Kartica";
  };

  const removeTransaction = (id: string) => {
    setParsedTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const saveAllTransactions = async () => {
    if (isReadOnly) {
      toast.error("Operacija nije dostupna u načinu samo za čitanje");
      return;
    }

    if (parsedTransactions.length === 0) {
      toast.error("Nema transakcija za spremanje");
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const transaction of parsedTransactions) {
      try {
        const input: TransactionInput = {
          // amount must be bigint per TransactionInput
          amount: eurToCentsBigInt(transaction.amount),
          transactionType: transaction.transactionType,
          expenseCategory: transaction.expenseCategory || null,
          paymentMethod: transaction.paymentMethod || null,
          date: BigInt(transaction.date.getTime() * 1000000),
          description: transaction.description,
        };

        await addTransactionMutation.mutateAsync(input);
        successCount++;
      } catch (error) {
        errorCount++;
        console.error("Error saving transaction:", error);
      }
    }

    if (successCount > 0) {
      toast.success(`Spremljeno ${successCount} transakcija`);
      setParsedTransactions([]);
      setInputText("");
      setErrors([]);
    }

    if (errorCount > 0) {
      toast.error(`Greška kod ${errorCount} transakcija`);
    }
  };

  const clearAll = () => {
    setInputText("");
    setParsedTransactions([]);
    setErrors([]);
  };

  return (
    <div className="container mx-auto py-4 sm:py-8 px-4">
      <ReadOnlyBanner />

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Tekstualni unos transakcija
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-2">
          Unesite transakcije prirodnim jezikom na hrvatskom.
        </p>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Unos teksta</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Unesite jednu ili više transakcija u prirodnom jeziku.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong className="text-sm">Primjeri:</strong>
                <ScrollArea className="h-32 sm:h-auto">
                  <ul className="mt-2 space-y-1 text-xs sm:text-sm">
                    <li>• danas prihod 15 eur gotovina i 50 eur kartica</li>
                    <li>• danas prihod 15 gotovina i 50 kartica</li>
                    <li>• jučer rashod 20 namirnice</li>
                    <li>• danas rashod 100 plaće</li>
                    <li>• danas rashodi plaće 50 eur kao Tamara</li>
                    <li>
                      • rashod 150 eur namirnice od toga 50 riba, 50 meso, 50
                      Plodine
                    </li>
                    <li>• rashod 80 piće uključuje 30 vino, 50 pivo</li>
                    <li>
                      • rashod 200 namirnice, kruh 50, mlijeko 50, voće 100
                    </li>
                    <li>• prihod 75 kartica za catering</li>
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>

            <Textarea
              placeholder="Unesite transakcije ovdje..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={6}
              className="font-mono text-sm sm:text-base resize-none"
              disabled={isReadOnly}
            />

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={parseText}
                className="flex-1"
                disabled={isReadOnly}
              >
                Parsiraj tekst
              </Button>
              <Button
                onClick={clearAll}
                variant="outline"
                className="flex-1 sm:flex-initial"
              >
                Očisti
              </Button>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong className="text-sm">Greške:</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    {errors.map((error) => (
                      <li key={error}>• {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">
              Prepoznate transakcije ({parsedTransactions.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Pregledajte i potvrdite transakcije prije spremanja
            </CardDescription>
          </CardHeader>
          <CardContent>
            {parsedTransactions.length === 0 ? (
              <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
                Nema prepoznatih transakcija
              </div>
            ) : (
              <div className="space-y-4">
                <ScrollArea className="h-[400px] sm:h-[500px]">
                  <div className="space-y-3 pr-4">
                    {parsedTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
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
                              <span className="text-sm sm:text-base font-semibold">
                                {formatCurrency(
                                  Math.round(transaction.amount * 100),
                                )}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {transaction.paymentMethod && (
                                <Badge variant="outline" className="text-xs">
                                  {getPaymentMethodDisplayName(
                                    transaction.paymentMethod,
                                  )}
                                </Badge>
                              )}
                              {transaction.expenseCategory && (
                                <Badge variant="secondary" className="text-xs">
                                  {getCategoryDisplayName(
                                    transaction.expenseCategory,
                                  )}
                                </Badge>
                              )}
                            </div>
                            {transaction.description && (
                              <p className="text-xs text-muted-foreground break-words">
                                {transaction.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {transaction.date.toLocaleDateString("hr-HR")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTransaction(transaction.id)}
                            className="h-8 w-8 shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  onClick={saveAllTransactions}
                  className="w-full"
                  disabled={addTransactionMutation.isPending || isReadOnly}
                >
                  {addTransactionMutation.isPending ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      Spremanje...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Spremi sve transakcije ({parsedTransactions.length})
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
