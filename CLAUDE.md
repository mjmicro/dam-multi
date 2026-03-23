# CLAUDE.md — My DAM Project Rules

## What This Project Is

Digital Asset Management system — monorepo using pnpm workspaces + Turbo.
Users upload images/videos. Files go to MinIO, jobs queue in Redis via BullMQ,
workers process with Sharp (images) and FFmpeg (video), metadata saved in MongoDB.

## Project Structure

- apps/api — Express REST API (port 4000)
- apps/client — React 18 + Vite frontend
- apps/worker — BullMQ media processing worker
- packages/database — shared Mongoose models + TypeScript types

## My Rules (always follow these)

- Always use async/await — never .then() or .catch()
- TypeScript strict mode — never use `any` type
- Every Express route must have try/catch error handling
- Never hardcode secrets — always use process.env
- Never modify .env files directly — ask me first
- React: functional components only, always define prop interfaces
- When I ask about code, read ONLY the files needed — not the whole project
