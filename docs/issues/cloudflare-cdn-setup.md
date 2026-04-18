# Issue: Set Up Cloudflare CDN for B2 Storage

## Status: Deferred / Backlog

## Current State

All 210 images have been successfully migrated from Supabase Storage to Backblaze B2 and are loading correctly via direct B2 URLs:

```
https://s3.us-east-005.backblazeb2.com/pseed-dev/webtoons/phase1-act1/phase1-act1-00.png
```

**Working:** ✅ HTTP 200, images load successfully
**Cost Savings:** ✅ 89% reduction (from $0.09/GB to $0.01/GB)

## Problem

Without Cloudflare CDN:
- ❌ No edge caching (every request hits US-East)
- ❌ 250ms+ latency for Thai users
- ❌ Paying B2 egress fees ($0.01/GB)

With Cloudflare CDN (goal):
- ✅ Edge caching at Bangkok (20-50ms latency)
- ✅ Zero egress cost (Cloudflare free tier)
- ✅ Better performance for Thai users

## Blockers

Cloudflare dashboard rewrite rules are not working as expected:
- Transform Rule gives HTTP 404
- Need proper Origin Rule configuration
- DNS is working but proxy/cache is not

## What Was Attempted

1. ✅ Created CNAME: `cdn.passionseed.org` → `s3.us-east-005.backblazeb2.com`
2. ✅ Enabled Cloudflare proxy (orange cloud)
3. ✅ Created Transform Rule (didn't work - HTTP 404)
4. ⚠️ Need to try: Origin Rules instead
5. ⚠️ Need to configure: B2 CORS for Cloudflare domain

## Files Ready

- `scripts/migrate-to-cloudflare-cdn.ts` - Updates DB URLs to Cloudflare
- `lib/b2Upload.ts` - Can generate Cloudflare URLs
- `supabase/functions/get-b2-upload-url/index.ts` - Returns Cloudflare URLs
- `docs/cloudflare-cdn-setup.md` - Configuration guide

## To Complete This Issue

### Step 1: Configure B2 CORS
In Backblaze B2 console:
```
✓ Share everything in this bucket with all HTTPS origins
✓ Apply to S3 Compatible API
```

### Step 2: Create Cloudflare Origin Rule
In Cloudflare dashboard (Rules → Origin Rules):
```
Rule name: B2 Origin Override
When: Hostname equals cdn.passionseed.org
Then:
  ✓ DNS record: Override to s3.us-east-005.backblazeb2.com
  ✓ Host header: Override to s3.us-east-005.backblazeb2.com
  ✓ Resolve override: /pseed-dev${http.request.uri.path}
```

### Step 3: Add Page Rule for Caching
In Cloudflare dashboard (Rules → Page Rules):
```
URL: cdn.passionseed.org/*
Settings:
  ☑️ Cache Level: Cache Everything
  ☑️ Edge Cache TTL: 1 month
  ☑️ Browser Cache TTL: 1 day
```

### Step 4: Test
```bash
# Should return HTTP 200 with cf-cache-status header
curl -I https://cdn.passionseed.org/webtoons/phase1-act1/phase1-act1-00.png
```

### Step 5: Run Migration
```bash
export $(cat ~/dev/pseed/.env.local | grep -E "^B2_" | xargs)
export $(cat .env | grep -E "^(SUPABASE|EXPO_PUBLIC)" | xargs)
npx tsx scripts/migrate-to-cloudflare-cdn.ts
```

## Impact

**Current (B2 direct):**
- Latency: ~250ms from Thailand
- Cost: $0.01/GB egress
- Status: Working ✅

**Future (B2 + Cloudflare):**
- Latency: ~20-50ms from Thailand
- Cost: $0 egress
- Status: Pending

## Priority

**LOW** - B2 direct is working fine. Cloudflare is an optimization for better performance, not a blocker.

Can be tackled when:
- More time available
- Cloudflare dashboard is cooperative
- Need better performance for Thai users
- Want to reduce costs further

## Related Files

- `lib/b2Upload.ts` - Upload logic (generates URLs)
- `docs/cloudflare-cdn-setup.md` - Full setup guide
- `scripts/migrate-to-cloudflare-cdn.ts` - URL migration script
- `supabase/functions/get-b2-upload-url/index.ts` - Edge function

## Notes

- All migration infrastructure is in place
- Code changes are minimal (just URL generation)
- Main blocker is Cloudflare dashboard configuration
- May need to try different rule types or contact Cloudflare support
