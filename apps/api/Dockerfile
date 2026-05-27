FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/ingestion/package.json packages/ingestion/package.json
RUN npm install

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY . .
RUN npm run prisma:generate
RUN npm run build -w @books/db
RUN npm run build -w @books/ingestion
RUN npm run build -w @books/api

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/db/dist packages/db/dist
COPY --from=build /app/packages/db/prisma packages/db/prisma
COPY --from=build /app/packages/ingestion/dist packages/ingestion/dist
COPY --from=build /app/package.json package.json
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/packages/db/package.json packages/db/package.json
COPY --from=build /app/packages/ingestion/package.json packages/ingestion/package.json
CMD ["node", "apps/api/dist/server.js"]
