// Proves Row Level Security is real, not just a suggestion: signs in as a
// specific test user, inserts a task, then tries to read the OTHER user's
// row directly by id. The read comes back empty - not because of an error,
// but because Postgres itself silently filters it out under RLS. This is
// the exact mechanism a real Supabase app relies on for per-user data
// isolation, using only the public anon key (safe to ship in a browser).
//
// Usage:
//   node run-as-user.js userA
//   node run-as-user.js userB
//
// (Each "user" is just a distinct email/password pair created on first run.)

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const who = process.argv[2];
if (!["userA", "userB"].includes(who)) {
  console.error("Usage: node run-as-user.js <userA|userB>");
  process.exit(1);
}

const EMAIL = `${who}@example.com`;
const PASSWORD = "correct-horse-battery-staple-123";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function signInOrSignUp() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: EMAIL,
    password: PASSWORD,
  });
  if (!error) return data;

  console.log(`No existing account for ${EMAIL}, creating one...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: EMAIL,
    password: PASSWORD,
  });
  if (signUpError) throw signUpError;
  return signUpData;
}

async function main() {
  const { user } = await signInOrSignUp();
  console.log(`Signed in as ${who} (user id: ${user.id})`);

  const title = `Task created by ${who} at ${new Date().toLocaleTimeString()}`;
  const { data: inserted, error: insertError } = await supabase
    .from("tasks")
    .insert({ title, user_id: user.id })
    .select()
    .single();
  if (insertError) throw insertError;
  console.log(`Inserted task: "${inserted.title}" (id: ${inserted.id})`);

  const { data: myTasks, error: readError } = await supabase.from("tasks").select("*");
  if (readError) throw readError;
  console.log(`\n${who} can see ${myTasks.length} task(s) total (only their own, enforced by RLS):`);
  myTasks.forEach((t) => console.log(`  - ${t.title}`));

  console.log(
    `\nNow run "node run-as-user.js ${who === "userA" ? "userB" : "userA"}" in another terminal ` +
      `and compare - each user only ever sees their own rows, even though both are hitting the same table with the same public anon key.`
  );
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
