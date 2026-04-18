# Cloudflare CDN Setup for passionseed.org

## DNS Configuration

Add this CNAME record in your Cloudflare DNS dashboard:

```
Type: CNAME
Name: cdn
Target: s3.us-east-005.backblazeb2.com
Proxy status: Proxied (orange cloud)
TTL: Auto
```

## Cloudflare Settings

### 1. SSL/TLS Mode
Set SSL/TLS to **Full (strict)** in Cloudflare dashboard:
- SSL/TLS → Overview → Full (strict)

### 2. Caching Configuration

**Caching Rules:**
```
Cache Level: Cache Everything
Edge Cache TTL: 1 month (for images)
Browser Cache TTL: 1 day
```

**Page Rules (if available on your plan):**
Create a page rule for `cdn.passionseed.org/*`:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 day

### 3. Origin Settings

In Cloudflare dashboard:
1. Go to **SSL/TLS** → **Origin Server**
2. No origin cert needed (B2 has valid SSL)

## URL Transformation

### Before (Direct B2):
```
https://s3.us-east-005.backblazeb2.com/pseed-dev/webtoons/phase1-act1/phase1-act1-00.png
```

### After (Cloudflare CDN):
```
https://cdn.passionseed.org/webtoons/phase1-act1/phase1-act1-00.png
```

## Benefits for Thai Users

1. **Faster Loading**: Images cached at Cloudflare Bangkok edge
2. **Lower Latency**: ~20-50ms from Bangkok vs ~250ms from US-East
3. **Zero Egress Cost**: Cloudflare doesn't charge for bandwidth
4. **Better Reliability**: Cloudflare's global network

## Verification

After setting up DNS, test with:
```bash
curl -I https://cdn.passionseed.org/webtoons/phase1-act1/phase1-act1-00.png
```

Should see `CF-Cache-Status: HIT` or `CF-Cache-Status: MISS` headers.

## Post-Setup Steps

1. Run the migration script to update existing URLs
2. Update the app to use cdn.passionseed.org for new uploads
3. Monitor Cloudflare Analytics for cache hit rates
