# UX Journal - YT-Studio Fixes

## Critical Insights
- **Root Cause of Infinite Loading:** The JS was executing before the DOM was fully parsed, and there was no fallback for the primary API. Fetching the API also blocked the rendering of the "Loading..." state clearance.
- **App Isolation:** By wrapping the video system in #app-root, we ensure that future global UI changes (like adding more SaaS sections) won't accidentally target or break the video player's logic.
- **Typography:** The oversized H1 in the hero was dominating the UI. Normalizing it to 2.8rem (serif) creates a more premium, SaaS-like feel.

## Reusable UX Patterns
- **API Fallback:** Always provide a local data/*.json fallback for high-traffic or unreliable worker-based APIs in static sites.
- **Null-Safe Selectors:** Using if (!element) return; guards prevents JS crashes during partial DOM updates or structural refactors.

## Rejected Design Changes
- **React Migration:** Considered finishing the React migration mentioned in memory, but decided against it to avoid breaking existing legacy DOM logic as per instructions.

## 2025-05-22 - Accessibility and Cleanup
**Learning:** Redundant code and structural duplicates (like multiple modals) lead to inconsistent UX and accessibility gaps. Keyboard navigation (Enter/Space/Escape) and proper ARIA roles are essential for an inclusive video platform.
**Action:** Always audit the HTML for duplicates before adding new features and ensure all custom interactive elements (like div-based cards) have role="button" and keyboard listeners.
