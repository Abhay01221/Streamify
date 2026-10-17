# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (needed for some native modules)
RUN apk add --no-cache openssl

# Copy manifests first — this layer is cached unless deps change
COPY package*.json ./
RUN npm ci

# Copy source and generate Prisma client for the target platform
COPY . .
RUN npx prisma generate

# Compile main app
RUN npx tsc -p tsconfig.json

# Compile the trusted seed together with its original fixtures.
RUN npx tsc --outDir dist-seed --target ES2020 --module commonjs --esModuleInterop true --skipLibCheck true prisma/seed.ts prisma/originalProblems.ts

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# curl  — used by docker-entrypoint.sh to wait for Piston
# openssl — required by Prisma's query engine on Alpine (musl + OpenSSL 3)
RUN apk add --no-cache curl openssl

# Copy manifests and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder
COPY --from=builder /app/dist        ./dist
COPY --from=builder /app/dist-seed   ./dist-seed

# Copy the Prisma-generated client (includes the correct query-engine binary)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy schema so prisma db push / migrate can run at startup
COPY prisma ./prisma

EXPOSE 5000

COPY docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
RUN chown node:node /app
USER node

CMD ["./docker-entrypoint.sh"]
