FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/client ./apps/client

# Install dependencies and build
RUN pnpm install --force
RUN pnpm --filter @dam/client run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve
RUN npm install -g serve

# Copy built app from builder
COPY --from=builder /app/apps/client/dist ./dist

# Set environment variables
# ENV NODE_ENV=production
# ENV VITE_API_URL=http://api:4000

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]
