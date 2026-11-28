export interface Env {
  YOUTUBE_API_KEY?: string;
  CHANNEL_ID?: string;
}

const DEFAULT_CHANNEL_ID = 'UCrjJP_SHUeCmqpTSHJCXkdA';

const DEMO_VIDEOS = [
  {
    id: 'Zzcdtm7Il9U',
    title: 'The hidden wall of Dhul-Qarnayn explained',
    thumbnail: 'https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg',
    publishedAt: '2024-01-15T10:00:00Z',
    channel: 'Ruh Al Tarikh',
  },
  {
    id: 'dQw4w9WgXcQ',
    title: 'Islamic History: The Umayyad Dynasty',
    thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    publishedAt: '2024-01-10T14:30:00Z',
    channel: 'Ruh Al Tarikh',
  },
  {
    id: 'jNQXAC9IVRw',
    title: 'Prophecy and End Times in Islamic Tradition',
    thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg',
    publishedAt: '2024-01-08T09:15:00Z',
    channel: 'Ruh Al Tarikh',
  },
];

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600' },
      });

    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
    const apiKey = env.YOUTUBE_API_KEY;

    if (url.pathname === '/' || url.pathname === '/health') {
      return json({
        status: 'ok',
        worker: 'yt-studio-app',
        timestamp: new Date().toISOString(),
        channel: channelId,
        hasApiKey: !!apiKey,
        endpoints: ['/health', '/api/videos', '/api/channel'],
      });
    }

    if (url.pathname === '/api/videos') {
      if (!apiKey) {
        return json({ success: true, isDemo: true, videos: DEMO_VIDEOS, reason: 'no_api_key' });
      }
      try {
        const channelResp = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const channelData = await channelResp.json() as { items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }> };
        const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsId) throw new Error('Uploads playlist not found for channel');

        const playlistResp = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${uploadsId}&key=${apiKey}`
        );
        const playlistData = await playlistResp.json() as { items?: Array<{ snippet: { resourceId: { videoId: string }; title: string; thumbnails: { high?: { url: string }; default?: { url: string } }; publishedAt: string; channelTitle: string; description: string } }> };
        const videos = (playlistData.items || []).map((item) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
          publishedAt: item.snippet.publishedAt,
          channel: item.snippet.channelTitle,
          description: item.snippet.description,
        }));

        return json({ success: true, isDemo: false, count: videos.length, videos });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return json({ success: true, isDemo: true, videos: DEMO_VIDEOS, error: message });
      }
    }

    if (url.pathname === '/api/channel') {
      if (!apiKey) {
        return json({ success: false, error: 'YOUTUBE_API_KEY not configured' }, 400);
      }
      try {
        const resp = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
        );
        const data = await resp.json() as { items?: Array<{ id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string } } }; statistics: { subscriberCount: string; videoCount: string; viewCount: string } }> };
        const ch = data.items?.[0];
        if (!ch) return json({ success: false, error: 'Channel not found' }, 404);
        return json({
          success: true,
          channel: {
            id: ch.id,
            title: ch.snippet.title,
            description: ch.snippet.description,
            thumbnail: ch.snippet.thumbnails.high?.url,
            subscribers: ch.statistics.subscriberCount,
            videoCount: ch.statistics.videoCount,
            viewCount: ch.statistics.viewCount,
            url: `https://www.youtube.com/channel/${ch.id}`,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return json({ success: false, error: message }, 500);
      }
    }

    return json({ error: 'Not Found', endpoints: ['/health', '/api/videos', '/api/channel'] }, 404);
  },
} satisfies ExportedHandler<Env>;
