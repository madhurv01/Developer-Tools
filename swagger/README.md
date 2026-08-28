# Swagger / OpenAPI

## What it is

**OpenAPI** (formerly known as "Swagger," the name that stuck for the tooling around it) is the industry-standard specification format for describing a REST API — every endpoint, every request/response shape, every field's type and constraints — in a single machine-readable YAML or JSON file. **Swagger UI** is the most widely used tool that reads that file and renders it as interactive, "try it out" documentation in a browser. Together they form the dominant way REST APIs are documented and validated across the industry, used by companies from small startups to Stripe, GitHub, and virtually every major cloud provider's public API.

- OpenAPI Specification: https://swagger.io/specification/
- Swagger tools (UI, Editor, Codegen): https://swagger.io/tools/
- Swagger UI GitHub: https://github.com/swagger-api/swagger-ui

## Why this tool exists / the problem it solves

Before OpenAPI became standard, API documentation was almost always a Word doc, a wiki page, or a hand-written Markdown file — written once, then drifting out of sync with the real API within weeks, because nothing forced it to stay accurate. A consumer of the API had no reliable way to know if the docs were still true, and had to resort to reading source code or trial-and-error against the live endpoint.

There are two real, widely-used ways teams solve this today:

1. **Spec-first**: hand-write an `openapi.yaml` describing the contract, then validate real requests/responses against it at runtime (common in Node/Express stacks, using libraries like `express-openapi-validator`).
2. **Code-first**: write the API in a framework that *generates* the OpenAPI spec directly from your code's type definitions — this mini project's approach, using Python's FastAPI. The spec and the interactive docs are a byproduct of the same Pydantic models that validate every request, so they cannot drift apart from what the code actually does, by construction.

Both are genuinely "contract-first" in spirit — the difference is which artifact is the source of truth (a written spec file, or the code's own type definitions). Understanding both matters because you'll encounter each in real codebases depending on the language and team.

## Why it matters in the AI era

An OpenAPI spec is one of the most useful things you can hand an AI tool: it's precise, structured, and unambiguous in a way prose documentation isn't, which makes it the ideal input for AI-generated API clients, AI agents that need to call your API correctly (LLM "function calling" and tool definitions are structurally very similar to an OpenAPI operation), and AI-assisted code review that can check whether an implementation actually matches its documented contract. FastAPI's code-first approach is particularly convenient here — since the spec is generated automatically, an AI agent's tool definitions can be regenerated straight from a running API with zero manual spec-writing, and can never silently go stale the way a hand-maintained spec can.

## Install

```powershell
cd mini-project
pip install -r requirements.txt
```

This installs FastAPI (the web framework, which generates the OpenAPI spec and Swagger UI automatically) and Uvicorn (the ASGI server that actually runs it).

For exploring/editing a hand-written spec visually (the spec-first approach): **Swagger Editor**, a live browser-based editor with real-time validation — https://editor.swagger.io (no install, works entirely in-browser).

## Configure

- **Automatic spec generation**: unlike a hand-written `openapi.yaml`, this project has no spec file at all — FastAPI builds it from the `NewBook`/`Book` Pydantic models and route type hints in `main.py`, and serves the raw generated spec at `/openapi.json` if you ever need the file itself (e.g. to feed into a codegen tool).
- **`response_model`**: sets the *response* shape FastAPI documents and validates against — separate from the request body model, exactly the same way this project's Node-based sibling projects separate `NewBook` (input) from `Book` (output, with an `id`).
- **Interactive docs paths**: FastAPI serves Swagger UI at `/docs` and an alternative UI (ReDoc) at `/redoc` automatically, with zero configuration — both read the same generated spec.

## Core use cases

- Interactive, always-accurate API documentation for consumers (internal teams, external partners, the public).
- Contract-first development, whether spec-first (hand-written YAML + a validator) or code-first (a framework like FastAPI generating the spec from your code).
- Request/response validation, rejecting malformed traffic before it reaches business logic.
- Generating typed API clients automatically (OpenAPI Generator, openapi-typescript) instead of hand-writing fetch calls.
- Powering API gateways and mocking servers directly from the same spec used for docs.

## Real-life scenario: a code-first, self-documenting API

This demonstrates the code-first alternative to hand-writing a spec: the OpenAPI contract and the interactive docs are generated directly from the same Pydantic models that validate every request, so the documentation and the real behavior of the API structurally cannot drift apart.

**What the mini project does:** [mini-project/main.py](mini-project/main.py) defines a small "Bookstore" API (list, get, create, delete books) using FastAPI and Pydantic models with real constraints — required fields, types, a minimum price. FastAPI validates every request against these models automatically and generates a full OpenAPI spec and interactive Swagger UI from them, with no separate spec file to maintain.

### Step 1 — Run it

```powershell
cd mini-project
pip install -r requirements.txt
python main.py
```

You'll see it running on port 4001, with docs at `/docs`.

### Step 2 — Explore the interactive docs

Open http://localhost:4001/docs in a browser. This is Swagger UI, generated entirely from `main.py`'s Pydantic models — expand `POST /books`, click **Try it out**, and you can send a real request straight from the docs page. Notice the schema shown for the request body matches the `NewBook` class exactly — there's only one definition, used for validation, the docs, and the generated spec.

### Step 3 — Prove the contract is enforced, not just documented

Send a request that violates the schema — missing a required field:

```powershell
curl -X POST http://localhost:4001/books -H "Content-Type: application/json" -d "{\"title\": \"Missing Fields\"}"
```

You get a `422` with a structured validation error explaining exactly which field failed and why — the route function in `main.py` never even ran; FastAPI rejected it first, purely based on the `NewBook` model.

### Step 4 — Send a valid request and see it succeed

```powershell
curl -X POST http://localhost:4001/books -H "Content-Type: application/json" -d "{\"title\": \"Refactoring\", \"author\": \"Martin Fowler\", \"price\": 44.99}"
curl http://localhost:4001/books
```

The new book appears in the list, matching exactly the `Book` model defined in `main.py`.

### Step 5 — Inspect the generated spec directly

```powershell
curl http://localhost:4001/openapi.json
```

This is the actual OpenAPI 3.1 document FastAPI generated — the same artifact a hand-written `openapi.yaml` would be in the spec-first approach, except this one is guaranteed to match the code because it was built from the code, not written separately from it.

### Step 6 — Try the other real endpoints

```powershell
curl http://localhost:4001/books/1
curl -X DELETE http://localhost:4001/books/1
curl http://localhost:4001/books/999
```

The last one returns a proper `404`, exactly as documented in the generated spec.

## Common pitfalls

- **Assuming code-first means "no discipline needed"**: the contract is only as good as your Pydantic models — vague types (e.g. everything as `str` with no constraints) generate a spec that's technically accurate but enforces almost nothing, the same trap as an overly loose hand-written spec.
- **Forgetting `response_model` documents the OUTPUT shape**: leaving it off still works, but the generated docs lose precision about what a successful response actually looks like.
- **Confusing this with the spec-first approach**: if you're working in a codebase that maintains a hand-written `openapi.yaml` validated at runtime (common in Node/Express), don't expect a spec file to exist here — inspect `/openapi.json` on the running app instead.

## Resources

- OpenAPI Specification: https://swagger.io/specification/
- FastAPI docs: https://fastapi.tiangolo.com
- FastAPI's automatic docs guide: https://fastapi.tiangolo.com/tutorial/metadata/
- Swagger Editor (live, in-browser, for the spec-first approach): https://editor.swagger.io
- OpenAPI Generator (client/server codegen from a spec): https://openapi-generator.tech
