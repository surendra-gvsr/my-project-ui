# EvidenceIQ

### AI-Powered Claims Evidence Management

## The Problem

Insurance adjusters, claims attorneys, and SIU investigators
spend hours manually compiling evidence from emails, PDFs,
photos, and notes into a defensible claim packet.
This process is slow, error-prone, and inconsistent —
costing firms thousands of hours per year and increasing
exposure in litigation and audits.

## The Solution

EvidenceIQ automates the entire evidence assembly workflow.
Upload your documents, let AI extract and organize the facts,
and export a professional, source-linked evidence pack in
minutes — not hours.

## Impact

- ⏱ Reduces evidence pack assembly time from hours to minutes
- 🎯 Eliminates manual fact extraction errors
- 📋 Produces consistent, audit-ready documentation
- 🔍 Every fact is source-linked — defensible in court
- 💰 Reduces litigation exposure through complete documentation
- 👥 Works for adjusters, attorneys, SIU investigators,
  and compliance teams

## Features

- 📁 Document ingestion — upload PDFs, images, text files
- 🤖 AI processing — extracts facts, dates, people,
  and amounts from every document automatically
- 📅 Evidence timeline — chronological view of all
  extracted facts, each linked back to its source document
- 📄 PDF export — professional evidence pack with cover
  page, table of contents, claim summary, and
  source citations
- 🔒 Security — rate limiting, input validation,
  protected routes, no sensitive data leakage

## Tech Stack

- Next.js 15 + TypeScript
- shadcn/ui + Tailwind CSS (Nova preset)
- Claude AI API — document intelligence
- @react-pdf/renderer — server-side PDF generation
- Multi-agent architecture via Claude Code

## Live Demo

🌐 https://evidenceiq.vercel.app

Demo credentials:

- Email: adjuster@evidenceiq.com
- Password: demo1234

## Getting Started

```bash
git clone https://github.com/surendra-gvsr/my-project-ui
cd my-project-ui
npm install
cp .env.example .env
# Add your Anthropic API key to .env
npm run dev
```

## Demo Files

Sample files are available to test the AI processing pipeline:

- [`/demo/sample-claim-notes.txt`](/demo/sample-claim-notes.txt) — Adjuster notes for a vehicle accident claim
- [`/demo/sample-medical-report.txt`](/demo/sample-medical-report.txt) — Medical report with diagnosis, treatment, and costs
- [`/demo/sample-witness-statement.txt`](/demo/sample-witness-statement.txt) — Witness statement with timeline and observations

Upload any of these to a claim workspace to see EvidenceIQ extract facts, dates, people, and amounts automatically.

## Architecture

Built using a multi-agent system in Claude Code:

- Orchestrator — delegates tasks to specialist agents
- @backend-agent — API routes, AI processing, PDF generation
- @frontend-agent — UI components, pages, design system
- @code-reviewer — automated security and bug review
- @verify-app — Playwright end-to-end browser testing

## Security

- Rate limiting on all API routes (5-60 req/min per endpoint)
- Input validation and filename sanitization on all uploads
- Protected routes with authentication middleware
- No sensitive data exposed in client-side code
- MIME type validation on all file uploads

## Who It's For

- Insurance adjusters building settlement packets
- Claims attorneys preparing litigation support
- SIU investigators compiling fraud review evidence
- Compliance teams preparing audit documentation
