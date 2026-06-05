# CI/CD

## Workflows

| Workflow | File | When it runs |
| --- | --- | --- |
| CI | `.github/workflows/ci.yml` | Every pull request and every push to `master` |
| Build image | `.github/workflows/docker.yml` | After CI succeeds on a push to `master`, or manually via **workflow_dispatch** |

### CI jobs

1. **check** — lint, typecheck, unit tests (with V8 coverage thresholds), production build, and `pnpm audit`.
2. **e2e** — Playwright Chromium tests against a production `next start` server (runs only after **check** passes).

`pnpm test` runs Vitest with coverage; the build fails if coverage of `lib/` and `hooks/` drops below the thresholds in `vitest.config.mts`. The HTML report is written to `coverage/` (gitignored).

Cancelled runs use a concurrency group per PR or branch so newer commits supersede older ones.

### Container release

The Docker workflow builds a `standalone` Next.js image and pushes to GHCR (`ghcr.io/<owner>/markdown-renderer`). It checks out the same commit SHA that CI validated (`workflow_run.head_sha`).

Manual **Build image** runs skip CI. Use that only for emergency rebuilds.

Homelab hosts should pull `:latest` (or a dated tag from the workflow log) after a successful **Build image** run so production never advances on a failed quality gate.

## Local parity

Use the same toolchain as CI:

- Node.js `>=22` (CI and the Dockerfile use Node 22)
- pnpm `11.5.0`

```bash
pnpm check      # lint, typecheck, unit tests, build, audit
pnpm test:e2e   # full browser suite (install chromium once)
```

## Branch protection

`master` should require these status checks before merge:

- `check`
- `e2e`

Enable them in GitHub after the first successful CI run on `master` (check names must exist before GitHub accepts them):

```bash
gh api \
  --method PUT \
  repos/jmartinn/markdown-renderer/branches/master/protection \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]=check \
  -f required_status_checks[contexts][]=e2e \
  -f enforce_admins=false \
  -F required_pull_request_reviews=null
```

Adjust the repository slug if you fork this project.
