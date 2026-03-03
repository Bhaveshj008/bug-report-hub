import type { DataFormat } from "@/types/bug";

const TEST_CASE_KEYWORDS = [
  "test case", "test case id", "test objective", "test procedure",
  "precondition", "status", "pass", "fail", "not tested",
  "test step", "tc_", "tc id", "execution",
];

const BUG_KEYWORDS = [
  "severity", "bug", "defect", "steps to reproduce",
  "reproducibility", "repro", "bug id", "defect id", "jira",
];

export function detectDataFormat(
  headers: string[],
  sampleRows: Record<string, string>[]
): DataFormat {
  const headerStr = headers.map((h) => h.toLowerCase()).join(" ");

  let bugScore = 0;
  let testCaseScore = 0;

  for (const kw of BUG_KEYWORDS) {
    if (headerStr.includes(kw)) bugScore += 2;
  }

  for (const kw of TEST_CASE_KEYWORDS) {
    if (headerStr.includes(kw)) testCaseScore += 2;
  }

  // Check sample data for Pass/Fail/Not Tested patterns
  if (sampleRows.length > 0) {
    const allValues = sampleRows
      .slice(0, 20)
      .flatMap((r) => Object.values(r).map((v) => v.toLowerCase().trim()));
    const statusValues = allValues.filter((v) =>
      ["pass", "fail", "not tested", "blocked", "skipped"].includes(v)
    );
    if (statusValues.length > 3) testCaseScore += 5;
  }

  if (testCaseScore > bugScore && testCaseScore >= 4) return "test_case";
  if (bugScore > testCaseScore && bugScore >= 4) return "bug_report";
  return "generic";
}

export function getChartLabels(format: DataFormat) {
  if (format === "test_case") {
    return {
      total: "Total Test Cases",
      severity: "Priority Distribution",
      category: "Features",
      component: "Modules",
      platform: "Preconditions",
      reproducibility: "Test Status",
      severityLabel: "Priority",
      detailTitle: "Test Case Details",
      listTitle: "Test Case List",
    };
  }
  return {
    total: "Total Bugs",
    severity: "Severity Distribution",
    category: "Issues by Category",
    component: "Issues by Component",
    platform: "Platform Distribution",
    reproducibility: "Reproducibility",
    severityLabel: "Severity",
    detailTitle: "Bug Details",
    listTitle: "Defect List",
  };
}
