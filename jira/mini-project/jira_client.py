# A tiny wrapper around the real Jira Cloud REST API (v3) - deliberately
# thin, no SDK, so it's obvious exactly what an HTTP request to Jira looks
# like: Basic Auth with your email + an API token (never your account
# password), and issue content described in Atlassian Document Format
# (ADF) rather than plain strings, which is what the API actually expects
# for rich-text fields like description.

import os

import requests

BASE_URL = os.environ["JIRA_BASE_URL"].rstrip("/")
AUTH = (os.environ["JIRA_EMAIL"], os.environ["JIRA_API_TOKEN"])
HEADERS = {"Content-Type": "application/json"}


def adf_paragraph(text):
    """Wraps plain text in the minimal Atlassian Document Format Jira expects."""
    return {
        "type": "doc",
        "version": 1,
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}],
    }


def find_existing_ticket(project_key, summary):
    """
    Searches for an open ticket with this exact summary before creating a
    new one - the real, practical fix for the most common mistake in
    "webhook creates a ticket" automations: without this check, a CI job
    that fails five times in a row creates five duplicate tickets instead
    of one tracked issue.
    """
    jql = f'project = {project_key} AND summary ~ "{summary}" AND resolution = Unresolved'
    res = requests.get(
        f"{BASE_URL}/rest/api/3/search",
        auth=AUTH,
        headers=HEADERS,
        params={"jql": jql, "maxResults": 1},
    )
    res.raise_for_status()
    issues = res.json().get("issues", [])
    return issues[0] if issues else None


def create_issue(project_key, summary, description_text, issue_type="Bug", priority=None, labels=None):
    fields = {
        "project": {"key": project_key},
        "summary": summary,
        "description": adf_paragraph(description_text),
        "issuetype": {"name": issue_type},
    }
    if priority:
        fields["priority"] = {"name": priority}
    if labels:
        fields["labels"] = labels

    res = requests.post(
        f"{BASE_URL}/rest/api/3/issue",
        auth=AUTH,
        headers=HEADERS,
        json={"fields": fields},
    )
    res.raise_for_status()
    return res.json()
