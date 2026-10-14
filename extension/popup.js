import {
  calculateEstimate,
  createRecord,
  duplicateRecord,
  filterRecords,
  formatMoney,
  normalizeRecord,
  STORAGE_KEY,
  toMarkdown
} from "./core.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const form = $("#estimate-form");
const listView = $("#list-view");
const editorView = $("#editor-view");
const recordList = $("#record-list");
const emptyState = $("#empty-state");
const featureList = $("#feature-list");
const toast = $("#toast");

let records = [];
let currentId = null;
let saveTimer = null;
let toastTimer = null;

function sortRecords() {
  records.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function setSaveState(text, state = "") {
  const label = $("#save-state");
  label.textContent = text;
  label.dataset.state = state;
}

function notify(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
}

async function persistRecords() {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: records });
    setSaveState("已保存", "saved");
    renderList();
    return true;
  } catch (error) {
    setSaveState("保存失败", "error");
    notify(`保存失败：${error.message || "浏览器存储不可用"}`, true);
    return false;
  }
}

function scheduleSave() {
  setSaveState("保存中…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const record = getCurrentRecord();
    if (!record) return;
    syncRecordFromForm(record);
    record.updatedAt = new Date().toISOString();
    persistRecords();
  }, 250);
}

function getCurrentRecord() {
  return records.find((record) => record.id === currentId) || null;
}

function showView(name) {
  const isEditor = name === "editor";
  listView.hidden = isEditor;
  editorView.hidden = !isEditor;
  if (isEditor) window.scrollTo(0, 0);
}

function updateEditorTitle() {
  const name = form.elements.name.value.trim();
  $("#editor-heading-title").textContent = name || (getCurrentRecord()?.name || "新建项目评估");
}

function makeFeatureRow(feature = {}) {
  const row = document.createElement("div");
  row.className = "feature-row";
  row.dataset.featureId = crypto.randomUUID();

  const name = document.createElement("input");
  name.type = "text";
  name.maxLength = 160;
  name.placeholder = "功能项";
  name.value = feature.name || "";
  name.dataset.field = "name";
  name.setAttribute("aria-label", "功能项");

  const priority = document.createElement("select");
  priority.dataset.field = "priority";
  priority.setAttribute("aria-label", "功能优先级");
  for (const value of ["P0", "P1", "P2"]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === (feature.priority || "P1");
    priority.append(option);
  }

  const hours = document.createElement("input");
  hours.type = "number";
  hours.min = "0";
  hours.step = "0.25";
  hours.inputMode = "decimal";
  hours.placeholder = "0";
  hours.value = feature.hours ?? "";
  hours.dataset.field = "hours";
  hours.setAttribute("aria-label", "估算工时");

  const last = document.createElement("div");
  last.className = "feature-last";
  const note = document.createElement("textarea");
  note.maxLength = 500;
  note.placeholder = "备注";
  note.value = feature.note || "";
  note.dataset.field = "note";
  note.setAttribute("aria-label", "功能备注");
  const remove = document.createElement("button");
  remove.className = "remove-feature";
  remove.type = "button";
  remove.textContent = "×";
  remove.title = "删除此功能项";
  remove.setAttribute("aria-label", "删除此功能项");
  last.append(note, remove);
  row.append(name, priority, hours, last);
  return row;
}

function renderFeatureRows(features = []) {
  featureList.replaceChildren(...features.map(makeFeatureRow));
  $("#feature-empty").hidden = features.length > 0;
}

function fillForm(record) {
  for (const field of form.elements) {
    if (field.name && Object.hasOwn(record, field.name)) field.value = record[field.name] ?? "";
  }
  renderFeatureRows(record.features || []);
  updateEditorTitle();
  updateEstimate();
}

