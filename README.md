<div align="center">
  <img width="1000" alt="FleetGuard Banner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# FleetGuard — Compliance & Safety Dashboard

FleetGuard is a dashboard for monitoring fleet compliance and safety. It provides a single-pane view of safety metrics, compliance status, and actionable alerts so operators can quickly identify and remediate issues across vehicles and drivers.

Live AI Studio preview: https://ai.studio/apps/8585742c-00f9-4e0d-9c0d-610a52f1ca82

## Key features
- Fleet-wide compliance overview (inspections, certificates, rules)
- Safety metrics and trends (incidents, near-misses, driving behavior)
- Alerts and notifications for non-compliance or safety events
- Searchable vehicle/driver records and detailed event history
- Extensible UI backed by a Node.js app (easy to customize)

## Tech stack
- Node.js (server / local dev)
- Frontend: (served by the repo app)
- Integrations: AI Studio preview link and configurable API keys via .env.local

(If you want the exact frameworks used in the frontend/backend to be listed here, tell me and I’ll add them.)

## Prerequisites
- Node.js (LTS recommended)
- npm (comes with Node.js)
- A Gemini API key (used by the app; stored in .env.local)

## Quick start — run locally
1. Clone the repo
   ```bash
   git clone https://github.com/29shnick/FleetGuard-Compliance-and-Safety-Dashboard.git
   cd FleetGuard-Compliance-and-Safety-Dashboard