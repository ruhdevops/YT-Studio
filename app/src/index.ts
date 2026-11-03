export interface Env {
  YOUTUBE_API_KEY?: string;
  CHANNEL_ID?: string;
  ENVIRONMENT?: string;
}

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  channel: string;
  description?: string;
}

const DEMO_VIDEOS: Video[] = [
  {
    id: "Zzcdtm7Il9U",
    title: "The hidden wall of Dhul-Qarnayn explained",
    thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
    publishedAt: "2024-01-15T10:00:00Z",
    channel: "Ruh Al Tarikh",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Islamic History: The Umayyad Dynasty",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    publishedAt: "2024-01-10T14:30:00Z",
    channel: "Ruh Al Tarikh",
  },
  {
    id: "jNQXAC9IVRw",
    title: "Quran Tafsir: Surah Al-Fatiha",
    thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
    publishedAt: "2024-01-08T09:15:00Z",
    channel: "Ruh Al Tarikh",
  },
];

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", ...extra },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const apiKey = env.YOUTUBE_API_KEY ?? "";
    const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL_ID;
    const cache: Record<string, string> = { "Cache-Control": "public, max-age=600" };

    if (path === "/" || path === "/health") {
      return json({
        status: "ok",
        worker: "yt-studio-app",
        timestamp: new Date().toISOString(),
        channel: channelId,
        environment: env.ENVIRONMENT ?? "development",
        hasApiKey: !!apiKey,
        endpoints: ["/", "/api/videos", "/api/channel", "/api/search"],
      });
    }

    if (path === "/api/videos") {
      const maxResults = url.searchParams.get("maxResults") ?? "12";
      const pageToken = url.searchParams.get("pageToken") ?? "";

      if (!apiKey) {
        return json({ success: true, isDemo: true, videos: DEMO_VIDEOS }, 200, cache);
      }

      try {
        const chRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const chData = (await chRes.json()) as { error?: { message: string }; items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[] };
        if (chData.error) throw new Error(chData.error.message);
        if (!chData.items?.[0]) throw new Error("Channel not found");

        const uploadsId = chData.items[0].contentDetails.relatedPlaylists.uploads;
        const ptParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
        const plRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsId}${ptParam}&key=${apiKey}`
        );
        const plData = (await plRes.json()) as { error?: { message: string }; items?: { snippet: { resourceId: { videoId: string }; title: string; thumbnails: { high?: { url: string }; default?: { url: string } }; publishedAt: string; channelTitle: string; description: string } }[]; nextPageToken?: string; pageInfo?: { totalResults: number } };
        if (plData.error) throw new Error(plData.error.message);

        const videos: Video[] = (plData.items ?? []).map((item) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? "",
          publishedAt: item.snippet.publishedAt,
          channel: item.snippet.channelTitle,
          description: item.snippet.description,
        }));

        return json({
          success: true,
          isDemo: false,
          videos,
          nextPageToken: plData.nextPageToken ?? null,
          totalResults: plData.pageInfo?.totalResults ?? videos.length,
        }, 200, cache);
      } catch (err) {
        return json({ success: true, isDemo: true, videos: DEMO_VIDEOS, error: String(err) }, 200, cache);
      }
    }

    if (path === "/api/channel") {
      if (!apiKey) {
        return json({ success: false, error: "API key not configured" }, 400);
      }
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
        );
        const data = (await res.json()) as { error?: { message: string }; items?: { id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } }; statistics: { subscriberCount: string; viewCount: string; videoCount: string } }[] };
        if (data.error) throw new Error(data.error.message);
        if (!data.items?.[0]) throw new Error("Channel not found");

        const ch = data.items[0];
        return json({
          success: true,
          channel: {
            id: ch.id,
            title: ch.snippet.title,
            description: ch.snippet.description,
            thumbnail: ch.snippet.thumbnails.high?.url ?? ch.snippet.thumbnails.default?.url ?? "",
            subscribers: ch.statistics.subscriberCount,
            views: ch.statistics.viewCount,
            videoCount: parseInt(ch.statistics.videoCount, 10),
            url: `https://www.youtube.com/channel/${ch.id}`,
          },
        }, 200, cache);
      } catch (err) {
        return json({ success: false, error: String(err) }, 500);
      }
    }

    if (path === "/api/search") {
      const q = url.searchParams.get("q");
      if (!q) return json({ success: false, error: "Missing query parameter q" }, 400);
      if (!apiKey) return json({ success: false, error: "API key not configured" }, 400);

      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
        );
        const data = (await res.json()) as { error?: { message: string }; items?: { id: { videoId: string }; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } }; publishedAt: string } }[] };
        if (data.error) throw new Error(data.error.message);

        const results = (data.items ?? []).map((item) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? "",
          publishedAt: item.snippet.publishedAt,
        }));

        return json({ success: true, results }, 200, cache);
      } catch (err) {
        return json({ success: false, error: String(err) }, 500);
      }
    }

    return json({ error: "Not Found", endpoints: ["/", "/api/videos", "/api/channel", "/api/search"] }, 404);
  },
} satisfies ExportedHandler<Env>;
