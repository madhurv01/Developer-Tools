# GitHub

## What it is

GitHub is the platform layer built on top of Git: hosting for repositories, **Pull Requests** for proposing and reviewing changes, **Actions** for running automated workflows (tests, builds, deploys) directly against your repository, and a real command-line tool (`gh`) for driving all of it without leaving the terminal. Where Git tracks history on your own machine, GitHub is where teams actually collaborate on top of that history — reviewing each other's changes, gating what merges to `main`, and automating what happens on every push.

- Website: https://github.com
- Docs: https://docs.github.com
- GitHub CLI: https://cli.github.com
- Actions docs: https://docs.github.com/actions

## Why this tool exists / the problem it solves

Git alone gives you history and branching, but says nothing about *process* — how a team actually agrees a change is ready to merge, or verifies it doesn't break anything before it does. Historically, "does this change actually work" meant someone manually running tests locally (or, worse, not running them at all) before merging, with no shared, enforced record that it happened. GitHub's Pull Requests and Actions solve this together: a PR is the place changes get proposed and reviewed, and an Actions workflow runs automatically against every push to that PR, posting a pass/fail status directly on it — so "did the tests pass" becomes a visible, enforced fact instead of something someone claims happened.

## Why it matters in the AI era

AI tools make it fast to generate a change; GitHub Actions is what verifies that change automatically before it ever reaches production, regardless of who (or what) wrote it. A PR with a red CI check is a hard, objective signal — not a matter of trusting that an AI-assisted change was reviewed carefully enough by eye. As AI-generated commits become a larger share of a team's changes, automated checks on every PR matter more, not less, because they're the one part of the review process that can't be rushed or skipped under time pressure.

## Install

### GitHub CLI (`gh`) — what makes this mini project's PR workflow possible from the terminal

```powershell
winget install GitHub.cli
```

Verify:

```powershell
gh --version
```

Authenticate:

```powershell
gh auth login
```

## Configure

- **`.github/workflows/*.yml`** (included in this mini project): any YAML file here defines a GitHub Actions workflow — this mini project's [mini-project/.github/workflows/ci.yml](mini-project/.github/workflows/ci.yml) runs on every push and every pull request, checking out the code and running the test suite.
- **Branch protection** (a real setting, not included in this mini project since it requires a live GitHub repo): **Settings → Branches → Add rule** lets you *require* a passing CI check before a PR can be merged at all — turning "CI failed" from a suggestion into an actual block, worth knowing about even though this mini project's demonstration works without it.
- **`gh` as the default authenticator for git operations**: once logged in, `gh` can also handle `git push`/`pull` authentication for you — convenient, though this mini project focuses on its PR- and Actions-specific commands.

## Core use cases

- Hosting a Git repository with a real collaboration workflow (Pull Requests) on top of it.
- Running automated checks (tests, linting, builds) on every push via Actions — this mini project's focus.
- Gating merges behind passing checks and required reviews.
- Managing issues, releases, and repository settings from the terminal via `gh`, without a browser.
- Automating deployments — most of this repo's deployment platforms (Vercel, Render, Railway, Streamlit Community Cloud) trigger directly off a GitHub push.

## Real-life scenario: a broken change gets caught by CI before it can merge

This is the actual, everyday value of GitHub Actions combined with Pull Requests: open a PR with a real bug, watch CI catch it automatically and block the merge, fix it, and watch the same PR turn green — entirely from the terminal via `gh`.

**What the mini project does:** [mini-project/add.js](mini-project/add.js) is a tiny function with a test suite ([mini-project/add.test.js](mini-project/add.test.js)) using Node's built-in test runner (zero npm dependencies), and [mini-project/.github/workflows/ci.yml](mini-project/.github/workflows/ci.yml) runs that suite automatically on every push and PR.

### Step 1 — Create a real GitHub repo and push this project

```powershell
cd mini-project
git init
git add -A
git commit -m "Initial commit"
gh repo create my-ci-demo --public --source=. --push
```

`gh repo create` creates the repo on GitHub *and* pushes your local commit to it in one step.

### Step 2 — Confirm CI runs on its own

```powershell
gh run list
```

You'll see the workflow already ran automatically against your first push — no manual trigger needed, because `on: push` in `ci.yml` fires on every push to any branch.

### Step 3 — Create a branch with a real, deliberate bug

```powershell
git checkout -b break-add
```

Edit `add.js` and change `return a + b;` to `return a - b;` — a real, plausible mistake (a bad merge, a copy-paste error). Commit and push:

```powershell
git commit -am "Refactor add()"
git push -u origin break-add
```

### Step 4 — Open a Pull Request from the terminal

```powershell
gh pr create --title "Refactor add()" --body "Small cleanup" --base main
```

`gh` opens a real PR on GitHub without ever touching a browser.

### Step 5 — Watch CI actually catch it

```powershell
gh pr checks --watch
```

This streams the live status of the PR's checks — watch it turn red. The bug you introduced in Step 3 is now a visible, enforced failure on the PR itself, not something a reviewer has to notice by reading the diff.

### Step 6 — Fix it and watch the same PR turn green

```powershell
git checkout add.js
git commit -am "Revert accidental change"
git push
gh pr checks --watch
```

Same PR, same branch, new commit — CI re-runs automatically on the new push and passes this time.

### Step 7 — Merge it

```powershell
gh pr merge --squash
```

The change is now on `main`, with a permanent, visible record that it passed CI before merging.

## Common pitfalls

- **Forgetting workflows only run on pushed commits**: local, uncommitted, or unpushed changes never trigger Actions — CI only ever sees what's actually on GitHub.
- **Not gating merges on CI status**: without branch protection requiring the check, a red CI status is only a *visual* warning — someone can still merge anyway unless the rule is explicitly turned on.
- **A workflow file with a YAML syntax error**: Actions fails silently-ish (shows as a workflow error, not a test failure) — validate YAML indentation carefully, it's the most common first-time mistake.
- **Expecting `gh pr checks` to wait forever**: `--watch` polls until checks complete or fail; if a workflow is stuck, you'll need to check the Actions tab on GitHub directly.

## Resources

- GitHub Actions docs: https://docs.github.com/actions
- GitHub CLI manual: https://cli.github.com/manual
- Workflow syntax reference: https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- Branch protection rules: https://docs.github.com/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
