# A real task list backed by Postgres - the point of this mini project is
# NOT the app itself, it's that this code never hardcodes a host, port,
# username, or password anywhere. Railway provisions a Postgres database
# and automatically injects a full connection string into this service's
# environment as DATABASE_URL, over a private network - no manual copying
# of credentials between a database dashboard and your app's config, which
# is the actual, everyday friction Railway removes compared to wiring up a
# database and an app as two separately-managed things.

require "sinatra"
require "pg"
require "json"

set :bind, "0.0.0.0"
set :port, ENV.fetch("PORT", 4567)

def db
  # DATABASE_URL is provided automatically once a Postgres service is
  # attached to this project in Railway - both when deployed AND when
  # running locally via `railway run` (see README). No .env file to keep
  # in sync with a database dashboard.
  @db ||= PG.connect(ENV.fetch("DATABASE_URL"))
end

def ensure_schema
  db.exec(<<~SQL)
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  SQL
end

get "/" do
  ensure_schema
  tasks = db.exec("SELECT id, title, created_at FROM tasks ORDER BY id DESC")
  rows = tasks.map { |t| "<li>##{t['id']} #{t['title']} <small>(#{t['created_at']})</small></li>" }.join

  environment_name = ENV.fetch("RAILWAY_ENVIRONMENT_NAME", "local (not deployed)")

  <<~HTML
    <h1>Task List</h1>
    <p>Environment: <strong>#{environment_name}</strong></p>
    <form method="POST" action="/tasks">
      <input name="title" placeholder="New task" required>
      <button type="submit">Add</button>
    </form>
    <ul>#{rows}</ul>
  HTML
end

post "/tasks" do
  ensure_schema
  db.exec_params("INSERT INTO tasks (title) VALUES ($1)", [params["title"]])
  redirect "/"
end

get "/health" do
  content_type :json
  { status: "ok" }.to_json
end
