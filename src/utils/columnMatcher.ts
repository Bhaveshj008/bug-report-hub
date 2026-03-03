import type { CanonicalField, ColumnMapping, MappingConfidence } from "@/types/bug";

const SYNONYMS: Record<CanonicalField, string[]> = {
  app: ["app", "application", "app name", "project"],
  jiraId: ["jira id", "jira", "ticket", "issue id", "bug id", "defect id", "id", "ticket id", "key", "test case id", "tc id", "sr. no", "sr no", "serial no", "s.no", "test id"],
  summary: ["defect summary", "summary", "title", "bug summary", "issue", "description", "defect description", "bug title", "test objectives", "test objective", "objective", "test name"],
  severity: ["severity", "bug severity", "priority", "sev", "level", "priority level"],
  component: ["component", "module", "feature", "area", "section", "category/module", "category/ module", "module name", "modules"],
  userRole: ["user role", "role", "user type", "persona"],
  testData: ["test data", "data", "test input", "test cases count"],
  platform: ["platform", "browser", "device", "environment", "env", "precondition", "pre-condition", "pre condition"],
  osVersion: ["os version", "os", "android version", "ios version", "version"],
  category: ["issue category", "bug category", "category", "type", "defect type", "bug type", "issue type", "sub module", "submodule", "sub-module", "features"],
  reproducibility: ["reproducibility", "repro", "frequency", "occurrence", "reproducible", "status", "test status", "execution status", "result"],
  steps: ["reproduction steps", "steps", "steps to reproduce", "str", "repro steps", "how to reproduce", "test procedure", "procedure", "test steps"],
  expected: ["expected results", "expected", "expected behavior", "expected result", "expected outcome"],
  actual: ["actual results", "actual", "actual behavior", "actual result", "actual outcome"],
  artifactsLink: ["artifacts", "drive link", "evidence", "attachments", "link", "artifacts name", "screenshot", "artifacts name / drive link", "test case range"],
  qaComments: ["qa comments", "qa comment", "qa notes", "qa feedback", "tester comments"],
  comments: ["comments", "comment", "notes", "remarks", "additional comments", "bug id"],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

function matchScore(header: string, synonyms: string[]): number {
  const h = normalize(header);
  for (const syn of synonyms) {
    const s = normalize(syn);
    if (h === s) return 1;
    if (h.includes(s) || s.includes(h)) return 0.8;
  }
  // word overlap
  const hWords = h.split(/\s+/);
  const best = synonyms.reduce((max, syn) => {
    const sWords = normalize(syn).split(/\s+/);
    const overlap = hWords.filter((w) => sWords.includes(w)).length;
    const score = overlap / Math.max(hWords.length, sWords.length);
    return Math.max(max, score);
  }, 0);
  return best > 0.4 ? best * 0.7 : 0;
}

export function matchColumns(headers: string[]): MappingConfidence {
  const mapping: ColumnMapping = {} as ColumnMapping;
  const used = new Set<string>();
  const scores: number[] = [];
  const fields = Object.keys(SYNONYMS) as CanonicalField[];

  // greedy best-match
  const candidates: { field: CanonicalField; header: string; score: number }[] = [];
  for (const field of fields) {
    for (const header of headers) {
      const s = matchScore(header, SYNONYMS[field]);
      if (s > 0.3) candidates.push({ field, header, score: s });
    }
  }
  candidates.sort((a, b) => b.score - a.score);

  const mappedFields = new Set<CanonicalField>();
  for (const c of candidates) {
    if (mappedFields.has(c.field) || used.has(c.header)) continue;
    mapping[c.field] = c.header;
    mappedFields.add(c.field);
    used.add(c.header);
    scores.push(c.score);
  }

  for (const field of fields) {
    if (!mappedFields.has(field)) mapping[field] = null;
  }

  const unmappedHeaders = headers.filter((h) => !used.has(h));
  const confidence = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / fields.length : 0;

  return { mapping, confidence, unmappedHeaders };
}
