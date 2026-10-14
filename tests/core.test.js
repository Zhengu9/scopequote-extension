import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEstimate,
  createRecord,
  duplicateRecord,
  filterRecords,
  normalizeRecord,
  toMarkdown
} from "../extension/core.js";

test("createRecord creates an independent record with a unique identifier", () => {
  const first = createRecord();
  const second = createRecord();
  assert.ok(first.id);
  assert.notEqual(first.id, second.id);
  assert.deepEqual(first.features, []);
});

test("duplicateRecord creates a new id and copies feature rows independently", () => {
  const source = createRecord({
    name: "Portal",
    features: [{ name: "Login", priority: "P0", hours: 2, note: "MFA" }]
  });
  const copy = duplicateRecord(source);
  assert.notEqual(copy.id, source.id);
  assert.equal(copy.name, "Portal（副本）");
  assert.deepEqual(copy.features, source.features);
  copy.features[0].hours = 8;
  assert.equal(source.features[0].hours, 2);
});

test("calculateEstimate sums hours and computes base, reserve, and quote", () => {
  const result = calculateEstimate({
    hourlyRate: 250,
    riskPercent: 20,
    features: [{ hours: 2.5 }, { hours: 3 }]
  });
  assert.deepEqual(result, {
    totalHours: 5.5,
    baseFee: 1375,
    riskFee: 275,
    quote: 1650
  });
});

test("calculateEstimate treats invalid or negative numeric values as zero", () => {
  const result = calculateEstimate({
    hourlyRate: -100,
    riskPercent: "invalid",
    features: [{ hours: -4 }, { hours: "3.25" }]
  });
  assert.deepEqual(result, {
    totalHours: 3.25,
    baseFee: 0,
    riskFee: 0,
    quote: 0
  });
});

test("normalizeRecord sanitizes feature values while preserving the record id", () => {
  const result = normalizeRecord({
    id: "record-1",
    features: [{ name: "API", priority: "unexpected", hours: -3, note: 7 }]
  });
  assert.equal(result.id, "record-1");
  assert.deepEqual(result.features, [{
    name: "API",
    priority: "P1",
    hours: 0,
    note: "7"
  }]);
});

test("filterRecords searches case-insensitively across project fields", () => {
  const records = [
    { name: "Client Portal", type: "Web", client: "Northwind", requirements: "", sourceTitle: "" },
    { name: "Mobile App", type: "iOS", client: "Studio", requirements: "scope quote", sourceTitle: "" }
  ];
  assert.equal(filterRecords(records, "NORTH").length, 1);
  assert.equal(filterRecords(records, "scope").length, 1);
  assert.equal(filterRecords(records, "missing").length, 0);
});

test("toMarkdown exports all quote sections, protects table pipes, and includes source", () => {
  const record = {
    name: "Client Portal",
    type: "Web",
    client: "NW",
    currency: "USD",
    hourlyRate: 100,
    riskPercent: 10,
    requirements: "Build a portal",
    features: [{ name: "Auth | access", priority: "P0", hours: 4, note: "OAuth" }],
    deliverables: "Source code",
    assumptions: "Content supplied by client",
    risks: "Third-party API",
    exclusions: "Hosting",
    questions: "Who owns the domain?",
    sourceTitle: "Brief",
    sourceUrl: "https://example.test/brief"
  };
  const markdown = toMarkdown(record);
  for (const section of [
    "项目范围与需求", "功能拆分", "工时与费用估算", "交付物",
    "假设条件", "项目风险", "不包含的范围", "待确认问题", "需求来源"
  ]) assert.ok(markdown.includes(section));
  assert.ok(markdown.includes("Auth \\| access"));
  assert.ok(markdown.includes("https://example.test/brief"));
  assert.ok(markdown.includes("$440.00"));
});
