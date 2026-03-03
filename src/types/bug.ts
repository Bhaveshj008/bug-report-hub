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

export type DataFormat = "bug_report" | "test_case" | "generic";

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

// Multi-provider AI support
export type AIProvider = "groq" | "openai" | "google" | "anthropic";

export type AIProviderConfig = {
  id: AIProvider;
  name: string;
  baseUrl: string;
  models: { id: string; name: string; maxTokens: number }[];
  keyPrefix: string;
  keyUrl: string;
};

export type GoogleSheetsConfig = {
  url: string;
  sheetId: string;
  gid?: string;
  pollInterval: number; // seconds, 0 = disabled
  lastFetched?: number;
};

export type UserPreferences = {
  theme: "light" | "dark";
  aiEnabled: boolean;
  groqApiKey?: string;
  // Multi-provider
  aiProvider?: AIProvider;
  aiModel?: string;
  apiKeys?: Partial<Record<AIProvider, string>>;
  googleSheetsApiKey?: string;
};