function syncRecordFromForm(record) {
  for (const field of form.elements) {
    if (!field.name) continue;
    if (field.name === "hourlyRate" || field.name === "riskPercent") {
      record[field.name] = Math.max(0, Number(field.value) || 0);
    } else {
      record[field.name] = field.value;
    }
  }
  record.features = $$(".feature-row", featureList).map((row) => ({
    name: $('[data-field="name"]', row).value.trim(),
    priority: $('[data-field="priority"]', row).value,
    hours: Math.max(0, Number($('[data-field="hours"]', row).value) || 0),
    note: $('[data-field="note"]', row).value.trim()
  }));
}

function updateEstimate() {
  const draft = getCurrentRecord() || createRecord();
  syncRecordFromForm(draft);
  const estimate = calculateEstimate(draft);
  $("#total-hours").textContent = `${Number(estimate.totalHours.toFixed(2))} 小时`;
  $("#base-fee").textContent = formatMoney(estimate.baseFee, draft.currency);
  $("#risk-fee").textContent = formatMoney(estimate.riskFee, draft.currency);
  $("#quote-total").textContent = formatMoney(estimate.quote, draft.currency);
}

function renderList() {
  const query = $("#search-records").value;
  const filtered = filterRecords(records, query);
  $("#record-count").textContent = `${records.length} 个评估`;
  recordList.replaceChildren();
  for (const record of filtered) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "record-card";
    card.addEventListener("click", () => openRecord(record.id));

    const details = document.createElement("div");
    const title = document.createElement("h2");
    title.textContent = record.name || "未命名评估";
    const meta = document.createElement("p");
    meta.textContent = [record.client || record.type, new Date(record.updatedAt).toLocaleDateString("zh-CN")].filter(Boolean).join(" · ");
    details.append(title, meta);

    const total = document.createElement("div");
    total.className = "record-card-total";
    const estimate = calculateEstimate(record);
    const amount = document.createElement("strong");
    amount.textContent = formatMoney(estimate.quote, record.currency);
    const hours = document.createElement("span");
    hours.textContent = `${Number(estimate.totalHours.toFixed(2))} 小时`;
    total.append(amount, hours);

    card.append(details, total);
    recordList.append(card);
  }
  const hasRecords = records.length > 0;
  emptyState.hidden = hasRecords;
  if (hasRecords && filtered.length === 0) {
    const noMatches = document.createElement("p");
    noMatches.className = "feature-empty";
    noMatches.textContent = "没有匹配的评估记录。";
    recordList.append(noMatches);
  }
}

function openRecord(id) {
  clearTimeout(saveTimer);
  const record = records.find((item) => item.id === id);
  if (!record) return;
  currentId = id;
  fillForm(record);
  setSaveState("已保存", "saved");
  showView("editor");
}

async function createNewRecord() {
  clearTimeout(saveTimer);
  const record = createRecord();
  records.unshift(record);
  currentId = record.id;
  fillForm(record);
  showView("editor");
  setSaveState("保存中…");
  const saved = await persistRecords();
  if (saved) notify("新评估已创建");
}

function downloadMarkdown() {
  const record = getCurrentRecord();
  if (!record) return;
  syncRecordFromForm(record);
  record.updatedAt = new Date().toISOString();
  persistRecords();
  const blob = new Blob([toMarkdown(record)], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const baseName = (record.name || "scopequote-estimate")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
    .trim()
    .slice(0, 80) || "scopequote-estimate";
  anchor.href = url;
  anchor.download = `${baseName}.md`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("Markdown 报价草案已导出");
}

async function readCurrentSelection() {
  const button = $("#read-selection");
  button.disabled = true;
  button.textContent = "正在读取…";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("没有可读取的当前网页");
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        selection: window.getSelection()?.toString() || "",
        title: document.title || "",
        url: location.href || ""
      })
    });
    const page = results?.[0]?.result;
    const selection = page?.selection?.trim();
    if (!selection) {
      if (page?.title) form.elements.sourceTitle.value = page.title;
      if (page?.url) form.elements.sourceUrl.value = page.url;
      scheduleSave();
      throw new Error("当前网页没有选中文字；已保存来源标题和网址");
    }
    const requirements = form.elements.requirements;
    requirements.value = [requirements.value.trim(), selection].filter(Boolean).join("\n\n");
    if (page.title) form.elements.sourceTitle.value = page.title;
    if (page.url) form.elements.sourceUrl.value = page.url;
    scheduleSave();
    updateEstimate();
    notify("已读取选中文字及网页来源");
  } catch (error) {
    notify(error.message || "无法读取当前网页。请确认网页允许扩展访问。", true);
  } finally {
    button.disabled = false;
    button.innerHTML = "读取当前网页选中文字";
  }
}

