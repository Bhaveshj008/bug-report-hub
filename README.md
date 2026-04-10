# QualityLens - Bug Report Analytics Dashboard

## What is it?

QualityLens is a universal data analytics dashboard that helps you analyze bug reports and data from multiple sources. Upload your Excel/CSV files or connect Google Sheets directly, and it automatically creates dynamic charts and visualizations to show you:

- How many bugs by severity (Critical, High, Medium, Low)
- Which components have the most issues
- Bug distribution across platforms
- Reproducibility patterns
- Real-time data updates from Google Sheets
- And more insights at a glance

Works with any structured data - automatically adapts charts and reports to your data format!

## Why use it?

Instead of looking at raw Excel or Google Sheets data, QualityLens shows you the big picture with dynamic charts and visualizations. You can quickly:
- Spot patterns and trends in your data automatically
- See which areas need the most attention
- View bugs by severity, component, platform, and more
- Export your analysis to share with your team
- Track changes in real-time with Google Sheets integration
- Work collaboratively with live data updates
- Use with any structured data format - dynamic dashboards adapt to your columns

## How it works

### Option 1: Upload Excel/CSV Files
- Click "Upload" and select your Excel or CSV file
- QualityLens automatically detects which columns contain severity, component, platform, etc.
- If it can't figure it out, you can manually map the columns
- Supports multiple sheets -select the sheet you want to analyze

### Option 2: Connect Google Sheets (Live Updates)
- Click "Connect Google Sheet"
- Paste your Google Sheets link (must be shared as "Anyone with link")
- If your sheet has multiple sheets, select the one you want to analyze
- QualityLens automatically fetches and analyzes your data
- **Multi-sheet support**: Easily switch between sheets without re-entering the URL
- **Real-time updates**: Enable "Auto-refresh" to automatically sync data at intervals (10s to 5 min)
- Works with or without Google Sheets API key
- Data updates in real-time as you work with your team

### Step 2: View the analytics
- See interactive charts, KPI cards, and a detailed data table
- Dynamic dashboard automatically adapts to your data columns
- Explore different visualization types based on your data structure
- Click on rows to see full details

### Step 3: Export results
- Generate a PDF report with all your charts
- Download as CSV for further analysis

## Google Sheets Integration

QualityLens now supports live Google Sheets integration for real-time collaborative analytics:

### Features:
- **Direct Sheet Connection**: Paste any Google Sheets URL (must be shared as "Anyone with link")
- **Multi-Sheet Support**: Automatic sheet detection with easy selection for workbooks with multiple sheets
- **Real-Time Auto-Sync**: Enable auto-refresh to automatically update data every 10 seconds to 5 minutes
- **Smart Sheet Selection**: Remember your selected sheet - no need to re-select on refresh or page reload
- **API Key Optional**: Works without Google Sheets API key (uses public export), or provide an API key for faster access
- **Live Collaboration**: See updates in real-time as your team modifies the sheet

### How to use:
1. Go to "Connect Google Sheet"
2. Paste your Google Sheets URL
3. If multiple sheets exist, select the one you want
4. Data loads automatically and updates in the dashboard
5. Toggle "Auto-refresh" and set your preferred sync interval
6. Your sheet selection is saved automatically

## Important: No Backend Required

This is a **frontend-only application**. Everything runs in your browser. Your data:
- Never leaves your computer
- Isn't sent to any server
- Gets stored in your browser's local storage (you can clear it anytime)
- When using Google Sheets, data is fetched directly from Google (not through our servers)

## Optional: AI Mode

QualityLens has an optional AI feature that can help automatically map your Excel columns. This is useful if your column names are unusual.

### How to enable AI mode:

1. Go to Settings (gear icon)
2. Toggle "Enable AI Column Mapping"
3. Choose your AI provider:
   - **Groq** (free, fast) - recommended
   - **OpenAI** (paid, GPT-4)
   - **Google Gemini** (free tier available)
   - **Anthropic Claude** (paid)
4. Enter your API key
5. Save settings

Your API key is stored locally in your browser - it's never sent anywhere.

### Getting API keys:

- **Groq**: Sign up free at [groq.com](https://groq.com) (no credit card needed for free tier)
- **OpenAI**: Get key at [platform.openai.com](https://platform.openai.com)
- **Google**: Get key at [ai.google.dev](https://ai.google.dev)
- **Anthropic**: Get key at [console.anthropic.com](https://console.anthropic.com)

## Getting Started

### Option 1: Use the web version
Just open the app in your browser - no installation needed.

### Option 2: Run locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build for production
npm run build
```

## Supported Data Format

QualityLens works with any structured data and automatically creates appropriate visualizations:

### Common columns (auto-detected):
- Severity (Critical, High, Medium, Low)
- Component (which part of the app)
- Platform (Web, Android, iOS, etc.)
- Reproducibility (Always, Sometimes, Rarely, etc.)
- Category, Status, Priority, JiraId, Summary, etc.

### Flexible & Adaptive:
- Works with Excel files (.xlsx, .xls), CSV files, or Google Sheets
- Support for multiple report types - dashboard auto-adapts to your data
- AI-powered column detection (optional) for unusual column names
- Custom column mapping if needed
- Don't worry about column names - QualityLens figures it out!

### Data Types Supported:
- Bug reports and issue tracking
- Incident reports
- Survey responses
- Customer feedback
- Error logs
- Performance metrics
- Any structured tabular data

## Tips

- **Dark/Light theme**: Click the theme toggle in the top-right
- **Column mapping**: If auto-detection isn't perfect, use the "Map Columns" modal to fix it
- **Save templates**: QualityLens remembers your column mappings for future uploads
- **Multiple sheets**: Works with Excel files and Google Sheets - select the sheet you want to analyze
- **Google Sheets sharing**: Make sure your Google Sheet is shared as "Anyone with the link" to connect
- **Auto-refresh**: Enable auto-sync to keep your dashboard updated with live data from Google Sheets
- **Sheet persistence**: Your selected sheet is remembered - refresh or disconnect anytime without re-selecting
- **API key optional**: Google Sheets works without API key, but API key access is faster and more reliable
- **Clear data**: Go to Settings → Clear all data or disconnect Google Sheets to reset everything

## Google Sheets API Key (Optional)

For faster and more reliable Google Sheets access, you can optionally provide a Google Sheets API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable the Google Sheets API
4. Create an API key (credentials)
5. In QualityLens Settings, paste your API key in "Google Sheets API Key"

Without an API key, BubLens still works but uses slower public export methods.

## What's Stored Locally

- Your bug data and preferences
- Column mapping templates (to reuse for future files)
- Theme preference (light/dark)
- AI settings (provider and API key)

Everything is in your browser's local storage. No cloud, no sync.

---

**That's it!** Just upload your bugs and get insights. Simple as that.
