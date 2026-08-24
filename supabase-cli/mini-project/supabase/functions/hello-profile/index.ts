// A real Supabase Edge Function - runs on Deno, deployed globally in
// production, but served and iterated on entirely LOCALLY here via
// `supabase functions serve`, against the same local database the
// migrations above created. This is the actual point of the CLI: build and
// test the full backend - database, auth, and serverless functions -
// on your machine before anything touches production.

import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const username = url.searchParams.get("username");

  if (!username) {
    return new Response(
      JSON.stringify({ error: "Pass ?username=<name> in the query string" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // These env vars are injected automatically by `supabase functions serve`
  // when running locally, and by the platform when deployed - no manual
  // wiring needed either way.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("profiles")
    .select("username, bio, created_at")
    .eq("username", username)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ profile: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
