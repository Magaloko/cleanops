# CleanOps

**Field Service Management Platform** for cleaning and facility management companies in the German-speaking market (AT/DE).

CleanOps covers the entire operational lifecycle — from lead capture through quote, contract, and project planning, to mobile task execution with photo documentation, checklists and GPS check-in, all the way to automated invoicing and business intelligence.

## Features

- **15 modules** · 12 workflows · 28+ database tables · Multi-Tenant SaaS
- GPS check-in with Haversine distance validation
- Configurable mandatory fields (GPS, photos, checklists) per object
- Automated invoice generation with double-billing prevention
- Customer portal (read-only, token-based, no login required)
- 8 granular roles with dual-layer security (React Router + RLS)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Routing | React Router v6 |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Deployment | Vercel |
| PDF | html2canvas + jsPDF |
| Charts | Recharts |
| Storage | Supabase Storage |

## Architecture

Multi-tenant by design — every table carries `company_id`. Row-Level Security policies enforce tenant isolation at the database level, making cross-tenant data access technically impossible.

## Process Flow

Lead → Site Survey → Quote → Contract → Project → Tasks → GPS Check-in → Field Execution → Quality Control → Invoice → Payment

## Roles

`super_admin` · `admin` · `manager` · `dispatcher` · `supervisor` · `accountant` · `worker` · `customer`

## Getting Started

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your Supabase credentials.

---

*Confidential — Internal Use Only*
