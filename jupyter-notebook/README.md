# Jupyter Notebook

## What it is

Jupyter Notebook is an interactive computing environment where code, its output, visualizations, and prose live together in one document, executed one **cell** at a time instead of top-to-bottom as a single script. You run a cell, see its result immediately (a printed value, a table, an inline chart), then write the next cell based on what you just learned — the entire point is exploring a problem interactively, keeping intermediate results alive in memory as you go, rather than re-running an entire program from scratch for every small change.

- Website: https://jupyter.org
- Docs: https://docs.jupyter.org
- GitHub (open source): https://github.com/jupyter/notebook

## Why this tool exists / the problem it solves

Exploratory work — "what does this dataset actually look like," "does this transformation do what I think it does," "which of these three approaches gives a better result" — doesn't fit a normal script well. A script runs start to finish and throws away all its state; to inspect an intermediate value you either add a `print()` and rerun everything, or reach for a debugger, both of which are slow for the kind of rapid, exploratory back-and-forth that data analysis and prototyping actually need. Jupyter's cell-based model solves this directly: each cell is its own unit of execution against a shared, persistent Python process (the **kernel**), so you can inspect a dataframe, tweak one cell, and re-run just that cell — in seconds, with every other variable still in memory exactly as it was.

The same mechanism that makes this powerful is also the source of Jupyter's most infamous real bug, and this mini project is built specifically to demonstrate it rather than gloss over it: because cells can be run in **any order**, and a variable holds whatever the kernel last set it to — not whatever value the code currently visible on the page implies — a notebook can look internally consistent while actually holding stale, wrong state. Understanding this failure mode (and its real fix, "Restart & Run All") is arguably the single most important practical skill for using Jupyter safely.

## Why it matters in the AI era

Jupyter is still the default environment where most real data science, model evaluation, and prompt/data exploration work happens before it becomes production code — inspecting a dataset an LLM pipeline will run over, comparing outputs across a few different prompts or models side by side, or sanity-checking what a fine-tuning dataset actually contains. It's also the format most ML tutorials, papers, and open-source model repos ship their examples in, so being able to read, run, and reason correctly about someone else's notebook (including spotting a hidden-state bug in it) is a genuinely common real skill.

## Install

```powershell
cd mini-project
pip install -r requirements.txt
```

Verify:

```powershell
jupyter --version
```

## Configure

