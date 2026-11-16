# Deployment

How ARGUS gets from a laptop to the public URL, how to check a deploy, and how to roll one back.

**Live site:** https://argus-delta-gules.vercel.app
**Repository:** https://github.com/Maazin2007/ARGUS (public, Apache 2.0)

## What is deployed

ARGUS is a Next.js app with no server code, no database, no accounts and no environment variables. Vercel builds it and serves the pages and scripts. Everything after that runs in the visitor's browser:

- Readings and check-ins are kept in the browser's `localStorage` (`src/lib/storage.ts`, the only file that touches it).
- The app makes no network calls of its own. No health data is ever sent to Vercel or anywhere else. Vercel only sees ordinary page requests, as for any website.
- There are no secrets to manage. Anything in the code is public, which is why ARGUS has no PIN or password (see `plan/PITCH.md`, judge questions).

## The three places it runs

| Where | URL | Built from | Who uses it |
|---|---|---|---|
| Local | http://localhost:3000 | your working copy, `npm run dev` | the person coding |
| Preview | a link Vercel posts on each pull request | the pull request's branch | the reviewer, before merging |
| Production | https://argus-delta-gules.vercel.app | `main` | judges, the demo, everyone |

## The pipeline

```
push a branch ──► open a pull request ──┬─► GitHub Actions CI: npm ci, lint, test, build
                                        └─► Vercel: preview build and link on the PR
                     │
                     ▼ a teammate checks the preview and merges ("Create a merge commit")
                     │
main updated ───────┬─► GitHub Actions CI runs again on main
                    └─► Vercel production build ──► live site updated, usually within 2 minutes
```

### GitHub Actions (`.github/workflows/ci.yml`)

Runs on every pull request to `main`, every push to `main`, and by hand (Actions tab → CI → Run workflow).

1. `npm ci`: installs the exact versions in `package-lock.json`
2. `npm run lint`: ESLint
3. `npm test`: the 153 tests in `tests/`, including the check that `results/` matches the status engine
4. `npm run build`: the same production build Vercel runs

It uses Node.js 22 on Ubuntu. A red cross on the pull request means one of these failed; open "Details" to see which.

### Vercel

- **Project:** `argus`, under Maazin's Vercel account (`maazin2007s-projects`), connected to the GitHub repository through the Vercel GitHub app.
- **Settings:** the Next.js defaults. There is no `vercel.json`. Build command `npm run build`, output from Next.js. The production branch is `main`.
- **Previews:** every pull request gets its own build and link, posted as a comment by the Vercel bot. The "Vercel" check on the pull request shows whether it built.
- **HTTPS:** Vercel serves the site over HTTPS only (HSTS header set by Vercel).
- **Environment variables:** none.

Only the Vercel account owner can change project settings, see build logs in the dashboard, or roll back. Anyone with write access to the repository can trigger a deploy by merging to `main`.

### `next.config.ts`

| Option | Why |
|---|---|
| `cacheComponents: true`, `partialPrefetching: true` | Next.js 16 rendering and prefetching. They are why `usePathname` and `useSearchParams` must sit inside `<Suspense>` |
| `turbopack.rules` for `*.css` | Lets Tailwind 4 run under Turbopack |
| `allowedDevOrigins: ["127.0.0.1"]` | Dev mode only: lets the app work when opened at 127.0.0.1 as well as localhost |

## Releasing a change

1. Run `npm run lint && npm test && npm run build` locally.
2. Open a pull request using the template (`.github/pull_request_template.md`).
3. Wait for both checks to pass: **build** (GitHub Actions) and **Vercel**.
4. A teammate opens the Vercel preview link and clicks through what changed (`plan/SCREEN_TESTS.md` for screens).
5. Merge with **"Create a merge commit"**. Never squash or rebase: `plan/EVALUATION.md` cites commit hashes as evidence of when predictions were committed, and squashing would change them.
6. Check production (next section).

## Checking a deploy

After a merge, within a few minutes:

1. Actions tab: the CI run for the merge commit on `main` is green.
2. The commit on GitHub shows the Vercel status "Deployment has completed".
3. Every route answers:

   ```
   for p in / /check-in /alerts /handover /emergency /indicator/heartRate; do
     printf "%s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://argus-delta-gules.vercel.app$p)"
   done
   ```

   Each should print `200`.
4. In a private window, open the live site and walk `plan/SCREEN_TESTS.md`, section 8 (the demo path).

## Rolling back

Pick the first one that works:

1. **Vercel dashboard** (account owner): Deployments → choose the last good production deployment → "Promote to Production" (or Instant Rollback). This takes seconds and changes no code.
2. **Revert in git:** `git revert -m 1 <merge commit>` on a branch, open a pull request, merge it. This keeps the history honest.
3. **Last resort for a live demo:** run a known-good tag locally:

   ```
   git checkout pitch-fallback
   npm ci && npm run build && npm start
   ```

   Then open http://localhost:3000. It needs no internet once built.

## Tags

| Tag | Commit | Meaning |
|---|---|---|
| `pitch-fallback` | `49fc778` (merge of PR #27) | The build kept as a fallback for the live pitch |
| `submission` | to be created | The exact build submitted to Space Apps; create it on the final merge commit |

To create the submission tag after the last merge:

```
git checkout main && git pull
git tag -a submission -m "NASA Space Apps 2026 submission"
git push origin submission
```

## Running it on board (no internet)

The app needs no server after it is built, so it can run on a ship's own computer:

```
npm ci
npm run build
npm start        # serves on http://localhost:3000
```

Once a page has loaded, every screen, check-in and device import works offline (`plan/SCREEN_TESTS.md`, section 9).

## When a build fails

| Symptom | Cause and fix |
|---|---|
| `localStorage is not defined` during the build | Pages are prerendered on the build machine, which has no browser. Only `src/lib/storage.ts` may touch `localStorage`, and it returns early when `typeof window === "undefined"` |
| Build error about `usePathname` or `useSearchParams` needing a Suspense boundary | Wrap the component that calls them in `<Suspense>` (see `src/components/AppShell.tsx`) |
| `tests/evaluate.test.ts` fails | A rule or scenario changed. Run `npm run evaluate` and commit the new `results/` files, and say why in `plan/EVALUATION.md` |
| A data test fails on a source | A medical number has no source or demo label. Add it to `plan/SOURCES.md` or label it |
| `AGENTS.md` shows as changed after `npm run dev` | `next dev` rewrites it. Commit it with your work |
| Vercel check fails but CI passes | Open the Vercel link on the pull request for the build log; ask the account owner if it is a settings problem |

## Known gaps

- `main` is not protected on GitHub, so someone with write access could push straight to it and skip CI. Turning on "Require a pull request" and "Require status checks: build" in Settings → Branches closes this.
- There is no custom domain; the site uses the Vercel address.
- There is no uptime monitoring. Check the site by hand before judging.
