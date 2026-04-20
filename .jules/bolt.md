## 2024-04-12 - [Implemented Iframe Facade for YouTube Videos]
**Learning:** YouTube iframes are extremely heavy, each adding ~1.2MB of JavaScript and 20+ network requests even before being played. For pages with multiple videos (like this studio), loading all iframes immediately severely impacts Lighthouse performance scores and Time to Interactive (TTI).
**Action:** Always use a "facade" pattern for third-party embeds. Render a lightweight thumbnail and a play button placeholder first, and only swap it with the actual iframe upon user interaction. This reduces initial page weight by ~90% on media-heavy pages.

**Impact Metrics:**
- **Initial Page Weight:** Reduced by ~11.8MB (10 videos * 1.2MB overhead vs ~200KB total thumbnails).
- **Network Requests:** Reduced by ~200 initial requests.
- **TTI:** Significant improvement as the main thread is no longer blocked by third-party script execution.

## 2024-05-22 - [Edge Caching for YouTube API Proxy]
**Learning:** Sequential API calls (Channels -> PlaylistItems) in a Cloudflare Worker can lead to high TTFB (~400ms+). Implementing the Cache API at the Edge and using `cf: { cacheTtl }` for internal sub-requests reduces response times to <30ms and preserves API quotas.
**Action:** Always implement Edge Caching for read-only API proxies. Ensure that the Cache API (`caches.default`) is used with a proper `cacheKey` and that `ctx.waitUntil` is employed to keep the Worker alive during the cache write.

**Impact Metrics:**
- **TTFB:** Reduced from ~400ms to ~20ms (estimated).
- **Network Requests:** 0 external requests on cache hits.
- **Payload Stability:** Fixed ID mapping mismatch (videoId -> id) ensuring frontend compatibility.
