#!/usr/bin/env python3
import requests
import os

LINEAR_API_KEY = os.getenv("LINEAR_API_KEY_BIG")
HEADERS = {
    "Content-Type": "application/json",
    "Authorization": LINEAR_API_KEY,
}

def run_query(query):
    response = requests.post(
        "https://api.linear.app/graphql",
        headers=HEADERS,
        json={"query": query}
    )
    response.raise_for_status()
    return response.json()

# Get all teams
team_query = """
query {
  teams {
    nodes {
      id
      name
    }
  }
}
"""
result = run_query(team_query)
teams = result["data"]["teams"]["nodes"]

print("=== Teams ===\n")
for team in teams:
    print(f"Team: {team['name']} ({team['id']})")

# Get workflow states
state_query = """
query {
  workflowStates {
    nodes {
      id
      name
      type
      team { id name }
    }
  }
}
"""
state_result = run_query(state_query)
states = state_result["data"]["workflowStates"]["nodes"]

print("\n=== Workflow States by Team ===\n")
states_by_team = {}
for s in states:
    tid = s["team"]["id"]
    tname = s["team"]["name"]
    if tid not in states_by_team:
        states_by_team[tid] = {"name": tname, "states": []}
    states_by_team[tid]["states"].append(s)

for tid, data in states_by_team.items():
    print(f"Team: {data['name']} ({tid})")
    for s in data["states"]:
        print(f"  - {s['name']} ({s['type']}): {s['id']}")
    print()

# Get some issues
issue_query = """
query {
  issues(first: 10) {
    nodes {
      id
      title
      team { id name }
      state { id name }
    }
  }
}
"""
issue_result = run_query(issue_query)
print("\n=== Sample Issues ===\n")
for issue in issue_result["data"]["issues"]["nodes"]:
    print(f"#{issue['id'][:8]}: {issue['title'][:50]}")
    print(f"  Team: {issue['team']['name']} ({issue['team']['id']})")
    print(f"  State: {issue['state']['name']}")
    print()
