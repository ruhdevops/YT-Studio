export interface Env {
  YOUTUBE_API_KEY?: string;
  ENVIRONMENT?: string;
  CHANNEL_ID?: string;
}

interface Video {
  id: string;
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  category: string;
}

const DEMO_VIDEOS: Video[] = [
  {
    id: 'Zzcdtm7Il9U',
    videoId: 'Zzcdtm7Il9U',
    title: 'The hidden wall of Dhul-Qarnayn explained',
    description: 'Deep dive into the archeological and scriptural evidence of the wall.',
    thumbnail: 'https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg',
    publishedAt: '2024-01-15T10:00:00Z',
    category: 'history'
  },
  {
    id: 'dQw4w9WgXcQ',
    videoId: 'dQw4w9WgXcQ',
    title: 'Islamic History: The Umayyad Dynasty',
    description: 'Tracing the rise and fall of the first major Islamic caliphate.',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    publishedAt: '2024-01-10T00:00:00Z',
    category: 'history'
  },
  {
    id: 'jNQXAC9IVRw',
    videoId: 'jNQXAC9IVRw',
    title: 'Prophecy and End Times in Islamic Tradition',
    description: 'Examine the prophetic narratives of the Quran and their interpretations.',
    thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    publishedAt: '2024-01-08T00:00:00Z',
    category: 'prophecy'
  }
];

const DEFAULT_CHANNEL_ID = 'UCrjJP_SHUeCmqpTSHJCXkdA';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function respondJSON(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (['quran', 'surah', 'tafsir'].some(k => t.includes(k))) return 'quran';
  if (['prophecy', 'dajjal', 'end times'].some(k => t.includes(k))) return 'prophecy';
  if (['discussion', 'podcast', 'debate'].some(k => t.includes(k))) return 'discussion';
  if (['guide', 'explained', 'lesson'].some(k => t.includes(k))) return 'educational';
  return 'history';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
    const apiKey = env.YOUTUBE_API_KEY || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (path === '/' || path === '/health') {
      return respondJSON({
        status: 'healthy',
        worker: 'ytstudio-app',
        timestamp: new Date().toISOString(),
        channel: channelId,
        environment: env.ENVIRONMENT || 'development',
        hasApiKey: !!apiKey,
        endpoints: ['/health', '/api/channel', '/api/videos', '/api/search']
      });
    }

    if (path === '/api/channel') {
      if (!apiKey) {
        return respondJSON({
          isDemo: true,
          channel: { id: channelId, title: 'Ruh Al Tarikh', url: `https://www.youtube.com/channel/${channelId}` }
        });
      }
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
        );
        const data = await res.json() as any;
        if (data.error) throw new Error(data.error.message);
        const ch = data.items?.[0];
        if (!ch) throw new Error('Channel not found');
        return respondJSON({
          isDemo: false,
          channel: {
            id: ch.id,
            title: ch.snippet?.title,
            description: ch.snippet?.description,
            thumbnail: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url,
            subscribers: ch.statistics?.subscriberCount,
            views: ch.statistics?.viewCount,
            videos: parseInt(ch.statistics?.videoCount || '0', 10),
            url: `https://www.youtube.com/channel/${ch.id}`
          }
        });
      } catch (err) {
        return respondJSON({
          isDemo: true,
          error: String(err),
          channel: { id: channelId, title: 'Ruh Al Tarikh', url: `https://www.youtube.com/channel/${channelId}` }
        });
      }
    }

    if (path === '/api/videos') {
      const maxResults = url.searchParams.get('maxResults') || '12';
      const pageToken = url.searchParams.get('pageToken') || '';

      if (!apiKey) {
        return respondJSON({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
      }
      try {
        const chRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const chData = await chRes.json() as any;
        if (chData.error) throw new Error(chData.error.message);
        const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsId) throw new Error('Uploads playlist not found');

        const ptParam = pageToken ? `&pageToken=${pageToken}` : '';
        const vRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
        );
        const vData = await vRes.json() as any;
        if (vData.error) throw new Error(vData.error.message);

        const videos: Video[] = (vData.items || []).map((item: any) => ({
          id: item.contentDetails?.videoId || '',
          videoId: item.contentDetails?.videoId || '',
          title: item.snippet?.title || 'Untitled',
          description: item.snippet?.description || '',
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
          publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
          category: detectCategory(item.snippet?.title || '')
        }));

        return respondJSON({
          isDemo: false,
          videos,
          count: videos.length,
          nextPageToken: vData.nextPageToken || null,
          totalResults: vData.pageInfo?.totalResults || videos.length
        });
      } catch (err) {
        return respondJSON({ isDemo: true, error: String(err), videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
      }
    }

    if (path === '/api/search') {
      const query = url.searchParams.get('q');
      if (!query) return respondJSON({ error: 'Missing query parameter q', results: [] }, 400);
      if (!apiKey) {
        const q = query.toLowerCase();
        const results = DEMO_VIDEOS.filter(v => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
        return respondJSON({ isDemo: true, results, count: results.length });
      }
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
        );
        const data = await res.json() as any;
        if (data.error) throw new Error(data.error.message);
        const results = (data.items || []).map((item: any) => ({
          id: item.id?.videoId || '',
          title: item.snippet?.title || 'Untitled',
          description: item.snippet?.description || '',
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
          publishedAt: item.snippet?.publishedAt || new Date().toISOString()
        }));
        return respondJSON({ isDemo: false, results, count: results.length });
      } catch (err) {
        return respondJSON({ isDemo: true, error: String(err), results: [], count: 0 }, 500);
      }
    }

    return respondJSON({ error: 'Not found', endpoints: ['/health', '/api/channel', '/api/videos', '/api/search'] }, 404);
  }
} satisfies ExportedHandler<Env>;
