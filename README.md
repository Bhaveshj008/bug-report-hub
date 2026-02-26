# BugLens - Bug Report Analytics Dashboard

## What is it?

BugLens is a web tool that helps you analyze bug reports from Excel files. Upload your bug data, and it automatically creates charts and visualizations to show you:

- How many bugs by severity (Critical, High, Medium, Low)
- Which components have the most issues
- Bug distribution across platforms
- Reproducibility patterns
- And more insights at a glance

## Why use it?

Instead of looking at raw Excel data, BugLens shows you the big picture with charts and tables. You can quickly:
- Spot which areas need the most attention
- See trends in bug severity and reproducibility
- Export your analysis to share with your team
- Track bugs by component, platform, and category

## How it works

### Step 1: Upload your Excel file
- Click "Upload" and select your Excel file
- BugLens automatically detects which columns contain severity, component, platform, etc.
- If it can't figure it out, you can manually map the columns

### Step 2: View the analytics
- See interactive charts, KPI cards, and a detailed bug table
- Explore different views: severity, platform, components, reproducibility
- Click on bugs to see full details

### Step 3: Export results
- Generate a PDF report with all your charts
- Download as CSV for further analysis

## Important: No Backend Required

This is a **frontend-only application**. Everything runs in your browser. Your Excel data:
- Never leaves your computer
- Isn't sent to any server
- Gets stored in your browser's local storage (you can clear it anytime)

## Optional: AI Mode

BugLens has an optional AI feature that can help automatically map your Excel columns. This is useful if your column names are unusual.

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

## Supported Excel Format

Your Excel file should have columns like:
- Severity (Critical, High, Medium, Low)
- Component (which part of the app)
- Platform (Web, Android, iOS, etc.)
- Reproducibility (Always, Sometimes, Rarely, etc.)
- Category, JiraId, Summary, etc.

Don't worry if your columns have different names - BugLens will figure it out!

## Tips

- **Dark/Light theme**: Click the theme toggle in the top-right
- **Column mapping**: If auto-detection isn't perfect, use the "Map Columns" modal to fix it
- **Save templates**: BugLens remembers your column mappings for future uploads
- **Clear data**: Go to Settings → Clear all data to reset everything

## What's Stored Locally

- Your bug data and preferences
- Column mapping templates (to reuse for future files)
- Theme preference (light/dark)
- AI settings (provider and API key)

Everything is in your browser's local storage. No cloud, no sync.

---

**That's it!** Just upload your bugs and get insights. Simple as that.
