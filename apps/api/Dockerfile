FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package.json and install dependencies
COPY apps/api/package.json ./
RUN npm install

# Create symbolic link to the database package in node_modules
RUN mkdir -p node_modules/@dam && \
    ln -s ../../packages/database node_modules/@dam/database

# Copy API source files only (skip node_modules)
COPY apps/api/src ./src
COPY apps/api/tsconfig.json ./

# Expose port
EXPOSE 4000

# Run in development mode with nodemon for hot reload
CMD ["npm", "run", "dev"]