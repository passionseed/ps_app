#!/usr/bin/env python3
"""
Consolidate duplicate Linear tickets.
"""
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

def run_mutation(mutation):
    response = requests.post(
        "https://api.linear.app/graphql",
        headers=HEADERS,
        json={"query": mutation}
    )
    response.raise_for_status()
    return response.json()

# Get all issues
query = """
query {
  issues(first: 100) {
    nodes {
      id
      title
      description
      state { name id }
      createdAt
      updatedAt
      project { name id }
      labels { nodes { name id } }
    }
  }
}
"""
result = run_query(query)
issues = result["data"]["issues"]["nodes"]

# Filter to backlog only (exclude completed, in progress, started)
backlog_issues = [i for i in issues if i["state"]["name"] == "Backlog"]

print(f"Total issues: {len(issues)}")
print(f"Backlog only: {len(backlog_issues)}")

# Group by keywords - find duplicates
keywords = [
    ("expert", "Expert interviews/conversations"),
    ("localization", "Localization/i18n"),
    ("onboarding", "Onboarding flow"),
    ("notification", "Notifications"),
    ("certificate", "Seed certificates"),
    ("badge", "Seed badges"),
    ("path", "Learning paths"),
    ("tcas", "TCAS"),
    ("portfolio", "Portfolio"),
    ("reflection", "Reflections"),
    ("chat", "AI chat"),
    ("dashboard", "Dashboard"),
    ("analytics", "Analytics"),
    ("mobile", "Mobile app"),
    ("backend", "Backend"),
    ("auth", "Authentication"),
    ("supabase", "Supabase"),
    ("test", "Testing"),
]

print("\n=== Duplicate Groups ===\n")
duplicate_groups = []
for keyword, description in keywords:
    matches = [i for i in backlog_issues if keyword.lower() in i["title"].lower()]
    if len(matches) > 1:
        print(f"{description} ({keyword}): {len(matches)} tickets")
        for m in matches:
            print(f"  - {m['id']}: {m['title']}")
        print()
        duplicate_groups.append((keyword, matches))

# Save for review
import json
with open("linear_duplicates.json", "w") as f:
    json.dump({
        "total": len(issues),
        "backlog": len(backlog_issues),
        "groups": [(k, [{"id": m["id"], "title": m["title"], "desc": m["description"][:200]} for m in v]) for k, v in duplicate_groups]
    }, f, indent=2)

print(f"\nSaved analysis to linear_duplicates.json")
print(f"Found {len(duplicate_groups)} duplicate groups")
