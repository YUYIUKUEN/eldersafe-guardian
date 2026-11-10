import { mkdirSync, writeFileSync } from "node:fs";
import { generateCertificatePdf } from "../packages/shared/src/certificates/pdf.ts";

const yearMonth = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
}).format(new Date());

const bytes = await generateCertificatePdf({
  volunteerName: "陳大文",
  rank: 1,
  yearMonth,
  completedCount: 12,
  points: 120,
  orgNameZh: "安心守護機構",
  orgNameEn: "ElderSafe Guardian",
});

mkdirSync("/opt/cursor/artifacts", { recursive: true });
const pdfPath = `/opt/cursor/artifacts/acceptance-certificate-${yearMonth}.pdf`;
writeFileSync(pdfPath, Buffer.from(bytes));

const latin = Buffer.from(bytes).toString("latin1");
const hasFont = /Identity-H|CIDFontType0|ToUnicode/i.test(latin);
const hasEn = /Outstanding Volunteer Certificate/i.test(latin);
console.log(
  JSON.stringify({
    pdfPath,
    bytes: bytes.byteLength,
    hasFont,
    hasEn,
    ok: hasFont && hasEn && bytes.byteLength > 20_000,
  }),
);
