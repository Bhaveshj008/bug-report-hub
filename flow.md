# QualityLens — Complete System Flow & Logic

## Table of Contents
1. [Data Ingestion](#1-data-ingestion)
2. [Column Analysis & Type Detection](#2-column-analysis--type-detection)
3. [Aggregation Engine](#3-aggregation-engine)
4. [Chart Selection Logic](#4-chart-selection-logic)
5. [KPI Card Selection](#5-kpi-card-selection)
6. [Google Sheets Integration](#6-google-sheets-integration)
7. [AI Insights Generation](#7-ai-insights-generation)
8. [RAG-like Q&A System](#8-rag-like-qa-system)
9. [Data Flow Diagram](#9-data-flow-diagram)

---

## 1. Data Ingestion

**Files:** `src/utils/excelParser.ts`, `src/components/FileUpload.tsx`

### Flow:
1. User uploads `.xlsx` / `.xls` / `.csv` file via `FileUpload.tsx`
2. `excelParser.ts` uses the `xlsx` library to parse the workbook
3. Each row becomes a `RawRow` (`Record<string, string>`) — no schema enforcement
4. Column headers are taken directly from the first row of the spreadsheet
5. All values are stored as strings to preserve original formatting

### Key Design Decision:
- **No normalization** — data stays in its original shape
- This allows the dashboard to handle ANY spreadsheet (bug reports, test cases, sales data, HR data, etc.)

**Type:** `src/types/bug.ts` → `RawRow = Record<string, string>`

---

## 2. Column Analysis & Type Detection

**File:** `src/utils/columnAnalyzer.ts` → `analyzeColumns()`

### How It Works:

For each column, the system runs a two-pass detection:

#### Pass 1: Name-based hints (keyword matching)
```
Column name contains "id", "no", "ticket" → type = "id"
Column name contains "email", "url", "link" → type = "url"
Column name contains "date", "time", "created" → type = "date"
Column name contains "description", "summary", "comment" → type = "text"
```

#### Pass 2: Value-based detection (on first 80 non-empty values)
```
All values match URL regex → "url"
>60% match date regex (YYYY-MM-DD etc.) → "date"
>60% match number/currency regex → "numeric"
```

#### Pass 3: Categorical vs Text vs ID (fallback)
```
≤2 unique values & ≥5 rows → "categorical" (e.g., Pass/Fail)
≤15 unique & avg length < 60 → "categorical"
≤30 unique & <15% of total & avg < 50 → "categorical"
≤50 unique & <8% of total & avg < 40 → "categorical"
avg length > 50 → "text" (long descriptions)
>80% unique values → "id" (likely identifiers)
<40% unique → "categorical"
else → "text"
```

### Output:
```typescript
DataAnalysis {
  columns: ColumnAnalysis[]    // name, type, uniqueCount, topValues, fillRate
  chartSuggestions: ChartSuggestion[]
  kpiColumns: string[]
  totalRows: number
}
```

### Priority Keywords (boost column importance):
Columns matching these get prioritized for charts/KPIs:
```
severity, priority, status, type, category, module, component,
platform, environment, result, department, region, country,
gender, segment, tier, level, grade, rating, channel, source
```

---

## 3. Aggregation Engine

**File:** `src/utils/columnAnalyzer.ts` → `dynamicAggregate()`

### Logic:
- Only aggregates columns detected as `"categorical"`
- For each categorical column, counts occurrences of each value
- Produces `DynamicAggregations`:

```typescript
{
  total: number,                              // total row count
  columnCounts: Record<string, Record<string, number>>  // col → value → count
}
```

**Example:**
```
columnCounts = {
  "Status": { "Open": 45, "Closed": 30, "In Progress": 15 },
  "Priority": { "High": 20, "Medium": 50, "Low": 20 }
}
```

This aggregated data is what gets sent to AI (never raw rows for insights).

---

## 4. Chart Selection Logic

**File:** `src/utils/columnAnalyzer.ts` → `generateChartSuggestions()`

### Selection Algorithm:

#### Step 1: Filter eligible columns
- Only `categorical` columns with `fillRate > 20%` and `uniqueCount >= 2`

#### Step 2: Sort by importance
1. Columns matching priority keywords (severity, status, etc.) come first
2. Then sorted by fewer unique values (simpler distributions first)

#### Step 3: Assign chart types (top 6 columns)
```
uniqueCount == 2        → Pie chart (binary: Pass/Fail, Yes/No)
uniqueCount ≤ 7         → Pie chart (small set, easy to read as slices)
uniqueCount ≤ 12        → Vertical bar chart (medium set)
uniqueCount > 12        → Horizontal bar chart (long labels need space)
```

#### Step 4: Cross-analysis charts (if ≥2 categorical columns)
```
Two columns with ≤10 unique each → Heatmap (col1 × col2 matrix)
Two columns: first ≤12, second ≤8 → Stacked bar (composition view)
Three small columns → Additional stacked bar
```

### Chart Components:
| Chart Type | File | When Used |
|---|---|---|
| Pie/Donut | `src/components/charts/SeverityPieChart.tsx` | ≤7 unique values |
| Vertical Bar | `src/components/charts/VBarChart.tsx` | 8-12 unique values |
| Horizontal Bar | `src/components/charts/HBarChart.tsx` | >12 unique values |
| Heatmap | `src/components/charts/DynamicHeatmap.tsx` | 2 categorical columns cross-analysis |
| Stacked Bar | `src/components/charts/DynamicStackedBar.tsx` | Composition of one column by another |

### Rendering:
**File:** `src/components/DynamicCharts.tsx`
- Simple charts (pie, vbar, hbar) → 3-column grid
- Cross charts (heatmap, stacked_bar) → 2-column grid
- Max 10 charts total to avoid overwhelming the dashboard

---

## 5. KPI Card Selection

**File:** `src/utils/columnAnalyzer.ts` → `pickKPIColumns()`

### Logic:
```
Filter: categorical columns where:
  - uniqueCount between 2 and 10 (not too granular)
  - fillRate > 40% (enough data to be meaningful)

Sort by:
  1. Priority keyword match (severity, status, etc.) → boosted
  2. Fewer unique values preferred (cleaner KPI)

Pick top 3 columns
```

### Rendering:
**File:** `src/components/DynamicKPICards.tsx`
- Shows total row count as first KPI
- For each selected column: shows the dominant value, its percentage, and a color-coded bar
- Includes data quality indicator (fill rate)

---

## 6. Google Sheets Integration

**Files:** `src/utils/googleSheets.ts`, `src/components/GoogleSheetsConnect.tsx`

### Two Modes:

#### Mode A: With Google API Key
1. Parse sheet URL → extract `sheetId`
2. Call Google Sheets API to list all tabs: `GET /spreadsheets/{id}?fields=sheets.properties`
3. If multiple tabs → show sheet selector modal
4. Fetch selected sheet data: `GET /spreadsheets/{id}/values/{sheetName}`
5. Convert to `RawRow[]`

#### Mode B: Without API Key (Public Sheets)
1. Parse sheet URL → extract `sheetId`
2. Download entire workbook as `.xlsx`: `https://docs.google.com/spreadsheets/d/{id}/export?format=xlsx`
3. Parse with `xlsx` library to detect all sheet tabs
4. If multiple tabs → show sheet selector modal
5. Extract selected sheet's rows → convert to `RawRow[]`

### Auto-Polling (Refresh):
- Configurable interval: 10s, 30s, 60s, 120s, 300s
- On refresh: if a sheet is already selected (`activeConfig.sheetName`), it **skips** the sheet selector and directly reloads that specific sheet
- Sheet switching: dropdown in the connected status bar lets users switch tabs without disconnecting

### Persistent Config:
```typescript
GoogleSheetsConfig {
  sheetId: string
  sheetName?: string
  pollInterval: number   // seconds, 0 = disabled
  lastFetched?: number   // timestamp
  apiKey?: string
}
```

---

## 7. AI Insights Generation

**File:** `src/utils/aiInsights.ts` → `generateInsights()`

### What Gets Sent to AI:
⚠️ **Raw rows are NEVER sent for insights generation.**

The system sends only **aggregated statistics**:
```
DATA SUMMARY (500 total rows, 12 columns):
Columns: ID, Title, Status, Priority, Module, ...

VALUE DISTRIBUTIONS:
Status: Open(45), Closed(30), In Progress(15), ...
Priority: High(20), Medium(50), Low(20), ...
Module: Auth(35), Payment(28), UI(22), ...
```

- Only top 8 values per column are included
- Only categorical column distributions are sent
- Token budget: `maxTokens: 1200`

### AI Response Format:
```markdown
## 📊 Executive Summary
## 🔥 Key Findings
## 📈 Pattern Analysis
## 🎯 Recommendations
## 📋 Data Quality Score (1-10)
```

### Supported Providers:
**File:** `src/utils/aiProviders.ts`

| Provider | Models |
|---|---|
| Groq | llama, mixtral, gemma |
| OpenAI | gpt-4o, gpt-4o-mini, gpt-3.5-turbo |
| Google | gemini-pro, gemini-flash |
| Anthropic | claude-3, claude-3.5 |

---

## 8. RAG-like Q&A System

**File:** `src/utils/aiInsights.ts` → `askAboutBugs()`

### How It Works (NOT sending full sheet):

#### Step 1: Build column summaries (same as insights)
- Top 10 values per column (up to 10 columns)
- This gives the AI statistical context

#### Step 2: Smart row filtering (keyword-based retrieval)
```typescript
// Extract keywords from the user's question
keywords = question.split(/\s+/).filter(word => word.length > 2)

// Search all rows for keyword matches
relevantRows = rows.filter(row => {
  text = Object.values(row).join(" ").toLowerCase()
  return keywords.some(keyword => text.includes(keyword))
})

// Fallback: if no matches, send first 20 rows
if (relevantRows.length === 0) relevantRows = rows.slice(0, 20)
```

#### Step 3: Compact row format
```typescript
// Only first 6 columns per row
// Only first 30 matching rows
// Each value truncated to 80 characters
```

#### Step 4: Combined prompt
```
STATS (500 rows):
[column distributions]

RELEVANT ROWS (45 of 500 matched):
[compact JSON of matching rows]

QUESTION: What are the most critical bugs in the Auth module?
```

### Token Optimization:
- `maxTokens: 800` for Q&A (vs 1200 for insights)
- Only sends ~30 rows max, not the full dataset
- Only first 6 columns per row, values capped at 80 chars
- Statistical distributions provide broader context without raw data

### Chat UI:
**File:** `src/components/AIInsightsPanel.tsx`
- Suggested starter questions provided
- Chat history maintained in component state
- Each Q&A pair displayed as user bubble + AI response

---

## 9. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER INPUT                            │
│  Excel Upload (.xlsx/.csv)  OR  Google Sheets URL        │
└──────────────┬──────────────────────┬────────────────────┘
               │                      │
               ▼                      ▼
      ┌────────────────┐    ┌──────────────────────┐
      │  excelParser.ts │    │  googleSheets.ts      │
      │  (xlsx library) │    │  (API or xlsx export) │
      └───────┬────────┘    └──────────┬───────────┘
              │                        │
              ▼                        ▼
        ┌─────────────────────────────────┐
        │     RawRow[] (Record<string,    │
        │         string>)                │
        └──────────────┬──────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │   columnAnalyzer.ts          │
        │   analyzeColumns()           │
        │                              │
        │  ┌─ detectColumnType()       │
        │  │  (regex + keywords)       │
        │  │                           │
        │  ├─ generateChartSuggestions()│
        │  │  (type→chart mapping)     │
        │  │                           │
        │  └─ pickKPIColumns()         │
        │     (priority scoring)       │
        └──────┬───────────────────────┘
               │
               ▼
        ┌──────────────────┐
        │  DataAnalysis     │
        │  {columns,        │
        │   chartSuggestions│
        │   kpiColumns}     │
        └──────┬───────────┘
               │
     ┌─────────┼──────────┬──────────────┐
     ▼         ▼          ▼              ▼
┌─────────┐ ┌────────┐ ┌──────────┐ ┌────────────┐
│DynamicKPI│ │Dynamic │ │Dynamic   │ │AIInsights  │
│Cards.tsx │ │Charts  │ │Table.tsx │ │Panel.tsx   │
│          │ │.tsx    │ │          │ │            │
│(top 3    │ │(auto-  │ │(sortable,│ │(aggregated │
│ columns) │ │ picked │ │ search,  │ │ stats only │
│          │ │ types) │ │ paginate)│ │ → AI API)  │
└──────────┘ └────────┘ └──────────┘ └────────────┘
```

### State Management:
**File:** `src/utils/store.ts`
- Uses IndexedDB (`idb` library) for persistent storage
- Stores: raw rows, analysis results, Google Sheets config, AI settings
- Survives page refreshes

### Main Orchestrator:
**File:** `src/pages/Index.tsx`
- Coordinates all components
- Runs `analyzeColumns()` and `dynamicAggregate()` when data changes
- Passes results to all child components

---

## Summary of What Gets Sent to AI

| Feature | Data Sent | Raw Rows? | Token Limit |
|---|---|---|---|
| **Generate Insights** | Column distributions (top 8 per col) | ❌ Never | 1200 |
| **Ask Question (RAG)** | Distributions + keyword-matched rows (max 30, truncated) | ⚠️ Partial (filtered + compact) | 800 |

The system is designed to be **token-efficient** — it never dumps the entire spreadsheet into an AI prompt.
