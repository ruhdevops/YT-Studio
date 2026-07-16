# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/shortcut.spec.js >> search shortcut / works
- Location: tests/shortcut.spec.js:1:47

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - generic [ref=e4]:
      - button "Ruh Al Tarikh - Back to Top" [ref=e5] [cursor=pointer]:
        - img [ref=e7]
        - generic [ref=e9]:
          - heading "Ruh Al Tarikh" [level=1] [ref=e10]
          - paragraph [ref=e11]: Cinematic Archive
      - navigation [ref=e12]:
        - button "Episodes" [ref=e13] [cursor=pointer]:
          - generic [ref=e14]: Episodes
        - button "Search" [ref=e15] [cursor=pointer]:
          - generic [ref=e16]: Search
      - generic [ref=e17]:
        - button "View Saved Episodes" [ref=e18] [cursor=pointer]:
          - generic [ref=e19]: "0"
        - button "View Dashboard" [ref=e20] [cursor=pointer]
        - link "Visit YouTube Channel" [ref=e21] [cursor=pointer]:
          - /url: https://www.youtube.com/@Ruh-Al-Tarikh
        - button "Toggle Theme" [ref=e23] [cursor=pointer]
        - generic [ref=e24]:
          - button "Archive" [pressed] [ref=e25]
          - button "Studio" [ref=e26]
  - main [ref=e27]:
    - region "Featured episode" [ref=e28]:
      - generic [ref=e32]:
        - generic [ref=e33]: Featured
        - heading "Exploring Islamic History" [level=2] [ref=e34]
        - paragraph [ref=e35]: Uncover deep insights into the Islamic civilization
        - generic [ref=e36]:
          - generic [ref=e37]: History
          - generic [ref=e38]: Recently added
        - generic [ref=e39]:
          - button "Watch Featured Episode" [ref=e40] [cursor=pointer]:
            - generic [ref=e41]: Watch Now
          - button "Save Featured Episode for Later" [ref=e42] [cursor=pointer]:
            - generic [ref=e43]: Save
    - region "Archive statistics" [ref=e44]:
      - generic [ref=e46]:
        - generic [ref=e49] [cursor=pointer]:
          - paragraph [ref=e50]: Total Episodes
          - paragraph [ref=e51]: "0"
        - generic [ref=e54] [cursor=pointer]:
          - paragraph [ref=e55]: Hours of Content
          - paragraph [ref=e56]: 0h
        - generic [ref=e59] [cursor=pointer]:
          - paragraph [ref=e60]: Saved Episodes
          - paragraph [ref=e61]: "0"
        - generic [ref=e64] [cursor=pointer]:
          - paragraph [ref=e65]: Most Watched
          - paragraph [ref=e66]: "0"
    - region "Episodes" [ref=e67]:
      - generic [ref=e69]:
        - heading "Episode Archive" [level=2] [ref=e70]
        - paragraph [ref=e71]: Loading episodes...
  - heading [level=2] [ref=e74]: Watch Later
  - generic [ref=e76]:
    - heading [level=2] [ref=e78]: Dashboard
    - generic [ref=e79]:
      - generic [ref=e80]:
        - generic [ref=e81]:
          - paragraph [ref=e82]: Episodes Loaded
          - paragraph [ref=e83]: "0"
        - generic [ref=e84]:
          - paragraph [ref=e85]: Saved Episodes
          - paragraph [ref=e86]: "0"
        - generic [ref=e87]:
          - paragraph [ref=e88]: Watch Progress
          - paragraph [ref=e89]: 0%
      - heading [level=3] [ref=e91]: Creator Analytics
      - generic [ref=e94]:
        - generic [ref=e95]:
          - heading [level=3] [ref=e96]: AI Creator Assistant
          - generic [ref=e97]: BETA
        - generic [ref=e98]:
          - generic [ref=e99]:
            - text: Video Title Scorer
            - generic [ref=e100]:
              - textbox [ref=e101]:
                - /placeholder: Enter title to score...
              - button [ref=e102] [cursor=pointer]: Score
          - generic [ref=e103]:
            - text: Viral Hook Generator
            - button [ref=e104] [cursor=pointer]: Generate Viral Hook
          - generic [ref=e105]:
            - text: Topic Discovery
            - generic [ref=e106]:
              - button [ref=e107]: Ottoman Siege
              - button [ref=e108]: Andalusian Fall
              - button [ref=e109]: Modern Prophecy
      - heading [level=3] [ref=e111]: Category Distribution
  - generic [ref=e112]:
    - heading [level=2] [ref=e114]: Share Episode
    - generic [ref=e115]:
      - generic [ref=e116]:
        - text: "Link:"
        - textbox [ref=e117]
        - button [ref=e118] [cursor=pointer]: Copy Link
      - generic [ref=e119]:
        - button [ref=e120]
        - button [ref=e121]
        - button [ref=e122]
  - heading [level=2] [ref=e125]: Episode Notes
  - status [ref=e127]
  - contentinfo [ref=e128]:
    - generic [ref=e129]:
      - generic [ref=e130]:
        - generic [ref=e131]:
          - heading "Ruh Al Tarikh" [level=3] [ref=e132]
          - paragraph [ref=e133]: A cinematic archive exploring Islamic history, scripture, and contested ideas through a professional, high-fidelity lens.
          - generic [ref=e134]:
            - link "YouTube" [ref=e135] [cursor=pointer]:
              - /url: https://www.youtube.com/@Ruh-Al-Tarikh
            - link "Twitter" [ref=e136] [cursor=pointer]:
              - /url: "#"
            - link "Instagram" [ref=e137] [cursor=pointer]:
              - /url: "#"
        - generic [ref=e138]:
          - heading "Explore" [level=4] [ref=e139]
          - list [ref=e140]:
            - listitem [ref=e141]:
              - link "Archive" [ref=e142] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e143]:
              - link "Historical Analysis" [ref=e144] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e145]:
              - link "Scriptural Deep-Dives" [ref=e146] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e147]:
              - link "Prophetic Timeline" [ref=e148] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e149]:
          - heading "Studio" [level=4] [ref=e150]
          - list [ref=e151]:
            - listitem [ref=e152]:
              - link "Creator Workspace" [ref=e153] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e154]:
              - link "History Hub" [ref=e155] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e156]:
              - link "Research Tools" [ref=e157] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e158]:
              - link "API Documentation" [ref=e159] [cursor=pointer]:
                - /url: "#"
        - generic [ref=e160]:
          - heading "Support" [level=4] [ref=e161]
          - list [ref=e162]:
            - listitem [ref=e163]:
              - link "Help Center" [ref=e164] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e165]:
              - link "Terms of Service" [ref=e166] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e167]:
              - link "Privacy Policy" [ref=e168] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e169]:
              - link "Contact Us" [ref=e170] [cursor=pointer]:
                - /url: "#"
      - paragraph [ref=e172]: © 2024 Ruh Al Tarikh. Premium Studio Experience.
  - generic [ref=e175]:
    - generic [ref=e176]: "[plugin:vite:import-analysis] Failed to parse source for import analysis because the content contains invalid JS syntax. If you are using JSX, make sure to name the file with the .jsx or .tsx extension."
    - generic [ref=e177]: /app/js/app.js:901:93
    - generic [ref=e178]: "899 | if (channelStatsEl) { 900 | channelStatsEl.innerHTML = ` 901 | <span>📺 ${channelStats.subscribers?.toLocaleString()} subscribers</span> | ^ 902 | <span>👁️ ${channelStats.views?.toLocaleString()} views</span> 903 | <span>🎬 ${channelStats.videos} videos</span>"
    - generic [ref=e179]: at TransformPluginContext._formatLog (file:///app/node_modules/.pnpm/vite@8.0.11_@types+node@25.6.2_esbuild@0.28.0/node_modules/vite/dist/node/chunks/node.js:30390:39) at TransformPluginContext.error (file:///app/node_modules/.pnpm/vite@8.0.11_@types+node@25.6.2_esbuild@0.28.0/node_modules/vite/dist/node/chunks/node.js:30387:14) at TransformPluginContext.transform (file:///app/node_modules/.pnpm/vite@8.0.11_@types+node@25.6.2_esbuild@0.28.0/node_modules/vite/dist/node/chunks/node.js:27615:10) at async EnvironmentPluginContainer.transform (file:///app/node_modules/.pnpm/vite@8.0.11_@types+node@25.6.2_esbuild@0.28.0/node_modules/vite/dist/node/chunks/node.js:30179:14) at async loadAndTransform (file:///app/node_modules/.pnpm/vite@8.0.11_@types+node@25.6.2_esbuild@0.28.0/node_modules/vite/dist/node/chunks/node.js:24509:26) at async viteTransformMiddleware (file:///app/node_modules/.pnpm/vite@8.0.11_@types+node@25.6.2_esbuild@0.28.0/node_modules/vite/dist/node/chunks/node.js:24303:20)
    - generic [ref=e180]:
      - text: Click outside, press Esc key, or fix the code to dismiss.
      - text: You can also disable this overlay by setting
      - code [ref=e181]: server.hmr.overlay
      - text: to
      - code [ref=e182]: "false"
      - text: in
      - code [ref=e183]: vite.config.js
      - text: .
```

# Test source

```ts
> 1 | import{test,expect}from"@playwright/test";test("search shortcut / works",async({page:t})=>{await t.goto("http://localhost:5173"),await t.keyboard.press("/");t=await t.evaluate(()=>document.activeElement===document.getElementById("searchInput"));expect(t).toBe(!0)});
    |                                                                                                                                                                                                                                                                ^ Error: expect(received).toBe(expected) // Object.is equality
```