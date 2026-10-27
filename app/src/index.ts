/**
 * YouTube API v3 Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /health, /api/channel, /api/videos, /api/search
 */

export interface Env {
  YOUTUBE_API_KEY?: string;
  CHANNEL_ID?: string;
  ENVIRONMENT?: string;
}

interface VideoItem {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
}

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS: VideoItem[] = [
  {
    id: "Zzcdtm7Il9U",
    title: "The hidden wall of Dhul-Qarnayn explained",
    description: "Deep dive into the archeological and scriptural evidence.",
    thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
    publishedAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Islamic History: The Umayyad Dynasty",
    description: "Tracing the rise and fall of the first major Islamic caliphate.",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    publishedAt: "2024-01-10T00:00:00Z",
  },
  {
    id: "jNQXAC9IVRw",
    title: "Prophecy and End Times in Islamic Tradition",
    description: "Prophetic narratives of the Quran and their interpretations.",
    thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
    publishedAt: "2024-01-08T00:00:00Z",
  },
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
    const apiKey = env.YOUTUBE_API_KEY || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const { pathname } = url;

    if (pathname === "/" || pathname === "/health") {
      return json({
        status: "healthy",
        worker: "ytstudio-app",
        channel: channelId,
        environment: env.ENVIRONMENT || "development",
        hasApiKey: !!apiKey,
        endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"],
        timestamp: new Date().toISOString(),
      });
    }

    if (pathname === "/api/channel") {
      if (!apiKey) {
        return json({ isDemo: true, error: "YOUTUBE_API_KEY not configured" }, 200);
      }
      try {
        const resp = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
        );
        const data = await resp.json() as Record<string, unknown>;
        const items = (data.items as unknown[]) || [];
        if (!items.length) throw new Error("Channel not found");
        const ch = items[0] as Record<string, unknown>;
        const snippet = ch.snippet as Record<string, unknown>;
        const stats = ch.statistics as Record<string, unknown>;
        const thumbs = (snippet.thumbnails as Record<string, { url: string }>) || {};
        return json({
          isDemo: false,
          channel: {
            id: ch.id,
            title: snippet.title,
            description: snippet.description,
            thumbnail: thumbs.high?.url || thumbs.default?.url || "",
            subscribers: stats.subscriberCount || "Hidden",
            views: stats.viewCount || "0",
            videos: parseInt((stats.videoCount as string) || "0", 10),
            url: `https://www.youtube.com/channel/${channelId}`,
          },
        });
      } catch (err) {
        return json({ isDemo: true, error: String(err) }, 200);
      }
    }

    if (pathname === "/api/videos") {
      const maxResults = url.searchParams.get("maxResults") || "12";
      const pageToken = url.searchParams.get("pageToken") || "";

      if (!apiKey) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length }, 200);
      }
      try {
        const chanResp = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const chanData = await chanResp.json() as Record<string, unknown>;
        const chanItems = (chanData.items as unknown[]) || [];
        if (!chanItems.length) throw new Error("Channel not found");
        const ch = chanItems[0] as Record<string, unknown>;
        const contentDetails = ch.contentDetails as Record<string, Record<string, string>>;
        const uploadsId = contentDetails.relatedPlaylists.uploads;

        const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
        const plResp = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${pageParam}&key=${apiKey}`
        );
        const plData = await plResp.json() as Record<string, unknown>;
        const plItems = (plData.items as unknown[]) || [];

        const videos: VideoItem[] = plItems.map((item) => {
          const it = item as Record<string, unknown>;
          const sn = it.snippet as Record<string, unknown>;
          const cd = it.contentDetails as Record<string, string>;
          const thumbs = (sn.thumbnails as Record<string, { url: string }>) || {};
          return {
            id: cd.videoId || "",
            title: (sn.title as string) || "Untitled",
            description: (sn.description as string) || "",
            thumbnail: thumbs.high?.url || thumbs.default?.url || "",
            publishedAt: (sn.publishedAt as string) || new Date().toISOString(),
          };
        });

        return json({
          isDemo: false,
          videos,
          count: videos.length,
          nextPageToken: plData.nextPageToken || null,
        });
      } catch (err) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, error: String(err) }, 200);
      }
    }

    if (pathname === "/api/search") {
      const query = url.searchParams.get("q");
      if (!query) return json({ error: "Missing q parameter" }, 400);

      if (!apiKey) {
        return json({ isDemo: true, results: [], error: "YOUTUBE_API_KEY not configured" }, 200);
      }
      try {
        const resp = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
        );
        const data = await resp.json() as Record<string, unknown>;
        const items = (data.items as unknown[]) || [];
        const results = items.map((item) => {
          const it = item as Record<string, unknown>;
          const id = it.id as Record<string, string>;
          const sn = it.snippet as Record<string, unknown>;
          const thumbs = (sn.thumbnails as Record<string, { url: string }>) || {};
          return {
            id: id.videoId || "",
            title: (sn.title as string) || "Untitled",
            description: (sn.description as string) || "",
            thumbnail: thumbs.high?.url || thumbs.default?.url || "",
            publishedAt: (sn.publishedAt as string) || new Date().toISOString(),
          };
        });
        return json({ isDemo: false, results });
      } catch (err) {
        return json({ isDemo: true, results: [], error: String(err) }, 500);
      }
    }

    return json({ error: "Not Found", endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"] }, 404);
  },
} satisfies ExportedHandler<Env>;
