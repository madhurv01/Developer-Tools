#!/usr/bin/env python3
# Real-world pattern: a CI/CD pipeline failing should create a tracked,
# assignable ticket automatically - not just an email nobody reads or a
# red icon someone has to notice. This reads a (simulated) GitHub Actions
# "workflow_run" failure payload - the exact shape GitHub's own webhook
# sends - and turns it into a real Jira ticket via the REST API, with a
# duplicate-prevention check so a flaky CI job failing repeatedly doesn't
# spam the board with five copies of the same ticket.
#
# Run: python create_ticket_from_ci_failure.py

import json
import os
from pathlib import Path

from dotenv import load_dotenv

from jira_client import create_issue, find_existing_ticket

load_dotenv()

PROJECT_KEY = os.environ["JIRA_PROJECT_KEY"]


def main():
    payload = json.loads((Path(__file__).parent / "ci_failure_payload.json").read_text())

    run = payload["workflow_run"]
    repo = payload["repository"]["full_name"]
    branch = run["head_branch"]
    commit_message = run["head_commit"]["message"]
    author = run["head_commit"]["author"]["name"]
    run_url = run["html_url"]

    if run["conclusion"] != "failure":
        print("Workflow run did not fail - nothing to file.")
        return

    summary = f'CI failed: "{run["name"]}" on {branch} ({repo})'

    print(f"Checking for an existing open ticket matching: {summary}")
    existing = find_existing_ticket(PROJECT_KEY, summary)
    if existing:
        print(f"Already tracked as {existing['key']} - not creating a duplicate.")
        print(f"{os.environ['JIRA_BASE_URL']}/browse/{existing['key']}")
        return

    description = (
        f"CI workflow \"{run['name']}\" failed on branch {branch}.\n\n"
        f"Commit: {commit_message} (by {author})\n"
        f"Run: {run_url}\n\n"
        "Auto-filed from a CI failure event."
    )

    # Real, simple triage logic: a failure on the default branch is worse
    # than one on a feature branch - blocking everyone, not just one PR.
    priority = "High" if branch in ("main", "master") else "Medium"

    issue = create_issue(
        project_key=PROJECT_KEY,
        summary=summary,
        description_text=description,
        issue_type="Bug",
        priority=priority,
        labels=["ci-failure", f"branch-{branch}"],
    )

    print(f"Created {issue['key']} (priority: {priority})")
    print(f"{os.environ['JIRA_BASE_URL']}/browse/{issue['key']}")


if __name__ == "__main__":
    main()
