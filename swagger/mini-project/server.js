// Contract-first API, the way real teams actually use OpenAPI/Swagger:
// openapi.yaml is not just fed to a docs page - it's loaded here and used
// by express-openapi-validator to REJECT any request that doesn't match the
// schema, before it ever reaches your route handler. This is the pattern
// that keeps a spec from silently drifting out of sync with the real API,
// which is the single biggest complaint about API docs in the industry.

import express from "express";
import swaggerUi from "swagger-ui-express";
import * as OpenApiValidator from "express-openapi-validator";
import YAML from "yamljs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.join(__dirname, "openapi.yaml");
const openapiDocument = YAML.load(specPath);

const app = express();
app.use(express.json());

// Interactive, always-in-sync docs generated directly from the same file
// that enforces the contract below - this is why "the docs are wrong" is
// structurally hard to happen in a setup like this.
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

// Every request from here down is validated against openapi.yaml BEFORE
// reaching a route handler. A request missing a required field, or with the
// wrong type, is rejected with a 400 automatically - the route handler
// never has to write that validation itself.
app.use(
  OpenApiValidator.middleware({
    apiSpec: specPath,
    validateRequests: true,
    validateResponses: true, // also catches OUR bugs: if a handler returns something that doesn't match the spec, this throws in development instead of silently shipping a broken contract.
  })
);

let books = [
  { id: 1, title: "Clean Code", author: "Robert C. Martin", price: 34.99, inStock: true },
  { id: 2, title: "The Pragmatic Programmer", author: "Andrew Hunt", price: 39.99, inStock: true },
];
let nextId = 3;

app.get("/books", (req, res) => {
  res.json(books);
});

app.post("/books", (req, res) => {
  // No manual validation here - express-openapi-validator already rejected
  // anything that didn't match the NewBook schema before this line ran.
  const book = { id: nextId++, inStock: true, ...req.body };
  books.push(book);
  res.status(201).json(book);
});

app.get("/books/:id", (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ message: "Book not found" });
  res.json(book);
});

app.delete("/books/:id", (req, res) => {
  const exists = books.some((b) => b.id === Number(req.params.id));
  if (!exists) return res.status(404).json({ message: "Book not found" });
  books = books.filter((b) => b.id !== Number(req.params.id));
  res.status(204).send();
});

// The validator's errors are structured OpenAPI validation errors - surface
// them as-is instead of a generic 500, which is what makes API consumers
// able to actually fix their request instead of guessing.
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    message: err.message,
    errors: err.errors,
  });
});

const PORT = 4001;
app.listen(PORT, () => {
  console.log(`Bookstore API running at http://localhost:${PORT}`);
  console.log(`Interactive docs (Swagger UI): http://localhost:${PORT}/docs`);
});
