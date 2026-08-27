// A real Jotform webhook receiver, for a bug-report intake form. Jotform
// POSTs a submission here the instant someone submits the form - as
// multipart/form-data, with the actual answers packed into a JSON string
// in the "rawRequest" field. This is exactly the real payload shape you
// have to parse when integrating Jotform with your own backend, and it's
// the same "expose a local receiver publicly" pattern as the ngrok mini
// project in this repo - see this README's Step 4 for wiring the two together.

import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const upload = multer(); // parses multipart/form-data text fields, no files needed here

const app = express();
const PORT = 3300;

const SUBMISSIONS_LOG = path.join(__dirname, "submissions.log");
const URGENT_LOG = path.join(__dirname, "urgent-issues.log");

function appendLog(file, line) {
  fs.appendFileSync(file, `[${new Date().toISOString()}] ${line}\n`);
}

// Finds an answer by matching part of the QUESTION TEXT, since Jotform's
// rawRequest keys are auto-generated ("q4_severity", "q7_stepsTo_reproduce")
// and shift whenever a form is edited - matching on the human-readable
// question text embedded in the key is the realistic, resilient way to do
// this instead of hardcoding exact key names that break the moment someone
// edits the form in the Jotform builder.
function findAnswer(rawRequest, questionFragment) {
  const key = Object.keys(rawRequest).find((k) =>
    k.toLowerCase().includes(questionFragment.toLowerCase())
  );
  return key ? rawRequest[key] : null;
}

app.get("/", (req, res) => {
  res.send("Jotform webhook receiver is up. POST submissions to /webhook");
});

app.post("/webhook", upload.none(), (req, res) => {
  const { formID, submissionID, formTitle } = req.body;

  let rawRequest = {};
  try {
    rawRequest = JSON.parse(req.body.rawRequest || "{}");
  } catch {
    console.warn("Could not parse rawRequest - responding 200 anyway so Jotform doesn't retry forever");
    return res.status(200).send("OK");
  }

  const severity = (findAnswer(rawRequest, "severity") || "unknown").toString();
  const description = findAnswer(rawRequest, "description") || "(no description field found)";
  const reporterEmail = findAnswer(rawRequest, "email") || "(no email field found)";

  const summary = `Form "${formTitle}" | Submission ${submissionID} | Severity: ${severity} | From: ${reporterEmail}`;
  console.log(summary);
  appendLog(SUBMISSIONS_LOG, summary);

  // Real triage logic: route high-severity bug reports somewhere that
  // actually gets noticed immediately, instead of sitting in a shared
  // inbox with everything else - the entire point of wiring a form to a
  // webhook instead of just emailing form results to a mailbox.
  if (/high|critical|urgent/i.test(severity)) {
    const urgentLine = `${summary} | Description: ${description}`;
    console.log(`URGENT SUBMISSION DETECTED: ${urgentLine}`);
    appendLog(URGENT_LOG, urgentLine);
  }

  // Jotform expects a 200 response to consider the webhook delivered - if
  // your endpoint returns an error, Jotform will retry the delivery.
  res.status(200).send("OK");
});

app.listen(PORT, () => {
  console.log(`Jotform webhook receiver listening on http://localhost:${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`Next: run "ngrok http ${PORT}" to get a public URL for a real Jotform webhook.`);
});
