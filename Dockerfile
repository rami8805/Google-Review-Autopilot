# Multi-stage production Dockerfile for Google Review Autopilot
# Target platform: Google Cloud Run (linux/amd64, Node.js 22)

# --- Stage 1: Builder ---
FROM node:22-slim AS builder

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for TypeScript & Vite build)
RUN npm ci --legacy-peer-deps || npm install

# Copy application source code and configs
COPY . .

# Build Vite frontend bundle into /app/dist
RUN npm run build

# --- Stage 2: Production Runtime ---
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy manifests and install production-only dependencies
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --legacy-peer-deps || npm install --omit=dev

# Copy compiled frontend and application backend files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/firebase-applet-config.json ./

# Expose HTTP port 3000
EXPOSE 3000

# Run server with Node.js
CMD ["node", "server.ts"]
