// Real-world pattern: a support inbox generates a stream of unstructured
// text, and something needs to turn each message into structured data
// (category, urgency, sentiment) fast enough to route it in real time -
// not batch-processed overnight. This is exactly the class of workload
// Groq is chosen for in production: its LPU inference hardware returns
// far more tokens/second than typical GPU-served inference, which matters
// a lot once you're running this per-message, live, at volume.

import "dotenv/config";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const tickets = [
  "URGENT!! I've been charged twice for my subscription and nobody is responding to my emails. This is the third time this has happened!!",
  "Hey, just wondering if there's a dark mode planned for the dashboard? Not a big deal, just curious :)",
  "The export button on the reports page does nothing when I click it. Chrome, latest version. Happened after today's update.",
  "Cancelling my account. The product stopped working for our team and support hasn't replied in 4 days.",
];

const SYSTEM_PROMPT = `You are a support ticket triage system. Given a raw customer message,
respond with ONLY a JSON object matching this exact shape:
{
  "category": "billing" | "bug" | "feature_request" | "account" | "other",
  "urgency": "low" | "medium" | "high",
  "sentiment": "positive" | "neutral" | "negative",
  "summary": "one sentence summary"
}`;

async function triageOne(ticketText) {
  const start = performance.now();

  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: ticketText },
    ],
    // JSON mode - the model is constrained to return valid JSON matching
    // what the system prompt describes, so this can be safely parsed
    // downstream (e.g. to actually route the ticket) without regex or a
    // fragile "hope it followed instructions" parse.
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const elapsedMs = performance.now() - start;
  const usage = completion.usage;
  const tokensPerSecond = usage
    ? Math.round((usage.completion_tokens / elapsedMs) * 1000)
    : null;

  return {
    result: JSON.parse(completion.choices[0].message.content),
    elapsedMs: Math.round(elapsedMs),
    tokensPerSecond,
  };
}

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY - copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  console.log(`Triaging ${tickets.length} tickets...\n`);

  for (const [i, ticket] of tickets.entries()) {
    const { result, elapsedMs, tokensPerSecond } = await triageOne(ticket);
    console.log(`--- Ticket ${i + 1} ---`);
    console.log(`Text: "${ticket.slice(0, 70)}${ticket.length > 70 ? "..." : ""}"`);
    console.log(`Category: ${result.category} | Urgency: ${result.urgency} | Sentiment: ${result.sentiment}`);
    console.log(`Summary: ${result.summary}`);
    console.log(`Latency: ${elapsedMs}ms (${tokensPerSecond} tokens/sec)\n`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
