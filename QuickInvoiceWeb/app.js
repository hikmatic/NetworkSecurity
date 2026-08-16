"use strict";

/* ---------- constants ---------- */

const STORAGE_KEY = "quickinvoice.data.v1";
const CURRENCY = "USD";

const ICONS = {
  home: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 11.5 12 4l9 7.5"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/></svg>',
  invoices: '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6M9 16h6M9 8h3"/></svg>',
  customers: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path stroke-linecap="round" d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/><circle cx="17.5" cy="9.5" r="2.4"/><path stroke-linecap="round" d="M15.5 14.2c2.6.3 4.5 2.6 4.7 5.8"/></svg>',
  chevron: '<svg viewBox="0 0 8 14"><path fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" d="M1 1l6 6-6 6"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14M5 12h14"/></svg>',
  share: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3v13M8 7l4-4 4 4M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6"/></svg>',
  doc: '<svg viewBox="0 0 24 24" width="48" height="48"><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" d="M7 3h7l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"/></svg>',
  people: '<svg viewBox="0 0 24 24" width="48" height="48"><circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" d="M3.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6"/></svg>',
};

/* ---------- tiny DOM builder ---------- */

function h(tag, attrs, children) {
  const el = document.createElement(tag);
  attrs = attrs || {};
  for (const key of Object.keys(attrs)) {
    const value = attrs[key];
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key === "html") el.innerHTML = value;
    else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in el && key !== "list") {
      try {
        el[key] = value;
      } catch (_) {
        el.setAttribute(key, value);
      }
    } else {
      el.setAttribute(key, value);
    }
  }
  const kids = Array.isArray(children) ? children : children === undefined ? [] : [children];
  for (const kid of kids) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.appendChild(typeof kid === "string" || typeof kid === "number" ? document.createTextNode(String(kid)) : kid);
  }
  return el;
}

function icon(name, extraClass) {
  return h("span", { class: ["icon-svg", extraClass].filter(Boolean).join(" "), html: ICONS[name] });
}

/* ---------- persistence ---------- */

function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { customers: [], invoices: [], invoiceSeq: 1 };
    const parsed = JSON.parse(raw);
    return {
      customers: Array.isArray(parsed.customers) ? parsed.customers : [],
      invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
      invoiceSeq: typeof parsed.invoiceSeq === "number" ? parsed.invoiceSeq : 1,
    };
  } catch (_) {
    return { customers: [], invoices: [], invoiceSeq: 1 };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let data = loadData();

/* ---------- formatting & calculations ---------- */

function money(value) {
  const n = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY }).format(n);
}

function shortDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(iso, days) {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function invoiceTotals(invoice) {
  const subtotal = invoice.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const tax = subtotal * ((Number(invoice.taxRatePercent) || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

function customerById(id) {
  return data.customers.find((c) => c.id === id) || null;
}

function invoiceById(id) {
  return data.invoices.find((i) => i.id === id) || null;
}

function outstandingTotal() {
  return data.invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + invoiceTotals(inv).total, 0);
}

function nextInvoiceNumber() {
  return "INV-" + String(data.invoiceSeq).padStart(4, "0");
}

/* ---------- navigation state ---------- */

const nav = {
  activeTab: "dashboard",
  stacks: {
    dashboard: [{ screen: "dashboard" }],
    invoices: [{ screen: "invoiceList" }],
    customers: [{ screen: "customerList" }],
  },
  modalStack: [],
};

function currentStack() {
  return nav.stacks[nav.activeTab];
}

function currentScreen() {
  const stack = currentStack();
  return stack[stack.length - 1];
}

function push(screen, props) {
  currentStack().push({ screen, props: props || {} });
  render();
}

function pop() {
  const stack = currentStack();
  if (stack.length > 1) stack.pop();
  render();
}

function switchTab(tab) {
  nav.activeTab = tab;
  render();
}

function openModal(screen, props) {
  const instance = MODALS[screen](props || {});
  nav.modalStack.push(instance);
  render();
}

function closeModal() {
  nav.modalStack.pop();
  render();
}

/* ---------- toast ---------- */

let toastTimer = null;
function showToast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("visible"), 1800);
}

/* ---------- shared row components ---------- */

function statusBadge(status) {
  const label = status === "paid" ? "Paid" : status === "sent" ? "Sent" : "Draft";
  return h("span", { class: "badge " + status }, label);
}

function invoiceRow(invoice, onClick) {
  const customer = customerById(invoice.customerId);
  const totals = invoiceTotals(invoice);
  return h("button", { class: "row", type: "button", onclick: onClick }, [
    h("div", { class: "row-main" }, [
      h("div", { class: "row-title" }, invoice.number),
      h("div", { class: "row-subtitle" }, customer ? customer.name : "No customer"),
    ]),
    h("div", { class: "row-trailing" }, [h("div", { class: "row-title" }, money(totals.total)), statusBadge(invoice.status)]),
    icon("chevron", "chevron"),
  ]);
}

function customerRow(customer, onClick) {
  return h("button", { class: "row", type: "button", onclick: onClick }, [
    h("div", { class: "row-main" }, [
      h("div", { class: "row-title" }, customer.name),
      customer.email ? h("div", { class: "row-subtitle" }, customer.email) : null,
    ]),
    icon("chevron", "chevron"),
  ]);
}

function emptyState(title, message, iconName) {
  return h("div", { class: "empty-state" }, [icon(iconName || "doc"), h("h3", null, title), h("p", null, message)]);
}

function navbar({ title, leading, trailing }) {
  return h("div", { class: "navbar" }, [
    leading || h("span", { class: "navbar-btn leading" }),
    h("div", { class: "navbar-title" }, title),
    trailing || h("span", { class: "navbar-btn trailing" }),
  ]);
}

/* ---------- screens ---------- */

function screenDashboard() {
  const recent = [...data.invoices].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  const content = h("div", null, [
    h("div", { class: "hero" }, [
      h("div", { class: "hero-label" }, "Outstanding"),
      h("div", { class: "hero-amount" }, money(outstandingTotal())),
      h("button", { class: "primary-btn", type: "button", onclick: () => openModal("invoiceForm", { invoiceId: null }) }, [
        icon("plus"),
        "New Invoice",
      ]),
    ]),
    h("div", { class: "section" }, [
      h("div", { class: "section-title" }, "Recent Invoices"),
      recent.length
        ? h(
            "div",
            { class: "card" },
            recent.map((inv) => invoiceRow(inv, () => showInvoiceFromDashboard(inv.id)))
          )
        : h("div", { class: "card" }, emptyState("No Invoices Yet", "Tap New Invoice to create your first one.", "doc")),
    ]),
  ]);
  return { title: "Quick Invoice", body: content, showsLargeTitle: true };
}

function showInvoiceFromDashboard(invoiceId) {
  nav.stacks.invoices = [{ screen: "invoiceList" }, { screen: "invoiceDetail", props: { invoiceId } }];
  switchTab("invoices");
}

function screenInvoiceList(props, searchState) {
  const query = (searchState.query || "").trim().toLowerCase();
  const list = [...data.invoices]
    .sort((a, b) => b.createdAt - a.createdAt)
    .filter((inv) => {
      if (!query) return true;
      const customer = customerById(inv.customerId);
      return inv.number.toLowerCase().includes(query) || (customer && customer.name.toLowerCase().includes(query));
    });

  const body = h("div", null, [
    h("div", { class: "search-bar" }, [
      h("input", {
        type: "text",
        placeholder: "Search invoices",
        value: searchState.query || "",
        oninput: (e) => {
          searchState.query = e.target.value;
          renderContentOnly();
        },
      }),
    ]),
    h("div", { class: "section", style: "margin-top: 4px;" }, [
      list.length
        ? h(
            "div",
            { class: "card" },
            list.map((inv) => invoiceRow(inv, () => push("invoiceDetail", { invoiceId: inv.id })))
          )
        : h("div", { class: "card" }, emptyState(query ? "No Matches" : "No Invoices Yet", query ? "Try a different search." : "Tap + to create your first invoice.", "doc")),
    ]),
  ]);

  return {
    title: "Invoices",
    body,
    trailing: h("button", { class: "navbar-btn trailing", type: "button", onclick: () => openModal("invoiceForm", { invoiceId: null }) }, [icon("plus")]),
  };
}

function screenInvoiceDetail(props) {
  const invoice = invoiceById(props.invoiceId);
  if (!invoice) {
    pop();
    return { title: "Invoice", body: h("div") };
  }
  const customer = customerById(invoice.customerId);
  const totals = invoiceTotals(invoice);

  const itemsCard = h(
    "div",
    { class: "card" },
    invoice.items.map((item) =>
      h("div", { class: "row", style: "cursor: default;" }, [
        h("div", { class: "row-main" }, [
          h("div", { class: "row-title" }, item.description),
          h("div", { class: "row-subtitle" }, `${item.quantity} × ${money(item.unitPrice)}`),
        ]),
        h("div", { class: "row-title" }, money(item.quantity * item.unitPrice)),
      ])
    )
  );

  const statusSelect = h(
    "select",
    {
      onchange: (e) => {
        invoice.status = e.target.value;
        saveData();
        renderContentOnly();
      },
    },
    ["draft", "sent", "paid"].map((s) => h("option", { value: s, selected: invoice.status === s }, s[0].toUpperCase() + s.slice(1)))
  );

  const body = h("div", null, [
    h("div", { class: "section", style: "margin-top: 16px;" }, [
      h("div", { class: "card" }, [
        h("div", { class: "row", style: "cursor: default;" }, [
          h("div", { class: "row-main" }, [
            h("div", { class: "row-title", style: "font-size: 20px; font-weight: 700;" }, invoice.number),
            h("div", { class: "row-subtitle" }, customer ? customer.name : "No customer"),
          ]),
          statusBadge(invoice.status),
        ]),
        h("div", { class: "row", style: "cursor: default;" }, [h("div", { class: "row-main" }, "Date"), h("div", null, shortDate(invoice.date))]),
        h("div", { class: "row", style: "cursor: default;" }, [h("div", { class: "row-main" }, "Due"), h("div", null, shortDate(invoice.dueDate))]),
        h("div", { class: "row", style: "cursor: default;" }, [h("div", { class: "row-main" }, "Status"), statusSelect]),
      ]),
    ]),
    h("div", { class: "section" }, [h("div", { class: "section-title" }, "Items"), itemsCard]),
    h("div", { class: "section" }, [
      h("div", { class: "card" }, [
        h("div", { class: "totals-row" }, [h("span", null, "Subtotal"), h("span", null, money(totals.subtotal))]),
        h("div", { class: "totals-row" }, [h("span", null, `Tax (${invoice.taxRatePercent}%)`), h("span", null, money(totals.tax))]),
        h("div", { class: "totals-row total" }, [h("span", null, "Total"), h("span", null, money(totals.total))]),
      ]),
    ]),
    invoice.notes
      ? h("div", { class: "section" }, [h("div", { class: "section-title" }, "Notes"), h("div", { class: "card" }, h("div", { class: "row", style: "cursor: default;" }, invoice.notes))])
      : null,
    h("div", { class: "section" }, [
      h("div", { class: "card" }, [
        h("button", { class: "row", type: "button", onclick: () => printInvoice(invoice) }, [icon("share"), h("span", { style: "margin-left: 8px;" }, "Share / Save PDF")]),
        h("button", { class: "row", type: "button", onclick: () => openModal("invoiceForm", { invoiceId: invoice.id }) }, "Edit Invoice"),
        h("button", { class: "row destructive-row", type: "button", onclick: () => confirmDeleteInvoice(invoice) }, "Delete Invoice"),
      ]),
    ]),
  ]);

  return {
    title: "Invoice",
    body,
    leading: h("button", { class: "navbar-btn leading", type: "button", onclick: () => pop() }, "Back"),
  };
}

function confirmDeleteInvoice(invoice) {
  if (!window.confirm(`Delete invoice ${invoice.number}? This cannot be undone.`)) return;
  data.invoices = data.invoices.filter((i) => i.id !== invoice.id);
  saveData();
  pop();
  showToast("Invoice deleted");
}

function screenCustomerList(props, searchState) {
  const query = (searchState.query || "").trim().toLowerCase();
  const list = [...data.customers].sort((a, b) => a.name.localeCompare(b.name)).filter((c) => !query || c.name.toLowerCase().includes(query));

  const body = h("div", null, [
    h("div", { class: "search-bar" }, [
      h("input", {
        type: "text",
        placeholder: "Search customers",
        value: searchState.query || "",
        oninput: (e) => {
          searchState.query = e.target.value;
          renderContentOnly();
        },
      }),
    ]),
    h("div", { class: "section", style: "margin-top: 4px;" }, [
      list.length
        ? h("div", { class: "card" }, list.map((c) => customerRow(c, () => push("customerDetail", { customerId: c.id }))))
        : h("div", { class: "card" }, emptyState(query ? "No Matches" : "No Customers", query ? "Try a different search." : "Tap + to add your first customer.", "people")),
    ]),
  ]);

  return {
    title: "Customers",
    body,
    trailing: h("button", { class: "navbar-btn trailing", type: "button", onclick: () => openModal("customerForm", { customerId: null }) }, [icon("plus")]),
  };
}

function screenCustomerDetail(props) {
  const customer = customerById(props.customerId);
  if (!customer) {
    pop();
    return { title: "Customer", body: h("div") };
  }
  const invoices = data.invoices.filter((inv) => inv.customerId === customer.id).sort((a, b) => b.createdAt - a.createdAt);

  const contactRows = [];
  if (customer.email) contactRows.push(h("div", { class: "row", style: "cursor: default;" }, [h("div", { class: "row-main" }, "Email"), h("div", null, customer.email)]));
  if (customer.phone) contactRows.push(h("div", { class: "row", style: "cursor: default;" }, [h("div", { class: "row-main" }, "Phone"), h("div", null, customer.phone)]));
  if (customer.address) contactRows.push(h("div", { class: "row", style: "cursor: default;" }, [h("div", { class: "row-main" }, "Address"), h("div", null, customer.address)]));
  if (!contactRows.length) contactRows.push(h("div", { class: "row", style: "cursor: default; color: var(--text-secondary);" }, "No contact details yet"));

  const body = h("div", null, [
    h("div", { class: "section", style: "margin-top: 16px;" }, [h("div", { class: "section-title" }, "Contact"), h("div", { class: "card" }, contactRows)]),
    h("div", { class: "section" }, [
      h("div", { class: "section-title" }, "Invoices"),
      invoices.length
        ? h("div", { class: "card" }, invoices.map((inv) => invoiceRow(inv, () => showInvoiceFromCustomer(inv.id))))
        : h("div", { class: "card" }, h("div", { class: "row", style: "cursor: default; color: var(--text-secondary);" }, "No invoices yet")),
    ]),
    h("div", { class: "section" }, [
      h("div", { class: "card" }, [h("button", { class: "row destructive-row", type: "button", onclick: () => confirmDeleteCustomer(customer) }, "Delete Customer")]),
    ]),
  ]);

  return {
    title: customer.name,
    body,
    leading: h("button", { class: "navbar-btn leading", type: "button", onclick: () => pop() }, "Back"),
    trailing: h("button", { class: "navbar-btn trailing", type: "button", onclick: () => openModal("customerForm", { customerId: customer.id }) }, "Edit"),
  };
}

function showInvoiceFromCustomer(invoiceId) {
  currentStack().push({ screen: "invoiceDetail", props: { invoiceId } });
  render();
}

function confirmDeleteCustomer(customer) {
  const invoiceCount = data.invoices.filter((inv) => inv.customerId === customer.id).length;
  const message = invoiceCount
    ? `Delete ${customer.name}? Their ${invoiceCount} invoice${invoiceCount === 1 ? "" : "s"} will be deleted too.`
    : `Delete ${customer.name}?`;
  if (!window.confirm(message)) return;
  data.customers = data.customers.filter((c) => c.id !== customer.id);
  data.invoices = data.invoices.filter((inv) => inv.customerId !== customer.id);
  saveData();
  pop();
  showToast("Customer deleted");
}

const SCREENS = {
  dashboard: screenDashboard,
  invoiceList: screenInvoiceList,
  invoiceDetail: screenInvoiceDetail,
  customerList: screenCustomerList,
  customerDetail: screenCustomerDetail,
};

const searchStates = { invoiceList: {}, customerList: {} };

/* ---------- modals: invoice form ---------- */

function newDraftInvoiceItem() {
  return { key: uid(), description: "", quantity: "1", unitPrice: "" };
}

function modalInvoiceForm(props) {
  const existing = props.invoiceId ? invoiceById(props.invoiceId) : null;
  const state = {
    customerId: existing ? existing.customerId : null,
    date: existing ? existing.date : todayISO(),
    dueDate: existing ? existing.dueDate : addDaysISO(todayISO(), 14),
    taxRatePercent: existing ? String(existing.taxRatePercent) : "0",
    notes: existing ? existing.notes : "",
    status: existing ? existing.status : "draft",
    items: existing && existing.items.length
      ? existing.items.map((it) => ({ key: uid(), description: it.description, quantity: String(it.quantity), unitPrice: String(it.unitPrice) }))
      : [newDraftInvoiceItem()],
  };

  function lineTotal(item) {
    return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
  }
  function subtotal() {
    return state.items.reduce((sum, it) => sum + lineTotal(it), 0);
  }
  function isValid() {
    return !!state.customerId && state.items.some((it) => it.description.trim().length > 0);
  }

  function refreshSaveButton() {
    const btn = document.getElementById("invoice-save-btn");
    if (btn) btn.disabled = !isValid();
  }

  function refreshCalculations() {
    state.items.forEach((item) => {
      const el = document.querySelector(`[data-line-total="${item.key}"]`);
      if (el) el.textContent = money(lineTotal(item));
    });
    const sub = subtotal();
    const tax = sub * ((Number(state.taxRatePercent) || 0) / 100);
    const subEl = document.getElementById("inv-calc-subtotal");
    const taxEl = document.getElementById("inv-calc-tax");
    const totalEl = document.getElementById("inv-calc-total");
    if (subEl) subEl.textContent = money(sub);
    if (taxEl) taxEl.textContent = money(tax);
    if (totalEl) totalEl.textContent = money(sub + tax);
    refreshSaveButton();
  }

  function save() {
    const items = state.items
      .filter((it) => it.description.trim().length > 0)
      .map((it) => ({ id: uid(), description: it.description.trim(), quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0 }));

    if (existing) {
      existing.customerId = state.customerId;
      existing.date = state.date;
      existing.dueDate = state.dueDate;
      existing.taxRatePercent = Number(state.taxRatePercent) || 0;
      existing.notes = state.notes;
      existing.status = state.status;
      existing.items = items;
    } else {
      const invoice = {
        id: uid(),
        number: nextInvoiceNumber(),
        customerId: state.customerId,
        date: state.date,
        dueDate: state.dueDate,
        taxRatePercent: Number(state.taxRatePercent) || 0,
        notes: state.notes,
        status: state.status,
        items,
        createdAt: Date.now(),
      };
      data.invoiceSeq += 1;
      data.invoices.push(invoice);
    }
    saveData();
    closeModal();
    showToast(existing ? "Invoice updated" : "Invoice created");
  }

  function renderBody() {
    const customer = state.customerId ? customerById(state.customerId) : null;
    const tax = subtotal() * ((Number(state.taxRatePercent) || 0) / 100);

    return h("div", null, [
      h("div", { class: "section", style: "margin-top: 16px;" }, [
        h("div", { class: "section-title" }, "Customer"),
        h(
          "div",
          { class: "card" },
          customer
            ? h("button", { class: "row", type: "button", onclick: () => openCustomerPicker() }, [
                h("div", { class: "row-main" }, [h("div", { class: "row-title" }, customer.name), customer.email ? h("div", { class: "row-subtitle" }, customer.email) : null]),
                h("span", { style: "color: var(--accent); font-size: 15px;" }, "Change"),
              ])
            : h("button", { class: "row", type: "button", onclick: () => openCustomerPicker() }, "Select Customer")
        ),
      ]),
      h("div", { class: "section" }, [
        h("div", { class: "section-title" }, "Details"),
        h("div", { class: "card" }, [
          h("div", { class: "form-row" }, [
            h("label", null, "Invoice Date"),
            h("input", { type: "date", value: state.date, onchange: (e) => (state.date = e.target.value) }),
          ]),
          h("div", { class: "form-row" }, [
            h("label", null, "Due Date"),
            h("input", { type: "date", value: state.dueDate, onchange: (e) => (state.dueDate = e.target.value) }),
          ]),
          h("div", { class: "form-row" }, [
            h("label", null, "Status"),
            h(
              "select",
              { onchange: (e) => (state.status = e.target.value) },
              ["draft", "sent", "paid"].map((s) => h("option", { value: s, selected: state.status === s }, s[0].toUpperCase() + s.slice(1)))
            ),
          ]),
          h("div", { class: "form-row" }, [
            h("label", null, "Tax Rate %"),
            h("input", {
              type: "number",
              inputmode: "decimal",
              value: state.taxRatePercent,
              oninput: (e) => {
                state.taxRatePercent = e.target.value;
                refreshCalculations();
              },
            }),
          ]),
        ]),
      ]),
      h("div", { class: "section" }, [
        h("div", { class: "section-title" }, "Items"),
        h("div", { class: "card" }, [
          ...state.items.map((item) =>
            h("div", { class: "line-item" }, [
              h("input", {
                type: "text",
                placeholder: "Description",
                value: item.description,
                oninput: (e) => {
                  item.description = e.target.value;
                  refreshSaveButton();
                },
              }),
              h("div", { class: "line-item-numbers" }, [
                h("input", {
                  class: "qty",
                  type: "number",
                  inputmode: "decimal",
                  value: item.quantity,
                  oninput: (e) => {
                    item.quantity = e.target.value;
                    refreshCalculations();
                  },
                }),
                h("span", { class: "x" }, "×"),
                h("input", {
                  class: "price",
                  type: "number",
                  inputmode: "decimal",
                  placeholder: "Price",
                  value: item.unitPrice,
                  oninput: (e) => {
                    item.unitPrice = e.target.value;
                    refreshCalculations();
                  },
                }),
                h("span", { class: "line-total", "data-line-total": item.key }, money(lineTotal(item))),
                h(
                  "button",
                  {
                    class: "remove-btn",
                    type: "button",
                    onclick: () => {
                      state.items = state.items.filter((it) => it.key !== item.key);
                      if (!state.items.length) state.items.push(newDraftInvoiceItem());
                      renderModalStack();
                    },
                  },
                  "−"
                ),
              ]),
            ])
          ),
          h(
            "button",
            {
              class: "row",
              type: "button",
              onclick: () => {
                state.items.push(newDraftInvoiceItem());
                renderModalStack();
              },
            },
            [icon("plus"), h("span", { style: "margin-left: 8px; color: var(--accent);" }, "Add Item")]
          ),
        ]),
      ]),
      h("div", { class: "section" }, [
        h("div", { class: "card" }, [
          h("div", { class: "totals-row" }, [h("span", null, "Subtotal"), h("span", { id: "inv-calc-subtotal" }, money(subtotal()))]),
          h("div", { class: "totals-row" }, [h("span", null, "Tax"), h("span", { id: "inv-calc-tax" }, money(tax))]),
          h("div", { class: "totals-row total" }, [h("span", null, "Total"), h("span", { id: "inv-calc-total" }, money(subtotal() + tax))]),
        ]),
      ]),
      h("div", { class: "section" }, [
        h("div", { class: "section-title" }, "Notes"),
        h("div", { class: "card" }, [
          h("div", { class: "form-row stacked" }, [h("textarea", { placeholder: "Optional notes for this invoice", oninput: (e) => (state.notes = e.target.value) }, state.notes)]),
        ]),
      ]),
    ]);
  }

  function openCustomerPicker() {
    openModal("customerPicker", {
      onSelect: (customerId) => {
        state.customerId = customerId;
        closeModal();
        renderModalStack();
      },
    });
  }

  return {
    title: existing ? "Edit Invoice" : "New Invoice",
    leading: h("button", { class: "navbar-btn leading", type: "button", onclick: () => closeModal() }, "Cancel"),
    trailing: () => h("button", { id: "invoice-save-btn", class: "navbar-btn trailing", type: "button", disabled: !isValid(), onclick: () => save() }, "Save"),
    renderBody,
  };
}

/* ---------- modal: customer form ---------- */

function modalCustomerForm(props) {
  const existing = props.customerId ? customerById(props.customerId) : null;
  const state = {
    name: existing ? existing.name : "",
    email: existing ? existing.email : "",
    phone: existing ? existing.phone : "",
    address: existing ? existing.address : "",
    notes: existing ? existing.notes : "",
  };

  function isValid() {
    return state.name.trim().length > 0;
  }

  function refreshSaveButton() {
    const btn = document.getElementById("customer-save-btn");
    if (btn) btn.disabled = !isValid();
  }

  function save() {
    let customer;
    if (existing) {
      customer = existing;
    } else {
      customer = { id: uid(), createdAt: Date.now() };
      data.customers.push(customer);
    }
    customer.name = state.name.trim();
    customer.email = state.email.trim();
    customer.phone = state.phone.trim();
    customer.address = state.address.trim();
    customer.notes = state.notes.trim();
    saveData();
    closeModal();
    if (props.onSave) props.onSave(customer.id);
    showToast(existing ? "Customer updated" : "Customer added");
  }

  function renderBody() {
    return h("div", null, [
      h("div", { class: "section", style: "margin-top: 16px;" }, [
        h("div", { class: "section-title" }, "Contact"),
        h("div", { class: "card" }, [
          h("div", { class: "form-row" }, [
            h("label", null, "Name"),
            h("input", {
              type: "text",
              placeholder: "Required",
              value: state.name,
              oninput: (e) => {
                state.name = e.target.value;
                refreshSaveButton();
              },
            }),
          ]),
          h("div", { class: "form-row" }, [
            h("label", null, "Email"),
            h("input", { type: "email", value: state.email, oninput: (e) => (state.email = e.target.value) }),
          ]),
          h("div", { class: "form-row" }, [
            h("label", null, "Phone"),
            h("input", { type: "tel", value: state.phone, oninput: (e) => (state.phone = e.target.value) }),
          ]),
        ]),
      ]),
      h("div", { class: "section" }, [
        h("div", { class: "section-title" }, "Address"),
        h("div", { class: "card" }, [h("div", { class: "form-row stacked" }, [h("textarea", { oninput: (e) => (state.address = e.target.value) }, state.address)])]),
      ]),
      h("div", { class: "section" }, [
        h("div", { class: "section-title" }, "Notes"),
        h("div", { class: "card" }, [h("div", { class: "form-row stacked" }, [h("textarea", { oninput: (e) => (state.notes = e.target.value) }, state.notes)])]),
      ]),
    ]);
  }

  return {
    title: existing ? "Edit Customer" : "New Customer",
    leading: h("button", { class: "navbar-btn leading", type: "button", onclick: () => closeModal() }, "Cancel"),
    trailing: () => h("button", { id: "customer-save-btn", class: "navbar-btn trailing", type: "button", disabled: !isValid(), onclick: () => save() }, "Save"),
    renderBody,
  };
}

/* ---------- modal: customer picker ---------- */

function modalCustomerPicker(props) {
  const state = { query: "" };

  function renderBody() {
    const query = state.query.trim().toLowerCase();
    const list = [...data.customers].sort((a, b) => a.name.localeCompare(b.name)).filter((c) => !query || c.name.toLowerCase().includes(query));

    return h("div", null, [
      h("div", { class: "search-bar" }, [
        h("input", {
          type: "text",
          placeholder: "Search customers",
          value: state.query,
          oninput: (e) => {
            state.query = e.target.value;
            renderModalStack();
          },
        }),
      ]),
      h("div", { class: "section", style: "margin-top: 4px;" }, [
        h("div", { class: "card" }, [
          h(
            "button",
            {
              class: "row",
              type: "button",
              onclick: () =>
                openModal("customerForm", {
                  customerId: null,
                  onSave: (customerId) => props.onSelect(customerId),
                }),
            },
            [icon("plus"), h("span", { style: "margin-left: 8px; color: var(--accent);" }, "New Customer")]
          ),
        ]),
        list.length ? h("div", { class: "card", style: "margin-top: 12px;" }, list.map((c) => customerRow(c, () => props.onSelect(c.id)))) : null,
      ]),
    ]);
  }

  return {
    title: "Select Customer",
    leading: h("button", { class: "navbar-btn leading", type: "button", onclick: () => closeModal() }, "Cancel"),
    renderBody,
  };
}

const MODALS = { invoiceForm: modalInvoiceForm, customerForm: modalCustomerForm, customerPicker: modalCustomerPicker };

/* ---------- print / share ---------- */

function printInvoice(invoice) {
  const customer = customerById(invoice.customerId);
  const totals = invoiceTotals(invoice);
  const printArea = document.getElementById("print-area");
  printArea.innerHTML = "";
  printArea.appendChild(
    h("div", { class: "invoice-preview" }, [
      h("div", { class: "inv-header" }, [
        h("h1", null, "Invoice " + invoice.number),
        h("div", { class: "dates" }, [h("div", null, "Date: " + shortDate(invoice.date)), h("div", null, "Due: " + shortDate(invoice.dueDate))]),
      ]),
      h("div", { class: "bill-to" }, [
        h("h4", null, "Bill To"),
        h("div", null, customer ? customer.name : "—"),
        customer && customer.email ? h("div", null, customer.email) : null,
        customer && customer.address ? h("div", null, customer.address) : null,
      ]),
      h("table", null, [
        h("thead", null, h("tr", null, [h("th", null, "Description"), h("th", null, "Qty"), h("th", null, "Price"), h("th", null, "Total")])),
        h(
          "tbody",
          null,
          invoice.items.map((item) =>
            h("tr", null, [h("td", null, item.description), h("td", null, String(item.quantity)), h("td", null, money(item.unitPrice)), h("td", null, money(item.quantity * item.unitPrice))])
          )
        ),
      ]),
      h("div", { class: "totals" }, [
        h("div", { class: "totals-line" }, [h("span", null, "Subtotal"), h("span", null, money(totals.subtotal))]),
        h("div", { class: "totals-line" }, [h("span", null, `Tax (${invoice.taxRatePercent}%)`), h("span", null, money(totals.tax))]),
        h("div", { class: "totals-line grand" }, [h("span", null, "Total"), h("span", null, money(totals.total))]),
      ]),
      invoice.notes ? h("div", { class: "bill-to", style: "margin-top: 20px;" }, [h("h4", null, "Notes"), h("div", null, invoice.notes)]) : null,
    ])
  );
  window.print();
}

/* ---------- render ---------- */

function renderTabbar() {
  const bar = document.getElementById("tabbar");
  bar.innerHTML = "";
  if (nav.modalStack.length) {
    bar.style.display = "none";
    return;
  }
  bar.style.display = "flex";
  const tabs = [
    { key: "dashboard", label: "Home", iconName: "home" },
    { key: "invoices", label: "Invoices", iconName: "invoices" },
    { key: "customers", label: "Customers", iconName: "customers" },
  ];
  for (const tab of tabs) {
    bar.appendChild(
      h(
        "button",
        { class: "tab-btn" + (nav.activeTab === tab.key ? " active" : ""), type: "button", onclick: () => switchTab(tab.key) },
        [icon(tab.iconName), h("span", null, tab.label)]
      )
    );
  }
}

function renderContentOnly() {
  const container = document.getElementById("content");
  const screenState = currentScreen();
  const searchState = searchStates[screenState.screen];
  const result = SCREENS[screenState.screen](screenState.props || {}, searchState);
  container.innerHTML = "";

  const nb = navbar({ title: result.showsLargeTitle ? "" : result.title, leading: result.leading, trailing: result.trailing });
  container.appendChild(nb);
  if (result.showsLargeTitle) container.appendChild(h("div", { class: "large-title" }, result.title));
  container.appendChild(result.body);
}

function renderModalStack() {
  const root = document.getElementById("modal-root");
  root.innerHTML = "";
  nav.modalStack.forEach((instance, index) => {
    const leading = typeof instance.leading === "function" ? instance.leading() : instance.leading;
    const trailing = typeof instance.trailing === "function" ? instance.trailing() : instance.trailing;
    const overlay = h("div", { class: "overlay", style: `z-index: ${20 + index};` });
    overlay.appendChild(navbar({ title: instance.title, leading, trailing }));
    const content = h("div", { style: "flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch;" });
    content.appendChild(instance.renderBody());
    overlay.appendChild(content);
    root.appendChild(overlay);
  });
}

function render() {
  renderContentOnly();
  renderTabbar();
  renderModalStack();
}

/* ---------- init ---------- */

function init() {
  render();
  if ("serviceWorker" in navigator && location.protocol !== "blob:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

document.addEventListener("DOMContentLoaded", init);
