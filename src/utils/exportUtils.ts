import type { BugRow } from "@/types/bug";

/**
 * Export filtered bug data as CSV
 */
export function exportCSV(rows: BugRow[], fileName: string = "bugs-export.csv") {
  const headers = [
    "Jira ID", "Summary", "Severity", "Component", "Category",
    "Platform", "OS Version", "Reproducibility", "User Role",
    "Steps", "Expected", "Actual", "Artifacts Link", "QA Comments", "Comments",
  ];
  const keys: (keyof BugRow)[] = [
    "jiraId", "summary", "severity", "component", "category",
    "platform", "osVersion", "reproducibility", "userRole",
    "steps", "expected", "actual", "artifactsLink", "qaComments", "comments",
  ];

  const escape = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csv = [
    headers.join(","),
    ...rows.map((row) => keys.map((k) => escape(row[k] || "")).join(",")),
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
 * Export dashboard as PDF using html2canvas + jsPDF
 */
export async function exportPDF(elementId: string, fileName: string = "bug-report.pdf") {
  const { default: html2canvas } = await import("html2canvas");
  const { jsPDF } = await import("jspdf");

  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("p", "mm", "a4");
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(fileName);
}
