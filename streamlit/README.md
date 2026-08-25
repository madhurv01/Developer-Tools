# Streamlit

## What it is

Streamlit is an open-source Python framework for turning a plain data-processing script into an interactive web app — no HTML, CSS, JavaScript, or frontend framework knowledge required. You write ordinary Python (load a dataframe, filter it, plot it), add a handful of Streamlit function calls (`st.slider`, `st.dataframe`, `st.line_chart`), and get a real, interactive, shareable web app out of it. It's the dominant tool in the Python data/ML ecosystem for exactly this: turning an analysis or a model into something a non-technical person can actually use themselves.

- Website: https://streamlit.io
- Docs: https://docs.streamlit.io
- GitHub: https://github.com/streamlit/streamlit
- Community Cloud (free hosting): https://streamlit.io/cloud

## Why this tool exists / the problem it solves

A data scientist or ML engineer can usually produce an analysis, a chart, or a working model quickly in a Jupyter notebook — but a notebook isn't something you hand to a product manager, a stakeholder, or a non-technical teammate and expect them to use. Historically, turning that analysis into something *they* could interact with meant building a real frontend: learning React or Flask templates, wiring up a backend API, handling state — a genuinely different skill set that stalls or kills a lot of useful internal tools before they ever get built.

Streamlit's core idea removes that entirely: the script *is* the app. Every widget you add (a slider, a dropdown, a file uploader) automatically re-runs the script top-to-bottom on interaction, with the widget's current value available as a normal Python variable — no separate frontend code, no API layer, no manual state management to write yourself.

## Why it matters in the AI era

Streamlit is one of the fastest ways to put a real, usable interface in front of an AI/ML model or an LLM-backed feature — a chatbot UI, a model comparison tool, a RAG demo with a file upload and a chat box, all buildable in plain Python in an afternoon. It's extremely common as the "let people actually try this" layer on top of a notebook-stage AI project, and its Community Cloud hosting means a working demo can be a public, shareable link the same day, which matters a lot when you need quick feedback on an AI feature before investing in a full frontend.

## Install

```powershell
pip install streamlit
```

Verify:

```powershell
streamlit hello
```

This launches Streamlit's own built-in demo app in your browser — if it opens, your install is working end to end.

## Configure

- **`requirements.txt`**: this mini project's [mini-project/requirements.txt](mini-project/requirements.txt) pins exact versions — required for a deployable app, since Streamlit Community Cloud installs from this file to build your app's environment.
- **`.streamlit/config.toml`** (included in this mini project): project-level configuration, most commonly used for theming — this mini project sets a custom color theme that applies automatically both locally and once deployed, with zero code changes needed.
- **`.streamlit/secrets.toml`** (not included — see "Configure secrets" below): the real place for API keys or credentials a Streamlit app needs, both locally and on Community Cloud, following the same "never commit real secrets" rule as everywhere else in this repo.
- **`@st.cache_data`** (used in this project's `app.py`): the real, standard way to avoid redoing expensive work (reading a file, calling an API, running a slow computation) on every single interaction — since the *entire script* re-runs on every widget interaction, caching correctly is one of the first real skills to learn.

## Core use cases

- Internal data dashboards and exploration tools for a team, built by whoever has the data, not by a separate frontend team.
- Quick, shareable demos of an ML model or analysis for stakeholder feedback.
- LLM/AI app prototypes — chat interfaces, RAG demos, prompt-testing tools — with a real UI in plain Python.
- Turning a one-off analysis script into a reusable, interactive self-service tool.
- Rapid internal tooling that would otherwise never get built due to frontend effort.

## Real-life scenario: a real, filterable, deployable sales dashboard

This is a genuinely common real Streamlit use case: take a raw dataset, and give someone else a live, interactive way to explore it — filters, KPIs, charts, and a data export — built entirely as one Python script.

**What the mini project does:** [mini-project/app.py](mini-project/app.py) loads [mini-project/sales_data.csv](mini-project/sales_data.csv) (a realistic 90-day synthetic sales dataset across five categories and four regions) and builds a full dashboard: sidebar filters for category, region, and date range; a live KPI row (total revenue, units sold, average order value); a revenue-over-time line chart; category and region breakdown bar charts; and a filtered data table with a working CSV download button — all of it updating instantly as filters change.

### Step 1 — Run it locally

```powershell
cd mini-project
pip install -r requirements.txt
streamlit run app.py
```

Your browser opens automatically to the running app. Change the category filter, adjust the date range, and watch every chart and KPI update instantly — this is the entire script re-running top-to-bottom on each interaction, with your filter choices available as ordinary Python variables.

### Step 2 — Understand the reactive model by breaking it slightly

Temporarily comment out the `@st.cache_data` decorator above `load_data()`, save, and change a filter in the running app. It still works — but add a `print("Reading CSV from disk...")` inside `load_data()` and watch your terminal: without caching, that line prints on **every single filter interaction**, re-reading the file from disk each time. Put the decorator back and repeat — it now prints only once. This is the real, practical reason caching matters the moment your data source is a slow file, a database query, or an API call instead of a small CSV.

### Step 3 — Push it to GitHub

Streamlit Community Cloud deploys directly from a GitHub repository. Push `mini-project/`'s contents (including `sales_data.csv` and `requirements.txt`) to a repo of your own.

### Step 4 — Deploy it for real, for free

Go to https://share.streamlit.io, sign in with GitHub, click **New app**, select your repository and `app.py` as the entry point, and deploy. Within a minute or two you get a real, public, shareable `https://<your-app>.streamlit.app` URL — an actual working dashboard anyone can open and interact with, not a local demo.

### Step 5 — Confirm the theme and data traveled with it

Open your live deployed URL — the custom color theme from `.streamlit/config.toml` is already applied, and the same filters, KPIs, and charts work exactly as they did locally, because the whole app (code, config, and data) deployed together as one unit.

### Step 6 — Make a real change and watch it redeploy

Edit a small piece of `app.py` (e.g. change the dashboard's title), commit, and push. Community Cloud automatically picks up the change and redeploys within moments — the same git-push-to-deploy workflow used by Vercel and Render elsewhere in this repo, applied here to a Python data app.

## Common pitfalls

- **Forgetting `sales_data.csv` isn't committed**: the CSV must be pushed to your repo alongside `app.py` — Streamlit Community Cloud only sees what's actually in the repository.
- **Missing or wrong `requirements.txt`**: a deploy fails immediately if a package your script imports isn't listed — always test with a fresh virtual environment locally before deploying, to catch this before Community Cloud does.
- **Not understanding "the whole script re-runs"**: expensive work placed outside a cached function silently re-runs on every single click — always reach for `@st.cache_data` (for data) or `@st.cache_resource` (for things like model objects or connections) once anything is not close to instant.
- **Putting real secrets in code**: use `.streamlit/secrets.toml` locally (gitignored) and the Community Cloud dashboard's **Secrets** section for deployed apps — never hardcode an API key directly in `app.py`.

## Resources

- Docs: https://docs.streamlit.io
- API reference (every widget/function): https://docs.streamlit.io/library/api-reference
- Caching guide: https://docs.streamlit.io/library/advanced-features/caching
- Community Cloud deployment guide: https://docs.streamlit.io/streamlit-community-cloud/deploy-your-app
