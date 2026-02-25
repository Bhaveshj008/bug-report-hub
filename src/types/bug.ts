export type BugRow = {
  app: string;
  jiraId: string;
  summary: string;
  severity: string;
  component: string;
  userRole: string;
  testData: string;
  platform: string;
  osVersion: string;
  category: string;
  reproducibility: string;
  steps: string;
  expected: string;
  actual: string;
  artifactsLink: string;
  qaComments: string;
  comments: string;
};

export type CanonicalField = keyof BugRow;

export type ColumnMapping = Record<CanonicalField, string | null>;

export type MappingConfidence = {
  mapping: ColumnMapping;
  confidence: number;
  unmappedHeaders: string[];
};

export type Aggregations = {
  total: number;
  severityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  componentCounts: Record<string, number>;
  platformCounts: Record<string, number>;
  reproducibilityCounts: Record<string, number>;
};

export type TemplateFingerprint = {
  id: string;
  headers: string[];
  sheetName: string;
  mapping: ColumnMapping;
  createdAt: number;
};

export type UserPreferences = {
  theme: "light" | "dark";
  aiEnabled: boolean;
  groqApiKey?: string;
};
