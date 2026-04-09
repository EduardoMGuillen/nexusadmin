"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IncomeSplitChart } from "@/components/charts/IncomeSplitChart";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { exportDocumentPdf } from "@/lib/services/documentService";
import { formatMoney, fromUSD, getKpis, getMonthKey, toUSD } from "@/lib/services/kpiService";
import { getAllData, removeItem, upsertItem } from "@/lib/repositories/financeRepo";
import type {
  BusinessDocument,
  BusinessProfile,
  Currency,
  EmployeeCost,
  ExpenseEntry,
  IncomeEntry,
  Service,
} from "@/lib/types";

type Tab = "dashboard" | "income" | "expenses" | "employees" | "services" | "documents" | "reports";

interface AppState {
  incomeEntries: IncomeEntry[];
  expenseEntries: ExpenseEntry[];
  employeeCosts: EmployeeCost[];
  services: Service[];
  documents: BusinessDocument[];
  businessProfile: BusinessProfile;
}

const SESSION_KEY = "nexus-workapp-session";
const THEME_KEY = "nexus-workapp-theme";
const ADMIN_USER = "admin";
const ADMIN_PASS = "nexus2026";

const defaultState: AppState = {
  incomeEntries: [],
  expenseEntries: [],
  employeeCosts: [],
  services: [],
  documents: [],
  businessProfile: {
    id: "main",
    businessName: "Nexus Global",
    websiteUrl: "https://www.nexusglobalsuministros.com/",
    baseCurrency: "USD",
  },
};

function nowISO() {
  return new Date().toISOString();
}

function toMonthLabel(monthKey: string) {
  const [y, m] = monthKey.split("-");
  return `${m}/${y}`;
}

