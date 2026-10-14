import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requiredFiles = [
  "extension/manifest.json",
  "extension/popup.html",
  "extension/popup.css",
  "extension/popup.js",
  "extension/core.js",
  "docs/index.html",
  "docs/styles.css",
  "docs/site.js",
  "README.md"
];
const failures = [];
for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`缺少文件：${relative}`);
}

const manifestPath = path.join(root, "extension/manifest.json");
let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
} catch (error) {
  failures.push(`manifest.json 无法解析：${error.message}`);
}

if (manifest) {
  if (manifest.manifest_version !== 3) failures.push("manifest_version 必须为 3");
  const permissions = new Set(manifest.permissions || []);
  for (const permission of ["storage", "activeTab", "scripting"]) {
    if (!permissions.has(permission)) failures.push(`缺少必要权限：${permission}`);
  }
  if (permissions.has("tabs")) failures.push("不应申请宽泛的 tabs 权限");
  if (manifest.host_permissions?.length) failures.push("不应申请站点 host_permissions");
  if (!manifest.action?.default_popup) failures.push("扩展图标应打开 popup.html");
  if (!fs.existsSync(path.join(root, "extension", manifest.action.default_popup))) {
    failures.push("manifest 指向的弹窗文件不存在");
  }
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("PASS project files and Manifest V3 permission checks");
}
