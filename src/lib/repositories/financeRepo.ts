import type {
  BusinessDocument,
  BusinessProfile,
  Client,
  EmployeeCost,
  ExpenseEntry,
  IncomeEntry,
  Service,
} from "@/lib/types";

const FALLBACK_KEY = "nexus-workapp-fallback-v1";

interface FallbackStore {
  clients: Client[];
  services: Service[];
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  employeeCosts: EmployeeCost[];
  documents: BusinessDocument[];
  businessProfile: BusinessProfile;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeIncomeEntry(value: unknown): IncomeEntry | null {
  const v = asObject(value);
  if (!v || !asString(v.id)) return null;
  return {
    id: asString(v.id),
    createdAt: asString(v.createdAt, new Date().toISOString()),
    updatedAt: asString(v.updatedAt, new Date().toISOString()),
    monthKey: asString(v.monthKey, "unknown"),
    clientName: asString(v.clientName),
    serviceName: asString(v.serviceName),
    amount: asNumber(v.amount, 0),
    currency: (asString(v.currency, "USD") as IncomeEntry["currency"]) ?? "USD",
    type: (asString(v.type, "one_time") as IncomeEntry["type"]) ?? "one_time",
    status: (asString(v.status, "pending") as IncomeEntry["status"]) ?? "pending",
    date: asString(v.date, new Date().toISOString().slice(0, 10)),
  };
}

function normalizeExpenseEntry(value: unknown): ExpenseEntry | null {
  const v = asObject(value);
  if (!v || !asString(v.id)) return null;
  return {
    id: asString(v.id),
    createdAt: asString(v.createdAt, new Date().toISOString()),
    updatedAt: asString(v.updatedAt, new Date().toISOString()),
    monthKey: asString(v.monthKey, "unknown"),
    title: asString(v.title),
    vendor: asString(v.vendor),
    amount: asNumber(v.amount, 0),
    currency: (asString(v.currency, "USD") as ExpenseEntry["currency"]) ?? "USD",
    type: (asString(v.type, "variable") as ExpenseEntry["type"]) ?? "variable",
    status: (asString(v.status, "pending") as ExpenseEntry["status"]) ?? "pending",
    date: asString(v.date, new Date().toISOString().slice(0, 10)),
  };
}

function normalizeEmployeeCost(value: unknown): EmployeeCost | null {
  const v = asObject(value);
  if (!v || !asString(v.id)) return null;
  return {
    id: asString(v.id),
    createdAt: asString(v.createdAt, new Date().toISOString()),
    updatedAt: asString(v.updatedAt, new Date().toISOString()),
    monthKey: asString(v.monthKey, "unknown"),
    collaborator: asString(v.collaborator),
    role: asString(v.role),
    amount: asNumber(v.amount, 0),
    currency: (asString(v.currency, "USD") as EmployeeCost["currency"]) ?? "USD",
    costType: (asString(v.costType, "fixed") as EmployeeCost["costType"]) ?? "fixed",
  };
}

function normalizeService(value: unknown): Service | null {
  const v = asObject(value);
  if (!v || !asString(v.id)) return null;
  return {
    id: asString(v.id),
    createdAt: asString(v.createdAt, new Date().toISOString()),
    updatedAt: asString(v.updatedAt, new Date().toISOString()),
    name: asString(v.name),
    basePrice: asNumber(v.basePrice, 0),
    currency: (asString(v.currency, "USD") as Service["currency"]) ?? "USD",
    category: (asString(v.category, "other") as Service["category"]) ?? "other",
  };
}

function normalizeDocument(value: unknown): BusinessDocument | null {
  const v = asObject(value);
  if (!v || !asString(v.id)) return null;
  const rawItems = asArray<Record<string, unknown>>(v.items);
  const items = rawItems.map((item) => ({
    serviceName: asString(item.serviceName),
    qty: asNumber(item.qty, 1),
    unitPrice: asNumber(item.unitPrice, 0),
    currency: (asString(item.currency, "USD") as BusinessDocument["currency"]) ?? "USD",
  }));
  return {
    id: asString(v.id),
    createdAt: asString(v.createdAt, new Date().toISOString()),
    updatedAt: asString(v.updatedAt, new Date().toISOString()),
    type: (asString(v.type, "quote") as BusinessDocument["type"]) ?? "quote",
    monthKey: asString(v.monthKey, "unknown"),
    clientName: asString(v.clientName),
    currency: (asString(v.currency, "USD") as BusinessDocument["currency"]) ?? "USD",
    items,
    total: asNumber(v.total, 0),
    notes: asString(v.notes),
    websiteUrl: asString(v.websiteUrl, fallbackDefault.businessProfile.websiteUrl),
  };
}

const fallbackDefault: FallbackStore = {
  clients: [],
  services: [],
  incomeEntries: [],
  expenseEntries: [],
  employeeCosts: [],
  documents: [],
  businessProfile: {
    id: "main",
    businessName: "Nexus Global",
    websiteUrl: "https://www.nexusglobalsuministros.com/",
    baseCurrency: "USD",
  },
};

function sanitizeStore(data: Partial<FallbackStore>): FallbackStore {
  return {
    clients: asArray<Client>(data.clients).filter((c) => c && typeof c.id === "string"),
    services: asArray(data.services).map(normalizeService).filter((x): x is Service => Boolean(x)),
    incomeEntries: asArray(data.incomeEntries)
      .map(normalizeIncomeEntry)
      .filter((x): x is IncomeEntry => Boolean(x)),
    expenseEntries: asArray(data.expenseEntries)
      .map(normalizeExpenseEntry)
      .filter((x): x is ExpenseEntry => Boolean(x)),
    employeeCosts: asArray(data.employeeCosts)
      .map(normalizeEmployeeCost)
      .filter((x): x is EmployeeCost => Boolean(x)),
    documents: asArray(data.documents)
      .map(normalizeDocument)
      .filter((x): x is BusinessDocument => Boolean(x)),
    businessProfile: data.businessProfile ?? fallbackDefault.businessProfile,
  };
}

function loadFallback(): FallbackStore {
  if (typeof window === "undefined") return fallbackDefault;
  const raw = localStorage.getItem(FALLBACK_KEY);
  if (!raw) return fallbackDefault;
  try {
    return sanitizeStore({ ...fallbackDefault, ...JSON.parse(raw) } as Partial<FallbackStore>);
  } catch {
    return fallbackDefault;
  }
}

function saveFallback(store: FallbackStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(store));
}

