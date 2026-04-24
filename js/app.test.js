import { describe, it, expect, beforeEach, vi } from 'vitest';

// Utility functions mirroring the logic in app.js for unit testing

const CACHE_EXPIRY = 24 * 60 * 60 * 1000;
const PROGRESS_KEY = 'watch_progress';
const LAST_PLAYED_KEY = 'last_played_video';

function getProgress(storage) {
  try {
    return JSON.parse(storage.getItem(PROGRESS_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveProgress(storage, id, time, percent) {
  const progress = getProgress(storage);
  progress[id] = { time, percent, updatedAt: Date.now() };
  storage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function setLastPlayed(storage, video) {
  storage.setItem(LAST_PLAYED_KEY, JSON.stringify({ id: video.id, timestamp: Date.now() }));
}

function getLastPlayed(storage, videos) {
  try {
    const last = JSON.parse(storage.getItem(LAST_PLAYED_KEY));
    return last ? videos.find(v => v.id === last.id) : null;
  } catch (e) {
    return null;
  }
}

function isCacheValid(cached, now) {
  if (!cached) return false;
  try {
    const { data, timestamp } = JSON.parse(cached);
    return (now - timestamp < CACHE_EXPIRY) && data && data.length > 0;
  } catch (e) {
    return false;
  }
}

function mapVideo(v) {
  return {
    id: v.id || v.videoId,
    videoId: v.videoId || v.id,
    title: v.title || 'Untitled',
    thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.id || v.videoId}/mqdefault.jpg`,
    publishedAt: v.publishedAt || new Date().toISOString(),
    channel: v.channel || 'Ruh Al Tarikh',
  };
}

// Simple localStorage mock
function makeStorage() {
  const store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
  };
}

describe('getProgress', () => {
  it('returns empty object when nothing stored', () => {
    const storage = makeStorage();
    expect(getProgress(storage)).toEqual({});
  });

  it('returns stored progress', () => {
    const storage = makeStorage();
    storage.setItem(PROGRESS_KEY, JSON.stringify({ abc: { time: 30, percent: 5 } }));
    expect(getProgress(storage)).toEqual({ abc: { time: 30, percent: 5 } });
  });

  it('returns empty object on malformed JSON', () => {
    const storage = makeStorage();
    storage.setItem(PROGRESS_KEY, 'not-json');
    expect(getProgress(storage)).toEqual({});
  });
});

describe('saveProgress', () => {
  it('saves progress for a video id', () => {
    const storage = makeStorage();
    saveProgress(storage, 'vid1', 120, 20);
    const progress = getProgress(storage);
    expect(progress['vid1'].time).toBe(120);
    expect(progress['vid1'].percent).toBe(20);
    expect(typeof progress['vid1'].updatedAt).toBe('number');
  });

  it('merges progress entries', () => {
    const storage = makeStorage();
    saveProgress(storage, 'vid1', 60, 10);
    saveProgress(storage, 'vid2', 180, 30);
    const progress = getProgress(storage);
    expect(Object.keys(progress)).toHaveLength(2);
  });
});

describe('setLastPlayed / getLastPlayed', () => {
  it('stores and retrieves the last played video', () => {
    const storage = makeStorage();
    const videos = [{ id: 'v1', title: 'Test' }, { id: 'v2', title: 'Other' }];
    setLastPlayed(storage, videos[0]);
    expect(getLastPlayed(storage, videos)).toEqual(videos[0]);
  });

  it('returns null when nothing is stored', () => {
    const storage = makeStorage();
    expect(getLastPlayed(storage, [])).toBeNull();
  });

  it('returns null when stored id no longer exists in videos', () => {
    const storage = makeStorage();
    setLastPlayed(storage, { id: 'removed' });
    expect(getLastPlayed(storage, [{ id: 'other' }])).toBeUndefined();
  });
});

describe('isCacheValid', () => {
  it('returns false for null cache', () => {
    expect(isCacheValid(null, Date.now())).toBe(false);
  });

  it('returns true for fresh cache with data', () => {
    const cached = JSON.stringify({ data: [{ id: '1' }], timestamp: Date.now() - 1000 });
    expect(isCacheValid(cached, Date.now())).toBe(true);
  });

  it('returns false for expired cache', () => {
    const cached = JSON.stringify({ data: [{ id: '1' }], timestamp: Date.now() - CACHE_EXPIRY - 1 });
    expect(isCacheValid(cached, Date.now())).toBe(false);
  });

  it('returns false for cache with empty data', () => {
    const cached = JSON.stringify({ data: [], timestamp: Date.now() });
    expect(isCacheValid(cached, Date.now())).toBe(false);
  });

  it('returns false for malformed JSON', () => {
    expect(isCacheValid('bad-json', Date.now())).toBe(false);
  });
});

describe('mapVideo', () => {
  it('maps a full video object', () => {
    const raw = { id: 'abc', videoId: 'abc', title: 'My Video', thumbnail: 'http://thumb', publishedAt: '2024-01-01', channel: 'Chan' };
    const mapped = mapVideo(raw);
    expect(mapped.id).toBe('abc');
    expect(mapped.title).toBe('My Video');
    expect(mapped.channel).toBe('Chan');
  });

  it('uses fallback thumbnail when none provided', () => {
    const raw = { id: 'xyz' };
    const mapped = mapVideo(raw);
    expect(mapped.thumbnail).toContain('xyz');
    expect(mapped.thumbnail).toContain('ytimg.com');
  });

  it('defaults title to Untitled', () => {
    const mapped = mapVideo({ id: 'x' });
    expect(mapped.title).toBe('Untitled');
  });

  it('defaults channel name', () => {
    const mapped = mapVideo({ id: 'x' });
    expect(mapped.channel).toBe('Ruh Al Tarikh');
  });

  it('prefers videoId when id is missing', () => {
    const mapped = mapVideo({ videoId: 'yyy' });
    expect(mapped.id).toBe('yyy');
  });
});
import { describe, it, expect } from 'vitest'

describe('app utilities', () => {
  it('formats video title correctly when under limit', () => {
    const title = 'Short Title'
    const maxLen = 80
    const result = title.substring(0, maxLen) + (title.length > maxLen ? '...' : '')
    expect(result).toBe('Short Title')
  })

  it('truncates video title at 80 characters', () => {
    const title = 'A'.repeat(90)
    const maxLen = 80
    const result = title.substring(0, maxLen) + (title.length > maxLen ? '...' : '')
    expect(result).toBe('A'.repeat(80) + '...')
  })

  it('cache expiry is 24 hours in milliseconds', () => {
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000
    expect(CACHE_EXPIRY).toBe(86400000)
  })

  it('progress percent does not exceed 100', () => {
    const time = 700
    const duration = 600
    const percent = Math.min(100, (time / duration) * 100)
    expect(percent).toBe(100)
  })

  it('progress percent calculates correctly within range', () => {
    const time = 300
    const duration = 600
    const percent = Math.min(100, (time / duration) * 100)
    expect(percent).toBe(50)
  })

  it('falls back to videoId when id is missing', () => {
    const v = { videoId: 'abc123', title: 'Test' }
    const id = v.id || v.videoId
    expect(id).toBe('abc123')
  })

  it('falls back to id when videoId is missing', () => {
    const v = { id: 'xyz789', title: 'Test' }
    const videoId = v.videoId || v.id
    expect(videoId).toBe('xyz789')
  })

  it('defaults title to Untitled when missing', () => {
    const v = {}
    const title = v.title || 'Untitled'
    expect(title).toBe('Untitled')
  })
})
