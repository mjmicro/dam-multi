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

COPY package*.json ./
COPY apps/worker/ ./apps/worker
COPY packages/database ./packages/database

# Install dependencies with workspaces from root
RUN npm install

CMD ["npm", "-w", "worker", "run", "dev"]