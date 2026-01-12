# --- STAGE 1: Base & Dependencies ---
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace configuration and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy the shared database package and API package.json
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/

# Install dependencies
RUN pnpm install --force

# --- STAGE 2: Builder ---
FROM base AS builder
WORKDIR /app

# Copy source code
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Build the database package first so it can be consumed by the API build
RUN pnpm --filter @dam/database run build

# Build the API (TypeScript) in the builder stage so runner gets `dist`
RUN pnpm --filter @dam/api run build

# --- STAGE 3: Runner ---
FROM base AS runner
WORKDIR /app

# Create a non-root user for security
RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nodejs
# Copy built assets and production dependencies (as root so chown works)
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/dist ./apps/api/node_modules/@dam/database
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Drop privileges to the non-root user for runtime
USER nodejs

# ENV NODE_ENV=production
EXPOSE 4000

# Start the application
CMD ["node", "apps/api/dist/index.js"]