# Books Inventory Ops

Production-oriented internal inventory ingestion and search system for a books business.

## Architecture

- `apps/frontend`: Next.js App Router, TypeScript, TailwindCSS, deployable to Vercel.
- `apps/api`: Express API, JWT auth, search, exports, uploads, publisher management.
- `apps/worker`: independent Node.js Gmail polling worker for Nestify VPS/cloud hosting.
- `packages/db`: Prisma schema and MySQL migration.
- `packages/ingestion`: reusable Excel/CSV parser with dynamic column mapping.

Runtime flow:

```text
Frontend on Vercel -> Express API on Nestify -> MySQL on Nestify
                                  ^
                                  |
                       Worker on Nestify polls Gmail
```

## Features

- Secure admin email/password login with JWT sessions.
- Gmail API polling every 5 minutes for unread attachment emails.
- Supports `.xlsx`, `.xls`, and `.csv` inventory files.
- Dynamic column mapping for ISBN, stock, title, price, and author fields.
- Malformed rows are logged without crashing the import.
- New publisher file atomically replaces previous inventory for that publisher.
- Fast ISBN/title search, bulk query, filters, pagination, and exports.
- Upload logs and failed-row inspection.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment files:

```bash
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env.local
cp apps/api/.env.example apps/api/.env
cp apps/worker/.env.example apps/worker/.env
```

3. Set `DATABASE_URL`, `JWT_SECRET`, and admin bootstrap credentials.

4. Generate Prisma client and apply migration:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Start services:

```bash
npm run dev:api
npm run dev:worker
npm run dev
```

Frontend runs on `http://localhost:3000`, API on `http://localhost:4000`.

## Gmail Setup

Create a Google Cloud OAuth client with Gmail API enabled. The worker needs:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- Gmail scope: `https://www.googleapis.com/auth/gmail.modify`

The worker searches using `GMAIL_QUERY`, defaulting to:

```text
is:unread has:attachment
```

After successful processing, messages are marked read.

## Deployment

See:

- [Vercel frontend guide](docs/vercel.md)
- [Nestify backend and worker guide](docs/nestify.md)
- [GitHub setup guide](docs/github.md)
- [Production checklist](docs/production-checklist.md)

## Database Notes

Indexes are defined for:

- `inventory.isbn`
- `inventory.title`
- `inventory.publisher_id`
- `uploads.status`
- `uploads.uploaded_at`

Inventory replacement is performed inside a Prisma transaction: delete existing rows for the publisher, insert the parsed rows, store failed row logs, and finalize the upload status.

## Sample Files

CSV samples are available in `samples/`. They include normal and malformed rows to verify partial-failure behavior.

