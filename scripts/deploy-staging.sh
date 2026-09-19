#!/usr/bin/env bash

set -euo pipefail

readonly VERCEL_SCOPE="team_uefNFBLSCeLqFdhBzCe4TePo"
readonly STAGING_ALIAS="ntusa-website-staging-ntusa.vercel.app"
readonly EXPECTED_BRANCH="staging"

fail() {
  echo "Error: $*" >&2
  exit 1
}

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$EXPECTED_BRANCH" ]] || fail "Run this command from the ${EXPECTED_BRANCH} branch (currently: ${current_branch:-detached HEAD})."

[[ -z "$(git status --porcelain)" ]] || fail "Commit or stash all working tree changes before deploying."
[[ -f .vercel/project.json ]] || fail "This checkout is not linked to Vercel. Run 'npx vercel link' first."

echo "Checking origin/${EXPECTED_BRANCH}…"
git fetch origin "$EXPECTED_BRANCH"
read -r remote_only local_only <<< "$(git rev-list --left-right --count "origin/${EXPECTED_BRANCH}...${EXPECTED_BRANCH}")"
[[ "$remote_only" == "0" ]] || fail "Local ${EXPECTED_BRANCH} is behind origin/${EXPECTED_BRANCH}; sync it before deploying."

echo "Pushing ${EXPECTED_BRANCH}…"
git push origin "$EXPECTED_BRANCH"

read -r remote_only local_only <<< "$(git rev-list --left-right --count "origin/${EXPECTED_BRANCH}...${EXPECTED_BRANCH}")"
[[ "$remote_only" == "0" && "$local_only" == "0" ]] || fail "Push did not synchronize ${EXPECTED_BRANCH} with origin."

echo "Creating Vercel Preview…"
deployment_url="$(npx --yes vercel deploy --yes --scope "$VERCEL_SCOPE" --no-color)"
[[ "$deployment_url" =~ ^https://[A-Za-z0-9.-]+\.vercel\.app$ ]] || fail "Vercel did not return a valid Preview URL: ${deployment_url}"

echo "Waiting for ${deployment_url} to become Ready…"
npx --yes vercel inspect "$deployment_url" --wait --timeout 10m --scope "$VERCEL_SCOPE" --no-color

echo "Updating ${STAGING_ALIAS}…"
npx --yes vercel alias set "$deployment_url" "$STAGING_ALIAS" --scope "$VERCEL_SCOPE" --no-color

echo
echo "Staging deployment is ready: https://${STAGING_ALIAS}"
