import fs from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/convert-university-meetings.mjs <sheet.csv>");
  process.exit(1);
}

function parseCsv(input) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  if (quoted) throw new Error("CSV has an unclosed quoted field");
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

function optionalText(value) {
  const text = value?.trim();
  return text && text !== "X" && text !== "?" ? text : undefined;
}

function publicEmail(value) {
  const email = optionalText(value);
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined;
}

function publicHttpUrl(value) {
  if (!value) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

const csv = await fs.readFile(inputPath, "utf8");
const rows = parseCsv(csv.replace(/^\uFEFF/, ""));
const expectedHeaders = [
  "會議名稱", "學生會代表", "代表聯絡資訊", "代表學號", "學生會代表產生方式",
  "是否已向校方回報推派資訊", "其他學生代表", "業務單位", "主要內容", "開會頻率",
  "相關法規或設置辦法", "備註",
];
if (!expectedHeaders.every((header, index) => rows[0]?.[index]?.trim() === header)) {
  throw new Error("CSV columns do not match the expected student representative sheet");
}

const meetings = [];
for (const [index, cells] of rows.slice(1).entries()) {
  const name = cells[0]?.trim();
  const representativeName = optionalText(cells[1]);
  const representative = representativeName
    ? {
        name: representativeName,
        ...(publicEmail(cells[2]) && { email: publicEmail(cells[2]) }),
        ...(optionalText(cells[3]) && { studentId: optionalText(cells[3]) }),
      }
    : undefined;

  if (!name) {
    if (representative && meetings.length) meetings.at(-1).representatives.push(representative);
    continue;
  }

  meetings.push({
    id: `meeting-${index + 1}`,
    name,
    representatives: representative ? [representative] : [],
    ...(optionalText(cells[4]) && { appointmentMethod: optionalText(cells[4]) }),
    ...(optionalText(cells[5]) && { reportStatus: optionalText(cells[5]) }),
    ...(optionalText(cells[6]) && { otherRepresentatives: optionalText(cells[6]) }),
    ...(optionalText(cells[7]) && { office: optionalText(cells[7]) }),
    ...(optionalText(cells[8]) && { subject: optionalText(cells[8]) }),
    ...(optionalText(cells[9]) && { frequency: optionalText(cells[9]) }),
    ...(publicHttpUrl(cells[10]) && { regulationUrl: publicHttpUrl(cells[10]) }),
    ...(optionalText(cells[11]) && { note: optionalText(cells[11]) }),
  });
}

const outputPath = path.resolve("data/university-meeting-representatives.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(meetings, null, 2)}\n`);
console.log(`Wrote ${meetings.length} meetings to ${outputPath}`);
