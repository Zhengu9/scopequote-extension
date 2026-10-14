export const STORAGE_KEY = "scopequote.records.v1";

export const DEFAULT_RECORD = Object.freeze({
  name: "",
  type: "网站 / Web 应用",
  client: "",
  currency: "CNY",
  hourlyRate: 300,
  riskPercent: 15,
  requirements: "",
  sourceTitle: "",
  sourceUrl: "",
  features: [],
  deliverables: "",
  assumptions: "",
  risks: "",
  exclusions: "",
  questions: ""
});

export function createRecord(overrides = {}) {
  const now = new Date().toISOString();
  return {
    ...structuredClone(DEFAULT_RECORD),
    ...overrides,
    id: crypto.randomUUID(),
    features: Array.isArray(overrides.features)
      ? overrides.features.map((feature) => ({ ...feature }))
      : [],
    createdAt: now,
    updatedAt: now
  };
}

export function duplicateRecord(record) {
  const copy = createRecord({
    ...record,
    name: `${record.name || "未命名评估"}（副本）`,
    features: (record.features || []).map((feature) => ({ ...feature }))
  });
  return copy;
}

export function normalizeRecord(record) {
  const base = createRecord();
  return {
    ...base,
    ...record,
    id: record?.id || base.id,
    features: Array.isArray(record?.features)
      ? record.features.map((feature) => ({
          name: String(feature.name ?? ""),
          priority: ["P0", "P1", "P2"].includes(feature.priority) ? feature.priority : "P1",
          hours: toNonNegativeNumber(feature.hours),
          note: String(feature.note ?? "")
        }))
      : []
  };
}

export function toNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export function calculateEstimate(record) {
  const totalHours = (record.features || []).reduce(
    (sum, feature) => sum + toNonNegativeNumber(feature.hours),
    0
  );
  const hourlyRate = toNonNegativeNumber(record.hourlyRate);
  const riskPercent = toNonNegativeNumber(record.riskPercent);
  const baseFee = totalHours * hourlyRate;
  const riskFee = baseFee * riskPercent / 100;
  return {
    totalHours,
    baseFee,
    riskFee,
    quote: baseFee + riskFee
  };
}

export function formatMoney(amount, currency = "CNY") {
  const supported = ["CNY", "USD", "EUR", "JPY", "GBP"];
  const code = supported.includes(currency) ? currency : "CNY";
  try {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

export function filterRecords(records, query) {
  const needle = String(query || "").trim().toLocaleLowerCase();
  if (!needle) return [...records];
  return records.filter((record) => [
    record.name,
    record.type,
    record.client,
    record.requirements,
    record.sourceTitle
  ].some((value) => String(value || "").toLocaleLowerCase().includes(needle)));
}

function markdownLines(value) {
  const lines = String(value || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines.map((line) => `- ${line}`).join("\n") : "- 暂无";
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, " ");
}

export function toMarkdown(record) {
  const estimate = calculateEstimate(record);
  const features = record.features?.length
    ? record.features.map((feature) => (
        `| ${markdownCell(feature.name || "未命名功能")} | ${markdownCell(feature.priority)} | ${toNonNegativeNumber(feature.hours)} | ${markdownCell(feature.note || "—")} |`
      )).join("\n")
    : "| 暂无功能项 | — | 0 | — |";
  const source = record.sourceUrl
    ? `[${markdownCell(record.sourceTitle || record.sourceUrl)}](${record.sourceUrl})`
    : "未记录";

  return `# ${record.name || "项目报价草案"}

> 本文为辅助估算草案，不构成正式报价承诺。实际成本、周期和项目结果需结合完整需求由相关人员审核确认。

## 项目信息

- 项目名称：${record.name || "未填写"}
- 项目类型：${record.type || "未填写"}
- 客户 / 项目代号：${record.client || "未填写"}
- 币种：${record.currency || "CNY"}
- 小时费率：${formatMoney(toNonNegativeNumber(record.hourlyRate), record.currency)} / 小时
- 风险预留：${toNonNegativeNumber(record.riskPercent)}%

## 项目范围与需求

${record.requirements?.trim() || "尚未填写需求描述。"}

## 功能拆分

| 功能项 | 优先级 | 估算工时 | 备注 |
| --- | --- | ---: | --- |
${features}

## 工时与费用估算

| 项目 | 计算方式 | 估算 |
| --- | --- | ---: |
| 总工时 | 各功能项工时之和 | ${estimate.totalHours} 小时 |
| 基础费用 | ${estimate.totalHours} 小时 × ${formatMoney(toNonNegativeNumber(record.hourlyRate), record.currency)} / 小时 | ${formatMoney(estimate.baseFee, record.currency)} |
| 风险预留费用 | 基础费用 × ${toNonNegativeNumber(record.riskPercent)}% | ${formatMoney(estimate.riskFee, record.currency)} |
| 建议报价 | 基础费用 + 风险预留费用 | **${formatMoney(estimate.quote, record.currency)}** |

## 交付物

${markdownLines(record.deliverables)}

## 假设条件

${markdownLines(record.assumptions)}

## 项目风险

${markdownLines(record.risks)}

## 不包含的范围

${markdownLines(record.exclusions)}

## 待确认问题

${markdownLines(record.questions)}

## 需求来源

${source}

---

估算生成时间：${new Date().toLocaleString("zh-CN")}
`;
}
