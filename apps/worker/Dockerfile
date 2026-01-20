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

# Copy package.json and install dependencies
COPY apps/worker/package.json ./
RUN npm install

# Create symbolic link to the database package in node_modules
RUN mkdir -p node_modules/@dam && \
    ln -s ../../packages/database node_modules/@dam/database

# Copy worker source files only (skip node_modules)
COPY apps/worker/src ./src
COPY apps/worker/tsconfig.json ./

# Run in development mode with nodemon for hot reload
CMD ["npm", "run", "dev"]