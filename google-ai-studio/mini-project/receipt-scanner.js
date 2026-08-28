// This is the real "export" of a prompt prototyped visually in Google AI
// Studio: upload an image there, describe what you want back, click "Get
// code," and this is the shape of what it hands you - a real API call
// using the same model and the same response schema you tested in the
// browser. Multimodal input (an image, here) plus a strict JSON schema for
// the output is the actual reason to prototype in AI Studio first: seeing
// the model's real output against a real image, before writing a single
// line of code.
//
// Usage: node receipt-scanner.js path/to/receipt.jpg

import "dotenv/config";
import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import path from "path";

const imagePath = process.argv[2];
if (!imagePath) {
  console.error("Usage: node receipt-scanner.js path/to/receipt.jpg");
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error("Missing GEMINI_API_KEY - copy .env.example to .env and fill it in.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// The exact JSON shape this mini project's output must match - the model
// is constrained to fill this in, not just asked nicely to follow a format
// described in the prompt (contrast with plain "please respond in JSON").
const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    merchantName: { type: Type.STRING },
    date: { type: Type.STRING, description: "ISO 8601 date, e.g. 2024-03-14" },
    total: { type: Type.NUMBER },
    currency: { type: Type.STRING, description: "3-letter currency code, e.g. USD" },
    lineItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          amount: { type: Type.NUMBER },
        },
        required: ["description", "amount"],
      },
    },
  },
  required: ["merchantName", "total", "lineItems"],
};

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

async function main() {
  const imageBytes = fs.readFileSync(imagePath);
  const base64Image = imageBytes.toString("base64");

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: "Extract the structured data from this receipt image." },
          { inlineData: { mimeType: guessMimeType(imagePath), data: base64Image } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: receiptSchema,
    },
  });

  const extracted = JSON.parse(response.text);

  console.log("Extracted receipt data:\n");
  console.log(JSON.stringify(extracted, null, 2));

  const computedTotal = extracted.lineItems.reduce((sum, item) => sum + item.amount, 0);
  console.log(`\nLine items sum to: ${computedTotal.toFixed(2)}`);
  console.log(`Model reported total: ${extracted.total.toFixed(2)}`);
  if (Math.abs(computedTotal - extracted.total) > 0.01) {
    console.log("Mismatch - the model's total doesn't match its own line items. Worth flagging for manual review.");
  } else {
    console.log("Line items reconcile with the reported total.");
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
