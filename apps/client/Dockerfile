FROM node:20-alpine

ARG VITE_API_URL=http://localhost:4001

WORKDIR /app

# Copy ALL root monorepo files
COPY . .

# Install dependencies with workspaces from root
RUN npm install

# Set environment variable for API URL
ENV VITE_API_URL=$VITE_API_URL

# Expose port
EXPOSE 3000

# Run using npx from root node_modules
CMD ["npx", "vite", "--host", "--port", "3000"]
