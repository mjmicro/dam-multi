FROM node:20-slim

# Install system dependencies for FFmpeg and Sharp
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libvips-dev \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/database ./packages/database
COPY apps/worker/package.json ./apps/worker/
COPY apps/worker/src ./apps/worker/src
COPY apps/worker/tsconfig.json ./apps/worker/

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --force

# Build database package first
RUN pnpm --filter @dam/database run build

# Build worker (compile TypeScript to JS)
RUN pnpm --filter @dam/worker run build

CMD ["node", "apps/worker/dist/index.js"]