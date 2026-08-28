# ngrok

## What it is

ngrok is a tunneling tool that takes something running on `localhost` on your machine and gives it a temporary, secure, public URL on the internet — e.g. `https://a1b2c3d4.ngrok-free.app` pointing straight at `http://localhost:3000` on your laptop, with no router configuration, no port forwarding, and no deployment.

It works by creating an outbound connection from your machine to ngrok's cloud edge servers; that connection is then used to relay any inbound traffic hitting your public URL back down to your local process. Because the connection is outbound-initiated, it works from behind NAT, corporate firewalls, and home routers without any configuration on your end.

- Website: https://ngrok.com
- Docs: https://ngrok.com/docs
- Dashboard (after signup): https://dashboard.ngrok.com

## Why this tool exists / the problem it solves

Before ngrok, testing anything that needed to call back into your local machine — a payment provider sending a webhook, a chat platform delivering a bot message, a partner API validating an OAuth redirect — meant one of:

1. Deploying to a real server just to test one change (slow, breaks your fast local iteration loop).
2. Configuring port forwarding on your home router and exposing your raw IP (a real security risk — you're opening your home network to the internet).
3. Using a shared "staging" server that everyone on the team fights over.

ngrok replaces all three with: run one command, get a URL, paste it into the third-party service's dashboard, done. It's a standard part of the workflow for anyone building integrations with webhook-driven services (Stripe, GitHub, Twilio, Slack, PayPal, WhatsApp Business API, etc.).

## Why it matters in the AI era

AI agents and bots are almost always webhook- or event-driven — a Slack bot receiving a mention, a WhatsApp bot receiving a message, an agent that reacts to a GitHub PR being opened, a voice agent receiving a call event from Twilio. You cannot develop or debug any of these without a public URL pointing at your local code while you iterate. ngrok is what makes "build an AI agent locally, test it against the real third-party platform, all before deploying anywhere" possible.

## Install

### Windows — via winget (recommended)

```powershell
winget install ngrok.ngrok
```

### Windows — manual

1. Download the Windows zip from https://ngrok.com/download
2. Extract `ngrok.exe` to a folder, e.g. `C:\tools\ngrok\`
3. Add that folder to your PATH (System Properties → Environment Variables → Path → New), or just always `cd` into it before running.

### macOS

```bash
brew install ngrok/ngrok/ngrok
```

### Linux (Debian/Ubuntu)

```bash
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc \
  | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" \
  | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok
```

### Verify

```powershell
ngrok version
```

## Configure (required — do this once)

1. Create a free account: https://dashboard.ngrok.com/signup
2. Copy your auth token from https://dashboard.ngrok.com/get-started/your-authtoken
3. Connect it to your local install:
   ```powershell
   ngrok config add-authtoken <YOUR_AUTH_TOKEN>
   ```
   This writes to `%USERPROFILE%\AppData\Local\ngrok\ngrok.yml` (Windows) — a per-machine config, so you do this once per computer, not per project.

4. Optional but worth knowing: on the free plan, every `ngrok http` run gets a **new random URL**. If you need a stable URL across restarts (useful once you're repeatedly re-registering the same webhook), you need a paid plan's reserved domain feature, or the free static domain now offered per account:
   ```powershell
   ngrok http --url=<your-static-domain>.ngrok-free.app 3000
   ```
   (Get your free static domain from the dashboard → Domains.)

## Core use cases

- **Webhook development**: receive and debug callbacks from Stripe, GitHub, Twilio, Slack, PayPal, etc. against code running on your own machine.
- **Sharing a local demo**: show a client or teammate a running app without deploying it anywhere.
- **Mobile app development**: point a phone app at your laptop's local backend over the internet instead of requiring the same WiFi network.
- **OAuth callback testing**: many OAuth providers require an `https://` redirect URI — ngrok gives you one instantly for local testing.
- **Traffic inspection**: ngrok's local web inspector shows every request/response that passed through the tunnel, which is invaluable for debugging exactly what a third-party service sent you.

## Real-life scenario: building a GitHub webhook receiver

This is the actual workflow used when building GitHub Apps, CI bots, or "auto-deploy on push" tooling — you cannot register a GitHub webhook against `localhost`, so this is the realistic way people build and test these integrations before ever deploying.

**What the mini project does:** a Flask server ([mini-project/webhook_server.py](mini-project/webhook_server.py)) that:
- Exposes a `POST /webhook` endpoint
- Verifies the `X-Hub-Signature-256` HMAC header exactly the way GitHub's docs require, so it rejects forged requests
- Parses real GitHub `push` event payloads and logs who pushed, to which branch, and how many commits — the exact point where a real system would kick off a deploy script
- Rejects and logs any request with a missing/invalid signature

### Step 1 — Run the receiver

```powershell
cd mini-project
pip install -r requirements.txt
python webhook_server.py
```

You'll see it listening on port 3000 with the shared secret it's using (`my-local-dev-secret` by default — override with the `WEBHOOK_SECRET` env var).

### Step 2 — Test signature verification locally, no GitHub needed

In a second terminal:

```powershell
python mini-project/simulate_github_push.py
```

This sends a correctly-signed fake `push` payload. Check the first terminal — you should see `Verified GitHub event: push` and a line written to `mini-project/deploy.log`. Now edit `simulate_github_push.py` to send a wrong secret and re-run it — you'll see the server reject it with a 401, exactly what happens when someone tries to spoof a webhook.

### Step 3 — Expose it and wire up a real GitHub repo (optional but recommended)

```powershell
ngrok http 3000
```

Copy the `https://...ngrok-free.app` URL ngrok prints.

In any GitHub repo you own: **Settings → Webhooks → Add webhook**
- Payload URL: `https://<your-ngrok-url>/webhook`
- Content type: `application/json`
- Secret: same value as `WEBHOOK_SECRET` (must match exactly)
- Events: "Just the push event"

Save it — GitHub immediately sends a `ping` event, which you'll see logged in your terminal and in `deploy.log`. Now push a real commit to that repo and watch your local server react to a live GitHub event in real time.

### Step 4 — Inspect the raw traffic

Open http://127.0.0.1:4040 while ngrok is running — this is ngrok's local web inspector. You can see the exact headers and body GitHub sent, and even **replay** a request without needing GitHub to send it again — extremely useful once you're debugging a real payload shape issue.

## Common pitfalls

- **Forgetting the URL changes on restart** (free plan): if you re-run `ngrok http 3000` after stopping it, you get a *new* URL and must update the webhook config again. Use a static domain to avoid this.
- **Signature mismatch**: the secret in your code must match the secret typed into the webhook config *exactly*, including no trailing whitespace.
- **Testing against the wrong port**: if your app also runs a frontend dev server, make sure you're tunneling the port your webhook receiver is actually on.

## Resources

- Docs: https://ngrok.com/docs
- Webhook debugging guide: https://ngrok.com/docs/guides/webhooks/
- GitHub's webhook signature verification docs: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