- **Kernel**: the Python process a notebook actually executes against — `pip install -r requirements.txt` installs everything this mini project's kernel needs (`pandas`, `matplotlib`); no separate kernel setup required for a single-environment project like this one.
- **Cell execution order vs. page order**: Jupyter numbers each executed cell (`[1]`, `[2]`, `[3]`...) in the order you actually *ran* them, not their position on the page — always check these numbers when something looks wrong; out-of-order numbers are the first sign of the hidden-state problem this mini project demonstrates directly.
- **`%matplotlib inline`**: the "magic" command (used in this mini project's first code cell) that renders plots directly inside the notebook output instead of opening a separate window — standard for this kind of exploratory work.

## Core use cases

- Exploratory data analysis — understanding a dataset's shape, distributions, and relationships before deciding what to build.
- Rapid prototyping of a data transformation, model, or algorithm, iterating cell by cell instead of rerunning a whole script.
- Literate, reproducible reports that mix explanation, code, and results in one shareable document.
- Comparing a few approaches side by side (different models, different parameters) with all results visible at once.
- Learning and teaching — most ML/data tutorials are notebooks specifically because of the inline, step-by-step execution model.

## Real-life scenario: exploratory analysis that catches its own hidden-state bug

This mirrors an actual, common analysis task — segmenting customers by spend — and deliberately walks you through Jupyter's most notorious real gotcha along the way, rather than pretending it doesn't exist.

**What the mini project does:** [mini-project/eda_customer_orders.ipynb](mini-project/eda_customer_orders.ipynb) explores a synthetic order dataset ([mini-project/orders.csv](mini-project/orders.csv), 170 orders across 40 customers), building up to a real customer segmentation (low/mid/high-value) — with a staged demonstration partway through of exactly how out-of-order cell execution corrupts a result, and the real fix for it.

### Step 1 — Launch it

```powershell
cd mini-project
jupyter notebook
```

Your browser opens to Jupyter's file browser. Click `eda_customer_orders.ipynb` to open it.

### Step 2 — Run Part 1 in order

Run each cell in **Part 1** top to bottom (Shift+Enter advances to the next cell after running). You'll see the real dataset loaded, summary statistics, a revenue-by-category bar chart, and a top-10-customers chart — genuine exploratory output, each building on the last.

### Step 3 — Deliberately trigger the hidden-state bug

In **Part 2**, run **Cell A** (prints a threshold, e.g. `High-spender threshold: 210.44`), then run **Cell B** (which doubles that threshold and prints the new value). Now run **Cell C** — it correctly uses the doubled threshold, and everything still looks consistent.

Now re-run **Cell A** by itself (click into it and press Shift+Enter) — it recomputes and re-prints the *original*, smaller threshold. But don't re-run Cell C. Look at the notebook: Cell A now shows the small threshold, Cell B (still showing its old output) shows the doubled one, and if you scroll down, Cell C's *displayed output* still reflects the doubled threshold — the page now shows three cells telling three different, mutually inconsistent stories about what the threshold actually is, and only the small bracketed execution-order number next to each cell (`[4]`, `[2]`, `[3]`) reveals which ran most recently.

### Step 4 — See the real consequence

Run **Cell C** again right now. It uses whatever `high_spender_threshold` currently holds in the kernel — which, depending on exactly what you re-ran, may or may not match what's visually printed above it in Cells A/B anymore. This is the actual bug: **the notebook's displayed page order is not the same thing as the kernel's actual execution history**, and nothing about the UI stops that from silently diverging.

### Step 5 — Apply the real fix

Use the menu: **Kernel → Restart & Run All** (or Restart & Clear Output, then run all). This wipes the kernel's memory completely and re-executes every cell in the actual page order, top to bottom — the only way to guarantee the notebook's visible state and its real internal state genuinely match. This is the standard, correct habit before trusting any notebook's results, sharing one with someone else, or exporting one to a script.

### Step 6 — Finish the real analysis

With a clean, trustworthy kernel state, run **Part 3** — it segments every customer into low/mid/high-value bands using the now-correct threshold and plots the result. This is the actual deliverable this exploration was building toward.

### Step 7 — Export it (optional)

```powershell
jupyter nbconvert --to script eda_customer_orders.ipynb
```

or, for a shareable static report:

```powershell
jupyter nbconvert --to html eda_customer_orders.ipynb
```

`nbconvert` turns the notebook into a plain `.py` script or a standalone HTML report — the real mechanism for handing off exploratory work to something that doesn't require Jupyter to view or run.

## Common pitfalls

- **Trusting a notebook you haven't run with "Restart & Run All"**: demonstrated directly in Steps 3-5 — a notebook that looks fine can be showing genuinely inconsistent state; this is true for any notebook you download too, not just ones you wrote yourself.
- **Confusing page order with execution order**: always glance at the `[N]` execution-count numbers next to each cell — if they're not in ascending order top to bottom, the notebook has been run out of order.
- **Never restarting the kernel between unrelated experiments**: leftover variables from an earlier experiment can silently leak into a later one that happens to reuse the same variable name.
- **Committing a notebook with large, real outputs baked in** (big dataframes, embedded images): notebooks store their last-run outputs in the file itself — `jupyter nbconvert --clear-output` before committing keeps diffs small and avoids leaking data that shouldn't be shared.

## Resources

- Docs: https://docs.jupyter.org
- `nbconvert` docs: https://nbconvert.readthedocs.io
- JupyterLab (the newer, more IDE-like interface): https://jupyterlab.readthedocs.io
