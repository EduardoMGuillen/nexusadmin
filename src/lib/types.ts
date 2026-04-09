export type Currency = "USD" | "HNL" | "EUR";
export type EntryType = "recurrent" | "one_time";
export type PaymentStatus = "paid" | "pending";
export type ExpenseType = "fixed" | "variable";
export type CostType = "fixed" | "project" | "commission";

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Client extends BaseEntity {
  name: string;
  email?: string;
}

export interface Service extends BaseEntity {
  name: string;
  basePrice: number;
  currency: Currency;
  category: "website" | "app" | "design" | "automation" | "other";
}

export interface IncomeEntry extends BaseEntity {
  monthKey: string;
  clientName: string;
  serviceName: string;
  amount: number;
  currency: Currency;
  type: EntryType;
  status: PaymentStatus;
  date: string;
}

export interface ExpenseEntry extends BaseEntity {
  monthKey: string;
  title: string;
  vendor?: string;
  amount: number;
  currency: Currency;
  type: ExpenseType;
  status: PaymentStatus;
  date: string;
}

export interface EmployeeCost extends BaseEntity {
  monthKey: string;
  collaborator: string;
  role?: string;
  amount: number;
  currency: Currency;
  costType: CostType;
}

export interface DocumentItem {
  serviceName: string;
  qty: number;
  unitPrice: number;
  currency: Currency;
}

export interface BusinessDocument extends BaseEntity {
  type: "quote" | "contract";
  monthKey: string;
  clientName: string;
  currency: Currency;
  items: DocumentItem[];
  total: number;
  notes?: string;
  websiteUrl: string;
}

export interface BusinessProfile {
  id: string;
  businessName: string;
  websiteUrl: string;
  baseCurrency: Currency;
}

export interface DashboardKpis {
  recurringIncomeUSD: number;
  oneTimeIncomeUSD: number;
  totalIncomeUSD: number;
  totalExpensesUSD: number;
  totalEmployeeCostsUSD: number;
  netProfitUSD: number;
  marginPct: number;
}
