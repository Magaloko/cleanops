# CleanOps

**Status:** Portfolio-MVP / Prototype  
**Demo:** https://cleanops-eight.vercel.app  
**Repository:** https://github.com/Magaloko/cleanops

CleanOps is a field-service-management SaaS prototype for cleaning and facility management companies in the German-speaking market.

It demonstrates how operational workflows can be mapped from lead capture and quote management through project planning, mobile task execution, quality control, invoicing and reporting.

## Purpose

CleanOps is built as a portfolio reference for an operations-heavy SaaS system, not as a generic landing page. The project focuses on concrete business processes:

- lead and customer management
- object / site surveys
- quote, contract and project flow
- task planning for field teams
- GPS-based check-in logic
- checklist and photo documentation
- quality control before invoicing
- role-based dashboards for office and field work

## Core Features

- Multi-tenant SaaS structure with company-based data separation
- Operational process flow: Lead → Survey → Quote → Contract → Project → Tasks → Check-in → Quality Control → Invoice
- GPS check-in concept with distance validation
- Configurable requirements per object, e.g. GPS, photos and checklists
- Customer portal concept with read-only access
- Granular role model for admin, manager, dispatcher, supervisor, accountant, worker and customer views
- Supabase/PostgreSQL schema with Row-Level Security approach

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite |
| Routing | React Router |
| Styling | Tailwind CSS |
| Backend / DB | Supabase / PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Deployment | Vercel |
| Icons | Lucide React |

## Local Development

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` or `.env.local` and set the required Supabase values.

Typical local URL for Vite:

```text
http://localhost:5173
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | start local Vite dev server |
| `npm run build` | create production build |
| `npm run preview` | preview production build locally |
| `npm run lint` | run ESLint |

## Portfolio Note

This repository is a portfolio MVP / prototype. It is intended to demonstrate product architecture, workflow design and SaaS implementation patterns for field-service operations.

Before production use, the following areas would need final project-specific validation:

- tenant and permission model
- Supabase RLS policies
- legal / data protection requirements
- invoice and tax logic
- deployment environment and monitoring
- production content and customer-specific workflows
