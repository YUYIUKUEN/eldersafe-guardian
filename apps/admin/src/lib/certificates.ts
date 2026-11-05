import { jsPDF } from "jspdf";

export function downloadTop3Certificates(
  items: Array<{ name: string; points: number }>,
  labels: {
    title: string;
    body: (name: string, rank: number) => string;
  },
) {
  const top3 = items.slice(0, 3);
  if (top3.length === 0) return;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  top3.forEach((item, index) => {
    if (index > 0) doc.addPage();
    const rank = index + 1;
    doc.setDrawColor(31, 107, 74);
    doc.setLineWidth(4);
    doc.rect(36, 36, doc.internal.pageSize.getWidth() - 72, doc.internal.pageSize.getHeight() - 72);

    doc.setFontSize(28);
    doc.setTextColor(31, 107, 74);
    doc.text(labels.title, doc.internal.pageSize.getWidth() / 2, 120, {
      align: "center",
    });

    doc.setFontSize(22);
    doc.setTextColor(20, 20, 20);
    doc.text(item.name, doc.internal.pageSize.getWidth() / 2, 190, {
      align: "center",
    });

    doc.setFontSize(16);
    const body = labels.body(item.name, rank);
    doc.text(body, doc.internal.pageSize.getWidth() / 2, 240, {
      align: "center",
      maxWidth: 640,
    });

    doc.setFontSize(14);
    doc.text(`Points: ${item.points}`, doc.internal.pageSize.getWidth() / 2, 300, {
      align: "center",
    });
  });

  doc.save("eldersafe-top3-certificates.pdf");
}
