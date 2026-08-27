// The other real integration pattern besides webhooks: pulling submissions
// directly from the Jotform REST API. Useful for a nightly export, a
// backfill, or any case where you don't want to (or can't) register a live
// webhook - e.g. building a report of everything submitted this week.

import "dotenv/config";

const API_KEY = process.env.JOTFORM_API_KEY;
const FORM_ID = process.env.JOTFORM_FORM_ID;

if (!API_KEY || !FORM_ID) {
  console.error("Missing JOTFORM_API_KEY or JOTFORM_FORM_ID - copy .env.example to .env and fill it in.");
  process.exit(1);
}

async function main() {
  const url = `https://api.jotform.com/form/${FORM_ID}/submissions?apiKey=${API_KEY}&limit=20&orderby=created_at`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.responseCode !== 200) {
    console.error("Jotform API error:", data.message);
    process.exit(1);
  }

  const submissions = data.content;
  console.log(`Fetched ${submissions.length} submission(s) for form ${FORM_ID}:\n`);

  for (const sub of submissions) {
    const answers = Object.values(sub.answers || {})
      .map((a) => `${a.text}: ${JSON.stringify(a.answer)}`)
      .join(" | ");
    console.log(`#${sub.id} (${sub.created_at}) - ${answers}`);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
