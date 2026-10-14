---
name: ntusa-release-workflow
description: Manage version control, staging promotion, and automated or manual Vercel Preview releases for the NTUSA official website. Use for this repository when committing changes, merging branches, pushing staging or main, or updating the staging deployment.
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
- After a push, confirm the tracked branch is synchronized.
- A push to `origin/staging` triggers both `.github/workflows/ci.yml` and `.github/workflows/deploy-staging-vercel.yml`. The deployment workflow runs validation, creates a Vercel Preview, applies staging database migrations, and updates the stable staging alias. A local merge into `staging` without a push does not deploy.
- A push to `main` triggers this repository's existing GitHub Actions production deployment workflow; do not additionally run a direct production deployment unless asked.

## Staging deployment

### Automatic deployment (default)

When the user asks to merge and push staging, pushing `origin/staging` is sufficient to start the staging CI/CD pipeline. Do not also run `npm run deploy:staging`, because that would create a duplicate deployment outside GitHub Actions and could race to update the stable alias.

After the push:

1. Confirm local `staging` and `origin/staging` are synchronized.
2. Report that the automatic staging CI/CD workflow was triggered.
3. If the user asks to monitor the deployment or provide its result, follow the GitHub Actions run through completion and report the outcome and URLs.

### Manual deployment fallback

Keep the local deployment command available for an explicitly requested manual staging deployment or redeployment, or when the automatic workflow is unavailable and the user authorizes the fallback. Do not infer permission to run it from an ordinary staging push.

For a manual deployment:

1. Ensure the checked-out branch is `staging`, all changes are committed, and `staging` has been pushed.
2. Run the repository deployment command:

   ```sh
   npm run deploy:staging
   ```

   The script verifies a clean `staging` working tree, fetches and pushes `origin/staging`, applies pending staging database migrations, creates a Vercel Preview, waits for status `Ready`, and moves the stable staging alias. It never deploys with `--prod`.

3. Report the generated immutable Preview URL and the stable staging alias. If the checkout has not been linked to Vercel, instruct the user to run `npx vercel link` first.

The stable alias is the staging acceptance URL. The hash-based Preview URL is an immutable deployment URL and is expected to change every deployment. Preview deployment protection requiring Vercel login is normal.

The Preview environment has `NEXTAUTH_URL` configured for the stable staging alias. Do not change it casually. Google OAuth must use the single fixed callback URI:

```text
https://ntusa-website-staging-ntusa.vercel.app/api/auth/callback/google
```

Changing the alias after each deployment is required; changing the Google OAuth redirect URI is not.
