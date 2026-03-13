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
  const { analysis, agg, rows, visibleKPIs, dataFileName, aiInsights } = options;

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
  pdf.setFillColor(139, 92, 246);
  pdf.rect(0, 40, pageW, 3, "F");

  pdf.setTextColor(...colors.white);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("BugLens Analytics Report", margin, 18);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Source: ${dataFileName || "Dataset"}`, margin, 26);
  pdf.text(`Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, 32);

  pdf.setFontSize(10);
  pdf.text(`${agg.total} records · ${analysis.columns.length} columns`, pageW - margin, 26, { align: "right" });
  
  y = 52;

  // === EXECUTIVE SUMMARY ===
  pdf.setTextColor(...colors.dark);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text("Executive Summary", margin, y);
  y += 8;
  pdf.setDrawColor(...colors.primary);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y - 2, margin + 40, y - 2);
  y += 4;

  const boxW = (contentW - 8) / 3;
  const summaryItems = [
    { label: "Total Records", value: String(agg.total) },
    { label: "Columns Analyzed", value: String(analysis.columns.length) },
    { label: "Data Quality", value: `${Math.round(analysis.columns.reduce((s, c) => s + c.fillRate, 0) / Math.max(analysis.columns.length, 1))}%` },
  ];

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

  // === KPI METRICS ===
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
      const by = y + row * 0;
      pdf.setFillColor(...colors.light);
      pdf.roundedRect(bx, by, kpiBoxW - 2, 20, 2, 2, "F");
      pdf.setFontSize(7);
      pdf.setTextColor(...colors.muted);
      pdf.setFont("helvetica", "normal");
      pdf.text(kpi.label.toUpperCase(), bx + 3, by + 6);
      pdf.setFontSize(11);
      pdf.setTextColor(...colors.dark);
      pdf.setFont("helvetica", "bold");
      const valTrunc = kpi.value.length > 16 ? kpi.value.slice(0, 14) + "…" : kpi.value;
      pdf.text(valTrunc, bx + 3, by + 13);
      if (kpi.sub) {
        pdf.setFontSize(7);
        pdf.setTextColor(...colors.muted);
        pdf.setFont("helvetica", "normal");
        pdf.text(kpi.sub.slice(0, 24), bx + 3, by + 18);
      }
    });
    y += 28;
  }

  // === CAPTURE DASHBOARD CHARTS ===
  const chartContainer = document.querySelector("#dashboard-charts");
  if (chartContainer) {
    try {
      checkPage(20);
      pdf.setTextColor(...colors.dark);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Visualizations", margin, y);
      y += 8;
      pdf.setDrawColor(...colors.primary);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y - 2, margin + 35, y - 2);
      y += 4;

      // Capture each chart card individually
      const chartCards = chartContainer.querySelectorAll("[data-chart-card]");
      for (const card of Array.from(chartCards)) {
        const canvas = await html2canvas(card as HTMLElement, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
          logging: false,
        });
        const imgData = canvas.toDataURL("image/png");
        const imgW = contentW;
        const imgH = (canvas.height / canvas.width) * imgW;

        checkPage(imgH + 4);
        pdf.addImage(imgData, "PNG", margin, y, imgW, imgH);
        y += imgH + 6;
      }
    } catch (e) {
      console.warn("Chart capture failed:", e);
    }
  }

  // === COLUMN DISTRIBUTIONS (fallback if no chart capture) ===
  if (!chartContainer) {
    const categoricals = analysis.columns.filter(c => c.type === "categorical" && c.fillRate > 20);

    if (categoricals.length > 0) {
      checkPage(20);
      pdf.setTextColor(...colors.dark);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Data Distributions", margin, y);
      y += 8;
      pdf.setDrawColor(...colors.primary);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y - 2, margin + 38, y - 2);
      y += 6;

      for (const col of categoricals.slice(0, 6)) {
        const counts = agg.columnCounts[col.name];
        if (!counts) continue;
        const entries = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 8);
        const colTotal = entries.reduce((s, [, v]) => s + v, 0);

        checkPage(12 + entries.length * 7);

        pdf.setFontSize(11);
        pdf.setTextColor(...colors.dark);
        pdf.setFont("helvetica", "bold");
        pdf.text(col.name, margin, y);
        pdf.setFontSize(8);
        pdf.setTextColor(...colors.muted);
        pdf.setFont("helvetica", "normal");
        pdf.text(`${col.uniqueCount} unique · ${Math.round(col.fillRate)}% filled`, margin + pdf.getTextWidth(col.name) + 4, y);
        y += 6;

        for (const [value, count] of entries) {
          const pct = Math.round((count / colTotal) * 100);
          const barW = (pct / 100) * (contentW * 0.5);

          pdf.setFillColor(...colors.light);
          pdf.roundedRect(margin, y - 3, contentW, 6, 1, 1, "F");
          pdf.setFillColor(...colors.primary);
          pdf.roundedRect(margin, y - 3, Math.max(barW, 2), 6, 1, 1, "F");

          pdf.setFontSize(8);
          pdf.setTextColor(...colors.dark);
          pdf.setFont("helvetica", "normal");
          const label = value.length > 24 ? value.slice(0, 22) + "…" : value;
          pdf.text(label, margin + contentW * 0.55, y + 1);
          pdf.setTextColor(...colors.muted);
          pdf.text(`${count} (${pct}%)`, margin + contentW * 0.85, y + 1);
          y += 7;
        }
        y += 4;
      }
    }
  }

  // === AI INSIGHTS ===
  if (aiInsights) {
    checkPage(30);
    pdf.setTextColor(...colors.dark);
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("AI-Powered Insights", margin, y);
    y += 8;
    pdf.setDrawColor(...colors.accent);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y - 2, margin + 42, y - 2);
    y += 6;

    // Strip markdown formatting for PDF
    const plainText = aiInsights
      .replace(/#{1,3}\s*/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/[📊🔥📈⚠️🎯📋✅❌💡🔍]/g, "")
      .trim();

    const lines = plainText.split("\n").filter(l => l.trim());
    
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect section headers (lines that were ## headers)
      const isHeader = trimmed.length < 60 && !trimmed.startsWith("-") && !trimmed.startsWith("•");
      const isBullet = trimmed.startsWith("-") || trimmed.startsWith("•");

      checkPage(8);

      if (isHeader && !isBullet) {
        y += 2;
        pdf.setFontSize(10);
        pdf.setTextColor(...colors.dark);
        pdf.setFont("helvetica", "bold");
        const headerText = trimmed.replace(/^[-•]\s*/, "");
        pdf.text(headerText, margin, y);
        y += 6;
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
      } else {
        pdf.setTextColor(...colors.text);
        const indent = isBullet ? margin + 4 : margin;
        const maxW = contentW - (isBullet ? 4 : 0);
        const text = isBullet ? trimmed.replace(/^[-•]\s*/, "• ") : trimmed;
        const splitLines = pdf.splitTextToSize(text, maxW);
        for (const sl of splitLines) {
          checkPage(5);
          pdf.text(sl, indent, y);
          y += 4.5;
        }
        y += 1;
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