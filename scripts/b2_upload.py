#!/usr/bin/env python3
"""
B2 Backblaze file uploader for university logos.
Usage: python3 scripts/b2_upload.py <local_file> <dest_path>
"""

import sys
import os
from b2sdk.v2 import B2Api

def load_env():
    env = {}
    with open('.env', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env[k] = v
    return env

def upload_to_b2(local_file: str, dest_path: str) -> str:
    env = load_env()
    
    application_key_id = env.get('B2_APPLICATION_KEY_ID', '')
    application_key = env.get('B2_APPLICATION_KEY', '')
    bucket_name = env.get('B2_BUCKET_NAME', 'pseed-dev')
    
    b2_api = B2Api()
    b2_api.authorize_account('production', application_key_id, application_key)
    bucket = b2_api.get_bucket_by_name(bucket_name)
    
    bucket.upload_local_file(local_file=local_file, file_name=dest_path)
    
    # Return CDN URL (Cloudflare proxied)
    return f"https://cdn.passionseed.org/{dest_path}"

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("Usage: python3 scripts/b2_upload.py <local_file> <dest_path>", file=sys.stderr)
        sys.exit(1)
    
    local_file = sys.argv[1]
    dest_path = sys.argv[2]
    
    if not os.path.exists(local_file):
        print(f"Error: {local_file} not found", file=sys.stderr)
        sys.exit(1)
    
    url = upload_to_b2(local_file, dest_path)
    print(url)
