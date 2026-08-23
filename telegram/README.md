# Telegram Bots

## What it is

Telegram exposes a full, free **Bot API** that lets any developer create a bot account, receive every message sent to it, and reply programmatically — no approval process, no paid tier, no app store review. A bot is created and configured entirely through a chat with **@BotFather**, Telegram's own bot for making bots, which hands you a token that acts as that bot's entire identity and credential.

- Bot API docs: https://core.telegram.org/bots/api
- BotFather: https://t.me/BotFather
- Official bot examples: https://core.telegram.org/bots/samples

## Why this tool exists / the problem it solves

Building any kind of chat-based interface historically meant either paying for a platform (a paid SMS gateway, a WhatsApp Business API integration with real onboarding friction) or standing up your own messaging infrastructure entirely. Telegram's Bot API removes essentially all of that friction: create a bot in a 30-second chat with BotFather, and you have a fully working two-way messaging endpoint, with rich features built in for free — inline keyboards, file uploads, group/channel management, payments, and more.

This makes Telegram bots the lowest-friction way to build a genuinely useful notification or utility interface: a personal reminder system, a way for a small team to get alerts, a lightweight admin console for a side project — all without building or hosting a custom frontend.

## Why it matters in the AI era

Telegram bots are one of the most common "shells" people put around an AI agent: a chat interface that already exists on every phone, with no app to build or distribute. Point the bot's message handler at an LLM call and you have a working AI assistant reachable from anywhere, in an afternoon. Understanding the underlying bot mechanics (command parsing, state per chat, webhook vs. polling) matters even when the "brain" behind the bot is an LLM — the message-handling plumbing is identical either way, and getting it right is what makes an AI-backed bot feel reliable instead of flaky.

## Install

There's no software to install for Telegram itself — you need the Telegram app (to create and talk to your bot) and a bot library for whatever language you're using.

1. Install Telegram: https://telegram.org/apps (desktop, mobile, or web all work)
2. Create your bot:
   - Open a chat with **@BotFather** inside Telegram
   - Send `/newbot`
   - Follow the prompts for a display name and a unique `_bot`-suffixed username
   - BotFather replies with a **token** — this is the credential the mini project needs
3. Install the Node bot library for this mini project:
   ```powershell
   cd mini-project
   npm install
   ```

## Configure

- **Store the token as an environment variable, never in source**: this project uses a `.env` file (see [mini-project/.env.example](mini-project/.env.example)) — anyone who obtains your bot's token can fully impersonate it (send messages as it, read all messages sent to it), so treat it exactly like a password.
- **Polling vs. webhook mode**: a bot can receive updates two ways —
  - **Long polling** (what this mini project uses): your bot process repeatedly asks Telegram "any new messages?" — no public URL needed, works from any laptop, ideal for development.
  - **Webhook**: Telegram pushes updates to a public HTTPS URL you register — required for production at scale, and needs a public URL, which is exactly where [ngrok](../ngrok/README.md) comes in during development (see "Going further" below).
- **BotFather commands worth knowing**: `/setdescription` and `/setabouttext` control what users see before starting a chat; `/setcommands` registers a command list that shows up as a tappable menu in the Telegram UI — worth doing once your bot's commands are finalized.

## Core use cases

- Personal automation: reminders, expense/habit tracking, quick note-taking, all reachable from your phone with no app install.
- Team/ops notifications: CI build results, server alerts, on-call pages, low-friction because everyone already has Telegram installed.
- Lightweight admin interfaces: trigger actions on a server or service via chat commands instead of building a web dashboard.
- A conversational frontend for an AI agent or LLM-backed assistant.
- Community/group tools: moderation bots, welcome messages, FAQ bots for a Telegram group or channel.

## Real-life scenario: a personal expense-tracking bot

This is a genuinely useful, complete bot — the same shape as most practical Telegram bots people actually build and keep using: parse a command, validate the input, persist it, and answer queries against that data. It uses per-chat state (SQLite keyed by `chat_id`), so it correctly tracks separate histories for every user who talks to it, which is the realistic requirement for any bot meant for more than one person.

**What the mini project does:** [mini-project/bot.js](mini-project/bot.js) runs a bot with five real commands, backed by a local SQLite database ([mini-project/db.js](mini-project/db.js)):
- `/add <amount> <category>` — log an expense, with real input validation (rejects non-numeric amounts instead of silently corrupting data)
- `/list` — show your last 10 entries
- `/summary` — totals grouped by category
- `/undo` — delete your most recent entry
- `/start` / `/help` — usage instructions

### Step 1 — Create your bot and get a token

Follow the **Install** steps above with @BotFather if you haven't already.

### Step 2 — Configure the token

```powershell
cd mini-project
copy .env.example .env
```

Edit `.env` and paste in the token BotFather gave you.

### Step 3 — Run it

```powershell
node bot.js
```

You'll see `Expense bot is running (long polling).` Open Telegram, find your bot by the username you gave it, and send `/start`.

### Step 4 — Use it like a real tool

```
/add 12.50 food
/add 45 transport
/add 8.99 food
/list
/summary
/undo
```

Watch `/summary` correctly group and total by category, and `/undo` remove only the most recent entry — this is genuinely usable for tracking your own spending, not a toy.

### Step 5 — Prove per-user isolation

Have a friend (or a second Telegram account) message the same bot and run `/add` a few times. Run `/summary` from each account — each conversation only ever sees its own entries, because every query is scoped by `chat_id`. This is the same principle a production bot relies on for any per-user state.

### Step 6 — Inspect the data directly (optional)

The database is a plain SQLite file (`mini-project/expenses.db`) — open it with any SQLite browser, or query it directly:

```powershell
npx sqlite3 expenses.db "SELECT * FROM expenses;"
```

Seeing your own bot's data sitting in an ordinary, inspectable file (versus a black-box cloud database) is a big part of why this is a good first real bot to build.

## Going further: webhook mode with ngrok

Long polling is fine for development but wastes resources at scale (constant "any updates?" requests) — real production bots use **webhook mode**, where Telegram pushes new messages to a public HTTPS URL the instant they arrive. Setting this up locally is a genuine, realistic use of [ngrok](../ngrok/README.md):

1. Run `ngrok http 3000` to get a public HTTPS URL for a local server.
2. Register it with Telegram:
   ```powershell
   curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<your-ngrok-url>/webhook"
   ```
3. Telegram now POSTs every incoming message to that URL instead of you having to poll for it — the same "expose a local server publicly" pattern covered in the ngrok README, applied to a real bot instead of a demo.

## Common pitfalls

- **Committing the bot token**: if it ever leaks (pushed to a public repo, pasted in a public chat), regenerate it immediately via `/revoke` with BotFather — the old token stops working instantly.
- **Running the bot twice**: Telegram only allows one active long-polling connection per bot token — a second instance will throw a 409 Conflict error until the first one is stopped.
- **Forgetting input validation**: this is the actual real-world bug class demonstrated in `/add` above — always validate user input before trusting it, especially in a bot where users can type literally anything.
- **Rate limits**: Telegram limits how fast a bot can send messages (roughly 30 messages/second globally, 1/second per chat) — relevant once a bot has many users, not something you'll hit in this mini project.

## Resources

- Bot API reference: https://core.telegram.org/bots/api
- node-telegram-bot-api docs: https://github.com/yagop/node-telegram-bot-api
- Bot development FAQ: https://core.telegram.org/bots/faq
- Webhook guide: https://core.telegram.org/bots/webhooks
