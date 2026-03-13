const STORAGE_KEY = "nexus-admin-data-v1";
const SESSION_KEY = "nexus-admin-session-v1";
const THEME_KEY = "nexus-admin-theme-v1";
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
const refreshBtn = document.getElementById("refreshBtn");
const themeToggleButtons = Array.from(document.querySelectorAll("[data-theme-toggle]"));

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

function getInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function updateThemeToggleLabels(theme) {
  const nextThemeLabel = theme === "dark" ? "Modo claro" : "Modo oscuro";
  themeToggleButtons.forEach((button) => {
    button.textContent = nextThemeLabel;
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(THEME_KEY, theme);
  updateThemeToggleLabels(theme);

  const themeColor = theme === "dark" ? "#0b0f17" : "#f2f5ff";
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", themeColor);
}

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
  const docType = quoteType.value;
  const isContract = docType === "Contrato";
  const introLabel = isContract ? "contrato" : "cotización";
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + 15);

  const phaseOne = totalFinal * 0.5;
  const phaseTwo = totalFinal * 0.3;
  const phaseThree = totalFinal * 0.2;
  const paymentTerms = isContract
    ? `
      <li>Pago unico: ${formatMoney(totalFinal, finalCurrency)} (100%) al aprobar este contrato e iniciar ejecucion.</li>
      <li>La emision de factura/recibo se realiza conforme a la normativa fiscal aplicable.</li>
      <li>Cualquier servicio adicional no contemplado se cotiza por separado y requiere aprobacion previa.</li>
    `
    : `
      <li>Pago inicial: ${formatMoney(phaseOne, finalCurrency)} (50%) para iniciar el proyecto.</li>
      <li>Segundo pago: ${formatMoney(phaseTwo, finalCurrency)} (30%) al completar avance funcional principal.</li>
      <li>Pago final: ${formatMoney(phaseThree, finalCurrency)} (20%) al cierre y entrega.</li>
      <li>Soporte post-lanzamiento: 15 dias para correcciones de alcance original.</li>
      <li>Cambios fuera de alcance se cotizan por separado y requieren aprobacion previa.</li>
    `;

  const serviceNames = selectedServices.map((service) => escapeHtml(service.name)).join(", ");
  const websiteUrl = "https://www.nexusglobalsuministros.com/";
  const extraContractClauses = isContract
    ? `
      <section class="doc-section">
        <h5>5. Propiedad intelectual y licencias</h5>
        <p>
          El código, diseño y activos creados para el cliente se entregarán con licencia de uso comercial una vez
          completado el pago total. Nexus Global podrá reutilizar componentes genéricos no exclusivos.
        </p>
      </section>
      <section class="doc-section">
        <h5>6. Confidencialidad y datos</h5>
        <p>
          Ambas partes acuerdan mantener confidencial la información técnica, comercial y operativa compartida durante
          la ejecución del proyecto.
        </p>
      </section>
      <section class="doc-section">
        <h5>7. Cambios de alcance</h5>
        <p>
          Cualquier requerimiento no contemplado en esta propuesta se tratará como adicional y se formalizará mediante
          una adenda con costo y plazo ajustado.
        </p>
      </section>
      <section class="doc-section">
        <h5>8. Suspensión, terminación y reactivación</h5>
        <p>
          Si el proyecto se pausa por más de 20 días calendario por causas ajenas a Nexus Global (falta de insumos,
          accesos o aprobaciones), se podrá reprogramar la fecha de entrega y aplicar una tarifa de reactivación
          operativa según el estado del proyecto.
        </p>
      </section>
      <section class="doc-section">
        <h5>9. Limitación de responsabilidad</h5>
        <p>
          Nexus Global responde por la correcta ejecución técnica del alcance contratado, pero no garantiza resultados
          comerciales específicos, ya que estos dependen de factores externos como mercado, inversión publicitaria,
          operación del cliente y comportamiento de usuarios finales.
        </p>
      </section>
      <section class="doc-section">
        <h5>10. Jurisdicción aplicable</h5>
        <p>
          Para cualquier controversia derivada del presente contrato, las partes acuerdan resolver de buena fe y, de no
          llegar a acuerdo, someterse a la jurisdicción competente del domicilio comercial de Nexus Global.
        </p>
      </section>
    `
    : `
      <section class="doc-section">
        <h5>5. Vigencia de la cotización</h5>
        <p>
          Esta cotización tiene vigencia hasta el ${validUntil.toLocaleDateString("es-HN")}. Después de esta fecha,
          precios y tiempos pueden variar según disponibilidad y alcance actualizado.
        </p>
      </section>
      <section class="doc-section">
        <h5>6. Alcance referencial de la propuesta</h5>
        <p>
          Esta cotización describe un alcance funcional base. El documento final de contratación detallará entregables,
          dependencias, cronograma definitivo y condiciones de soporte según el análisis técnico completo.
        </p>
      </section>
      <section class="doc-section">
        <h5>7. Exclusiones comunes</h5>
        <p>
          No se incluyen costos de terceros (dominios, hosting, APIs pagas, pasarelas de pago, licencias premium o
          inversión en pauta publicitaria) salvo que se especifique expresamente en esta propuesta.
        </p>
      </section>
    `;

  currentDocHTML = `
    <div class="doc-head">
      <img src="./nexustexto.png" alt="Nexus" class="doc-logo" />
      <div>
        <h4>${docType} - ${docId}</h4>
        <p>Fecha: ${formattedDate}</p>
        <p>Cliente: ${escapeHtml(selectedClient.name)}</p>
      </div>
    </div>
    <p>
      Nexus Global presenta esta ${introLabel} para la prestación de servicios digitales.
      El presente documento resume alcance, inversión y condiciones generales del servicio en ${finalCurrency}.
    </p>
    <section class="doc-section">
      <h5>Datos del proveedor</h5>
      <p>
        <strong>Nexus Global</strong><br />
        Sitio web: <a href="${websiteUrl}" target="_blank" rel="noopener noreferrer">${websiteUrl}</a><br />
        Servicios digitales: desarrollo web, plataformas personalizadas, automatización y soluciones empresariales.
      </p>
    </section>
    <section class="doc-section">
      <h5>1. Resumen ejecutivo</h5>
      <p>
        Se propone desarrollar e implementar los siguientes servicios: ${serviceNames}. El objetivo principal es
        mejorar la presencia digital, optimizar procesos internos y habilitar herramientas tecnológicas orientadas a
        resultados medibles para el cliente.
      </p>
    </section>
    <section class="doc-section">
      <h5>Objetivo de negocio</h5>
      <p>
        La solución propuesta busca fortalecer la operación digital del cliente, aumentar eficiencia en procesos clave y
        habilitar toma de decisiones basada en información, priorizando calidad técnica, escalabilidad y facilidad de uso.
      </p>
    </section>
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
    <section class="doc-section">
      <h5>2. Alcance y entregables</h5>
      <ul>
        <li>Levantamiento de requerimientos y definición funcional inicial.</li>
        <li>Diseño y configuración técnica de la solución seleccionada.</li>
        <li>Desarrollo, pruebas funcionales y ajustes de calidad.</li>
        <li>Capacitación básica y acompañamiento de salida a producción.</li>
        <li>Entrega de accesos, documentación operativa breve y handoff final.</li>
      </ul>
    </section>
    <section class="doc-section">
      <h5>3. Cronograma estimado</h5>
      <p>
        El plazo estimado del proyecto es de 2 a 6 semanas, sujeto a la complejidad de integraciones, tiempos de
        aprobación del cliente y disponibilidad de insumos (marca, accesos, contenido y validaciones).
      </p>
    </section>
    <section class="doc-section">
      <h5>4.1 Responsabilidades del cliente</h5>
      <ul>
        <li>Entregar contenido, credenciales y materiales de marca en tiempo oportuno.</li>
        <li>Designar un punto de contacto para validaciones y aprobaciones.</li>
        <li>Revisar avances y brindar retroalimentación en los tiempos acordados.</li>
      </ul>
    </section>
    <section class="doc-section">
      <h5>5. Condiciones comerciales</h5>
      <ul>
        ${paymentTerms}
      </ul>
    </section>
    <section class="doc-section">
      <h5>6. Garantías y soporte</h5>
      <p>
        Nexus Global garantiza corrección de defectos atribuibles al desarrollo entregado durante el periodo de soporte.
        Solicitudes de nuevas funcionalidades, integraciones adicionales o rediseños se gestionarán como mejoras
        evolutivas mediante una propuesta complementaria.
      </p>
    </section>
    <section class="doc-section">
      <h5>${isContract ? "11" : "8"}. Canales de atención</h5>
      <p>
        Para seguimiento de proyecto, coordinación operativa y soporte, el cliente podrá comunicarse con Nexus Global
        mediante los canales oficiales definidos al inicio del servicio, incluyendo el sitio web corporativo.
      </p>
    </section>
    ${extraContractClauses}
    <section class="doc-section">
      <h5>${isContract ? "12" : "9"}. Aceptación</h5>
      <p>
        Al firmar este documento, ambas partes aceptan las condiciones, montos y tiempos aquí establecidos para la
        ejecución del servicio.
      </p>
    </section>
    ${
      notes
        ? `<section class="doc-section"><h5>Notas adicionales</h5><p>${escapeHtml(notes)}</p></section>`
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
          .doc-section { margin-top: 14px; }
          .doc-section h5 { margin: 0 0 6px; font-size: 15px; }
          .doc-section p { margin: 0; line-height: 1.45; }
          .doc-section ul { margin: 6px 0 0; padding-left: 20px; }
          .doc-section a { color: #2f5ae0; text-decoration: none; }
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

themeToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  });
});

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

if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    window.location.reload();
  });
}

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
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        // Silently ignore registration errors for local testing edge cases.
      });
  });
}

applyTheme(getInitialTheme());

if (localStorage.getItem(SESSION_KEY) === "1") {
  showAdmin();
} else {
  showAuth();
}
