## 2024-04-12 - [Implemented Iframe Facade for YouTube Videos]
**Learning:** YouTube iframes are extremely heavy, each adding ~1.2MB of JavaScript and 20+ network requests even before being played. For pages with multiple videos (like this studio), loading all iframes immediately severely impacts Lighthouse performance scores and Time to Interactive (TTI).
**Action:** Always use a "facade" pattern for third-party embeds. Render a lightweight thumbnail and a play button placeholder first, and only swap it with the actual iframe upon user interaction. This reduces initial page weight by ~90% on media-heavy pages.

**Impact Metrics:**
- **Initial Page Weight:** Reduced by ~11.8MB (10 videos * 1.2MB overhead vs ~200KB total thumbnails).
- **Network Requests:** Reduced by ~200 initial requests.
- **TTI:** Significant improvement as the main thread is no longer blocked by third-party script execution.
