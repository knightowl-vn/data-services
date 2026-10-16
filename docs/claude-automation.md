# Claude Code automation (issue → PR → review fixes)

`.github/workflows/claude.yml` runs the Claude Code CLI through
[`anthropics/claude-code-action@v1`](https://github.com/anthropics/claude-code-action)
on an ephemeral `ubuntu-24.04-arm` runner, with Claude Code's
[Bash sandbox](https://code.claude.com/docs/en/sandboxing) turned on.

## What it does

| Trigger | Job | Result |
| --- | --- | --- |
| Issue labeled `claude`, or `@claude` in a new issue's body | `implement` | Claude creates a `claude/issue-<n>-…` branch, implements the issue, pushes, and opens a PR that `Closes #<n>`. Progress is shown in a tracking comment on the issue. |
| `@claude …` in an issue comment, PR comment or inline review comment | `implement` | Claude answers, or changes code. On a PR it pushes to the PR branch. On an issue it opens a PR. |
| A review on a PR whose head branch is `claude/…` with **Request changes**, or a review whose body mentions `@claude` | `address-review` | Claude reads the review and its inline comments, applies the fixes, runs the checks, pushes to the PR branch, replies to each comment, and asks the reviewer for a re-review. |

Only users with write access to the repo can trigger Claude (the action checks
this). Bot actors are rejected, and reviews on fork PRs never run.

## Sandbox

The `setup-claude-sandbox` composite action installs `bubblewrap` and `socat`.
It also adds the AppArmor profile that Ubuntu 24.04 needs for bubblewrap and
checks that bubblewrap works. The workflow then passes these Claude Code
settings (`CLAUDE_SANDBOX_SETTINGS` in the workflow):

- `sandbox.enabled` and `failIfUnavailable`: if the sandbox can't start,
  Claude exits instead of running commands without it.
- `allowUnsandboxedCommands: false`: Claude can't retry a command outside the
  sandbox.
- `autoAllowBashIfSandboxed`: commands that stay in the sandbox (tests,
  builds, git) run without approval.
- `network.strictAllowlist` with `allowedDomains`: shell commands can reach
  only GitHub and the npm, PyPI, Go and crates registries. Trim or extend this
  list once the project's language is chosen.
- `filesystem` and `credentials`: writes are limited to the checkout and the
  temp and cache directories. `ANTHROPIC_API_KEY`, the OIDC request token and
  the Actions runtime tokens are removed from the environment of shell
  commands.
- A permission rule denies edits to `.github/workflows/**`.

The settings are inline in the workflow file, not in a repo file. That way a
branch Claude pushes can't loosen its own sandbox: the Claude GitHub App token
has no `workflows` permission.

## One-time setup

1. **Install the Claude GitHub App** on `knightowl-vn/data-services`:
   <https://github.com/apps/claude>. Alternatively, run `/install-github-app`
   in a local `claude` session. The action exchanges an OIDC token for this
   app's token (`id-token: write`). Commits and PRs made with that token
   trigger CI. Ones made with the default `GITHUB_TOKEN` would not.
2. **Add a secret** under *Settings → Secrets and variables → Actions*:
   - `ANTHROPIC_API_KEY` (from <https://console.anthropic.com>), or
   - `CLAUDE_CODE_OAUTH_TOKEN` (from `claude setup-token` with a Pro or Max
     plan). If you use this, swap the commented line in both jobs.
3. **Create the `claude` label** (*Issues → Labels → New label*).
4. Optional: under *Settings → Actions → General*, make sure workflows can run.
   Also consider requiring PR reviews on `main`, so a human always approves
   Claude's PRs before merge.

## Usage

- Open an issue describing the change and add the `claude` label. Claude
  replies with a tracking comment and then a PR link.
- Review the PR. Use **Request changes** with inline comments. Claude pushes
  fixes and replies on each thread. Repeat until you approve.
- For a quick one-off on any issue or PR, comment `@claude <instruction>`.

## Tuning

- Model, turn limits and more go in `claude_args`, e.g. `--max-turns 50` or
  `--model <id>`.
- When build, lint and test commands exist, add them to `CLAUDE.md`. Claude
  runs them before it commits.
