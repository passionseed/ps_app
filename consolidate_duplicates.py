#!/usr/bin/env python3
"""
Consolidate duplicate Linear tickets by closing duplicates and linking to canonical.
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

# Get workflow states directly
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

# Use Passionseed Main team (where the issues are)
PS_TEAM_ID = "cf511658-c0c8-408e-85d7-c8f25d357366"

# Filter states for Passionseed Main team
team_states = [s for s in states if s["team"]["id"] == PS_TEAM_ID]
print(f"Team: Passionseed Main ({PS_TEAM_ID})")
print(f"Team states: {len(team_states)}")

backlog_state = next((s for s in team_states if s["name"] == "Backlog"), None)
done_state = next((s for s in team_states if s["name"] == "Done"), None)
canceled_state = next((s for s in team_states if s["name"] == "Canceled"), None)
duplicate_state = next((s for s in team_states if s["name"] == "Duplicate"), None)

# Fallback to any triage/cancelled state
if not canceled_state:
    canceled_state = next((s for s in team_states if "cancel" in s["name"].lower() or s["type"] == "canceled"), None)

print(f"Backlog state: {backlog_state['id'] if backlog_state else 'N/A'}")
print(f"Done state: {done_state['id'] if done_state else 'N/A'}")
print(f"Canceled state: {canceled_state['id'] if canceled_state else 'N/A'}")
print(f"Duplicate state: {duplicate_state['id'] if duplicate_state else 'N/A'}")

# Use Duplicate state if available, otherwise Canceled
target_state = duplicate_state if duplicate_state else canceled_state

if not target_state:
    print("\nNo Canceled state found! Available states:")
    for s in team_states:
        print(f"  - {s['name']} ({s['type']})")
    exit(1)

# Define duplicate groups: (canonical_id, [duplicate_ids])
DUPLICATE_GROUPS = [
    # Expert conversations
    ("925a3886-b535-4276-b7b6-a7c422efccd3", ["4d417352-f93a-492d-bf43-7a912cfb4aca", "e4a96dfb-0ba2-43ae-afee-0083ed1dbf7a", "366b0e86-793e-4587-93c4-1c991914e7a7"]),
    # Expert pipeline
    ("9d806955-d056-452b-ab81-ead6d1075444", ["c097c382-0614-47ac-b208-c8d6683d31cb", "7283ab00-5ca6-4b1e-885b-17b1b6bf4097"]),
    # Localization
    ("18d3555d-91bb-4c49-8819-3c1efb1ef9cf", ["b4754ccc-c4c3-4bc4-8765-4cf769625b61", "0c434697-c423-4491-957d-5005ffc2246f", "9dca9c5b-0aae-4df7-9f00-74a663f84d85"]),
    # Path requests
    ("19efbffc-7fea-4e04-9c00-28b9ad2ddf28", ["643c5be4-280a-4fa7-84a6-4d763ea8f4b3", "3ff9b7ec-4364-4be7-88ab-8e782a746292"]),
    # Analytics
    ("249c9242-d2f9-4989-bc77-81f9dd00732d", ["9d77dd8e-2375-42b1-a5a2-c0655260ed51"]),
    # CS test drive
    ("fe1f63cc-e4e5-4286-837d-6e46a147deef", ["4f020da1-85c1-461b-9aff-6e46a147deef", "d21c4d7f-944c-47ec-9a5e-6eaa40362bac"]),
    # Reflection core
    ("e4e63a50-e4cc-44c2-885d-5a57946adcd0", ["a4e7993e-48fb-4285-ac45-0e09a1adf4a0", "3c1a96f9-dbc4-41a5-9816-ee81c040d149"]),
    # Reflection→DF
    ("aa3b0f5e-3875-4b7e-a71b-fc570176f6d0", ["6751c9b0-358f-483a-bf70-ff9a0b201689"]),
]

print("\n=== Consolidation Plan ===\n")
total_to_close = sum(len(dups) for _, dups in DUPLICATE_GROUPS)
for canonical, duplicates in DUPLICATE_GROUPS:
    print(f"Keep: #{canonical[:8]}")
    for dup in duplicates:
        print(f"  → Close: #{dup[:8]}")
    print()

print(f"Total to close: {total_to_close}\n")

closed = 0
failed = 0

def close_issue(issue_id, canonical_id):
    # Add comment
    comment_mutation = f'''
    mutation {{
        commentCreate(input: {{
            issueId: "{issue_id}",
            body: "Closing as duplicate of #{canonical_id[:8]} — see that ticket for the canonical version."
        }}) {{
            success
        }}
    }}
    '''
    comment_result = run_mutation(comment_mutation)
    
    # Update state to Duplicate
    update_mutation = f'''
    mutation {{
        issueUpdate(id: "{issue_id}", input: {{
            stateId: "{target_state['id']}",
        }}) {{
            success
            issue {{ id state {{ name }} }}
        }}
    }}
    '''
    result = run_mutation(update_mutation)
    if not result:
        print(f"  Empty response")
        return False
    if "errors" in result:
        print(f"  API Error: {result['errors'][0]['message']}")
        return False
    return result.get("data", {}).get("issueUpdate", {}).get("success", False)

for canonical, duplicates in DUPLICATE_GROUPS:
    for dup in duplicates:
        print(f"Closing #{dup[:8]}...")
        if close_issue(dup, canonical):
            closed += 1
            print(f"  ✓ Done")
        else:
            failed += 1
            print(f"  ✗ Failed")

print(f"\n=== Summary ===")
print(f"✓ Closed: {closed}")
print(f"✗ Failed: {failed}")
