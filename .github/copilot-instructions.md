# DAM Monorepo — Copilot Instructions

## Stack

- pnpm workspaces + Turborepo monorepo
- Node 20, TypeScript 5, ESM throughout
- Apps: `apps/api` (Express), `apps/worker` (BullMQ), `apps/client` (React + Vite)
- Packages: `packages/queue` (@dam/queue), `packages/types` (@dam/types)
- Database: Mongodb(mongoose)
- Queue: BullMQ + Redis
- Storage: MinIO
- Testing: Vitest (NOT Jest)
- Linting: ESLint flat config (`eslint.config.js`) at monorepo root

## Package Naming

- `@dam/api`, `@dam/worker`, `@dam/client`

## Conventions

### General

- All source code lives in `src/` inside each package/app
- Packages export from `src/index.ts`, compiled to `dist/`, `package.json` exports point at `dist/`
- Use Zod for all runtime validation; infer TypeScript types with `z.infer<>`
- Tests are co-located: `foo.ts` → `foo.test.ts` in same directory
- Integration tests live in `tests/integration/` per app
- Never use `any` — use `unknown` and narrow
- Async errors use `Result<T, E>` pattern, not thrown exceptions in services
- Docker: each app has its own multi-stage Dockerfile using `turbo prune --docker`

### Types

- Never define types, interfaces, or enums inline inside component or logic files
- Place types in a dedicated `types.ts` file
- If a type is specific to one feature or module, place it in a co-located `types.ts` next to that module
- If a type is shared across the app, place it in the global `packages/types` package
- Always replace inline definitions with an import from the types file — never leave duplicates

### Constants

- Never hardcode magic strings, magic numbers, or config values inline in logic or component files
- Place constants in the appropriate file based on scope:
  - **Environment/config values** (API URLs, bucket names, ports, feature flags) → `config.ts` or `config/index.ts`
  - **App-wide shared constants** (status values, roles, pagination limits) → `constants/index.ts`
  - **Feature-specific constants** (used only within one module) → co-located `constants.ts` next to that module
  - **UI constants** (z-index, animation durations, breakpoints) → `constants/ui.ts`
- Group related constants with a comment label (e.g. `// API`, `// Storage`, `// Pagination`)
- If a constant belongs in `config.ts` but is currently hardcoded, add a comment: `// TODO: move to .env`
- Always replace the original definition with an import from the new location — no duplicates

### CORS & Networking

- All Express apps must include CORS middleware with the following headers:

```ts
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
res.header('Access-Control-Allow-Private-Network', 'true'); // Required for Chrome on localhost
```

- Always handle `OPTIONS` preflight requests and return `200`
- Use `127.0.0.1` instead of `localhost` in all internal service URLs to avoid Chrome IPv6 resolution issues

### Status Values

- All status strings must be normalized with `.toUpperCase()` before comparison or switch statements
- Never compare raw status strings case-sensitively

## File Hygiene (enforce on every PR)

- Delete any file that is not imported or referenced anywhere in the project
- Delete any file that was only used by removed code
- Do not create `types.ts` or `constants.ts` files unless they contain at least one definition
- No unused exports — if nothing consumes an export, remove it

## What Has Been Removed

- **Drizzle ORM** — fully removed. Do not re-introduce `drizzle-orm`, `drizzle-kit`, or any drizzle config files, schema files, or migration folders. Database access is handled via Prisma only.

## For New Developers

- Run `pnpm install` from the monorepo root — never inside individual apps
- Use `turbo dev` to start all apps in development mode
- Storage uses MinIO — set `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY` in your `.env`
- Queue uses Redis — set `REDIS_URL` in your `.env`
- All hardcoded config values should be treated as temporary — move them to `.env` and load via `config.ts`
- When in doubt about where to place a file, follow the scope rules under Constants and Types above

## Commit Convention

- Commits must follow Conventional Commits format: `type(scope): description`
- Type must be one of: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`
- Subject must be lower-case and under 100 characters
- Husky enforces this on every commit via commitlint — do not bypass with `--no-verify`
