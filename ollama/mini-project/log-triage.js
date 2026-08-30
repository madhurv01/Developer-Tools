// A real, private log-triage assistant. The entire point of this mini
// project: sensitive server log data (which can contain internal hostnames,
// stack traces, even accidental secrets) is summarized by a real LLM that
// never leaves your machine - no API key, no request to any external
// server, nothing sent anywhere. Every call here goes to
// http://localhost:11434, Ollama's local API, which only exists because a
// model is running on this computer right now.
//
// Run: node log-triage.js
// (requires the "log-triage" model to exist - see README Step 2)

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logContents = readFileSync(path.join(__dirname, "sample.log"), "utf8");

async function main() {
  console.log("Sending log file to the LOCAL model at http://localhost:11434 ...");
  console.log("(No network request leaves this machine - check your network monitor if you don't believe it.)\n");

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "log-triage",
      prompt: logContents,
      stream: false,
    }),
  });

  if (!response.ok) {
    console.error(
      `Request failed (${response.status}). Is Ollama running, and have you created the "log-triage" model? See README Steps 1-2.`
    );
    process.exit(1);
  }

  const data = await response.json();
  console.log("--- Triage summary ---\n");
  console.log(data.response.trim());
}

main().catch((err) => {
  console.error("Error:", err.message);
  console.error("Is Ollama running? Try: ollama serve");
  process.exit(1);
});
