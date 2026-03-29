# Restaurant Finance Tracker

## Current State
The `QuickIncome.tsx` page allows fast monthly income entry per year using `addMonthlyIncome` backend API. Each month gets one total income value. The backend has expense categories: rezije, oprema, napojnica, pice, place, ostalo, namirnice.

## Requested Changes (Diff)

### Add
- Tab navigation on the QuickIncome page: "Brzi unos prihoda" (existing) and "Brzi unos rashoda" (new)
- Rashodi tab: same year selector, 12 month cards
- Each month card shows: total existing expenses for that month (summed from transactions), and a breakdown by category
- Entry flow: user enters total expense amount, expands category breakdown, distributes per category, system tracks remaining amount
- On save: creates one `addTransaction` call per non-zero category, with `transactionType: expense`, `date` = 1st of that month, `expenseCategory` set accordingly
- Display of already-entered expenses per month/category derived from `getAllTransactions()`
- Warning if total distributed != total entered

### Modify
- `QuickIncome.tsx`: wrap existing content in a "Prihodi" tab, add new "Rashodi" tab

### Remove
- Nothing

## Implementation Plan
1. Add Tabs component wrapping to QuickIncome.tsx
2. Move existing income JSX into "Prihodi" tab content
3. Add "Rashodi" tab with year selector (shared state) and 12 month cards
4. Compute existing monthly expenses from `useGetAllTransactions()` grouped by month+category
5. Build category breakdown UI with input fields per category, running total tracker
6. On save per month: call `useAddTransaction` for each category with amount > 0
7. Show existing category amounts as read-only with edit capability (delete existing transactions and re-enter)
