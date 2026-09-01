const STORAGE_KEY = "porsh-invoice-v1";
const SEQUENCE_KEY = "porsh-invoice-sequences-v1";
const STANDARD_TERMS = "50% deposit required to commence any project.\nBalance due within the payment terms stated.\nNo final delivery until full payment is received.\nPayment details below.\nThank you for choosing Porsh Studios.";

const defaultInvoice = {
  invoiceNumber: "PS-INV-2026-0047",
  currencySymbol: "GH₵",
  invoiceDate: "2026-09-01",
  dueDate: "2026-10-01",
  paymentTerms: "50% Deposit | Balance on Delivery",
  clientName: "Nestlé Ghana Ltd.",
  clientAttention: "Procurement Department",
  clientAddress: "P.O. Box GP 2184\nAccra, Ghana",
  projectName: "Nestlé Sale Corporate Video",
  reference: "PO-45007218",
  discount: 0,
  nhilRate: 2.5,
  getFundRate: 2.5,
  taxRate: 15,
  notes: "Thank you for choosing Porsh Studios.\nPayment due within the terms stated above.",
  bankName: "GCB Bank Ltd.",
  accountName: "Porsh Studios",
  accountNumber: "1231130012345",
  accountCurrency: "GHS",
  payeeName: "Porsh Studios",
  payeeAddress: "Accra, Ghana",
  email: "hello@porshstudios.com",
  phone: "+233 24 123 4567",
  terms: STANDARD_TERMS,
  items: [
    { description: "Cameras and Lenses", amount: 1500 },
    { description: "Drone Coverage", amount: 500 },
    { description: "Tripod", amount: 150 },
    { description: "Lighting Equipment", amount: 800 },
    { description: "Camera Crew", amount: 3000 },
    { description: "Transportation", amount: 1000 },
    { description: "Editing & Post-Production", amount: 3500 }
  ]
};

const state = loadInvoice();
const form = document.querySelector("#invoiceForm");
const itemEditor = document.querySelector("#itemEditor");
const previewItems = document.querySelector("#previewItems");
const saveState = document.querySelector("#saveState");
const toast = document.querySelector("#toast");
let saveTimer;
let installPrompt;

function loadInvoice() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const invoice = saved ? { ...structuredClone(defaultInvoice), ...saved } : structuredClone(defaultInvoice);
    if (!String(invoice.currencySymbol || "").trim()) invoice.currencySymbol = "GH₵";
    if (!String(invoice.terms || "").trim()) invoice.terms = STANDARD_TERMS;
    return invoice;
  } catch {
    return structuredClone(defaultInvoice);
  }
}

function populateForm() {
  Object.entries(state).forEach(([key, value]) => {
    if (key === "items") return;
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  });
  renderItemEditor();
  renderPreview();
}

function renderItemEditor() {
  itemEditor.replaceChildren();
  state.items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "item-input-row";
    row.innerHTML = `
      <label>Description<input type="text" data-item-field="description" data-index="${index}" value="${escapeHtml(item.description)}" aria-label="Item ${index + 1} description"></label>
      <label>Amount<input type="number" min="0" step="0.01" data-item-field="amount" data-index="${index}" value="${numberValue(item.amount)}" aria-label="Item ${index + 1} amount"></label>
      <button class="delete-item" type="button" data-delete-index="${index}" aria-label="Remove item ${index + 1}">×</button>`;
    itemEditor.append(row);
  });
}

function renderPreview() {
  document.querySelectorAll("[data-preview]").forEach((element) => {
    const value = state[element.dataset.preview] ?? "";
    const prefix = value ? element.dataset.prefix || "" : "";
    element.textContent = `${prefix}${value}`;
  });
  document.querySelectorAll("[data-preview-date]").forEach((element) => {
    element.textContent = formatDate(state[element.dataset.previewDate]);
  });

  previewItems.replaceChildren();
  previewItems.classList.toggle("dense", state.items.length > 8);
  previewItems.style.gridTemplateRows = `repeat(${Math.max(state.items.length, 1)}, 1fr)`;
  state.items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "preview-item";
    const description = document.createElement("span");
    const amount = document.createElement("span");
    description.textContent = item.description;
    amount.textContent = money(item.amount);
    row.append(description, amount);
    previewItems.append(row);
  });

  if (!state.items.length) {
    const empty = document.createElement("div");
    empty.className = "preview-item";
    empty.innerHTML = "<span>No items added</span><span>—</span>";
    previewItems.append(empty);
  }

  const subtotal = state.items.reduce((sum, item) => sum + positiveNumber(item.amount), 0);
  const discount = positiveNumber(state.discount);
  const taxable = Math.max(0, subtotal - discount);
  const nhil = taxable * positiveNumber(state.nhilRate) / 100;
  const getFund = taxable * positiveNumber(state.getFundRate) / 100;
  const taxSubtotal = taxable + nhil + getFund;
  const tax = taxable * positiveNumber(state.taxRate) / 100;
  const total = taxSubtotal + tax;

  document.querySelector("#subtotalPreview").textContent = money(subtotal);
  document.querySelector("#discountPreview").textContent = money(discount);
  document.querySelector("#nhilLabel").textContent = `NHIL (${formatRate(state.nhilRate)}%)`;
  document.querySelector("#nhilPreview").textContent = money(nhil);
  document.querySelector("#getFundLabel").textContent = `GETFUND (${formatRate(state.getFundRate)}%)`;
  document.querySelector("#getFundPreview").textContent = money(getFund);
  document.querySelector("#taxSubtotalPreview").textContent = money(taxSubtotal);
  document.querySelector("#taxLabel").textContent = `VAT (${formatRate(state.taxRate)}%)`;
  document.querySelector("#taxPreview").textContent = money(tax);
  document.querySelector("#totalPreview").textContent = money(total);

  const terms = String(state.terms || "").split("\n").map((line) => line.trim()).filter(Boolean);
  const termsPreview = document.querySelector("#termsPreview");
  termsPreview.replaceChildren();
  terms.forEach((term) => {
    const item = document.createElement("li");
    item.textContent = term;
    termsPreview.append(item);
  });
}

