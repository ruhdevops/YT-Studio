/**
 * YouTube API v3 Worker — yt-studio-worker
 * Fetches channel stats and video listings for channel UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 *
 * Endpoints:
 *   GET /           — health check
 *   GET /api/channel — channel statistics
 *   GET /api/videos  — video listing (paginated, ?maxResults=12&pageToken=...)
 *   GET /api/search  — search videos (?q=query)
 */

export interface Env {
  YOUTUBE_API_KEY?: string;
  CHANNEL_ID?: string;
  ENVIRONMENT?: string;
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

const CHANNEL_ID_DEFAULT = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS: Video[] = [
  {
    id: "Zzcdtm7Il9U",
    videoId: "Zzcdtm7Il9U",
    title: "The hidden wall of Dhul-Qarnayn explained",
    description: "Deep dive into the archeological and scriptural evidence of the wall.",
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
    description: "Examine the prophetic narratives of the Quran and their interpretations.",
    thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
    publishedAt: "2024-01-08T00:00:00Z",
    category: "prophecy",
  },
];

function detectCategory(title: string): string {
  const t = title.toLowerCase();
  if (["quran", "surah", "ayah", "tafsir"].some((k) => t.includes(k))) return "quran";
  if (["prophecy", "dajjal", "gog", "magog", "end times"].some((k) => t.includes(k))) return "prophecy";
  if (["history", "empire", "caliph", "ottoman", "crusade", "civilization"].some((k) => t.includes(k))) return "history";
  if (["guide", "explained", "documentary", "lesson"].some((k) => t.includes(k))) return "educational";
  return "history";
}

function clamp(n: number, max: number): number {
  return n < max ? n : max;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const channelId = env.CHANNEL_ID || CHANNEL_ID_DEFAULT;
    const apiKey = env.YOUTUBE_API_KEY || "";
    const hasApiKey = apiKey.length > 0;

    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    const yt = (path: string) =>
      `https://www.googleapis.com/youtube/v3/${path}&key=${apiKey}`;

    try {
      // Health check
      if (url.pathname === "/" || url.pathname === "/health") {
        return json({
          status: "healthy",
          worker: "yt-studio-worker",
          channel: channelId,
          hasApiKey,
          environment: env.ENVIRONMENT || "development",
          timestamp: new Date().toISOString(),
          endpoints: ["/api/channel", "/api/videos", "/api/search"],
        });
      }

      // Channel statistics
      if (url.pathname === "/api/channel") {
        if (!hasApiKey) {
          return json({
            isDemo: true,
            channel: { id: channelId, title: "Ruh Al Tarikh (demo)", url: `https://www.youtube.com/channel/${channelId}` },
          });
        }
        const res = await fetch(
          yt(`channels?part=snippet,statistics&id=${channelId}`)
        );
        const data = (await res.json()) as any;
        if (data.error) throw new Error(data.error.message);
        const ch = data.items?.[0];
        if (!ch) throw new Error("Channel not found");
        return json({
          isDemo: false,
          channel: {
            id: ch.id,
            title: ch.snippet?.title,
            description: ch.snippet?.description,
            thumbnail: ch.snippet?.thumbnails?.high?.url || ch.snippet?.thumbnails?.default?.url,
            subscribers: ch.statistics?.subscriberCount || "Hidden",
            views: ch.statistics?.viewCount,
            videos: parseInt(ch.statistics?.videoCount || "0", 10),
            url: `https://www.youtube.com/channel/${ch.id}`,
          },
        });
      }

      // Video listing
      if (url.pathname === "/api/videos") {
        const maxResults = url.searchParams.get("maxResults") || "12";
        const pageToken = url.searchParams.get("pageToken") || "";

        if (!hasApiKey) {
          const limit = clamp(parseInt(maxResults, 10) || 12, DEMO_VIDEOS.length);
          return json({ isDemo: true, videos: DEMO_VIDEOS.slice(0, limit), count: limit });
        }

        const chRes = await fetch(yt(`channels?part=contentDetails&id=${channelId}`));
        const chData = (await chRes.json()) as any;
        if (chData.error) throw new Error(chData.error.message);
        const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsId) throw new Error("Uploads playlist not found");

        const ptParam = pageToken ? `&pageToken=${pageToken}` : "";
        const plRes = await fetch(
          yt(`playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}`)
        );
        const plData = (await plRes.json()) as any;
        if (plData.error) throw new Error(plData.error.message);

        const videos: Video[] = (plData.items || []).map((item: any) => ({
          id: item.contentDetails?.videoId || "",
          videoId: item.contentDetails?.videoId || "",
          title: item.snippet?.title || "Untitled",
          description: item.snippet?.description || "",
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
          publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
          category: detectCategory(item.snippet?.title || ""),
        }));

        return json({
          isDemo: false,
          videos,
          count: videos.length,
          nextPageToken: plData.nextPageToken || null,
          totalResults: plData.pageInfo?.totalResults || videos.length,
        });
      }

      // Search
      if (url.pathname === "/api/search") {
        const q = url.searchParams.get("q");
        if (!q) return json({ error: "Missing query parameter ?q=", results: [] }, 400);
        if (!hasApiKey) return json({ isDemo: true, results: [], error: "No API key" });

        const srRes = await fetch(
          yt(`search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10`)
        );
        const srData = (await srRes.json()) as any;
        if (srData.error) throw new Error(srData.error.message);

        const results = (srData.items || []).map((item: any) => ({
          id: item.id?.videoId || "",
          title: item.snippet?.title || "Untitled",
          description: item.snippet?.description || "",
          thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || "",
          publishedAt: item.snippet?.publishedAt || new Date().toISOString(),
        }));

        return json({ isDemo: false, results });
      }

      return json({ error: "Not found", endpoints: ["/", "/api/channel", "/api/videos", "/api/search"] }, 404);
    } catch (err) {
      return json({ error: "Internal server error", message: String(err), isDemo: true, videos: DEMO_VIDEOS }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
