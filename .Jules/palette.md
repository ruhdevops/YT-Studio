## 2025-04-12 - [Accessibility & Micro-UX in Video Galleries]
**Learning:** When dynamically rendering YouTube content, always include `title` on iframes and `alt` on thumbnails for screen reader accessibility. Adding a loading state in the container before the async fetch completes prevents "layout shift" feeling and informs the user something is happening.
**Action:** Ensure all dynamic media rendering includes appropriate ARIA/alt/title attributes and a visible loading state.
