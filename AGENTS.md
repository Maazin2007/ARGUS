<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project rules

- Follow `plan/CODING_STANDARDS.md`. File ownership is in `plan/BACKEND.md`; the app's flow is in `plan/FLOW.md`.
- Never write a medical number or instruction from memory. It comes from an opened source, or it is labelled "demo parameter" / "Demo copy".
- No server code, no database, no new dependency without the team agreeing.
- The team is learning: explain the code you write, and prefer the plain version.
- Log AI use in `plan/AI_USE.md`.
