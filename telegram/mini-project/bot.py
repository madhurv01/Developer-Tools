# A real, usable expense-tracker bot - the same command-based interaction
# pattern behind most practical Telegram bots (reminder bots, habit
# trackers, on-call alert bots). Runs via long polling, the realistic way
# to run a bot during development without needing a public URL (contrast
# with webhook mode, covered in the README's "Going further" section).

import os
import logging

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

from db import add_expense, list_expenses, summarize_by_category, delete_last

load_dotenv()
logging.basicConfig(level=logging.INFO)

HELP_TEXT = (
    "Welcome! I track your expenses.\n\n"
    "Commands:\n"
    "/add <amount> <category> - log an expense, e.g. /add 12.50 food\n"
    "/list - show your last 10 expenses\n"
    "/summary - totals grouped by category\n"
    "/undo - delete your most recent entry\n"
    "/help - show this again"
)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(HELP_TEXT)


# Real, working input validation - a genuinely common source of bugs in
# bots people actually ship (crashing on non-numeric input, or silently
# accepting garbage).
async def add(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    if not context.args:
        await update.message.reply_text("Usage: /add 12.50 food")
        return

    try:
        amount = float(context.args[0])
    except ValueError:
        await update.message.reply_text("Couldn't parse that. Usage: /add 12.50 food")
        return

    if amount <= 0:
        await update.message.reply_text("Amount must be positive.")
        return

    category = " ".join(context.args[1:]) or "uncategorized"
    add_expense(chat_id, amount, category.lower())
    await update.message.reply_text(f'Logged {amount:.2f} under "{category}".')


async def list_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    rows = list_expenses(chat_id)
    if not rows:
        await update.message.reply_text("No expenses logged yet. Try /add 12.50 food")
        return
    lines = [f"#{r[0]} - {r[2]:.2f} ({r[3]}) - {r[4]}" for r in rows]
    await update.message.reply_text("\n".join(lines))


async def summary(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    rows = summarize_by_category(chat_id)
    if not rows:
        await update.message.reply_text("Nothing to summarize yet. Try /add 12.50 food")
        return
    total = sum(r[1] for r in rows)
    lines = [f"{r[0]}: {r[1]:.2f} ({r[2]} entr{'y' if r[2] == 1 else 'ies'})" for r in rows]
    await update.message.reply_text("\n".join(lines) + f"\n\nTotal: {total:.2f}")


async def undo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    deleted = delete_last(chat_id)
    await update.message.reply_text(f"Removed entry #{deleted[0]}." if deleted else "Nothing to undo.")


def main():
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise SystemExit("Missing TELEGRAM_BOT_TOKEN - copy .env.example to .env and fill it in.")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler(["start", "help"], start))
    app.add_handler(CommandHandler("add", add))
    app.add_handler(CommandHandler("list", list_cmd))
    app.add_handler(CommandHandler("summary", summary))
    app.add_handler(CommandHandler("undo", undo))

    print("Expense bot is running (long polling). Message it on Telegram now.")
    app.run_polling()


if __name__ == "__main__":
    main()
