# VibeCheck 🧠

> AI-powered team health monitoring for Slack — detects burnout, engagement drops, and resignation risk before they become problems.

---

## What it does

VibeCheck silently monitors Slack communication patterns and surfaces early warning signals to managers — without reading message content. It tracks *when* and *how often* people communicate, not *what* they say.

**Detected patterns:**
- 🔥 **Burnout** — chronic late-night messaging (10pm–6am)
- 📉 **Engagement drop** — sudden 50%+ reduction in activity
- 🤐 **Silent tension** — stopped collaborating with specific teammates
- ⏱️ **Response time degradation** — replies taking 2–3× longer than baseline
- 📅 **Meeting overload** — excessive back-to-back meetings correlating with low Slack activity
- 🔮 **Resignation risk** — 30-day predictive model combining all signals

---

## Demo

### Commands

| Command | What it does |
|---------|-------------|
| `/vibecheck` | Your personal health report |
| `/vibecheck @user` | Health report for a specific teammate |
| `/vibecheck team` | Full team dashboard in Slack |
| `/vibecheck dashboard` | Creates a live Canvas dashboard |
| `/vibecheck-alert` | Check your active alerts |

### Screenshots

**Individual health report:**
- Health score out of 100
- 7-day message activity
- Late-night pattern detection
- Active alerts with severity levels

**Team dashboard:**
- Visual health distribution (Healthy / Monitor / At Risk / Critical)
- AI-powered predictive alerts with confidence scores
- Intervention buttons for managers

---

## Architecture

![Architecture](docs/architecture.png)

Or

```
Slack Workspace
      │
      ▼
VibeCheck Bot (Slack Bolt, Socket Mode, Node.js)
      │
      ├── Pattern Analyzer ──────────────────────┐
      │   (burnout, engagement, tension, timing)  │
      │                                           │
      ├── Prediction Engine                       ▼
      │   (30-day resignation risk model)    PostgreSQL
      │                                           ▲
      ├── Dashboard Builder                       │
      │   (Slack blocks + Canvas API)             │
      │                                           │
      └── Google Calendar MCP ───────────────────┘
          (meeting overload detection)
```

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Bot framework | Slack Bolt (TypeScript) |
| Runtime | Node.js 18+ |
| Database | PostgreSQL 18 |
| Calendar | Google Calendar API (OAuth2) |
| Pattern detection | Custom SQL analytics |
| Predictions | Statistical 30-day model |
| Scheduling | Node.js `setInterval` |

---

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Slack workspace (Pro plan recommended)
- Google Cloud project with Calendar API enabled

### 1. Clone and install

```bash
git clone https://github.com/yourusername/vibecheck
cd vibecheck
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_TOKEN=xapp-...
PORT=3000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/vibecheck
```

### 3. Set up database

```bash
psql -U postgres -c "CREATE DATABASE vibecheck;"
psql -U postgres -d vibecheck -f src/database/schema.sql
```

### 4. Set up Slack app

Go to [api.slack.com/apps](https://api.slack.com/apps) and configure:

**Bot Token Scopes:**
- `canvases:read`, `canvases:write`
- `channels:history`, `channels:read`
- `chat:write`, `commands`
- `reactions:read`, `search:read.public`
- `users:read`

**Slash Commands:**
- `/vibecheck`
- `/vibecheck-alert`

**Enable Socket Mode** and generate an App-Level Token with `connections:write`.

### 5. Configure Google Calendar (optional)

1. Create a project at [console.cloud.google.com](https://console.cloud.google.com)
2. Enable the Google Calendar API
3. Create OAuth 2.0 credentials (Desktop app)
4. Save as `google-credentials.json` in project root
5. Run once to authenticate:
   ```bash
   npx ts-node -e "(async () => { const m = await import('./src/services/mcpCalendar'); await m.getUserMeetingStats(); })()"
   ```

> **Note:** Without Google Calendar credentials, the app uses mock meeting data for demo purposes. All other features work fully.

### 6. Seed demo data (optional)

```bash
npx ts-node src/scripts/seedDemoData.ts
```

This creates 8 realistic users with varied patterns — perfect for demos.

### 7. Run

```bash
npm run dev
```

---

## How it works

### Privacy-first design

VibeCheck **never reads message content**. It only stores:
- Timestamp of when a message was sent
- Which channel (not the message itself)
- Whether it was a thread reply
- Reaction counts (not who reacted)

This means zero exposure of sensitive conversations.

### Pattern detection

Each pattern is detected independently:

**Burnout detection** — counts messages sent between 10pm–6am over 7 days. If a user sends 15+ late-night messages in a week or works late 4+ nights, an alert is triggered.

**Engagement drop** — compares current week message count to previous week. A 50%+ drop triggers a medium alert; 75%+ triggers high.

**Silent tension** — identifies teammates who previously collaborated in the same threads but have stopped doing so in the last 7 days.

**Response time degradation** — calculates average time between consecutive messages per user per channel, comparing current week to 30-day baseline.

**Resignation risk prediction** — combines all signals with a weighted scoring model. A score ≥50 generates a predictive alert with confidence percentage.

### Health score

Each user receives a 0–100 health score calculated by deducting points for active alerts:

| Alert severity | Points deducted |
|---------------|----------------|
| Critical | 30 |
| High | 20 |
| Medium | 10 |
| Low | 5 |

---

## MCP Integration

**Google Calendar Integration:**
VibeCheck uses the Model Context Protocol (MCP) to connect with Google Calendar. In demo mode, realistic mock data is used per user based on their role and workload patterns. In production, it integrates with the real Calendar API to detect meeting overload.

To switch from mock to real calendar data:
1. Complete the Google Calendar setup above
2. In `src/services/patternAnalyzer.ts`, change the import from `mockCalendar` to `mcpCalendar`

---

## Project structure

```
src/
├── index.ts                 # Main app entry point
├── database/
│   ├── client.ts            # PostgreSQL connection pool
│   ├── queries.ts           # Database query functions
│   └── schema.sql           # Database schema
├── services/
│   ├── patternAnalyzer.ts   # Core pattern detection
│   ├── prediction.ts        # Resignation risk model
│   ├── dashboard.ts         # Slack block builders
│   ├── canvasBuilder.ts     # Canvas API integration
│   ├── managerAlerts.ts     # Scheduled alert system
│   ├── mcpCalendar.ts       # Google Calendar MCP
│   ├── mockCalendar.ts      # Mock calendar data
│   └── rts.ts               # Real-time search
└── scripts/
    └── seedDemoData.ts      # Demo data generator
```

---

## What makes this different

Most productivity tools track output. VibeCheck tracks **wellbeing signals** — the subtle behavioral shifts that precede burnout and attrition by weeks.

| Typical HR tools | VibeCheck |
|-----------------|-----------|
| Surveys (lagging indicator) | Behavioral patterns (leading indicator) |
| Reads message content | Metadata only — privacy preserved |
| Manual check-ins | Automated continuous monitoring |
| Reactive | Predictive (30-day model) |
| Generic alerts | Role-specific context |

---

## License

MIT