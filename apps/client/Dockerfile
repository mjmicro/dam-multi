FROM node:20-alpine

WORKDIR /app

# Copy package.json and install dependencies
COPY apps/client/package.json ./
RUN npm install

# Copy client source files only (skip node_modules that were just installed)
COPY apps/client/src ./src
COPY apps/client/public ./public
COPY apps/client/index.html ./
COPY apps/client/tsconfig.json ./
COPY apps/client/tsconfig.node.json ./
COPY apps/client/vite.config.ts ./
COPY apps/client/postcss.config.js ./
COPY apps/client/tailwind.config.js ./

# Expose port
EXPOSE 3000

# Run vite in development mode with hot reload
CMD ["npm", "run", "dev"]
