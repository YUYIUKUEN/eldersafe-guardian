import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import {
  CERTIFICATE_DEFAULTS,
  getCertificateOrgName,
  type CertificatePdfInput,
} from "./config";

const A4_LANDSCAPE = { width: 841.89, height: 595.28 };

let fontCache: { regular: Uint8Array; bold: Uint8Array } | null = null;

function fontsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../assets/fonts");
}

async function loadFonts(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  if (fontCache) return fontCache;
  const dir = fontsDir();
  const [regular, bold] = await Promise.all([
    readFile(path.join(dir, "NotoSansTC-Regular.otf")),
    readFile(path.join(dir, "NotoSansTC-Bold.otf")),
  ]);
  fontCache = { regular, bold };
  return fontCache;
}

function formatYearMonthLabel(yearMonth: string, locale: "zh" | "en"): string {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return yearMonth;
  if (locale === "zh") return `${y} 年 ${m} 月`;
  const date = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat("en-HK", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatIssuedDate(date: Date, locale: "zh" | "en"): string {
  if (locale === "zh") {
    return new Intl.DateTimeFormat("zh-HK", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Hong_Kong",
    }).format(date);
  }
  return new Intl.DateTimeFormat("en-HK", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Hong_Kong",
  }).format(date);
}

function drawBorder(
  page: ReturnType<PDFDocument["addPage"]>,
  width: number,
  height: number,
) {
  const margin = 28;
  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderColor: rgb(0.12, 0.35, 0.55),
    borderWidth: 3,
  });
  page.drawRectangle({
    x: margin + 10,
    y: margin + 10,
    width: width - (margin + 10) * 2,
    height: height - (margin + 10) * 2,
    borderColor: rgb(0.72, 0.58, 0.22),
    borderWidth: 1.5,
  });
}

/**
 * Generate an A4 landscape bilingual Top 3 volunteer certificate PDF.
 */
export async function generateCertificatePdf(
  input: CertificatePdfInput,
): Promise<Uint8Array> {
  const fonts = await loadFonts();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });

  const page = pdf.addPage([A4_LANDSCAPE.width, A4_LANDSCAPE.height]);
  const { width, height } = page.getSize();
  drawBorder(page, width, height);

  const org = getCertificateOrgName();
  const orgZh = input.orgNameZh?.trim() || org.zh;
  const orgEn = input.orgNameEn?.trim() || org.en;
  const issuedAt = input.issuedAt ?? new Date();
  const rank = input.rank;

  const titleZh = CERTIFICATE_DEFAULTS.titleZh;
  const titleEn = CERTIFICATE_DEFAULTS.titleEn;
  const rankZh = CERTIFICATE_DEFAULTS.rankLabelsZh[rank];
  const rankEn = CERTIFICATE_DEFAULTS.rankLabelsEn[rank];

  const centerX = width / 2;
  let y = height - 88;

  const drawCentered = (
    text: string,
    size: number,
    font: typeof bold,
    color = rgb(0.1, 0.15, 0.22),
  ) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: centerX - textWidth / 2,
      y,
      size,
      font,
      color,
    });
  };

  drawCentered(orgZh, 14, regular, rgb(0.25, 0.35, 0.45));
  y -= 18;
  drawCentered(orgEn, 11, regular, rgb(0.35, 0.42, 0.5));
  y -= 36;

  drawCentered(titleZh, 36, bold, rgb(0.1, 0.32, 0.52));
  y -= 34;
  drawCentered(titleEn, 18, regular, rgb(0.2, 0.35, 0.5));
  y -= 40;

  drawCentered("謹此表彰／This certifies that", 12, regular);
  y -= 32;

  drawCentered(input.volunteerName, 30, bold, rgb(0.08, 0.2, 0.35));
  y -= 28;

  // Decorative line under name
  page.drawLine({
    start: { x: centerX - 160, y },
    end: { x: centerX + 160, y },
    thickness: 1,
    color: rgb(0.72, 0.58, 0.22),
  });
  y -= 28;

  drawCentered(
    `於 ${formatYearMonthLabel(input.yearMonth, "zh")} 義工服務中榮獲${rankZh}`,
    14,
    regular,
  );
  y -= 20;
  drawCentered(
    `Awarded ${rankEn} for outstanding volunteer service in ${formatYearMonthLabel(input.yearMonth, "en")}`,
    11,
    regular,
    rgb(0.25, 0.3, 0.38),
  );
  y -= 28;

  drawCentered(
    `完成服務次數／Completed services：${input.completedCount}`,
    13,
    regular,
  );
  if (input.points != null) {
    y -= 20;
    drawCentered(`積分／Points：${input.points}`, 12, regular);
  }

  y -= 36;
  drawCentered(
    `頒發日期／Date of issue：${formatIssuedDate(issuedAt, "zh")}／${formatIssuedDate(issuedAt, "en")}`,
    11,
    regular,
  );

  // Signature block (bottom-right)
  const sigX = width - 260;
  const sigY = 70;
  page.drawText("簽名／Signature", {
    x: sigX,
    y: sigY + 36,
    size: 10,
    font: regular,
    color: rgb(0.3, 0.35, 0.4),
  });
  page.drawLine({
    start: { x: sigX, y: sigY + 20 },
    end: { x: sigX + 180, y: sigY + 20 },
    thickness: 1,
    color: rgb(0.4, 0.45, 0.5),
  });
  page.drawText(orgZh, {
    x: sigX,
    y: sigY,
    size: 10,
    font: regular,
    color: rgb(0.25, 0.3, 0.38),
  });

  // Subtle watermark rank
  page.drawText(String(rank), {
    x: 70,
    y: height / 2 - 40,
    size: 120,
    font: bold,
    color: rgb(0.85, 0.88, 0.92),
    opacity: 0.35,
  });

  return pdf.save();
}
