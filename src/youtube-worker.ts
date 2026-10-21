/**
 * YouTube API V3 Worker - Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: GET /health, /api/channel, /api/videos, /api/search
 * Falls back to demo data when YOUTUBE_API_KEY is not set.
 */

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
  category?: string;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS, POST',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const respondJSON = (data: any, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    };

    try {
      const apiKey = env.YOUTUBE_API_KEY || '';
      if (path.startsWith('/api/') && !apiKey) throw new Error('YOUTUBE_API_KEY is missing');
      const hasSecretBinding = !!env.YOUTUBE_API_KEY;

      if (path === '/' || path === '/health') {
        return respondJSON({
            status: 'healthy',
            worker: 'ytstudio',
            timestamp: new Date().toISOString(),
            channel: channelId,
            hasSecretBinding,
            environment: env.ENVIRONMENT || 'development',
            endpoints: {
              health: '/',
              channel: '/api/channel',
              videos: '/api/videos',
              search: '/api/search'
            }
        });
      }

      if (path === '/api/channel') {
        try {
          const channelUrl = 'https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=' + channelId + '&key=' + apiKey;
          const response = await fetch(channelUrl);
          const data = await response.json() as any;

          if (data.error) throw new Error(data.error.message);
          if (!data.items || data.items.length === 0) throw new Error('Channel not found');

          const channel = data.items[0];
          return respondJSON({
              status: 'success',
              isDemo: false,
              hasSecretBinding,
              channel: {
                id: channel.id || channelId,
                title: channel.snippet?.title || 'Archive',
                description: channel.snippet?.description || '',
                thumbnail: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url || '',
                subscribers: channel.statistics?.subscriberCount || 'Hidden',
                views: channel.statistics?.viewCount || '0',
                videos: parseInt(channel.statistics?.videoCount || '0', 10),
                url: 'https://www.youtube.com/channel/' + (channel.id || channelId)
              }
          });
        } catch (error) {
          return respondJSON({
              isDemo: true,
              status: 'fallback_to_demo',
              error: String(error),
              channel: {
                id: channelId,
                title: 'Ruh Al Tarikh - Cinematic Islamic Archive',
                url: 'https://www.youtube.com/channel/' + channelId
              }
          });
        }
      }

      if (path === '/api/videos') {
        const maxResults = url.searchParams.get('maxResults') || '12';
        const pageToken = url.searchParams.get('pageToken') || '';

        try {
          const channelResp = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=' + channelId + '&key=' + apiKey
          );
          const channelData = await channelResp.json() as any;

          if (channelData.error) throw new Error(channelData.error.message);
          if (!channelData.items || !channelData.items[0]) throw new Error('Channel not found');

          const uploadsPlaylistId = channelData.items[0].contentDetails?.relatedPlaylists?.uploads;
          if (!uploadsPlaylistId) throw new Error('Uploads playlist not found');

          const videosResp = await fetch(
            'https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=' + uploadsPlaylistId + '&maxResults=' + maxResults + '&pageToken=' + pageToken + '&key=' + apiKey
          );
          const videosData = await videosResp.json() as any;

          if (videosData.error) throw new Error(videosData.error.message);
          if (!videosData.items) throw new Error('No videos found');

          const videos: Video[] = (videosData.items || []).map((item: any) => ({
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
              nextPageToken: videosData.nextPageToken || null,
              totalResults: videosData.pageInfo?.totalResults || videos.length,
              hasSecretBinding
          });
        } catch (error) {
          const limit = parseInt(maxResults, 10);
          return respondJSON({
              isDemo: true,
              videos: DEMO_VIDEOS.slice(0, isNaN(limit) ? 12 : minVal(limit, DEMO_VIDEOS.length)),
              count: DEMO_VIDEOS.length,
              error: String(error),
              hasSecretBinding
          });
        }
      }

      if (path === '/api/search') {
        const query = url.searchParams.get('q');
        if (!query) return respondJSON({ error: 'Query parameter required', results: [] }, 400);

        try {
          const searchUrl = 'https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=' + channelId + '&q=' + encodeURIComponent(query) + '&maxResults=10&key=' + apiKey;
          const searchResp = await fetch(searchUrl);
          const searchData = await searchResp.json() as any;

          if (searchData.error) throw new Error(searchData.error.message);

          const results = (searchData.items || []).map((item: any) => ({
            id: item.id?.videoId || '',
            title: item.snippet?.title || 'Untitled',
            description: item.snippet?.description || '',
            thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
            publishedAt: item.snippet?.publishedAt || new Date().toISOString()
          }));

          return respondJSON({ isDemo: false, results, hasSecretBinding });
        } catch (error) {
          return respondJSON({ error: String(error), isDemo: true, results: [] }, 500);
        }
      }

      return respondJSON({
          error: 'Not found',
          endpoints: ['/', '/api/channel', '/api/videos', '/api/search']
      }, 404);
    } catch (error) {
      return respondJSON({
          error: 'Internal server error',
          message: String(error),
          isDemo: true,
          videos: DEMO_VIDEOS
      }, 500);
    }
  }
};

function minVal(a: number, b: number): number {
    return a < b ? a : b;
}

function detectCategory(title: string): string {
  const titleLower = title.toLowerCase();
  const categories = {
    quran: ['quran', 'surah', 'ayah', 'tafsir', 'quranic'],
    prophecy: ['prophecy', 'dajjal', 'gog', 'magog', 'end times'],
    discussion: ['discussion', 'podcast', 'debate', 'interview'],
    educational: ['guide', 'explained', 'documentary', 'lesson', 'education'],
    history: ['history', 'empire', 'caliph', 'war', 'civilization', 'ottoman', 'crusade', 'silk road']
  };

  for (const [category, terms] of Object.entries(categories)) {
    if (terms.some(term => titleLower.includes(term))) return category;
  }
  return 'history';
}
