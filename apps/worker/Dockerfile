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

# Copy ALL root monorepo files
COPY . .

# Install dependencies with workspaces from root
RUN npm install

# For Docker Swarm, run directly with ts-node (no watch mode needed)
CMD ["npx", "ts-node", "apps/worker/src/index.ts"]