export async function getAllData() {
  try {
    const response = await fetch("/api/data", { cache: "no-store" });
    if (!response.ok) throw new Error("remote-failed");
    const data = (await response.json()) as Partial<FallbackStore>;
    return sanitizeStore(data);
  } catch {
    return sanitizeStore(loadFallback());
  }
}

export async function upsertItem<T extends { id: string }>(
  collectionName: keyof Omit<FallbackStore, "businessProfile">,
  value: T,
) {
  try {
    const response = await fetch(`/api/items/${collectionName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(value),
    });
    if (!response.ok) throw new Error("remote-failed");
  } catch {
    const store = loadFallback();
    const list = [...((store[collectionName] as unknown) as T[])];
    const idx = list.findIndex((item) => item.id === value.id);
    if (idx === -1) list.unshift(value);
    else list[idx] = value;
    (store[collectionName] as unknown) = list;
    saveFallback(store);
  }
}

export async function removeItem(
  collectionName: keyof Omit<FallbackStore, "businessProfile">,
  id: string,
) {
  try {
    const response = await fetch(`/api/items/${collectionName}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error("remote-failed");
  } catch {
    const store = loadFallback();
    const next = (store[collectionName] as { id: string }[]).filter((item) => item.id !== id);
    (store[collectionName] as { id: string }[]) = next;
    saveFallback(store);
  }
}

export async function saveBusinessProfile(profile: BusinessProfile) {
  try {
    const response = await fetch("/api/items/businessProfile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    if (!response.ok) throw new Error("remote-failed");
  } catch {
    const store = loadFallback();
    store.businessProfile = profile;
    saveFallback(store);
  }
}
