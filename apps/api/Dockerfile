FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy ALL root monorepo files
COPY . .

# Install dependencies with workspaces from root
RUN npm install

# Expose port
EXPOSE 4000

# Run from root using npm workspace syntax
CMD ["npm", "-w", "api", "run", "dev"]