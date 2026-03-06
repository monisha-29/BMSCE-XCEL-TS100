import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def create_jira_issue(action_item, jira_config=None):
    """
    Creates a single Jira issue from an action item dictionary.
    Requires jira_config with: jiraUrl, jiraProjectKey, jiraEmail, jiraApiToken.
    """
    if not jira_config:
        print("No Jira config provided — skipping ticket creation.")
        return False

    jira_url = jira_config.get("jiraUrl", "")
    project_key = jira_config.get("jiraProjectKey", "")
    jira_email = jira_config.get("jiraEmail", "")
    jira_token = jira_config.get("jiraApiToken", "")

    if not all([jira_url, project_key, jira_email, jira_token]):
        print("Incomplete Jira config — skipping ticket creation.")
        return False

    url = f"{jira_url}/rest/api/3/issue"
    summary = action_item.get("Summary", "Action Item")
    priority = action_item.get("Priority", "Medium")
    deadline = action_item.get("Due date")

    payload = json.dumps({
        "fields": {
            "project": {"key": project_key},
            "summary": summary,
            "description": {
                "content": [{
                    "content": [{"text": summary, "type": "text"}],
                    "type": "paragraph"
                }],
                "type": "doc",
                "version": 1
            },
            "issuetype": {"name": "Task"},
            "priority": {"name": priority},
            **({"duedate": deadline} if deadline and deadline != "N/A" else {})
        }
    })

    try:
        response = requests.post(
            url,
            data=payload,
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            auth=(jira_email, jira_token)
        )
        response.raise_for_status()
        print(f"Created Jira issue: {response.json().get('key')}")
        return True
    except requests.exceptions.HTTPError as err:
        print(f"Jira error: {err}")
        return False