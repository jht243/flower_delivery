# Trip Planner & Organizer - ChatGPT MCP Connector

A Model Context Protocol (MCP) server that provides an interactive trip planner widget for ChatGPT. Keep all your travel reservations — flights, hotels, trains, and ground transport — organized in one place.

**[Privacy Policy](PRIVACY.md)** | **[OpenAI Apps SDK](https://developers.openai.com/apps-sdk)**

## Features

- ✈️ Organize flights, hotels, trains, and ground transport in one itinerary
- �️ Support for round-trip, one-way, and multi-city itineraries
- 📊 Booking status checklist with progress tracking per category
- 🤖 AI-powered trip description parsing (describe your trip in plain English)
- 📅 Day-by-day itinerary view
- 💾 Save and manage multiple trips
- 🖨️ Print-friendly output

## Trip Types

- **Round Trip** — Outbound + return flight with hotel and transport
- **One Way** — Single-direction travel with accommodation
- **Multi-City** — Multiple legs with different cities, transport modes, and hotels per stop

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
pnpm install
```

### Build the Widget

```bash
pnpm run build
```

### Run Locally

```bash
pnpm start
```

Server runs on `http://localhost:8000`. **Note:** HTTP endpoints are for local development only.

### Deploy to Render.com

1. Push this repo to GitHub
2. Connect to Render.com
3. Create new Web Service from this repo
4. Render will auto-detect `render.yaml` and deploy

## How to Use in ChatGPT

1. Open ChatGPT in **Developer Mode**
2. Add MCP Connector with your deployed HTTPS URL (e.g. `https://trip-planner-xxxx.onrender.com`)
3. Say: **"Help me organize my trip"** or **"Plan a round trip from Boston to Paris"**
4. The interactive widget appears!

### Example Prompts

- "Help me organize my upcoming trip"
- "Plan a round trip from NYC to London for 2 weeks"
- "I'm flying from Boston to Paris on June 11, then to Geneva, then back"
- "Create an itinerary for my business trip to Tokyo"
- "Track my multi-city Europe trip"

## Tech Stack

- **MCP SDK** - Model Context Protocol for ChatGPT integration
- **Node.js + TypeScript** - Server runtime
- **Server-Sent Events (SSE)** - Real-time communication
- **React** - Widget UI components
- **Lucide Icons** - Beautiful icons

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
OPENAI_API_KEY=your_openai_key    # For AI-powered trip parsing
BUTTONDOWN_API_KEY=your_api_key   # For email subscriptions
ANALYTICS_PASSWORD=your_password  # For /analytics dashboard
```

## Privacy & Data Use

See the full **[Privacy Policy](PRIVACY.md)** for complete details.

- **What we collect:** When the widget runs inside ChatGPT, our server receives location (city/region/country), locale, device/browser fingerprint, inferred trip query, and log timestamps via the MCP `_meta` object.
- **How we use it:** These fields feed the `/analytics` dashboard only. We do not sell, rent, or share this data.
- **Server log retention:** Analytics logs are stored for **30 days** in the `/logs` directory and then automatically rotated and deleted.
- **Local trip data:** Your trip details are cached in browser `localStorage` and persist indefinitely — data is only removed when you manually delete a saved trip or use the "Reset" button.
- **Deletion requests:** Email **support@layer3labs.io** with the approximate UTC date/time of your session. We will delete associated server logs within 7 business days.

## Monitoring & Alerts

- Visit `/analytics` (Basic Auth protected) to review the live dashboard.
- Automated alerts trigger for:
  - **Tool failures**: >5 per day (critical)
  - **Parameter parse errors**: >3 per week (warning)
  - **Empty results**: >20% of calls (warning)
  - **Widget crashes**: Any occurrence (critical)
  - **Buttondown failures**: >10% failure rate (warning)

## Security

- **Production (HTTPS required)**: The OpenAI Apps SDK requires HTTPS end-to-end. Render.com provides HTTPS by default for all `env: node` web services — no extra configuration needed. All external API calls and CSP `connect_domains` in the codebase use `https://`.
- **Local development only**: `http://localhost:8000` is strictly for local testing and will **not** work with the ChatGPT MCP connector, which requires HTTPS.
- Widget runs in a sandboxed iframe with strict CSP

## Support

For questions, bug reports, or support:
- **Email**: support@layer3labs.io

**Note:** GitHub issues are not monitored for support requests. Please use email for all inquiries.

## License

MIT
