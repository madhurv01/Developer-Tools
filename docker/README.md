# Docker

## What it is

Docker packages an application together with everything it needs to run — the runtime, system libraries, dependencies, and configuration — into a single portable unit called a **container**. A container behaves the same way on your laptop, a teammate's laptop, a CI runner, and a production server, because it isn't relying on whatever happens to be installed on the host machine — it carries its own environment with it.

Containers are not virtual machines: they don't boot a separate OS kernel. They share the host machine's kernel but are isolated from it (and from each other) using Linux namespaces and cgroups, which is why they start in milliseconds instead of minutes and use a fraction of the resources a VM would.

- Website: https://www.docker.com
- Docs: https://docs.docker.com

## Why this tool exists / the problem it solves

Before Docker, "it works on my machine but not in production" was one of the most common and time-consuming problems in software engineering — caused by differences in OS version, installed library versions, environment variables, or configuration between a developer's laptop and the server it eventually runs on.

Docker solves this by making the *environment itself* part of the artifact you build and ship. You write a `Dockerfile` describing exactly how to construct the environment; anyone (or any server) that runs `docker build` gets a byte-for-byte identical result. This also solves the "dependency hell" problem where two projects on the same machine need conflicting versions of the same library — each container has its own isolated filesystem, so there's no conflict.

## Why it matters in the AI era

Nearly every serious open-source AI project — Ollama, Qdrant, Weaviate, ChromaDB, n8n, LangSmith self-hosted, LocalAI, text-generation-webui — ships an official Docker image as the primary way to run it, specifically *because* these tools have complex native dependencies (CUDA drivers, specific Python versions, compiled C++ extensions) that are painful to install directly. Docker lets you run any of these with a single `docker run` command instead of spending an afternoon resolving dependency conflicts on your host machine. It's also how you package your own AI agent or API for deployment to any cloud provider without vendor lock-in.

## Install

### Windows

1. Install Docker Desktop: https://www.docker.com/products/docker-desktop
2. Docker Desktop on Windows requires **WSL2** (Windows Subsystem for Linux) as its backend — the installer will prompt you to enable it and install a Linux kernel update if it's missing. Reboot when asked.
3. Launch Docker Desktop and wait for the whale icon in the system tray to show "Docker is running."

### macOS

Same installer link, native support for both Intel and Apple Silicon.

### Linux

Install the Docker Engine directly (no Docker Desktop needed):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER   # so you don't need sudo for every docker command
```

Log out and back in for the group change to apply.

### Verify install

```powershell
docker --version
docker compose version
docker run hello-world
```

The last command downloads a tiny test image and runs it — if you see "Hello from Docker!", your install is fully working end to end (daemon running, network access, image pull, container run).

## Key concepts you need before going further

- **Image**: a read-only template (built from a `Dockerfile`) — the blueprint.
- **Container**: a running (or stopped) instance of an image — the actual process.
- **Dockerfile**: the recipe describing how to build an image, layer by layer.
- **Volume**: a persistent storage location that survives even if the container is deleted — without one, anything a container writes to disk is lost when it stops.
- **Docker Compose**: a tool for defining and running *multiple* related containers together (e.g. an API + its database) as one unit, described in a single `docker-compose.yml` file.
- **Network**: Compose automatically creates a private virtual network so your containers can reach each other by service name (e.g. a container named `api` can reach `redis` just by using the hostname `redis`).

## Core use cases

- Guaranteeing a consistent dev environment across every machine on a team.
- Packaging an app once and deploying that exact artifact anywhere (AWS, Azure, a bare-metal server, your laptop).
- Running dependencies you don't want to install natively (databases, caches, message queues, AI model servers).
- Isolating experiments so they never conflict with your host machine's Python/Node/library versions.
- Local multi-service development (API + database + cache) that mirrors production topology.

## Real-life scenario: an API backed by a Redis cache

This is a genuinely common real-world shape: a stateless API container talking to a separate, stateful Redis container for shared data (session storage, rate limiting, counters, caching expensive computations). It's exactly the kind of thing you cannot properly demonstrate with a single container — it needs Docker Compose to show container-to-container networking and persistent volumes, which is where Docker's real value shows up.

**What the mini project does:** a small Node API ([mini-project/server.js](mini-project/server.js)) that increments a visit counter stored in Redis every time you hit `/`, and reports stats from `/stats`. The API and Redis run as **two separate containers**, wired together by [mini-project/docker-compose.yml](mini-project/docker-compose.yml).

### Step 1 — Build and start both containers

```powershell
cd mini-project
docker compose up --build
```

Watch the logs: you'll see the `redis` container start first, then the `api` container connect to it at `redis://redis:6379` — note that's the **service name**, not `localhost` or an IP. Compose's built-in DNS is what makes `redis` resolve to the right container automatically.

### Step 2 — Generate some traffic

In another terminal:

```powershell
curl http://localhost:4000/
curl http://localhost:4000/
curl http://localhost:4000/stats
```

`/stats` will show a growing `totalVisits` count, all being read from Redis, not from the API container's own memory.

### Step 3 — Prove persistence survives a restart

```powershell
docker compose down
docker compose up
curl http://localhost:4000/stats
```

The visit count is **still there** after a full container teardown and restart. This is because `docker-compose.yml` mounts a named volume (`redis_data`) to Redis's data directory — the data lives outside the container's own filesystem, so destroying and recreating the container doesn't touch it.

### Step 4 — Prove isolation by breaking only one container

```powershell
docker compose restart redis
```

The `api` container keeps running the whole time (check `docker compose ps`) and simply reconnects once Redis comes back — the two processes are genuinely independent, exactly as they would be in production.

### Step 5 — Clean up (including the volume, if you want a true fresh start)

```powershell
docker compose down -v
```

The `-v` flag deletes the named volume too — without it, `docker compose down` alone leaves the volume (and your data) intact for next time, which is the safer default.

## Reading the Dockerfile

[mini-project/Dockerfile](mini-project/Dockerfile) demonstrates the standard real-world optimization: `package.json` is copied and `npm install` is run *before* the rest of the source code is copied in. Docker caches each instruction as a layer — as long as `package.json` hasn't changed, Docker reuses the cached `npm install` layer on every rebuild instead of re-downloading dependencies, which is the difference between a 20-second rebuild and a 2-minute one on any real project.

## Common pitfalls

- **Using `localhost` between containers**: containers each have their own network namespace — `localhost` inside the `api` container refers to the `api` container itself, not the `redis` container. Always use the service name from `docker-compose.yml`.
- **Forgetting `-v` leaves old data around**: if you change your data model and things look "stuck," check whether an old volume is still there with `docker volume ls`.
- **Editing code but not seeing changes**: this Dockerfile `COPY`s source at build time, so you must `docker compose up --build` (not just `up`) after changing `server.js`.

## Resources

- Docker docs: https://docs.docker.com
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Hub (pre-built images): https://hub.docker.com
