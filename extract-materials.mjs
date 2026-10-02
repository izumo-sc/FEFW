import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const sourcePath = String.raw`C:\Users\miyu1\Documents\Codex\2026-09-21\s\outputs\inventory_check_20260930_screenshots\復興素材_所持数確認_2026-09-30_スクショ反映.xlsx`;
const outputPath = new URL("./dist/materials.js", import.meta.url);

const blob = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(blob);
const sheet = workbook.worksheets.getItem("素材集計");
const rows = sheet.getRange("A7:V62").values;

const materials = [];
let routeLimited = false;
let nextIsSectionStart = false;

for (const row of rows) {
  const name = String(row[0] ?? "").trim();
  if (!name) {
    routeLimited = true;
    nextIsSectionStart = true;
    continue;
  }

  const locations = row
    .slice(7)
    .map((value) => String(value ?? "").replace(/\r?\n/g, "").trim())
    .filter(Boolean);

  materials.push({
    name,
    category: String(row[6] ?? ""),
    required: Number(row[1] ?? 0),
    locations,
    routeLimited,
    sectionStart: nextIsSectionStart,
  });
  nextIsSectionStart = false;
}

const javascript = `window.MATERIALS = ${JSON.stringify(materials, null, 2)};\n`;
await fs.writeFile(outputPath, javascript, "utf8");

console.log(JSON.stringify({
  output: outputPath.pathname,
  count: materials.length,
  requiredTotal: materials.reduce((sum, item) => sum + item.required, 0),
  routeLimitedCount: materials.filter((item) => item.routeLimited).length,
}));
