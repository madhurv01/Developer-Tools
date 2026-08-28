#!/usr/bin/env python3
# Proves Row Level Security is real, not just a suggestion: signs in as a
# specific test user, inserts a task, then reads back the table. The read
# comes back with only THAT user's rows - not because of application code
# filtering it, but because Postgres itself silently filters it out under
# RLS. This is the exact mechanism a real Supabase app relies on for
# per-user data isolation, using only the public anon key (safe to ship in
# a browser).
#
# Usage:
#   python run_as_user.py userA
#   python run_as_user.py userB
#
# (Each "user" is just a distinct email/password pair created on first run.)

import os
import sys
from datetime import datetime

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

PASSWORD = "correct-horse-battery-staple-123"


def sign_in_or_sign_up(supabase, email):
    try:
        result = supabase.auth.sign_in_with_password({"email": email, "password": PASSWORD})
        return result.user
    except Exception:
        print(f"No existing account for {email}, creating one...")
        result = supabase.auth.sign_up({"email": email, "password": PASSWORD})
        return result.user


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("userA", "userB"):
        raise SystemExit("Usage: python run_as_user.py <userA|userB>")
    who = sys.argv[1]
    email = f"{who}@example.com"

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])

    user = sign_in_or_sign_up(supabase, email)
    print(f"Signed in as {who} (user id: {user.id})")

    title = f"Task created by {who} at {datetime.now().strftime('%H:%M:%S')}"
    inserted = (
        supabase.table("tasks").insert({"title": title, "user_id": user.id}).execute()
    )
    inserted_row = inserted.data[0]
    print(f'Inserted task: "{inserted_row["title"]}" (id: {inserted_row["id"]})')

    my_tasks = supabase.table("tasks").select("*").execute().data
    print(f"\n{who} can see {len(my_tasks)} task(s) total (only their own, enforced by RLS):")
    for t in my_tasks:
        print(f"  - {t['title']}")

    other = "userB" if who == "userA" else "userA"
    print(
        f'\nNow run "python run_as_user.py {other}" in another terminal '
        "and compare - each user only ever sees their own rows, even though both are hitting "
        "the same table with the same public anon key."
    )


if __name__ == "__main__":
    main()
