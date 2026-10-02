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

# Copy manifests and install production dependencies
# tsx is a production dependency (see package.json) so TypeScript entrypoints work
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
COPY --from=builder /app/firebase-applet-config.json* ./

# Non-root user for Cloud Run best practices
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs appuser \
  && chown -R appuser:nodejs /app
USER appuser

# Expose HTTP port 3000
EXPOSE 3000

# Healthcheck for Cloud Run / load balancers
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Run server with tsx (production dependency)
CMD ["npx", "tsx", "server.ts"]
