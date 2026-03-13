const STORAGE_KEY = "nexus-admin-data-v1";
const SESSION_KEY = "nexus-admin-session-v1";
const VALID_USER = "admin";
const VALID_PASS = "nexus2026";

const ratesToUSD = {
  USD: 1,
  HNL: 1 / 24.7,
  EUR: 1 / 0.92,
};

const currencySymbols = {
  USD: "$",
  HNL: "L",
  EUR: "€",
};

const defaultData = {
  clients: [],
  expenses: [],
  services: [
    { id: crypto.randomUUID(), name: "MiVisita", price: 1200, currency: "USD" },
    { id: crypto.randomUUID(), name: "PaginaWeb", price: 850, currency: "USD" },
  ],
};

let state = loadData();
let deferredPrompt = null;
let currentDocHTML = "";

const authShell = document.getElementById("authShell");
const adminShell = document.getElementById("adminShell");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const installBtn = document.getElementById("installBtn");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpensesEl = document.getElementById("totalExpenses");
const totalProfitEl = document.getElementById("totalProfit");
const serviceCountEl = document.getElementById("serviceCount");

const clientsTable = document.getElementById("clientsTable");
const expensesTable = document.getElementById("expensesTable");
const servicesTable = document.getElementById("servicesTable");
const serviceSelector = document.getElementById("serviceSelector");

const clientForm = document.getElementById("clientForm");
const expenseForm = document.getElementById("expenseForm");
const serviceForm = document.getElementById("serviceForm");
const quoteForm = document.getElementById("quoteForm");

const quoteClient = document.getElementById("quoteClient");
const quoteType = document.getElementById("quoteType");
const quoteCurrency = document.getElementById("quoteCurrency");
const quoteNotes = document.getElementById("quoteNotes");

const docPreview = document.getElementById("docPreview");
const generateDocBtn = document.getElementById("generateDocBtn");
const printBtn = document.getElementById("printBtn");

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultData);
  try {
    const parsed = JSON.parse(raw);
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
      services: Array.isArray(parsed.services) && parsed.services.length
        ? parsed.services
        : structuredClone(defaultData.services),
    };
  } catch {
    return structuredClone(defaultData);
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(amount, currency = "USD") {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

function toUSD(amount, currency) {
  const rate = ratesToUSD[currency] ?? 1;
  return amount * rate;
}

function fromUSD(usdAmount, currency) {
  const rate = ratesToUSD[currency] ?? 1;
  return usdAmount / rate;
}

function calcTotals() {
  const income = state.clients.reduce((acc, item) => acc + Number(item.incomeUSD || 0), 0);
  const expenses = state.expenses.reduce((acc, item) => acc + Number(item.amountUSD || 0), 0);
  return { income, expenses, profit: income - expenses };
}

function renderKPIs() {
  const { income, expenses, profit } = calcTotals();
  totalIncomeEl.textContent = formatMoney(income, "USD");
  totalExpensesEl.textContent = formatMoney(expenses, "USD");
  totalProfitEl.textContent = formatMoney(profit, "USD");
  totalProfitEl.style.color = profit >= 0 ? "#40d38a" : "#ff6467";
  serviceCountEl.textContent = String(state.services.length);
}

function createDeleteButton(onClick) {
  const btn = document.createElement("button");
  btn.textContent = "Eliminar";
  btn.className = "ghost danger";
  btn.type = "button";
  btn.addEventListener("click", onClick);
  return btn;
}

function renderClients() {
  clientsTable.innerHTML = "";
  for (const client of state.clients) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(client.name)}</td>
      <td>${formatMoney(Number(client.incomeUSD), "USD")}</td>
      <td></td>
    `;
    const actionCell = tr.querySelector("td:last-child");
    actionCell.appendChild(
      createDeleteButton(() => {
        state.clients = state.clients.filter((item) => item.id !== client.id);
        saveData();
        renderAll();
      }),
    );
    clientsTable.appendChild(tr);
  }
}

function renderExpenses() {
  expensesTable.innerHTML = "";
  for (const expense of state.expenses) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(expense.name)}</td>
      <td>${formatMoney(Number(expense.amountUSD), "USD")}</td>
      <td></td>
    `;
    const actionCell = tr.querySelector("td:last-child");
    actionCell.appendChild(
      createDeleteButton(() => {
        state.expenses = state.expenses.filter((item) => item.id !== expense.id);
        saveData();
        renderAll();
      }),
    );
    expensesTable.appendChild(tr);
  }
}