export default function HomePage() {
  const [session, setSession] = useState(
    () => (typeof window !== "undefined" ? localStorage.getItem(SESSION_KEY) === "1" : false),
  );
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const savedTheme = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    return savedTheme ?? "dark";
  });
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<AppState>(defaultState);

  const [login, setLogin] = useState({ user: "", pass: "", error: "" });
  const [incomeDraft, setIncomeDraft] = useState({
    clientName: "",
    serviceName: "",
    amount: "",
    currency: "USD" as Currency,
    type: "recurrent" as "recurrent" | "one_time",
    status: "paid" as "paid" | "pending",
    date: new Date().toISOString().slice(0, 10),
  });
  const [expenseDraft, setExpenseDraft] = useState({
    title: "",
    vendor: "",
    amount: "",
    currency: "USD" as Currency,
    type: "fixed" as "fixed" | "variable",
    status: "paid" as "paid" | "pending",
    date: new Date().toISOString().slice(0, 10),
  });
  const [employeeDraft, setEmployeeDraft] = useState({
    collaborator: "",
    role: "",
    amount: "",
    currency: "USD" as Currency,
    costType: "fixed" as "fixed" | "project" | "commission",
  });
  const [serviceDraft, setServiceDraft] = useState({
    name: "",
    basePrice: "",
    currency: "USD" as Currency,
    category: "website" as Service["category"],
  });
  const [docDraft, setDocDraft] = useState({
    type: "quote" as "quote" | "contract",
    clientName: "",
    currency: "USD" as Currency,
    notes: "",
    serviceIds: [] as string[],
  });

  const monthIncome = useMemo(
    () => state.incomeEntries.filter((item) => item.monthKey === monthKey),
    [monthKey, state.incomeEntries],
  );
  const monthExpenses = useMemo(
    () => state.expenseEntries.filter((item) => item.monthKey === monthKey),
    [monthKey, state.expenseEntries],
  );
  const monthEmployeeCosts = useMemo(
    () => state.employeeCosts.filter((item) => item.monthKey === monthKey),
    [monthKey, state.employeeCosts],
  );
  const kpis = useMemo(
    () =>
      getKpis({
        incomeEntries: state.incomeEntries,
        expenseEntries: state.expenseEntries,
        employeeCosts: state.employeeCosts,
        monthKey,
      }),
    [state.employeeCosts, state.expenseEntries, state.incomeEntries, monthKey],
  );

  const monthlyTrend = useMemo(() => {
    const months = new Set<string>();
    state.incomeEntries.forEach((i) => months.add(i.monthKey));
    state.expenseEntries.forEach((e) => months.add(e.monthKey));
    state.employeeCosts.forEach((c) => months.add(c.monthKey));
    return Array.from(months)
      .sort()
      .slice(-8)
      .map((key) => {
        const monthKpis = getKpis({
          incomeEntries: state.incomeEntries,
          expenseEntries: state.expenseEntries,
          employeeCosts: state.employeeCosts,
          monthKey: key,
        });
        return {
          month: toMonthLabel(key),
          income: Number(monthKpis.totalIncomeUSD.toFixed(2)),
          expenses: Number((monthKpis.totalExpensesUSD + monthKpis.totalEmployeeCostsUSD).toFixed(2)),
          profit: Number(monthKpis.netProfitUSD.toFixed(2)),
        };
      });
  }, [state.employeeCosts, state.expenseEntries, state.incomeEntries]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllData();
      setState(data);
    } catch {
      setState(defaultState);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, [loadData]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (login.user === ADMIN_USER && login.pass === ADMIN_PASS) {
      localStorage.setItem(SESSION_KEY, "1");
      setSession(true);
      setLogin((prev) => ({ ...prev, error: "" }));
      return;
    }
    setLogin((prev) => ({ ...prev, error: "Credenciales incorrectas." }));
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(false);
  }

  async function addIncome(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(incomeDraft.amount);
    if (!incomeDraft.clientName || Number.isNaN(amount)) return;
    const value: IncomeEntry = {
      id: crypto.randomUUID(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      monthKey,
      ...incomeDraft,
      amount,
    };
    await upsertItem("incomeEntries", value);
    await loadData();
    setIncomeDraft((prev) => ({ ...prev, clientName: "", serviceName: "", amount: "" }));
  }

  async function addExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(expenseDraft.amount);
    if (!expenseDraft.title || Number.isNaN(amount)) return;
    const value: ExpenseEntry = {
      id: crypto.randomUUID(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      monthKey,
      ...expenseDraft,
      amount,
    };
    await upsertItem("expenseEntries", value);
    await loadData();
    setExpenseDraft((prev) => ({ ...prev, title: "", vendor: "", amount: "" }));
  }

  async function addEmployeeCost(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(employeeDraft.amount);
    if (!employeeDraft.collaborator || Number.isNaN(amount)) return;
    const value: EmployeeCost = {
      id: crypto.randomUUID(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      monthKey,
      ...employeeDraft,
      amount,
    };
    await upsertItem("employeeCosts", value);
    await loadData();
    setEmployeeDraft((prev) => ({ ...prev, collaborator: "", role: "", amount: "" }));
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    const basePrice = Number(serviceDraft.basePrice);
    if (!serviceDraft.name || Number.isNaN(basePrice)) return;
    const value: Service = {
      id: crypto.randomUUID(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      ...serviceDraft,
      basePrice,
    };
    await upsertItem("services", value);
    await loadData();
    setServiceDraft((prev) => ({ ...prev, name: "", basePrice: "" }));
  }

  async function addDocument(e: React.FormEvent) {
    e.preventDefault();
    const selectedServices = state.services.filter((service) => docDraft.serviceIds.includes(service.id));
    if (!docDraft.clientName || !selectedServices.length) return;
    const items = selectedServices.map((service) => ({
      serviceName: service.name,
      qty: 1,
      unitPrice: service.basePrice,
      currency: service.currency,
    }));
    const totalUSD = items.reduce((acc, item) => acc + toUSD(item.unitPrice * item.qty, item.currency), 0);
    const total = fromUSD(totalUSD, docDraft.currency);

    const value: BusinessDocument = {
      id: crypto.randomUUID(),
      createdAt: nowISO(),
      updatedAt: nowISO(),
      type: docDraft.type,
      monthKey,
      clientName: docDraft.clientName,
      currency: docDraft.currency,
      items,
      total,
      notes: docDraft.notes,
      websiteUrl: state.businessProfile.websiteUrl,
    };
    await upsertItem("documents", value);
    await loadData();
    setDocDraft((prev) => ({ ...prev, clientName: "", notes: "", serviceIds: [] }));
  }

  function toggleServiceSelection(id: string) {
    setDocDraft((prev) => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(id)
        ? prev.serviceIds.filter((item) => item !== id)
        : [...prev.serviceIds, id],
    }));
  }

  async function remove(collection: "incomeEntries" | "expenseEntries" | "employeeCosts" | "services" | "documents", id: string) {
    await removeItem(collection, id);
    await loadData();
  }

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexus-backup-${monthKey}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file: File) {
    const text = await file.text();
    const data = JSON.parse(text) as Partial<AppState>;
    const tasks: Promise<void>[] = [];
    (data.incomeEntries ?? []).forEach((item) => tasks.push(upsertItem("incomeEntries", item)));
    (data.expenseEntries ?? []).forEach((item) => tasks.push(upsertItem("expenseEntries", item)));
    (data.employeeCosts ?? []).forEach((item) => tasks.push(upsertItem("employeeCosts", item)));
    (data.services ?? []).forEach((item) => tasks.push(upsertItem("services", item)));
    (data.documents ?? []).forEach((item) => tasks.push(upsertItem("documents", item)));
    await Promise.all(tasks);
    await loadData();
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-actions">
            <button onClick={toggleTheme} className="ghost" type="button">
              {theme === "dark" ? "Modo claro" : "Modo oscuro"}
            </button>
          </div>
          <img src="/api/assets/NexusGPTHD.png" alt="Nexus" className="logo" />
          <h1>Nexus WorkApp</h1>
          <p>Herramienta operativa para control total del negocio.</p>
          <form onSubmit={handleLogin} className="form">
            <input
              placeholder="Usuario"
              value={login.user}
              onChange={(e) => setLogin((prev) => ({ ...prev, user: e.target.value }))}
            />
            <input
              placeholder="Contrasena"
              type="password"
              value={login.pass}
              onChange={(e) => setLogin((prev) => ({ ...prev, pass: e.target.value }))}
            />
            <button type="submit">Entrar</button>
            <small>Acceso: admin / nexus2026</small>
            {login.error ? <small className="danger-text">{login.error}</small> : null}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <img src="/api/assets/NexusGPTHD.png" alt="Nexus" className="brand-logo" />
          <div>
            <h2>{state.businessProfile.businessName}</h2>
            <small>{state.businessProfile.websiteUrl}</small>
          </div>
        </div>
        <div className="row">
          <input value={monthKey} onChange={(e) => setMonthKey(e.target.value)} />
          <button onClick={exportBackup} className="ghost" type="button">
            Exportar backup
          </button>
          <label className="ghost file-label">
            Importar backup
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importBackup(file);
              }}
            />
          </label>
          <button onClick={toggleTheme} className="ghost" type="button">
            {theme === "dark" ? "Claro" : "Oscuro"}
          </button>
          <button onClick={() => window.location.reload()} className="ghost" type="button">
            Refrescar
          </button>
          <button onClick={logout} className="ghost danger" type="button">
            Salir
          </button>
        </div>
      </header>

      <nav className="tabs">
        {(["dashboard", "income", "expenses", "employees", "services", "documents", "reports"] as Tab[]).map(
          (item) => (
            <button
              type="button"
              key={item}
              className={tab === item ? "tab active" : "tab"}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ),
        )}
      </nav>

      {loading ? <p>Cargando datos...</p> : null}

      {tab === "dashboard" ? (
        <>
          <section className="kpi-grid">
            <article className="card">
              <h3>Ingreso recurrente</h3>
              <p>{formatMoney(kpis.recurringIncomeUSD, "USD")}</p>
            </article>
            <article className="card">
              <h3>Ingreso one-time</h3>
              <p>{formatMoney(kpis.oneTimeIncomeUSD, "USD")}</p>
            </article>
            <article className="card">
              <h3>Costos operativos</h3>
              <p>{formatMoney(kpis.totalExpensesUSD + kpis.totalEmployeeCostsUSD, "USD")}</p>
            </article>
            <article className="card">
              <h3>Utilidad neta</h3>
              <p className={kpis.netProfitUSD >= 0 ? "ok-text" : "danger-text"}>
                {formatMoney(kpis.netProfitUSD, "USD")} ({kpis.marginPct.toFixed(1)}%)
              </p>
            </article>
          </section>
          <section className="two-cols">
            <MonthlyTrendChart data={monthlyTrend} />
            <IncomeSplitChart recurrent={kpis.recurringIncomeUSD} oneTime={kpis.oneTimeIncomeUSD} />
          </section>
        </>
      ) : null}

      {tab === "income" ? (
        <section className="card">
          <h3>Ingresos del mes</h3>
          <form className="form-grid" onSubmit={addIncome}>
            <input placeholder="Cliente" value={incomeDraft.clientName} onChange={(e) => setIncomeDraft((p) => ({ ...p, clientName: e.target.value }))} />
            <input placeholder="Servicio" value={incomeDraft.serviceName} onChange={(e) => setIncomeDraft((p) => ({ ...p, serviceName: e.target.value }))} />
            <input placeholder="Monto" type="number" value={incomeDraft.amount} onChange={(e) => setIncomeDraft((p) => ({ ...p, amount: e.target.value }))} />
            <select value={incomeDraft.currency} onChange={(e) => setIncomeDraft((p) => ({ ...p, currency: e.target.value as Currency }))}>
              <option>USD</option><option>HNL</option><option>EUR</option>
            </select>
            <select value={incomeDraft.type} onChange={(e) => setIncomeDraft((p) => ({ ...p, type: e.target.value as "recurrent" | "one_time" }))}>
              <option value="recurrent">Recurrente</option><option value="one_time">One-time</option>
            </select>
            <select value={incomeDraft.status} onChange={(e) => setIncomeDraft((p) => ({ ...p, status: e.target.value as "paid" | "pending" }))}>
              <option value="paid">Pagado</option><option value="pending">Pendiente</option>
            </select>
            <button type="submit">Agregar</button>
          </form>
          <table>
            <thead><tr><th>Cliente</th><th>Servicio</th><th>Monto</th><th>Tipo</th><th></th></tr></thead>
            <tbody>
              {monthIncome.map((item) => (
                <tr key={item.id}>
                  <td>{item.clientName}</td><td>{item.serviceName}</td><td>{formatMoney(item.amount, item.currency)}</td><td>{item.type}</td>
                  <td><button type="button" className="ghost danger" onClick={() => void remove("incomeEntries", item.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "expenses" ? (
        <section className="card">
          <h3>Gastos del mes</h3>
          <form className="form-grid" onSubmit={addExpense}>
            <input placeholder="Concepto" value={expenseDraft.title} onChange={(e) => setExpenseDraft((p) => ({ ...p, title: e.target.value }))} />
            <input placeholder="Proveedor" value={expenseDraft.vendor} onChange={(e) => setExpenseDraft((p) => ({ ...p, vendor: e.target.value }))} />
            <input placeholder="Monto" type="number" value={expenseDraft.amount} onChange={(e) => setExpenseDraft((p) => ({ ...p, amount: e.target.value }))} />
            <select value={expenseDraft.currency} onChange={(e) => setExpenseDraft((p) => ({ ...p, currency: e.target.value as Currency }))}>
              <option>USD</option><option>HNL</option><option>EUR</option>
            </select>
            <select value={expenseDraft.type} onChange={(e) => setExpenseDraft((p) => ({ ...p, type: e.target.value as "fixed" | "variable" }))}>
              <option value="fixed">Fijo</option><option value="variable">Variable</option>
            </select>
            <select value={expenseDraft.status} onChange={(e) => setExpenseDraft((p) => ({ ...p, status: e.target.value as "paid" | "pending" }))}>
              <option value="paid">Pagado</option><option value="pending">Pendiente</option>
            </select>
            <button type="submit">Agregar</button>
          </form>
          <table>
            <thead><tr><th>Concepto</th><th>Monto</th><th>Tipo</th><th></th></tr></thead>
            <tbody>
              {monthExpenses.map((item) => (
                <tr key={item.id}>
                  <td>{item.title}</td><td>{formatMoney(item.amount, item.currency)}</td><td>{item.type}</td>
                  <td><button type="button" className="ghost danger" onClick={() => void remove("expenseEntries", item.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "employees" ? (
        <section className="card">
          <h3>Costos de empleados/colaboradores</h3>
          <form className="form-grid" onSubmit={addEmployeeCost}>
            <input placeholder="Nombre colaborador" value={employeeDraft.collaborator} onChange={(e) => setEmployeeDraft((p) => ({ ...p, collaborator: e.target.value }))} />
            <input placeholder="Rol" value={employeeDraft.role} onChange={(e) => setEmployeeDraft((p) => ({ ...p, role: e.target.value }))} />
            <input placeholder="Costo" type="number" value={employeeDraft.amount} onChange={(e) => setEmployeeDraft((p) => ({ ...p, amount: e.target.value }))} />
            <select value={employeeDraft.currency} onChange={(e) => setEmployeeDraft((p) => ({ ...p, currency: e.target.value as Currency }))}>
              <option>USD</option><option>HNL</option><option>EUR</option>
            </select>
            <select value={employeeDraft.costType} onChange={(e) => setEmployeeDraft((p) => ({ ...p, costType: e.target.value as EmployeeCost["costType"] }))}>
              <option value="fixed">Fijo</option><option value="project">Proyecto</option><option value="commission">Comision</option>
            </select>
            <button type="submit">Agregar</button>
          </form>
          <table>
            <thead><tr><th>Colaborador</th><th>Costo</th><th>Tipo</th><th></th></tr></thead>
            <tbody>
              {monthEmployeeCosts.map((item) => (
                <tr key={item.id}>
                  <td>{item.collaborator}</td><td>{formatMoney(item.amount, item.currency)}</td><td>{item.costType}</td>
                  <td><button type="button" className="ghost danger" onClick={() => void remove("employeeCosts", item.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "services" ? (
        <section className="card">
          <h3>Catalogo de servicios</h3>
          <form className="form-grid" onSubmit={addService}>
            <input placeholder="Servicio" value={serviceDraft.name} onChange={(e) => setServiceDraft((p) => ({ ...p, name: e.target.value }))} />
            <input placeholder="Precio base" type="number" value={serviceDraft.basePrice} onChange={(e) => setServiceDraft((p) => ({ ...p, basePrice: e.target.value }))} />
            <select value={serviceDraft.currency} onChange={(e) => setServiceDraft((p) => ({ ...p, currency: e.target.value as Currency }))}>
              <option>USD</option><option>HNL</option><option>EUR</option>
            </select>
            <select value={serviceDraft.category} onChange={(e) => setServiceDraft((p) => ({ ...p, category: e.target.value as Service["category"] }))}>
              <option value="website">Website</option><option value="app">App</option><option value="design">Diseno</option><option value="automation">Automatizacion</option><option value="other">Otro</option>
            </select>
            <button type="submit">Agregar</button>
          </form>
          <table>
            <thead><tr><th>Servicio</th><th>Precio</th><th>Categoria</th><th></th></tr></thead>
            <tbody>
              {state.services.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td><td>{formatMoney(item.basePrice, item.currency)}</td><td>{item.category}</td>
                  <td><button type="button" className="ghost danger" onClick={() => void remove("services", item.id)}>Eliminar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "documents" ? (
        <section className="card">
          <h3>Cotizaciones y contratos</h3>
          <form className="form-grid" onSubmit={addDocument}>
            <select value={docDraft.type} onChange={(e) => setDocDraft((p) => ({ ...p, type: e.target.value as "quote" | "contract" }))}>
              <option value="quote">Cotizacion</option><option value="contract">Contrato</option>
            </select>
            <input placeholder="Cliente" value={docDraft.clientName} onChange={(e) => setDocDraft((p) => ({ ...p, clientName: e.target.value }))} />
            <select value={docDraft.currency} onChange={(e) => setDocDraft((p) => ({ ...p, currency: e.target.value as Currency }))}>
              <option>USD</option><option>HNL</option><option>EUR</option>
            </select>
            <input placeholder="Notas" value={docDraft.notes} onChange={(e) => setDocDraft((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit">Generar</button>
          </form>
          <div className="service-picker">
            {state.services.map((service) => (
              <label key={service.id} className="chip">
                <input
                  type="checkbox"
                  checked={docDraft.serviceIds.includes(service.id)}
                  onChange={() => toggleServiceSelection(service.id)}
                />
                {service.name} ({formatMoney(service.basePrice, service.currency)})
              </label>
            ))}
          </div>
          <table>
            <thead><tr><th>Tipo</th><th>Cliente</th><th>Total</th><th>Acciones</th></tr></thead>
            <tbody>
              {state.documents.filter((item) => item.monthKey === monthKey).map((item) => (
                <tr key={item.id}>
                  <td>{item.type === "contract" ? "Contrato" : "Cotizacion"}</td>
                  <td>{item.clientName}</td>
                  <td>{formatMoney(item.total, item.currency)}</td>
                  <td className="row">
                    <button type="button" className="ghost" onClick={() => exportDocumentPdf(item)}>PDF</button>
                    <button type="button" className="ghost danger" onClick={() => void remove("documents", item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {tab === "reports" ? (
        <section className="card">
          <h3>Reportes clave</h3>
          <ul>
            <li>Top cliente: {monthIncome[0]?.clientName ?? "N/A"}</li>
            <li>Top servicio: {monthIncome[0]?.serviceName ?? "N/A"}</li>
            <li>Ingresos pagados: {monthIncome.filter((i) => i.status === "paid").length}</li>
            <li>Gastos pendientes: {monthExpenses.filter((i) => i.status === "pending").length}</li>
          </ul>
          <MonthlyTrendChart data={monthlyTrend} />
        </section>
      ) : null}
    </main>
  );
}
