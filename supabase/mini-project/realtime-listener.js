// Subscribes to live database changes on the tasks table - the same
// mechanism a real collaborative app (a shared board, a live dashboard, a
// chat app) uses to push updates to every connected client the instant a
// row changes, with no polling and no custom WebSocket server to write.
//
// Run this, then in ANOTHER terminal run "node run-as-user.js userA" - the
// insert shows up here in real time.

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

console.log("Listening for changes on public.tasks ... (Ctrl+C to stop)");
console.log("In another terminal, run: node run-as-user.js userA\n");

supabase
  .channel("tasks-changes")
  .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
    console.log(`[${payload.eventType}] ${new Date().toLocaleTimeString()}`);
    console.log(payload.new ?? payload.old);
    console.log("---");
  })
  .subscribe((status) => {
    if (status === "SUBSCRIBED") {
      console.log("Subscribed successfully - waiting for changes...\n");
    }
  });
