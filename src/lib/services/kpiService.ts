import type { Currency, DashboardKpis, EmployeeCost, ExpenseEntry, IncomeEntry } from "@/lib/types";

const ratesToUSD: Record<Currency, number> = {
  USD: 1,
  HNL: 1 / 24.7,
  EUR: 1.08,
};

export function toUSD(amount: number, currency: Currency): number {
  return amount * ratesToUSD[currency];
}

export function fromUSD(amount: number, currency: Currency): number {
  return amount / ratesToUSD[currency];
}

export function getMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function getKpis({
  incomeEntries,
  expenseEntries,
  employeeCosts,
  monthKey,
}: {
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  employeeCosts: EmployeeCost[];
  monthKey: string;
}): DashboardKpis {
  const monthIncome = incomeEntries.filter((item) => item.monthKey === monthKey && item.status === "paid");
  const monthExpenses = expenseEntries.filter((item) => item.monthKey === monthKey && item.status === "paid");
  const monthEmployeeCosts = employeeCosts.filter((item) => item.monthKey === monthKey);

  const recurringIncomeUSD = monthIncome
    .filter((item) => item.type === "recurrent")
    .reduce((acc, item) => acc + toUSD(item.amount, item.currency), 0);
  const oneTimeIncomeUSD = monthIncome
    .filter((item) => item.type === "one_time")
    .reduce((acc, item) => acc + toUSD(item.amount, item.currency), 0);
  const totalIncomeUSD = recurringIncomeUSD + oneTimeIncomeUSD;

  const totalExpensesUSD = monthExpenses.reduce((acc, item) => acc + toUSD(item.amount, item.currency), 0);
  const totalEmployeeCostsUSD = monthEmployeeCosts.reduce(
    (acc, item) => acc + toUSD(item.amount, item.currency),
    0,
  );

  const netProfitUSD = totalIncomeUSD - totalExpensesUSD - totalEmployeeCostsUSD;
  const marginPct = totalIncomeUSD > 0 ? (netProfitUSD / totalIncomeUSD) * 100 : 0;

  return {
    recurringIncomeUSD,
    oneTimeIncomeUSD,
    totalIncomeUSD,
    totalExpensesUSD,
    totalEmployeeCostsUSD,
    netProfitUSD,
    marginPct,
  };
}

export function formatMoney(amount: number, currency: Currency) {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
