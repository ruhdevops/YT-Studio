/**
 * YouTube API v3 Proxy Worker — Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /health, /api/channel, /api/videos, /api/search
 */

export interface Env {
  YOUTUBE_API_KEY?: string;
  CHANNEL_ID?: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  category: string;
}

const DEFAULT_CHANNEL_ID = 'UCrjJP_SHUeCmqpTSHJCXkdA';

const DEMO_VIDEOS: Video[] = [
  {
    id: 'Zzcdtm7Il9U',
    title: 'The hidden wall of Dhul-Qarnayn explained',
    description: 'Deep dive into the archeological and scriptural evidence of the wall.',
    thumbnail: 'https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg',
    publishedAt: '2024-01-15T10:00:00Z',
    category: 'history'
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Islamic History: The Umayyad Dynasty',
    description: 'Tracing the rise and fall of the first major Islamic caliphate.',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    publishedAt: '2024-01-10T00:00:00Z',
    category: 'history'
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Prophecy and End Times in Islamic Tradition',
    description: 'Examine the prophetic narratives of the Quran and their interpretations.',
    thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    publishedAt: '2024-01-08T00:00:00Z',
    category: 'prophecy'
  }
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (['quran', 'surah', 'ayah', 'tafsir'].some(k => t.includes(k))) return 'quran';
  if (['prophecy', 'dajjal', 'gog', 'magog', 'end times'].some(k => t.includes(k))) return 'prophecy';
  if (['discussion', 'podcast', 'debate', 'interview'].some(k => t.includes(k))) return 'discussion';
  if (['guide', 'explained', 'documentary', 'lesson'].some(k => t.includes(k))) return 'educational';
  return 'history';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const apiKey = env.YOUTUBE_API_KEY ?? '';
    const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL_ID;

    if (url.pathname === '/health' || url.pathname === '/') {
      return json({
        status: 'healthy',
        worker: 'yt-proxy',
        timestamp: new Date().toISOString(),
        channel: channelId,
        hasApiKey: !!apiKey,
        endpoints: ['/health', '/api/channel', '/api/videos', '/api/search'],
      });
    }

    if (url.pathname === '/api/channel') {
      if (!apiKey) {
        return json({ isDemo: true, error: 'YOUTUBE_API_KEY not configured' }, 503);
      }
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
        );
        const data = await res.json() as { error?: { message: string }; items?: unknown[] };
        if (data.error) throw new Error(data.error.message);
        if (!data.items || data.items.length === 0) throw new Error('Channel not found');
        const ch = (data.items[0] as Record<string, unknown>);
        const snippet = ch['snippet'] as Record<string, unknown>;
        const statistics = ch['statistics'] as Record<string, unknown>;
        const thumbnails = snippet['thumbnails'] as Record<string, { url: string }>;
        return json({
          isDemo: false,
          channel: {
            id: channelId,
            title: snippet['title'],
            description: snippet['description'],
            thumbnail: thumbnails['high']?.url ?? thumbnails['default']?.url ?? '',
            subscribers: statistics['subscriberCount'] ?? 'Hidden',
            views: statistics['viewCount'] ?? '0',
            videoCount: parseInt(String(statistics['videoCount'] ?? '0'), 10),
            url: `https://www.youtube.com/channel/${channelId}`,
          },
        });
      } catch (err) {
        return json({ isDemo: true, error: String(err) }, 500);
      }
    }

    if (url.pathname === '/api/videos') {
      const maxResults = url.searchParams.get('maxResults') ?? '12';
      const pageToken = url.searchParams.get('pageToken') ?? '';

      if (!apiKey) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
      }
      try {
        const chRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const chData = await chRes.json() as { error?: { message: string }; items?: unknown[] };
        if (chData.error) throw new Error(chData.error.message);
        if (!chData.items || chData.items.length === 0) throw new Error('Channel not found');

        const details = (chData.items[0] as Record<string, unknown>)['contentDetails'] as Record<string, Record<string, string>>;
        const uploadsId = details['relatedPlaylists']['uploads'];
        if (!uploadsId) throw new Error('Uploads playlist not found');

        const ptParam = pageToken ? `&pageToken=${pageToken}` : '';
        const plRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
        );
        const plData = await plRes.json() as { error?: { message: string }; items?: unknown[]; nextPageToken?: string; pageInfo?: { totalResults: number } };
        if (plData.error) throw new Error(plData.error.message);

        const videos: Video[] = (plData.items ?? []).map((item) => {
          const i = item as Record<string, Record<string, unknown>>;
          const snippet = i['snippet'];
          const contentDetails = i['contentDetails'];
          const thumbnails = snippet['thumbnails'] as Record<string, { url: string }>;
          const title = String(snippet['title'] ?? 'Untitled');
          return {
            id: String(contentDetails['videoId'] ?? ''),
            title,
            description: String(snippet['description'] ?? ''),
            thumbnail: thumbnails['high']?.url ?? thumbnails['default']?.url ?? '',
            publishedAt: String(snippet['publishedAt'] ?? new Date().toISOString()),
            category: detectCategory(title),
          };
        });

        return json({
          isDemo: false,
          videos,
          count: videos.length,
          nextPageToken: plData.nextPageToken ?? null,
          totalResults: plData.pageInfo?.totalResults ?? videos.length,
        });
      } catch (err) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
      }
    }

    if (url.pathname === '/api/search') {
      const q = url.searchParams.get('q');
      if (!q) return json({ error: 'Missing query parameter q' }, 400);
      if (!apiKey) return json({ isDemo: true, results: [], error: 'YOUTUBE_API_KEY not configured' }, 503);

      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
        );
        const data = await res.json() as { error?: { message: string }; items?: unknown[] };
        if (data.error) throw new Error(data.error.message);

        const results = (data.items ?? []).map((item) => {
          const i = item as Record<string, Record<string, unknown>>;
          const snippet = i['snippet'];
          const id = i['id'] as Record<string, string>;
          const thumbnails = snippet['thumbnails'] as Record<string, { url: string }>;
          return {
            id: id['videoId'] ?? '',
            title: String(snippet['title'] ?? 'Untitled'),
            description: String(snippet['description'] ?? ''),
            thumbnail: thumbnails['high']?.url ?? thumbnails['default']?.url ?? '',
            publishedAt: String(snippet['publishedAt'] ?? new Date().toISOString()),
          };
        });

        return json({ isDemo: false, results });
      } catch (err) {
        return json({ isDemo: true, results: [], error: String(err) }, 500);
      }
    }

    return json({ error: 'Not found', endpoints: ['/health', '/api/channel', '/api/videos', '/api/search'] }, 404);
  },
} satisfies ExportedHandler<Env>;
