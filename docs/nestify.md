# Nestify Backend and Worker Deployment

## MySQL

1. Create a MySQL database on Nestify.
2. Create a dedicated DB user with access only to this database.
3. Set `DATABASE_URL` in API and worker environments:

```text
mysql://USER:PASSWORD@HOST:3306/books_inventory
```

4. Run migration from the server or CI:

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
```

## Express API

Recommended process command:

```bash
npm install
npm run prisma:generate
npm run build -w @books/db
npm run build -w @books/ingestion
npm run build -w @books/api
npm run start -w @books/api
```

Required environment variables are listed in `apps/api/.env.example`.

Set `CORS_ORIGIN` to the Vercel frontend URL.

## Worker

Run as a separate process:

```bash
npm run build -w @books/worker
npm run start -w @books/worker
```

Use PM2 or systemd so it restarts automatically.

PM2 example:

```bash
pm2 start "npm run start -w @books/api" --name books-api
pm2 start "npm run start -w @books/worker" --name books-worker
pm2 save
```

## Docker

Dockerfiles are included in:

- `apps/api/Dockerfile`
- `apps/worker/Dockerfile`

Build from the repository root:

```bash
docker build -f apps/api/Dockerfile -t books-api .
docker build -f apps/worker/Dockerfile -t books-worker .
```

