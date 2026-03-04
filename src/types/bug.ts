// Raw row from any spreadsheet — actual column names preserved
export type RawRow = Record<string, string>;

// Column analysis result
export type ColumnType = "categorical" | "numeric" | "id" | "text" | "url" | "date";

export type ColumnAnalysis = {
  name: string;
  type: ColumnType;
  uniqueCount: number;
  totalCount: number;
  topValues: { value: string; count: number }[];
  fillRate: number; // percentage of non-empty values
};

export type ChartSuggestion = {
  type: "pie" | "hbar" | "vbar" | "heatmap" | "stacked_bar";
  columns: string[]; // 1 for simple, 2 for cross-analysis
  title: string;
  priority: number; // higher = more important
};

export type DataAnalysis = {
  columns: ColumnAnalysis[];
  chartSuggestions: ChartSuggestion[];
  kpiColumns: string[]; // columns to show as KPI cards
  totalRows: number;
};

export type DataFormat = "bug_report" | "test_case" | "generic";

export type GoogleSheetsConfig = {
  url: string;
  sheetId: string;
  gid?: string;
  sheetName?: string;
  pollInterval: number;
  lastFetched?: number;
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

export type UserPreferences = {
  theme: "light" | "dark";
  aiEnabled: boolean;
  groqApiKey?: string;
  aiProvider?: AIProvider;
  aiModel?: string;
  apiKeys?: Partial<Record<AIProvider, string>>;
  googleSheetsApiKey?: string;
};

// Legacy compat - keep for template fingerprints
export type TemplateFingerprint = {
  id: string;
  headers: string[];
  sheetName: string;
  mapping: Record<string, string | null>;
  createdAt: number;
};

// Aggregations are now dynamic
export type DynamicAggregations = {
  total: number;
  columnCounts: Record<string, Record<string, number>>; // columnName -> { value: count }
};

// Keep old type name as alias for backward compat in AI insights
export type BugRow = RawRow;
export type Aggregations = DynamicAggregations;
