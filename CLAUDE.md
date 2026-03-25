# CLAUDE.md — My DAM Project Rules

## What This Project Is

Digital Asset Management system — monorepo using pnpm workspaces + Turborepo.
Users upload images/videos. Files go to MinIO, jobs queue in Redis via BullMQ,
workers process with Sharp (images) and FFmpeg (video), metadata saved in MongoDB.

## Stack

- Node 20, TypeScript 5, ESM throughout
- Testing: Vitest (NOT Jest)
- Linting: ESLint flat config (`eslint.config.js`) at monorepo root
- Package names: `@dam/api`, `@dam/worker`, `@dam/client`

## Project Structure

- `apps/api` — Express REST API (port 4000)
- `apps/client` — React 18 + Vite frontend
- `apps/worker` — BullMQ media processing worker
- `packages/database` — Mongoose models + shared TypeScript types

## My Rules (always follow these)

### General

- Always use async/await — never `.then()` or `.catch()`
- TypeScript strict mode — never use `any`, use `unknown` and narrow
- Every Express route must have try/catch error handling
- Never hardcode secrets — always use `process.env`
- Never modify .env files directly — ask me first
- Always use Zod for input validation in the API; infer types with `z.infer<>`
- Async errors in services use `Result<T, E>` pattern — not thrown exceptions
- When I ask about code, read ONLY the files needed — not the whole project

### Types

- Never define types/interfaces/enums inline inside component or logic files
- Feature-specific types → co-located `types.ts` next to that module
- Shared types → `packages/database/src/types/`
- Never leave duplicate type definitions

### Constants

- Never hardcode magic strings, numbers, or config values in logic files
- Environment/config values → `config.ts`
- App-wide constants → `constants/index.ts`
- Feature-specific constants → co-located `constants.ts`
- UI constants → `constants/ui.ts`

### React

- Functional components only — always define prop interfaces
- Never define prop types inline — put them in a `types.ts`

### CORS & Networking

- All Express apps must include CORS middleware with these headers:
  ```ts
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Private-Network', 'true');
  ```
- Always handle OPTIONS preflight — return 200
- Use `127.0.0.1` instead of `localhost` in internal service URLs

### Status Values

- Always normalize status strings with `.toUpperCase()` before comparison

## Never Do

- Never run `docker compose down -v` — it deletes all data volumes
- Never introduce `drizzle-orm`, `drizzle-kit`, Prisma, or any ORM other than Mongoose
- Never install packages without checking if one already exists
- Never bypass Husky with `--no-verify`

## Tests

- Unit tests co-located: `foo.ts` → `foo.test.ts` in same directory
- Integration tests → `tests/integration/` per app
- Run tests with Vitest, never Jest

## File Hygiene

- Delete any file not imported or referenced anywhere
- No unused exports — if nothing consumes it, remove it
- Do not create `types.ts` or `constants.ts` unless they have at least one definition

## Commits

- Follow Conventional Commits: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `revert`
- Subject must be lowercase and under 100 characters
