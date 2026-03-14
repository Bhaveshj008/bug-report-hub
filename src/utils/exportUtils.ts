import type { RawRow, DataAnalysis, DynamicAggregations } from "@/types/bug";

/**
 * Export data as CSV — works with any column structure
 */
export function exportCSV(rows: RawRow[], fileName: string = "export.csv") {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);

  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h] || "")).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Professional PDF Report Generator
 * Captures actual dashboard charts via html2canvas + includes AI insights
 */
export async function exportPDF(
  fileName: string = "report.pdf",
  options: {
    analysis: DataAnalysis;
    agg: DynamicAggregations;
    rows: RawRow[];
    visibleKPIs?: Set<number>;
    dataFileName?: string;
    aiInsights?: string | null;
  }
) {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;
  const { analysis, agg, visibleKPIs, dataFileName, aiInsights } = options;

  const pdf = new jsPDF("p", "mm", "a4");
  const pageW = 210;
  const pageH = 297;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = margin;

  const colors = {
    primary: [14, 165, 233] as [number, number, number],
    dark: [15, 23, 42] as [number, number, number],
    text: [30, 41, 59] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    light: [241, 245, 249] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    accent: [139, 92, 246] as [number, number, number],
    success: [34, 197, 94] as [number, number, number],
  };

  const checkPage = (needed: number) => {
    if (y + needed > pageH - 20) {
      pdf.addPage();
      y = margin;
    }
  };

  // === HEADER ===
  pdf.setFillColor(...colors.primary);
  pdf.rect(0, 0, pageW, 40, "F");
  pdf.setFillColor(...colors.accent);
  pdf.rect(0, 40, pageW, 3, "F");

  pdf.setTextColor(...colors.white);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("BugLens Analytics Report", margin, 18);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Source: ${dataFileName || "Dataset"}`, margin, 26);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 32);
  pdf.text(`${agg.total} records · ${analysis.columns.length} columns`, pageW - margin, 26, { align: "right" });

  y = 52;

  // === EXECUTIVE SUMMARY BOXES ===
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Executive Summary", margin, y);
  y += 8;
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y - 2, margin + 40, y - 2);
  y += 4;

  const avgFill = Math.round(analysis.columns.reduce((s, c) => s + c.fillRate, 0) / Math.max(analysis.columns.length, 1));
  const summaryItems = [
    { label: "Total Records", value: String(agg.total) },
    { label: "Columns Analyzed", value: String(analysis.columns.length) },
    { label: "Data Quality", value: `${avgFill}%` },
  ];
  const boxW = (contentW - 8) / 3;

  summaryItems.forEach((item, i) => {
    const bx = margin + i * (boxW + 4);
    pdf.setFillColor(...colors.light);
    pdf.roundedRect(bx, y, boxW, 20, 2, 2, "F");
    pdf.setFontSize(8);
    pdf.setTextColor(...colors.muted);
    pdf.setFont("helvetica", "normal");
    pdf.text(item.label.toUpperCase(), bx + 4, y + 7);
    pdf.setFontSize(16);
    pdf.setTextColor(...colors.dark);
    pdf.setFont("helvetica", "bold");
    pdf.text(item.value, bx + 4, y + 16);
  });
  y += 28;

  // === KPI METRICS (only visible ones) ===
  const kpis: { label: string; value: string; sub?: string }[] = [];
  const filteredKPIColumns = analysis.kpiColumns;

  let kpiIdx = 0;
  kpis.push({ label: "Total Records", value: String(agg.total) });
  kpiIdx++;

  for (const colName of filteredKPIColumns) {
    const counts = agg.columnCounts[colName];
    if (!counts) continue;
    const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
    if (entries.length === 0) continue;

    const [topValue, topCount] = entries[0];
    const pct = agg.total > 0 ? Math.round((topCount / agg.total) * 100) : 0;

    if (!visibleKPIs || visibleKPIs.has(kpiIdx)) {
      kpis.push({ label: `Top ${colName}`, value: topValue, sub: `${topCount} (${pct}%)` });
    }
    kpiIdx++;

    if (entries.length <= 6) {
      if (!visibleKPIs || visibleKPIs.has(kpiIdx)) {
        kpis.push({ label: `${colName} Types`, value: String(entries.length), sub: entries.slice(0, 3).map(([v]) => v).join(", ") });
      }
      kpiIdx++;
    }
  }

  if (kpis.length > 1) {
    checkPage(30);
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Key Metrics", margin, y);
    y += 8;
    pdf.setDrawColor(...colors.accent);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y - 2, margin + 30, y - 2);
    y += 4;

    const kpiBoxW = (contentW - 6) / Math.min(kpis.length, 4);
    kpis.slice(0, 8).forEach((kpi, i) => {
      const row = Math.floor(i / 4);
      const col = i % 4;
      if (col === 0 && row > 0) y += 24;
      checkPage(24);

      const bx = margin + col * (kpiBoxW + 2);
      pdf.setFillColor(...colors.light);
      pdf.roundedRect(bx, y, kpiBoxW - 2, 20, 2, 2, "F");
      pdf.setFontSize(7);
      pdf.setTextColor(...colors.muted);
      pdf.setFont("helvetica", "normal");
      pdf.text(kpi.label.toUpperCase(), bx + 3, y + 6);
      pdf.setFontSize(11);
      pdf.setTextColor(...colors.dark);
      pdf.setFont("helvetica", "bold");
      const valTrunc = kpi.value.length > 16 ? kpi.value.slice(0, 14) + "…" : kpi.value;
      pdf.text(valTrunc, bx + 3, y + 13);
      if (kpi.sub) {
        pdf.setFontSize(7);
        pdf.setTextColor(...colors.muted);
        pdf.setFont("helvetica", "normal");
        pdf.text(kpi.sub.slice(0, 24), bx + 3, y + 18);
      }
    });
    y += 28;
  }

  // === CAPTURE ACTUAL DASHBOARD CHARTS ===
  const chartCards = document.querySelectorAll("[data-chart-card]");
  if (chartCards.length > 0) {
    checkPage(20);
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Visual Analytics", margin, y);
    y += 8;
    pdf.setDrawColor(...colors.primary);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y - 2, margin + 35, y - 2);
    y += 6;

    // Capture charts 2 per row
    for (let i = 0; i < chartCards.length; i += 2) {
      checkPage(75);
      const chartW = (contentW - 4) / 2;

      for (let j = 0; j < 2 && i + j < chartCards.length; j++) {
        const el = chartCards[i + j] as HTMLElement;
        try {
          const canvas = await html2canvas(el, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            useCORS: true,
          });
          const imgData = canvas.toDataURL("image/png");
          const imgAspect = canvas.height / canvas.width;
          const imgH = Math.min(chartW * imgAspect, 70);
          const bx = margin + j * (chartW + 4);
          pdf.addImage(imgData, "PNG", bx, y, chartW, imgH);
        } catch (e) {
          console.warn("Failed to capture chart", e);
        }
      }

      // Calculate height of tallest chart in this row
      const heights: number[] = [];
      for (let j = 0; j < 2 && i + j < chartCards.length; j++) {
        const el = chartCards[i + j] as HTMLElement;
        const aspect = el.offsetHeight / Math.max(el.offsetWidth, 1);
        const chartW2 = (contentW - 4) / 2;
        heights.push(Math.min(chartW2 * aspect, 70));
      }
      y += Math.max(...heights) + 6;
    }
  }

  // === AI INSIGHTS SECTION ===
  if (aiInsights) {
    checkPage(30);
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("AI-Powered Insights", margin, y);
    y += 8;
    pdf.setDrawColor(...colors.accent);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y - 2, margin + 40, y - 2);
    y += 6;

    // Parse markdown into PDF text
    const lines = aiInsights.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) { y += 2; continue; }

      checkPage(8);

      if (trimmed.startsWith("## ")) {
        y += 3;
        pdf.setFontSize(11);
        pdf.setTextColor(...colors.dark);
        pdf.setFont("helvetica", "bold");
        const heading = trimmed.replace(/^##\s*/, "").replace(/[*_]/g, "");
        pdf.text(heading, margin, y);
        y += 6;
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.text);
        pdf.setFont("helvetica", "normal");
        const bullet = trimmed.replace(/^[-*]\s*/, "").replace(/[*_]/g, "");
        const wrappedLines = pdf.splitTextToSize(`• ${bullet}`, contentW - 6);
        for (const wl of wrappedLines) {
          checkPage(5);
          pdf.text(wl, margin + 3, y);
          y += 4;
        }
      } else if (/^\d+\./.test(trimmed)) {
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.text);
        pdf.setFont("helvetica", "normal");
        const clean = trimmed.replace(/[*_]/g, "");
        const wrappedLines = pdf.splitTextToSize(clean, contentW - 6);
        for (const wl of wrappedLines) {
          checkPage(5);
          pdf.text(wl, margin + 3, y);
          y += 4;
        }
      } else {
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.text);
        pdf.setFont("helvetica", "normal");
        const clean = trimmed.replace(/[*_#]/g, "");
        const wrappedLines = pdf.splitTextToSize(clean, contentW);
        for (const wl of wrappedLines) {
          checkPage(5);
          pdf.text(wl, margin, y);
          y += 4;
        }
      }
    }
  }

  // === FOOTER ===
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFillColor(...colors.light);
    pdf.rect(0, pageH - 12, pageW, 12, "F");
    pdf.setFontSize(7);
    pdf.setTextColor(...colors.muted);
    pdf.setFont("helvetica", "normal");
    pdf.text("Generated by BugLens Analytics", margin, pageH - 5);
    pdf.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
  }

  pdf.save(fileName);
}
