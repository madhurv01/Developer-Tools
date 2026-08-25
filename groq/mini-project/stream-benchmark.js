// Measures the two numbers that actually matter for a real-time AI feature
// (a live chat UI, a voice agent, an autocomplete-style tool): time-to-
// first-token (how long a user stares at nothing before text appears) and
// sustained tokens/sec once generation is underway. Prints tokens to the
// terminal as they arrive, the same UX pattern a streaming chat UI relies
// on, so you can literally watch the speed instead of just reading a number.

import "dotenv/config";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function main() {
  if (!process.env.GROQ_API_KEY) {
    console.error("Missing GROQ_API_KEY - copy .env.example to .env and fill it in.");
    process.exit(1);
  }

  const prompt =
    "Explain, in about 150 words, why low-latency LLM inference matters for real-time voice agents.";

  console.log(`Prompt: "${prompt}"\n`);
  console.log("Streaming response (watch it arrive token by token):\n");

  const start = performance.now();
  let firstTokenAt = null;
  let tokenCount = 0;
  let fullText = "";

  const stream = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    if (token) {
      if (firstTokenAt === null) firstTokenAt = performance.now();
      tokenCount++;
      fullText += token;
      process.stdout.write(token);
    }
  }

  const end = performance.now();
  const timeToFirstTokenMs = Math.round(firstTokenAt - start);
  const totalMs = Math.round(end - start);
  const generationMs = Math.round(end - firstTokenAt);
  const tokensPerSecond = Math.round((tokenCount / generationMs) * 1000);

  console.log("\n\n--- Benchmark ---");
  console.log(`Time to first token: ${timeToFirstTokenMs}ms`);
  console.log(`Total response time: ${totalMs}ms`);
  console.log(`Approx tokens streamed: ${tokenCount}`);
  console.log(`Approx generation speed: ${tokensPerSecond} tokens/sec`);
  console.log(
    "\nCompare this time-to-first-token against a typical GPU-hosted API - " +
      "this gap is the entire reason Groq gets chosen for latency-sensitive, real-time AI features."
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