function money(value) {
  const number = positiveNumber(value);
  return `${String(state.currencySymbol || "").trim() || "GH₵"}${number.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function positiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function numberValue(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function formatRate(value) {
  return positiveNumber(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function saveInvoice() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveState.textContent = "Saved locally";
}

function parseInvoiceNumber(value) {
  const match = String(value || "").match(/^(.*?)(\d+)(\D*)$/);
  if (!match) return null;
  return {
    prefix: match[1],
    number: Number(match[2]),
    width: match[2].length,
    suffix: match[3]
  };
}

function loadSequences() {
  try {
    return JSON.parse(localStorage.getItem(SEQUENCE_KEY)) || {};
  } catch {
    return {};
  }
}

function advanceInvoiceNumber(finalizedNumber) {
  const parsed = parseInvoiceNumber(finalizedNumber);
  if (!parsed || !Number.isFinite(parsed.number)) {
    showToast("The invoice number was saved, but it needs trailing digits before it can advance automatically.");
    return null;
  }

  const sequences = loadSequences();
  const sequenceName = `${parsed.prefix}|${parsed.suffix}`;
  const lastFinalized = Math.max(parsed.number, Number(sequences[sequenceName]) || 0);
  sequences[sequenceName] = lastFinalized;
  localStorage.setItem(SEQUENCE_KEY, JSON.stringify(sequences));

  const nextSerial = String(lastFinalized + 1).padStart(parsed.width, "0");
  const nextInvoiceNumber = `${parsed.prefix}${nextSerial}${parsed.suffix}`;
  state.invoiceNumber = nextInvoiceNumber;
  state.terms = STANDARD_TERMS;
  form.elements.namedItem("invoiceNumber").value = nextInvoiceNumber;
  form.elements.namedItem("terms").value = STANDARD_TERMS;
  renderPreview();
  saveInvoice();
  return nextInvoiceNumber;
}

function scheduleSave() {
  saveState.textContent = "Saving…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveInvoice, 250);
}

function syncField(event) {
  const field = event.target;
  if (!field.name || field.closest(".item-input-row")) return;
  state[field.name] = field.type === "number" ? positiveNumber(field.value) : field.value;
  renderPreview();
  scheduleSave();
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value ?? "";
  return div.innerHTML.replaceAll('"', "&quot;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

form.addEventListener("input", syncField);

itemEditor.addEventListener("input", (event) => {
  const field = event.target;
  const index = Number(field.dataset.index);
  if (!Number.isInteger(index) || !state.items[index]) return;
  state.items[index][field.dataset.itemField] = field.dataset.itemField === "amount" ? positiveNumber(field.value) : field.value;
  renderPreview();
  scheduleSave();
});

itemEditor.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-index]");
  if (!button) return;
  state.items.splice(Number(button.dataset.deleteIndex), 1);
  renderItemEditor();
  renderPreview();
  scheduleSave();
});

document.querySelector("#addItemButton").addEventListener("click", () => {
  state.items.push({ description: "New item", amount: 0 });
  renderItemEditor();
  renderPreview();
  scheduleSave();
  itemEditor.lastElementChild?.querySelector("input")?.select();
});

document.querySelector("#restoreTermsButton").addEventListener("click", () => {
  state.terms = STANDARD_TERMS;
  form.elements.namedItem("terms").value = STANDARD_TERMS;
  renderPreview();
  saveInvoice();
  showToast("The standard terms and conditions have been restored.");
});

document.querySelector("#resetButton").addEventListener("click", () => {
  if (!confirm("Reset all invoice fields to the original template example?")) return;
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, structuredClone(defaultInvoice));
  populateForm();
  saveInvoice();
  showToast("Invoice reset to the template example.");
});

document.querySelector("#pdfButton").addEventListener("click", () => {
  saveInvoice();
  const finalizedNumber = state.invoiceNumber;
  showToast("In the print window, select “Save as PDF” or your device’s PDF option.");
  setTimeout(() => {
    window.print();
    const wasSaved = window.confirm(`Was invoice ${finalizedNumber} saved successfully as a PDF?\n\nChoose OK to finalize it and advance to the next invoice number.`);
    if (!wasSaved) {
      showToast(`Invoice number remains ${finalizedNumber}.`);
      return;
    }
    const nextInvoiceNumber = advanceInvoiceNumber(finalizedNumber);
    if (nextInvoiceNumber) showToast(`${finalizedNumber} finalized. The next invoice is ${nextInvoiceNumber}.`);
  }, 250);
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  document.querySelector("#installButton").hidden = false;
});

document.querySelector("#installButton").addEventListener("click", async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  document.querySelector("#installButton").hidden = true;
});

function fitPreviewOnSmallScreens() {
  const page = document.querySelector("#invoicePage");
  const area = document.querySelector(".preview-area");
  if (window.innerWidth > 600) {
    page.style.transform = "";
    area.style.height = "";
    return;
  }
  const available = area.clientWidth;
  const scale = Math.min(1, available / 794);
  page.style.transform = `scale(${scale})`;
  area.style.height = `${1123 * scale + 70}px`;
}

window.addEventListener("resize", fitPreviewOnSmallScreens);
populateForm();
fitPreviewOnSmallScreens();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  let refreshingForUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshingForUpdate) return;
    refreshingForUpdate = true;
    window.location.reload();
  });
  navigator.serviceWorker.register("sw.js?v=8").then((registration) => registration.update());
}
