#!/usr/bin/env python3
"""
Add beta testers to Apple TestFlight via App Store Connect API.

Setup:
1. Go to App Store Connect → Users & Access → Keys
2. Create an API key with "App Manager" access
3. Download the .p8 file (only once!)
4. Note the Key ID and Issuer ID
5. Install dependencies: pip install pyjwt requests

Usage:
  python add_testflight_testers.py --key-id YOUR_KEY_ID --issuer-id YOUR_ISSUER_ID --auth-key /path/to/AuthKey_XXXXXXX.p8 --emails beta_tester_emails.txt
"""

import argparse
import jwt
import requests
import time
from datetime import datetime, timedelta

# App Store Connect API
API_URL = "https://api.appstoreconnect.apple.com/v1"

def create_jwt_token(key_id: str, issuer_id: str, auth_key_path: str) -> str:
    """Generate JWT token for App Store Connect API authentication."""
    with open(auth_key_path, 'r') as f:
        private_key = f.read()
    
    payload = {
        'iss': issuer_id,
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(minutes=5),
        'aud': 'appstoreconnect-v1',
    }
    
    headers = {
        'alg': 'ES256',
        'kid': key_id,
    }
    
    token = jwt.encode(payload, private_key, algorithm='ES256', headers=headers)
    return token

def add_beta_tester(email: str, token: str, dry_run: bool = False) -> dict:
    """Add a single beta tester to TestFlight."""
    if dry_run:
        return {'status': 'dry_run', 'email': email}
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json',
    }
    
    payload = {
        'data': {
            'type': 'betaTesters',
            'attributes': {
                'email': email,
                'firstName': '',
                'lastName': '',
            },
            'relationships': {
                'betaGroups': {
                    'data': [
                        # You can add specific beta group IDs here if needed
                    ]
                }
            }
        }
    }
    
    response = requests.post(
        f'{API_URL}/betaTesters',
        headers=headers,
        json=payload
    )
    
    if response.status_code == 201:
        return {'status': 'success', 'email': email, 'response': response.json()}
    elif response.status_code == 409:
        return {'status': 'exists', 'email': email, 'error': 'Tester already exists'}
    else:
        return {'status': 'error', 'email': email, 'error': response.text}

def main():
    parser = argparse.ArgumentParser(description='Add beta testers to TestFlight')
    parser.add_argument('--key-id', required=True, help='App Store Connect API Key ID')
    parser.add_argument('--issuer-id', required=True, help='App Store Connect Issuer ID')
    parser.add_argument('--auth-key', required=True, help='Path to AuthKey_XXXXXXX.p8 file')
    parser.add_argument('--emails', required=True, help='Path to file with emails (one per line)')
    parser.add_argument('--dry-run', action='store_true', help='Do not actually add testers')
    parser.add_argument('--delay', type=float, default=0.5, help='Delay between requests (seconds)')
    
    args = parser.parse_args()
    
    # Read emails
    with open(args.emails, 'r') as f:
        emails = [line.strip() for line in f if line.strip() and line.strip() != 'null']
    
    print(f"Found {len(emails)} emails to process")
    if args.dry_run:
        print("DRY RUN MODE - no testers will be added\n")
    
    # Generate JWT token
    print("Generating JWT token...")
    token = create_jwt_token(args.key_id, args.issuer_id, args.auth_key)
    
    # Add testers
    results = {'success': 0, 'exists': 0, 'error': 0, 'dry_run': 0}
    
    for i, email in enumerate(emails, 1):
        print(f"[{i}/{len(emails)}] Processing: {email}")
        result = add_beta_tester(email, token, args.dry_run)
        results[result['status']] = results.get(result['status'], 0) + 1
        
        if result['status'] == 'success':
            print(f"  ✓ Added successfully")
        elif result['status'] == 'exists':
            print(f"  ⚠ Already exists")
        elif result['status'] == 'error':
            print(f"  ✗ Error: {result.get('error', 'Unknown')}")
        elif result['status'] == 'dry_run':
            print(f"  - Would add (dry run)")
        
        # Rate limiting
        if not args.dry_run and i < len(emails):
            time.sleep(args.delay)
    
    # Summary
    print(f"\n{'='*50}")
    print(f"Summary:")
    print(f"  Success:  {results['success']}")
    print(f"  Exists:   {results['exists']}")
    print(f"  Errors:   {results['error']}")
    if args.dry_run:
        print(f"  Dry run:  {results['dry_run']}")
    print(f"  Total:    {len(emails)}")

if __name__ == '__main__':
    main()
