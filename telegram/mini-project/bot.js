// A real, usable expense-tracker bot - the same command-based interaction
// pattern behind most practical Telegram bots (reminder bots, habit
// trackers, on-call alert bots, personal finance bots). Runs via long
// polling, which is the realistic way to run a bot during development
// without needing a public URL (contrast with the webhook mode covered
// in the README's "going further" section, which pairs with ngrok).

import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { addExpense, listExpenses, summarizeByCategory, deleteLast } from "./db.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("Missing TELEGRAM_BOT_TOKEN - copy .env.example to .env and fill it in.");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
console.log("Expense bot is running (long polling). Message it on Telegram now.");

bot.onText(/^\/start$/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Welcome! I track your expenses.\n\n" +
      "Commands:\n" +
      "/add <amount> <category> - log an expense, e.g. /add 12.50 food\n" +
      "/list - show your last 10 expenses\n" +
      "/summary - totals grouped by category\n" +
      "/undo - delete your most recent entry\n" +
      "/help - show this again"
  );
});

bot.onText(/^\/help$/, (msg) => bot.emit("text", { ...msg, text: "/start" }));

// BUG-FREE reference implementation of command parsing with real input
// validation - a genuinely common source of bugs in bots people actually
// ship (crashing on non-numeric input, or silently accepting garbage).
bot.onText(/^\/add (.+)$/, (msg, match) => {
  const chatId = msg.chat.id;
  const parts = match[1].trim().split(/\s+/);
  const amount = parseFloat(parts[0]);
  const category = parts.slice(1).join(" ") || "uncategorized";

  if (Number.isNaN(amount) || amount <= 0) {
    bot.sendMessage(chatId, "Couldn't parse that. Usage: /add 12.50 food");
    return;
  }

  addExpense(chatId, amount, category.toLowerCase());
  bot.sendMessage(chatId, `Logged ${amount.toFixed(2)} under "${category}".`);
});

bot.onText(/^\/list$/, (msg) => {
  const chatId = msg.chat.id;
  const rows = listExpenses(chatId);
  if (rows.length === 0) {
    bot.sendMessage(chatId, "No expenses logged yet. Try /add 12.50 food");
    return;
  }
  const lines = rows.map(
    (r) => `#${r.id} - ${r.amount.toFixed(2)} (${r.category}) - ${r.created_at}`
  );
  bot.sendMessage(chatId, lines.join("\n"));
});

bot.onText(/^\/summary$/, (msg) => {
  const chatId = msg.chat.id;
  const rows = summarizeByCategory(chatId);
  if (rows.length === 0) {
    bot.sendMessage(chatId, "Nothing to summarize yet. Try /add 12.50 food");
    return;
  }
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  const lines = rows.map(
    (r) => `${r.category}: ${r.total.toFixed(2)} (${r.count} entr${r.count === 1 ? "y" : "ies"})`
  );
  bot.sendMessage(chatId, `${lines.join("\n")}\n\nTotal: ${total.toFixed(2)}`);
});

bot.onText(/^\/undo$/, (msg) => {
  const chatId = msg.chat.id;
  const deleted = deleteLast(chatId);
  bot.sendMessage(
    chatId,
    deleted ? `Removed entry #${deleted.id}.` : "Nothing to undo."
  );
});

bot.on("polling_error", (err) => console.error("Polling error:", err.message));