async function removeCurrentRecord() {
  const record = getCurrentRecord();
  if (!record) return;
  const label = record.name || "这份评估";
  if (!window.confirm(`确定删除“${label}”吗？删除后无法恢复。`)) return;
  clearTimeout(saveTimer);
  records = records.filter((item) => item.id !== currentId);
  currentId = null;
  await persistRecords();
  showView("list");
  notify("评估已删除");
}

async function duplicateCurrentRecord() {
  const source = getCurrentRecord();
  if (!source) return;
  syncRecordFromForm(source);
  const copy = duplicateRecord(source);
  records.unshift(copy);
  currentId = copy.id;
  fillForm(copy);
  setSaveState("保存中…");
  await persistRecords();
  notify("已复制评估");
}

async function init() {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    records = Array.isArray(stored[STORAGE_KEY])
      ? stored[STORAGE_KEY].map(normalizeRecord)
      : [];
    sortRecords();
    renderList();
  } catch (error) {
    notify(`读取本地记录失败：${error.message || "未知错误"}`, true);
    $("#record-count").textContent = "读取失败";
  }
}

$("#new-record").addEventListener("click", createNewRecord);
$("#empty-new-record").addEventListener("click", createNewRecord);
$("#back-to-list").addEventListener("click", () => {
  clearTimeout(saveTimer);
  const record = getCurrentRecord();
  if (record) {
    syncRecordFromForm(record);
    persistRecords();
  }
  currentId = null;
  showView("list");
});
$("#search-records").addEventListener("input", renderList);
form.addEventListener("input", () => {
  updateEditorTitle();
  updateEstimate();
  scheduleSave();
});
form.addEventListener("change", () => {
  updateEstimate();
  scheduleSave();
});
featureList.addEventListener("input", () => {
  updateEstimate();
  scheduleSave();
});
featureList.addEventListener("change", () => {
  updateEstimate();
  scheduleSave();
});
featureList.addEventListener("click", (event) => {
  const remove = event.target.closest(".remove-feature");
  if (!remove) return;
  remove.closest(".feature-row").remove();
  $("#feature-empty").hidden = featureList.children.length > 0;
  updateEstimate();
  scheduleSave();
});
$("#add-feature").addEventListener("click", () => {
  featureList.append(makeFeatureRow({ priority: "P1" }));
  $("#feature-empty").hidden = true;
  updateEstimate();
  scheduleSave();
  $('[data-field="name"]', featureList.lastElementChild).focus();
});
$("#save-record").addEventListener("click", async () => {
  clearTimeout(saveTimer);
  const record = getCurrentRecord();
  if (!record) return;
  syncRecordFromForm(record);
  if (!record.name.trim()) {
    form.elements.name.focus();
    notify("请先填写项目名称", true);
    return;
  }
  record.updatedAt = new Date().toISOString();
  if (await persistRecords()) notify("评估已保存");
});
$("#export-markdown").addEventListener("click", downloadMarkdown);
$("#read-selection").addEventListener("click", readCurrentSelection);
$("#delete-record").addEventListener("click", removeCurrentRecord);
$("#duplicate-record").addEventListener("click", duplicateCurrentRecord);

window.addEventListener("pagehide", () => {
  clearTimeout(saveTimer);
  const record = getCurrentRecord();
  if (!record) return;
  syncRecordFromForm(record);
  record.updatedAt = new Date().toISOString();
  chrome.storage.local.set({ [STORAGE_KEY]: records });
});

init();
