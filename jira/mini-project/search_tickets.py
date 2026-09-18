#!/usr/bin/env python3
# The read side of the same automation: JQL (Jira Query Language) is how
# you query issues programmatically - the same query language you'd type
# into Jira's own search bar, callable directly from the REST API. Useful
# for dashboards, reports, or - as in create_ticket_from_ci_failure.py -
# checking for duplicates before creating something new.
#
# Run: python search_tickets.py

import os

import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.environ["JIRA_BASE_URL"].rstrip("/")
AUTH = (os.environ["JIRA_EMAIL"], os.environ["JIRA_API_TOKEN"])
PROJECT_KEY = os.environ["JIRA_PROJECT_KEY"]


def main():
    jql = f'project = {PROJECT_KEY} AND labels = "ci-failure" ORDER BY created DESC'
    res = requests.get(
        f"{BASE_URL}/rest/api/3/search",
        auth=AUTH,
        params={"jql": jql, "maxResults": 20, "fields": "summary,status,priority,created"},
    )
    res.raise_for_status()
    issues = res.json()["issues"]

    if not issues:
        print("No CI-failure tickets found.")
        return

    print(f"{len(issues)} CI-failure ticket(s):\n")
    for issue in issues:
        f = issue["fields"]
        print(f"{issue['key']} [{f['status']['name']}] ({f['priority']['name']}) - {f['summary']}")


if __name__ == "__main__":
    main()