function renderServices() {
  servicesTable.innerHTML = "";
  for (const service of state.services) {
    const usdValue = toUSD(Number(service.price), service.currency);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(service.name)}</td>
      <td>${formatMoney(Number(service.price), service.currency)}</td>
      <td>${service.currency}</td>
      <td>${formatMoney(usdValue, "USD")}</td>
      <td></td>
    `;
    const actionCell = tr.querySelector("td:last-child");
    actionCell.appendChild(
      createDeleteButton(() => {
        state.services = state.services.filter((item) => item.id !== service.id);
        saveData();
        renderAll();
      }),
    );
    servicesTable.appendChild(tr);
  }
}

function renderQuoteClientOptions() {
  quoteClient.innerHTML = "";
  if (!state.clients.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sin clientes (agrega uno)";
    quoteClient.appendChild(option);
    return;
  }
  state.clients.forEach((client) => {
    const option = document.createElement("option");
    option.value = client.id;
    option.textContent = client.name;
    quoteClient.appendChild(option);
  });
}

function renderServiceSelector() {
  serviceSelector.innerHTML = "";
  if (!state.services.length) {
    serviceSelector.innerHTML = `<p class="subtle">No hay servicios cargados.</p>`;
    return;
  }

  state.services.forEach((service) => {
    const wrap = document.createElement("label");
    wrap.className = "service-chip";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = service.id;
    checkbox.className = "quote-service-check";

    const qty = document.createElement("input");
    qty.type = "number";
    qty.min = "1";
    qty.value = "1";
    qty.className = "qty-input";
    qty.title = "Cantidad";

    const text = document.createElement("span");
    text.textContent = `${service.name} (${formatMoney(Number(service.price), service.currency)})`;

    wrap.appendChild(checkbox);
    wrap.appendChild(text);
    wrap.appendChild(qty);
    serviceSelector.appendChild(wrap);
  });
}

function getSelectedServices() {
  const cards = Array.from(serviceSelector.querySelectorAll(".service-chip"));
  const selected = [];

  cards.forEach((card) => {
    const check = card.querySelector(".quote-service-check");
    const qtyInput = card.querySelector(".qty-input");
    if (!check.checked) return;
    const service = state.services.find((item) => item.id === check.value);
    if (!service) return;
    const qty = Math.max(1, Number(qtyInput.value || 1));
    selected.push({ ...service, qty });
  });

  return selected;
}

function generateDoc() {
  const selectedClient = state.clients.find((c) => c.id === quoteClient.value);
  const selectedServices = getSelectedServices();
  if (!selectedClient) {
    docPreview.innerHTML = `<p class="error">Debes tener al menos un cliente para generar un documento.</p>`;
    currentDocHTML = "";
    return;
  }
  if (!selectedServices.length) {
    docPreview.innerHTML = `<p class="error">Selecciona al menos un servicio para generar la cotización/contrato.</p>`;
    currentDocHTML = "";
    return;
  }

  const finalCurrency = quoteCurrency.value;
  const today = new Date();
  const formattedDate = today.toLocaleDateString("es-HN");
  const docId = `NXS-${today.getFullYear()}-${String(today.getTime()).slice(-6)}`;

  let totalUSD = 0;
  const rows = selectedServices
    .map((service) => {
      const lineUSD = toUSD(Number(service.price), service.currency) * service.qty;
      totalUSD += lineUSD;
      const lineFinal = fromUSD(lineUSD, finalCurrency);
      return `
        <tr>
          <td>${escapeHtml(service.name)}</td>
          <td>${service.qty}</td>
          <td>${formatMoney(Number(service.price), service.currency)}</td>
          <td>${formatMoney(lineFinal, finalCurrency)}</td>
        </tr>
      `;
    })
    .join("");

  const totalFinal = fromUSD(totalUSD, finalCurrency);
  const notes = quoteNotes.value.trim();

  currentDocHTML = `
    <div class="doc-head">
      <img src="./nexustexto.png" alt="Nexus" class="doc-logo" />
      <div>
        <h4>${quoteType.value} - ${docId}</h4>
        <p>Fecha: ${formattedDate}</p>
        <p>Cliente: ${escapeHtml(selectedClient.name)}</p>
      </div>
    </div>
    <p>
      Nexus Global presenta esta ${quoteType.value.toLowerCase()} para la prestación de servicios digitales.
      Todos los valores están expresados en ${finalCurrency}.
    </p>
    <table class="doc-table">
      <thead>
        <tr>
          <th>Servicio</th>
          <th>Cantidad</th>
          <th>Precio Unitario</th>
          <th>Subtotal (${finalCurrency})</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>Total</strong></td>
          <td><strong>${formatMoney(totalFinal, finalCurrency)}</strong></td>
        </tr>
      </tfoot>
    </table>
    <p><strong>Términos base:</strong> 50% inicial, 50% contra entrega final. Soporte post-lanzamiento incluido según alcance acordado.</p>
    ${
      notes
        ? `<p><strong>Notas:</strong> ${escapeHtml(notes)}</p>`
        : ""
    }
    <div class="signatures">
      <div><span>Firma Nexus Global</span></div>
      <div><span>Firma Cliente</span></div>
    </div>
  `;
  docPreview.innerHTML = currentDocHTML;
}

function printDocument() {
  if (!currentDocHTML) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Documento Nexus</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #16181d; }
          .doc-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
          .doc-logo { max-height: 54px; object-fit: contain; }
          .doc-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 16px; }
          .doc-table th, .doc-table td { border: 1px solid #dadde5; padding: 8px; text-align: left; }
          .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
          .signatures div { width: 45%; border-top: 1px solid #222; text-align: center; padding-top: 8px; }
        </style>
      </head>
      <body>${currentDocHTML}</body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderAll() {
  renderKPIs();
  renderClients();
  renderExpenses();
  renderServices();
  renderQuoteClientOptions();
  renderServiceSelector();
}

function showAdmin() {
  authShell.classList.add("hidden");
  adminShell.classList.remove("hidden");
  renderAll();
}

function showAuth() {
  adminShell.classList.add("hidden");
  authShell.classList.remove("hidden");
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loginError.textContent = "";
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  if (username === VALID_USER && password === VALID_PASS) {
    localStorage.setItem(SESSION_KEY, "1");
    showAdmin();
    return;
  }
  loginError.textContent = "Usuario o contraseña incorrectos.";
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(SESSION_KEY);
  showAuth();
});

clientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("clientName").value.trim();
  const incomeUSD = Number(document.getElementById("clientIncome").value);
  if (!name || Number.isNaN(incomeUSD) || incomeUSD < 0) return;
  state.clients.push({ id: crypto.randomUUID(), name, incomeUSD });
  saveData();
  clientForm.reset();
  renderAll();
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("expenseName").value.trim();
  const amountUSD = Number(document.getElementById("expenseAmount").value);
  if (!name || Number.isNaN(amountUSD) || amountUSD < 0) return;
  state.expenses.push({ id: crypto.randomUUID(), name, amountUSD });
  saveData();
  expenseForm.reset();
  renderAll();
});

serviceForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.getElementById("serviceName").value.trim();
  const price = Number(document.getElementById("servicePrice").value);
  const currency = document.getElementById("serviceCurrency").value;
  if (!name || Number.isNaN(price) || price < 0) return;
  state.services.push({ id: crypto.randomUUID(), name, price, currency });
  saveData();
  serviceForm.reset();
  renderAll();
});

quoteForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

generateDocBtn.addEventListener("click", generateDoc);
printBtn.addEventListener("click", printDocument);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
  installBtn.classList.remove("hidden");
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Silently ignore registration errors for local testing edge cases.
    });
  });
}

if (localStorage.getItem(SESSION_KEY) === "1") {
  showAdmin();
} else {
  showAuth();
}
