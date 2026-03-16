FROM node:20-alpine AS base
RUN npm install -g pnpm turbo
RUN apk add --no-cache ffmpeg
WORKDIR /app

FROM base AS installer
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=installer /app ./
# Build all packages at once
RUN pnpm turbo run build



FROM node:20-alpine AS runner
RUN apk add --no-cache ffmpeg
RUN npm install -g pnpm
WORKDIR /app
ENV NODE_ENV=production

# Copy workspace files for pnpm to resolve workspace dependencies
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy all package.json files and dist folders from packages
COPY --from=builder /app/packages ./packages

# Copy the worker app
COPY --from=builder /app/apps/worker/dist ./dist
COPY --from=builder /app/apps/worker/package.json ./package.json

# Install only production dependencies with workspace resolution
RUN pnpm install --prod --ignore-scripts

CMD ["node", "dist/index.js"]