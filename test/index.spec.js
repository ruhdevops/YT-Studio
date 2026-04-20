import { describe, it, expect, vi } from 'vitest';

describe('Frontend API Configuration', () => {
  it('should use the correct production API endpoint', async () => {
    // This is a simple check to ensure the API URL is correct in the minified/concatenated js
    const fs = require('fs');
    const appJs = fs.readFileSync('js/app.js', 'utf8');
    expect(appJs).toContain('https://yt-studio-api.ruhdevopsytstudio.workers.dev');
  });
});
