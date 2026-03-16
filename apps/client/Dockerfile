FROM node:20-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

FROM base AS installer
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=installer /app ./
ARG VITE_API_URL=http://127.0.0.1:4000
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm turbo run build --filter=client

FROM node:20-alpine AS runner
RUN npm install -g pnpm
WORKDIR /app
ENV NODE_ENV=production

ARG VITE_API_URL=http://127.0.0.1:4000
ENV VITE_API_URL=$VITE_API_URL

# Copy built assets and package files
COPY --from=builder /app/apps/client/dist ./dist
COPY --from=builder /app/apps/client/package.json ./package.json

# Install only production dependencies (mostly for dev server if needed)
RUN pnpm install --prod --ignore-scripts

# Serve the built app
EXPOSE 3000
CMD ["pnpm", "run", "preview", "--host", "--port", "3000"]
