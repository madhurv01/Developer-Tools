# Swagger / OpenAPI

## What it is

**OpenAPI** (formerly known as "Swagger," the name that stuck for the tooling around it) is the industry-standard specification format for describing a REST API — every endpoint, every request/response shape, every field's type and constraints — in a single machine-readable YAML or JSON file. **Swagger UI** is the most widely used tool that reads that file and renders it as interactive, "try it out" documentation in a browser. Together they form the dominant way REST APIs are documented and validated across the industry, used by companies from small startups to Stripe, GitHub, and virtually every major cloud provider's public API.

- OpenAPI Specification: https://swagger.io/specification/
- Swagger tools (UI, Editor, Codegen): https://swagger.io/tools/
- Swagger UI GitHub: https://github.com/swagger-api/swagger-ui

## Why this tool exists / the problem it solves

Before OpenAPI became standard, API documentation was almost always a Word doc, a wiki page, or a hand-written Markdown file — written once, then drifting out of sync with the real API within weeks, because nothing forced it to stay accurate. A consumer of the API had no reliable way to know if the docs were still true, and had to resort to reading source code or trial-and-error against the live endpoint.

OpenAPI fixes this by making the spec a **single, machine-readable source of truth** that tooling can act on directly: generate interactive docs from it (Swagger UI), generate client SDKs in any language from it (OpenAPI Generator), and — the pattern this mini project demonstrates — **enforce it at runtime**, so a request that violates the contract is rejected automatically instead of the spec silently becoming a lie. This last part, "contract-first" API design, is the actual industry-standard practice at any team serious about API reliability: the spec isn't generated *after* the code as an afterthought — it's written first (or kept in lockstep with the code) and used to validate real traffic against it.

## Why it matters in the AI era

An OpenAPI spec is one of the most useful things you can hand an AI tool: it's precise, structured, and unambiguous in a way prose documentation isn't, which makes it the ideal input for AI-generated API clients, AI agents that need to call your API correctly (LLM "function calling" and tool definitions are structurally very similar to an OpenAPI operation), and AI-assisted code review that can check whether an implementation actually matches its documented contract. Teams building AI agents that call internal APIs increasingly generate the agent's tool definitions directly from an existing OpenAPI spec, rather than hand-writing them — which only works if that spec is trustworthy, i.e. actually enforced against real traffic the way this mini project sets up.

## Install

There's nothing to install to *use* the OpenAPI spec format itself — it's just YAML/JSON. What you install is the tooling that acts on a spec you write.

For this mini project (a Node/Express API with the spec enforced at runtime):

```powershell
cd mini-project
npm install
```

For exploring/editing specs visually without writing code: **Swagger Editor**, a live browser-based editor with real-time validation — https://editor.swagger.io (no install, works entirely in-browser) or self-hosted via Docker:

```powershell
docker run -p 8080:8080 swaggerapi/swagger-editor
```

## Configure

- **Spec location and versioning**: keep `openapi.yaml` in the same repo as the API it describes, and treat changes to it with the same review rigor as code — it's a contract other teams/consumers depend on.
- **`operationId`**: every operation in this project's spec has one (e.g. `listBooks`) — many codegen and tooling workflows use this as the generated function name, so keeping it descriptive and stable matters once other tools depend on it.
- **`validateResponses`** (used in this project's `server.js`): a stricter setting most real projects only enable in development/CI, not production — it catches the API's *own* bugs (returning something that violates its documented shape) but adds validation overhead you may not want on every production request.

## Core use cases

- Interactive, always-accurate API documentation for consumers (internal teams, external partners, the public).
- Contract-first development: write the spec first, generate a server stub and client SDKs from it, then implement against the stub.
- Request/response validation middleware, rejecting malformed traffic before it reaches business logic.
- Generating typed API clients automatically (OpenAPI Generator, openapi-typescript) instead of hand-writing fetch calls.
- Powering API gateways and mocking servers directly from the same spec used for docs.

## Real-life scenario: a contract-first, self-enforcing API

This is the actual industry-standard pattern, not a toy: the OpenAPI spec is loaded by the server itself and used to validate every request and response, so the documentation and the real behavior of the API structurally cannot drift apart.

**What the mini project does:** [mini-project/openapi.yaml](mini-project/openapi.yaml) defines a small "Bookstore" API (list, get, create, delete books) with strict schemas — required fields, types, minimum values. [mini-project/server.js](mini-project/server.js) loads that exact file with `express-openapi-validator`, which rejects any request that doesn't match the schema *before* the route handler runs, and serves interactive Swagger UI docs generated from the same file.

### Step 1 — Run it

```powershell
cd mini-project
npm install
node server.js
```

You'll see it running on port 4001, with docs at `/docs`.

### Step 2 — Explore the interactive docs

Open http://localhost:4001/docs in a browser. This is Swagger UI, rendered entirely from `openapi.yaml` — expand `POST /books`, click **Try it out**, and you can send a real request straight from the docs page. Notice the schema shown for the request body is the exact same schema enforced by the server — there's only one definition, used for both.

### Step 3 — Prove the contract is enforced, not just documented

Send a request that violates the schema — missing a required field:

```powershell
curl -X POST http://localhost:4001/books -H "Content-Type: application/json" -d "{\"title\": \"Missing Fields\"}"
```

You get a `400` with a structured validation error explaining exactly which field failed and why — the route handler in `server.js` never even ran; `express-openapi-validator` rejected it first, purely based on the spec.

### Step 4 — Send a valid request and see it succeed

```powershell
curl -X POST http://localhost:4001/books -H "Content-Type: application/json" -d "{\"title\": \"Refactoring\", \"author\": \"Martin Fowler\", \"price\": 44.99}"
curl http://localhost:4001/books
```

The new book appears in the list, matching exactly the `Book` schema defined in `openapi.yaml`.

### Step 5 — Break the contract from the server side (very instructive)

In `server.js`, temporarily change the `POST /books` handler to return `res.status(201).json({ title: book.title })` (dropping the required `id`, `author`, `price` fields), save, and re-run the same POST request from Step 4. Because `validateResponses: true` is set, the server itself throws an error — this is the mechanism that catches "the API stopped matching its own docs" as a bug during development, before it ever reaches a real consumer.

### Step 6 — Try the other real endpoints

```powershell
curl http://localhost:4001/books/1
curl -X DELETE http://localhost:4001/books/1
curl http://localhost:4001/books/999
```

The last one returns a proper `404`, exactly as declared in the spec.

## Common pitfalls

- **Letting the spec and the code drift apart**: this is the entire problem OpenAPI is meant to solve — if you don't wire up runtime validation like this project does, nothing stops that drift from happening again.
- **Overly loose schemas**: a spec with no `required` fields and everything typed as `string` technically "works" but enforces almost nothing — the value of contract-first design comes from being genuinely strict.
- **Forgetting `validateResponses` is expensive**: fine in development/CI, but measure the overhead before leaving it on in a high-throughput production service.

## Resources

- OpenAPI Specification: https://swagger.io/specification/
- Swagger Editor (live, in-browser): https://editor.swagger.io
- express-openapi-validator docs: https://github.com/cdimascio/express-openapi-validator
- OpenAPI Generator (client/server codegen from a spec): https://openapi-generator.tech
