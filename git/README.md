# Git

## What it is

Git is the distributed version control system nearly all modern software is built with — it tracks every change to a codebase as a chain of commits, lets multiple people work on the same project without overwriting each other, and keeps a complete, searchable history of not just *what* changed but *when* and *why*. Almost every other tool in this repo assumes Git underneath it: GitHub, Vercel, Render, Railway, and Streamlit Community Cloud all deploy by reading a Git repository.

- Website: https://git-scm.com
- Docs: https://git-scm.com/doc
- Reference manual: https://git-scm.com/docs

## Why this tool exists / the problem it solves

Before Git (and other version control systems), tracking changes to code meant manually saving copies of files (`app_v2_final_ACTUALLY_final.js`), or trusting a single shared server that everyone edited directly, with no real history and no safe way to experiment without risking the working copy. Git solves this with a **complete local history** — every developer has the entire project history on their own machine, can branch and experiment freely, and can merge changes back together, with the ability to inspect, compare, or revert to literally any past state of the project at any time.

The reason this README isn't just "how to `git add`/`commit`/`push`" is that most developers stop learning Git at that point and never discover its actual investigative power — the sections and mini project below focus on `git bisect`, a command that turns "which of these 200 commits broke this" from a manual guessing game into an automated binary search.

## Why it matters in the AI era

AI tools can generate a lot of code very quickly, which means a regression can get buried in a commit history fast — a bug introduced three AI-assisted commits ago, discovered a week later, with no memory of which specific change caused it. `git bisect` is exactly the tool for this: it doesn't matter who (or what) wrote the commit that broke something, or how long ago — bisect finds it automatically from a test that distinguishes "working" from "broken," which is precisely the kind of objective check an AI-assisted workflow can lean on instead of manual code review to pinpoint a regression.

## Install

### Windows

```powershell
winget install Git.Git
```

### macOS

```bash
brew install git
```

### Verify

```powershell
git --version
```

## Configure

- **Identity** (required before your first commit anywhere):
  ```powershell
  git config --global user.name "Your Name"
  git config --global user.email "you@example.com"
  ```
- **Default branch name**: modern Git defaults to `main` for new repos; if yours doesn't, set it explicitly with `git config --global init.defaultBranch main`.
- **A real `.gitignore`**: keeps build artifacts, dependencies, and secrets out of your history in the first place — every tool folder in this repo has one at the root for exactly this reason.

## Core use cases

- Tracking every change to a codebase with full, permanent history.
- Branching to work on a feature or fix without touching the main line of work.
- Merging multiple people's changes together, with conflict resolution when two people changed the same lines.
- **Bisecting** — automatically finding the exact commit that introduced a regression (this mini project's focus).
- Reverting, reapplying, or comparing any past state of the project.

## Real-life scenario: automatically finding the exact commit that broke something

This is a genuinely underused Git superpower: instead of reading through commits by eye trying to spot a regression, `git bisect` performs a binary search across your history, automatically narrowing down to the **one specific commit** that introduced a bug — in `O(log n)` steps, even across hundreds of commits.

**What the mini project does:** [mini-project/setup.sh](mini-project/setup.sh) builds a real local Git repository with eight commits, one of which quietly introduces a genuine regression (a broken "optimization" to an `add()` function that only shows up for negative numbers) — the kind of subtle bug that looks harmless in a diff and easily slips past review.

### Step 1 — Build the demo repository

```powershell
cd mini-project
bash setup.sh
cd demo-repo
```

### Step 2 — Confirm HEAD is actually broken

```powershell
python test_calc.py
```

This fails with an `AssertionError` — something in this repo's history broke `add()`, but you don't yet know which commit.

### Step 3 — Look at the history you're searching

```powershell
git log --oneline
```

Eight commits, none of their messages screaming "bug" — a realistic history where the regression isn't obvious from commit messages alone.

### Step 4 — Start a bisect

```powershell
git bisect start
git bisect bad
git bisect good $(git rev-list --max-parents=0 HEAD)
```

This tells Git: the current commit (`HEAD`) is bad, and the very first commit in the repo is known good. Git checks out a commit roughly halfway between them and waits for you to tell it good or bad.

### Step 5 — Let Git automate the rest

Instead of manually testing and marking each halfway point, hand Git the test itself:

```powershell
git bisect run python test_calc.py
```

Git now runs `test_calc.py` at each candidate commit automatically, using its exit code (0 = good, non-zero = bad) to decide which half of history to search next — and prints the **exact commit** that introduced the regression, typically in 3-4 steps instead of checking all 8 commits by hand.

### Step 6 — Confirm and clean up

```powershell
git show <commit-hash-bisect-found>
```

Read the diff — you'll see the exact "optimization" that broke negative-number addition. Then:

```powershell
git bisect reset
```

This returns your working directory to where it was before you started bisecting.

### Step 7 — Try it manually first (optional, for contrast)

Repeat Step 4, but instead of `git bisect run`, at each step Git checks out a candidate commit — run `python test_calc.py` yourself, then tell Git `git bisect good` or `git bisect bad` based on the result, repeating until Git reports the culprit. This is the same algorithm, just without automating the test step — worth doing once to see exactly what `bisect run` was automating for you.

## Common pitfalls

- **Forgetting `git bisect reset`**: leaves your working directory checked out at some arbitrary historical commit ("detached HEAD") instead of back on your branch — always reset when done.
- **A test that isn't actually deterministic**: `git bisect run` trusts your test's exit code completely — a flaky test will send bisect down the wrong path and report the wrong commit.
- **Confusing `git bisect good/bad` order**: `bad` should be the commit where the problem exists (usually `HEAD`), `good` the earliest commit you're sure worked — reversing these gives nonsensical results.
- **Bisecting across a history with genuinely broken intermediate commits** (e.g. a commit that doesn't build at all, unrelated to the bug being searched for): mark those `git bisect skip` instead of good/bad, so bisect routes around them.

## Resources

- `git bisect` documentation: https://git-scm.com/docs/git-bisect
- Pro Git book (free, thorough): https://git-scm.com/book
- Git reference manual: https://git-scm.com/docs
