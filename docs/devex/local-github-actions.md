# Local GitHub Actions Testing

Run GitHub Actions workflows on your machine — no commit/push required.

## What problem this solves

Before this setup, every workflow change required a `git push` and waiting for GitHub runners
to tell you whether you broke something. Now you can validate the same workflows locally in
seconds with `task actions:test`.

## Prerequisites

| Tool     | Check            | Install                                                                    |
| -------- | ---------------- | -------------------------------------------------------------------------- |
| Docker   | `docker info`    | [docker.com](https://docs.docker.com/get-docker/)                          |
| act      | `act --version`  | macOS: `brew install act` / Linux: [install script](https://nektosact.com) |
| Taskfile | `task --version` | [taskfile.dev](https://taskfile.dev/installation/)                         |

Verify everything is ready:

```bash
task actions:doctor
```

## Quick start

```bash
# 1. See what jobs exist
task actions:list

# 2. Run the default local suite (lint + actionlint + tests)
task actions:test

# 3. Run a single job
task actions:test:job -- tests
```

## Task reference

| Task                         | What it does                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `task actions:doctor`        | Check Docker, act, workflows directory, and secrets file                                     |
| `task actions:list`          | List all workflows and jobs with `act --list`                                                |
| `task actions:test`          | Run the local suite (lint + actionlint + tests) as pull_request                              |
| `task actions:test:pr`       | Same as `actions:test` — pull_request event                                                  |
| `task actions:test:push`     | Same suite, simulating a push to master                                                      |
| `task actions:test:dispatch` | Same suite, simulating a workflow_dispatch                                                   |
| `task actions:test:full`     | Run ALL jobs (requires `.secrets` with real credentials)                                     |
| `task actions:test:job`      | Run one specific job, e.g. `task actions:test:job -- lint`                                   |
| `task actions:test:workflow` | Run a full workflow file, e.g. `task actions:test:workflow -- .github/workflows/netlify.yml` |

## Local suite vs GitHub CI

The local suite (`task actions:test`) runs these jobs:

| Job                | Runs locally | Notes                                                             |
| ------------------ | ------------ | ----------------------------------------------------------------- |
| `lint`             | Yes          | editorconfig, prettier, eslint, tsc                               |
| `actionlint`       | Partially    | Lints workflow files but cannot post results to GitHub Checks API |
| `tests`            | Yes          | Vitest test suite                                                 |
| `push_to_registry` | No           | Excluded — requires `secrets.GITHUB_TOKEN` and pushes to ghcr.io  |
| `build`            | No           | Excluded — requires Netlify secrets and makes real deploy calls   |

The local suite covers the **fast-feedback** jobs — the ones you care about during
development. The Docker push and Netlify deploy are integration-level steps that
only make sense on real GitHub runners.

## Working with secrets

Some jobs (`push_to_registry`, `build`) need secrets that act cannot inject automatically.

1. Copy the example file:

   ```bash
   cp .secrets.example .secrets
   ```

2. Edit `.secrets` and fill in your credentials:

   ```
   GITHUB_TOKEN=ghp_your_token_here
   NETLIFY_AUTH_TOKEN=nf_your_token_here
   NETLIFY_SITE_ID=your-site-id
   ```

3. Run the full suite (includes all jobs):

   ```bash
   task actions:test:full
   ```

**Do not commit `.secrets`** — it is already in `.gitignore`.

## Working with environment variables

If a job reads from `env` or `${{ env.MY_VAR }}`:

```bash
cp .env.act.example .env.act
# Edit .env.act and add your variables
```

A task that uses `.env.act` will pick it up automatically if the file exists.

## Event payloads

Payload files under `.github/act/events/` let you simulate specific GitHub events:

| File                                        | Used by                            |
| ------------------------------------------- | ---------------------------------- |
| `.github/act/events/push.json`              | `task actions:test:push`           |
| `.github/act/events/pull_request.json`      | `act pull_request --eventpath ...` |
| `.github/act/events/workflow_dispatch.json` | `task actions:test:dispatch`       |

You can pass any payload explicitly:

```bash
act pull_request --eventpath .github/act/events/pull_request.json
```

## Known limitations of act

1. **`secrets.GITHUB_TOKEN`** is not auto-generated. You must provide it via `.secrets`.
2. **GitHub Checks API** — actions that post to the Checks API (like `reviewdog/action-actionlint`)
   fail to report results. The linting itself runs, but results only appear in terminal output.
3. **`${{ github.repository_owner }}`** and similar context variables have default values
   in act that may differ from your real repository. Event payloads help override them.
4. **Docker-in-Docker** jobs may need the `catthehacker/ubuntu:full-*` images configured
   in `.actrc` — already set up for this project.
5. **macOS runners** (`macos-latest`, `macos-14`) are **not supported** by act. This project
   only uses `ubuntu-latest` and `ubuntu-22.04`, so this is not an issue.
6. **Secrets in reusable workflows** — act does not pass secrets to reusable workflows
   called from the same repository. Not relevant here (no reusable workflows).
7. **`actions/checkout@v6`** — this version does not exist (latest is v4). The `build` job
   in `netlify.yml:84` references a non-existent action version. This will fail both locally
   and on GitHub. See the feedback section below.

## Differences between act and GitHub-hosted runners

| Aspect             | GitHub-hosted runner        | act (local)                              |
| ------------------ | --------------------------- | ---------------------------------------- |
| OS image           | Fresh VM per job            | Docker container from `.actrc` image     |
| `GITHUB_TOKEN`     | Auto-provisioned            | Must be set manually in `.secrets`       |
| Network            | Internet access, GitHub API | Host network (may need proxy/VPN config) |
| Disk space         | ~14 GB free                 | Whatever Docker has available            |
| `${{ secrets.* }}` | Injected by GitHub          | Read from `--secret-file`                |
| Timeouts           | 6 hours default             | No timeout unless set via `--timeout`    |
| Caching            | `actions/cache` works       | `actions/cache` stores in local volume   |

## Debugging common issues

**`act: command not found`**
→ Install act: `brew install act` (macOS) or use the Linux install script.

**`Cannot connect to the Docker daemon`**
→ Start Docker Desktop or `sudo systemctl start docker`.

**Job hangs on `actions/setup-node` or `pnpm/action-setup`**
→ Make sure `.actrc` uses the `catthehacker/ubuntu:full-*` images. The default `-lite` images
may lack Node.js toolchains.

**Apple Silicon Mac — container exits immediately**
→ The `catthehacker/ubuntu:full-latest` image supports multi-arch. If you still see issues,
try adding `--container-architecture linux/amd64` to your act command.

**`act pull_request` does not match any job**
→ The workflow filters by branch (`branches: [master]`). Use the provided event payloads
to simulate the correct branch context: `--eventpath .github/act/events/pull_request.json`.

**Secrets not being read**
→ Secrets must be in `KEY=VALUE` format, one per line. No quotes, no spaces around `=`.
Use `--secret-file .secrets` (or the task handles it automatically for `actions:test:full`).

**First run is slow**
→ The first `act` run pulls the Docker image (~2 GB). Subsequent runs use the cached image.
Run `docker pull catthehacker/ubuntu:full-latest` ahead of time to warm the cache.
