---
name: ntusa-release-workflow
description: Manage version control, staging promotion, and Vercel Preview releases for the NTUSA official website. Use for this repository when committing changes, merging branches, pushing staging or main, or updating the staging deployment.
---

# NTUSA Release Workflow

Apply this workflow only to this repository.

## Working changes

- Preserve unrelated dirty or untracked files. Inspect `git status --short --branch` first and stage exact paths only.
- Work on the branch the user names. If no branch is specified, create a focused `feat/` or `fix/` branch from the requested integration branch; do not make feature commits directly on `main`.
- Treat each independently reviewable user-facing change as one commit. Commit after verifying that change, using a Conventional Commit message such as `feat(scope): …`, `fix(scope): …`, `style(scope): …`, or `chore(scope): …`.
- Run `npm test` and `npm run lint` for ordinary frontend changes. Report pre-existing lint warnings separately from new errors. Run `./test.sh` when requested or before a broader release verification.

## Merge and push boundaries

- “Merge to staging” means: fetch `origin/staging`, confirm the source commits and destination state, switch to `staging`, then use a non-fast-forward merge. Do not push unless the user also asks to push.
- “Merge to main” follows the same process with `origin/main`. Do not push main unless explicitly requested.
- Before any merge, fetch the target branch and compare both directions. Stop for direction if remote changes create a conflict or materially alter the release scope.
- Use an explicit merge commit message: `merge: <concise release description>`.
- After a push, confirm the tracked branch is synchronized. A push to `main` triggers this repository's existing GitHub Actions production deployment workflow; do not additionally run a direct Vercel production deployment unless asked.

## Staging Preview on Vercel

When the user asks to “sync to Vercel” after staging:

1. Push `staging` first.
2. Deploy the checked-out staging code as a Vercel Preview, never with `--prod`:

   ```sh
   npx --yes vercel --yes --scope team_uefNFBLSCeLqFdhBzCe4TePo
   ```

3. Inspect the generated deployment and wait for status `Ready`.
4. Move the stable staging alias to that ready deployment:

   ```sh
   npx --yes vercel alias set <preview-url> ntusa-website-staging-ntusa.vercel.app --scope team_uefNFBLSCeLqFdhBzCe4TePo
   ```

The stable alias is the staging acceptance URL. The hash-based Preview URL is an immutable deployment URL and is expected to change every deployment. Preview deployment protection requiring Vercel login is normal.

The Preview environment has `NEXTAUTH_URL` configured for the stable staging alias. Do not change it casually. Google OAuth must use the single fixed callback URI:

```text
https://ntusa-website-staging-ntusa.vercel.app/api/auth/callback/google
```

Changing the alias after each deployment is required; changing the Google OAuth redirect URI is not.
