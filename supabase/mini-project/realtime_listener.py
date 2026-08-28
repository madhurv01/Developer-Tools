#!/usr/bin/env python3
# Subscribes to live database changes on the tasks table - the same
# mechanism a real collaborative app (a shared board, a live dashboard, a
# chat app) uses to push updates to every connected client the instant a
# row changes, with no polling and no custom WebSocket server to write.
#
# Run this, then in ANOTHER terminal run "python run_as_user.py userA" -
# the insert shows up here in real time.
#
# Realtime in supabase-py requires the async client, since it's backed by
# a websocket connection under the hood.

import asyncio
import os

from dotenv import load_dotenv
from supabase import acreate_client

load_dotenv()


def on_change(payload):
    print(f"[{payload['eventType']}]")
    print(payload.get("new") or payload.get("old"))
    print("---")


async def main():
    supabase = await acreate_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_ANON_KEY"])

    print("Listening for changes on public.tasks ... (Ctrl+C to stop)")
    print("In another terminal, run: python run_as_user.py userA\n")

    channel = supabase.channel("tasks-changes")
    channel.on_postgres_changes(
        event="*", schema="public", table="tasks", callback=on_change
    )
    await channel.subscribe()

    print("Subscribed successfully - waiting for changes...\n")
    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    asyncio.run(main())
