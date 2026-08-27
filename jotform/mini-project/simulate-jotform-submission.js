// Sends a realistically-shaped fake Jotform webhook payload to your local
// receiver, so you can test the parsing and triage logic before ever
// connecting a real Jotform account. Real Jotform webhook payloads are
// multipart/form-data with a "rawRequest" field containing a JSON string
// of auto-generated question keys - this mirrors that exactly.
//
// Run: node simulate-jotform-submission.js
// (webhook-server.js must already be running)

const rawRequest = {
  q3_name: { first: "Jordan", last: "Lee" },
  q4_email: "jordan.lee@example.com",
  q5_severity: "High",
  q6_description: "The export button on the reports page throws a 500 error every time.",
};

const form = new FormData();
form.append("formID", "123456789012345");
form.append("submissionID", "5555555555555555555");
form.append("formTitle", "Bug Report Intake");
form.append("rawRequest", JSON.stringify(rawRequest));

const res = await fetch("http://localhost:3300/webhook", {
  method: "POST",
  body: form,
});

console.log(`Response: ${res.status} ${await res.text()}`);
