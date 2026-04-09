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

function loadFallback(): FallbackStore {
  if (typeof window === "undefined") return fallbackDefault;
  const raw = localStorage.getItem(FALLBACK_KEY);
  if (!raw) return fallbackDefault;
  try {
    return { ...fallbackDefault, ...JSON.parse(raw) };
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
    return {
      clients: asArray<Client>(data.clients),
      services: asArray<Service>(data.services),
      incomeEntries: asArray<IncomeEntry>(data.incomeEntries),
      expenseEntries: asArray<ExpenseEntry>(data.expenseEntries),
      employeeCosts: asArray<EmployeeCost>(data.employeeCosts),
      documents: asArray<BusinessDocument>(data.documents),
      businessProfile: data.businessProfile ?? fallbackDefault.businessProfile,
    };
  } catch {
    return loadFallback();
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
