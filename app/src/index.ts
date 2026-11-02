/**
 * YouTube API v3 Cloudflare Worker
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 * Endpoints: /health, /api/channel, /api/videos, /api/search
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
  category: string;
}

const DEMO_VIDEOS: Video[] = [
  {
    id: "Zzcdtm7Il9U",
    videoId: "Zzcdtm7Il9U",
    title: "The hidden wall of Dhul-Qarnayn explained",
    description: "Deep dive into the archeological and scriptural evidence.",
    thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
    publishedAt: "2024-01-15T10:00:00Z",
    category: "history",
  },
  {
    id: "dQw4w9WgXcQ",
    videoId: "dQw4w9WgXcQ",
    title: "Islamic History: The Umayyad Dynasty",
    description: "Tracing the rise and fall of the first major Islamic caliphate.",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    publishedAt: "2024-01-10T00:00:00Z",
    category: "history",
  },
  {
    id: "jNQXAC9IVRw",
    videoId: "jNQXAC9IVRw",
    title: "Prophecy and End Times in Islamic Tradition",
    description: "Examine the prophetic narratives of the Quran.",
    thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
    publishedAt: "2024-01-08T00:00:00Z",
    category: "prophecy",
  },
];

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (["quran", "surah", "ayah", "tafsir"].some((k) => t.includes(k))) return "quran";
  if (["prophecy", "dajjal", "gog", "magog", "end times"].some((k) => t.includes(k))) return "prophecy";
  if (["discussion", "podcast", "debate", "interview"].some((k) => t.includes(k))) return "discussion";
  if (["history", "empire", "caliph", "ottoman", "crusade"].some((k) => t.includes(k))) return "history";
  return "history";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
    const apiKey = env.YOUTUBE_API_KEY || "";

    const corsHeaders: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const path = url.pathname;

    if (path === "/" || path === "/health") {
      return json({
        status: "healthy",
        worker: "yt-studio",
        timestamp: new Date().toISOString(),
        channel: channelId,
        hasApiKey: !!apiKey,
        environment: env.ENVIRONMENT || "development",
        endpoints: {
          health: "/health",
          channel: "/api/channel",
          videos: "/api/videos",
          search: "/api/search",
        },
      });
    }

    if (path === "/api/channel") {
      if (!apiKey) {
        return json({
          isDemo: true,
          channel: { id: channelId, title: "Ruh Al Tarikh", url: `https://www.youtube.com/channel/${channelId}` },
        });
      }
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
        );
        const data = (await res.json()) as Record<string, unknown>;
        if ((data as { error?: { message: string } }).error) throw new Error((data as { error: { message: string } }).error.message);
        const items = (data as { items?: unknown[] }).items;
        if (!items || items.length === 0) throw new Error("Channel not found");
        const ch = items[0] as Record<string, Record<string, unknown>>;
        return json({
          isDemo: false,
          channel: {
            id: channelId,
            title: (ch.snippet?.title as string) || "Archive",
            description: (ch.snippet?.description as string) || "",
            thumbnail:
              ((ch.snippet?.thumbnails as Record<string, { url: string }>)?.high?.url as string) ||
              ((ch.snippet?.thumbnails as Record<string, { url: string }>)?.default?.url as string) ||
              "",
            subscribers: (ch.statistics?.subscriberCount as string) || "Hidden",
            views: (ch.statistics?.viewCount as string) || "0",
            videoCount: parseInt((ch.statistics?.videoCount as string) || "0", 10),
            url: `https://www.youtube.com/channel/${channelId}`,
          },
        });
      } catch (err) {
        return json({ isDemo: true, error: String(err), channel: { id: channelId, title: "Ruh Al Tarikh" } });
      }
    }

    if (path === "/api/videos") {
      const maxResults = url.searchParams.get("maxResults") || "12";
      const pageToken = url.searchParams.get("pageToken") || "";

      if (!apiKey) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
      }
      try {
        const chRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const chData = (await chRes.json()) as Record<string, unknown>;
        if ((chData as { error?: { message: string } }).error) throw new Error((chData as { error: { message: string } }).error.message);
        const items = (chData as { items?: unknown[] }).items;
        if (!items || !items[0]) throw new Error("Channel not found");
        const uploadsId = (
          (items[0] as Record<string, unknown>).contentDetails as Record<string, Record<string, string>>
        )?.relatedPlaylists?.uploads;
        if (!uploadsId) throw new Error("Uploads playlist not found");

        const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
        const vRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${pageParam}&key=${apiKey}`
        );
        const vData = (await vRes.json()) as Record<string, unknown>;
        if ((vData as { error?: { message: string } }).error) throw new Error((vData as { error: { message: string } }).error.message);

        const rawItems = ((vData as { items?: unknown[] }).items || []) as Record<string, Record<string, unknown>>[];
        const videos: Video[] = rawItems.map((item) => ({
          id: (item.contentDetails?.videoId as string) || "",
          videoId: (item.contentDetails?.videoId as string) || "",
          title: (item.snippet?.title as string) || "Untitled",
          description: (item.snippet?.description as string) || "",
          thumbnail:
            ((item.snippet?.thumbnails as Record<string, { url: string }>)?.high?.url as string) ||
            ((item.snippet?.thumbnails as Record<string, { url: string }>)?.default?.url as string) ||
            "",
          publishedAt: (item.snippet?.publishedAt as string) || new Date().toISOString(),
          category: detectCategory((item.snippet?.title as string) || ""),
        }));

        return json({
          isDemo: false,
          videos,
          count: videos.length,
          nextPageToken: (vData as { nextPageToken?: string }).nextPageToken || null,
          totalResults: ((vData as { pageInfo?: { totalResults: number } }).pageInfo?.totalResults) || videos.length,
        });
      } catch (err) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
      }
    }

    if (path === "/api/search") {
      const query = url.searchParams.get("q");
      if (!query) return json({ error: "Query parameter required", results: [] }, 400);

      if (!apiKey) {
        const q = query.toLowerCase();
        const results = DEMO_VIDEOS.filter(
          (v) => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
        );
        return json({ isDemo: true, results });
      }
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
        );
        const data = (await res.json()) as Record<string, unknown>;
        if ((data as { error?: { message: string } }).error) throw new Error((data as { error: { message: string } }).error.message);
        const items = (((data as { items?: unknown[] }).items) || []) as Record<string, Record<string, unknown>>[];
        const results = items.map((item) => ({
          id: (item.id?.videoId as string) || "",
          title: (item.snippet?.title as string) || "Untitled",
          description: (item.snippet?.description as string) || "",
          thumbnail:
            ((item.snippet?.thumbnails as Record<string, { url: string }>)?.high?.url as string) ||
            ((item.snippet?.thumbnails as Record<string, { url: string }>)?.default?.url as string) ||
            "",
          publishedAt: (item.snippet?.publishedAt as string) || new Date().toISOString(),
        }));
        return json({ isDemo: false, results });
      } catch (err) {
        return json({ error: String(err), isDemo: true, results: [] }, 500);
      }
    }

    return json({ error: "Not found", endpoints: ["/health", "/api/channel", "/api/videos", "/api/search"] }, 404);
  },
} satisfies ExportedHandler<Env>;
