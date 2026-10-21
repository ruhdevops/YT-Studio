export interface Env {
  YOUTUBE_API_KEY?: string;
  NODE_ENV?: string;
  CHANNEL_ID?: string;
}

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS = [
  {
    id: "Zzcdtm7Il9U",
    title: "The hidden wall of Dhul-Qarnayn explained",
    thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/mqdefault.jpg",
    publishedAt: "2024-01-15T10:00:00Z",
    channel: "Ruh Al Tarikh",
    description: "Deep dive into archeological and scriptural evidence of the wall.",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Islamic History: The Umayyad Dynasty",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
    publishedAt: "2024-01-10T14:30:00Z",
    channel: "Ruh Al Tarikh",
    description: "Tracing the rise and fall of the first major Islamic caliphate.",
  },
  {
    id: "jNQXAC9IVRw",
    title: "Quran Tafsir: Surah Al-Fatiha",
    thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg",
    publishedAt: "2024-01-08T09:15:00Z",
    channel: "Ruh Al Tarikh",
    description: "In-depth tafsir of the opening chapter of the Quran.",
  },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
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

    const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL_ID;
    const apiKey = env.YOUTUBE_API_KEY ?? "";

    if (url.pathname === "/health" || url.pathname === "/") {
      return json({
        status: "ok",
        worker: "yt-studio",
        time: new Date().toISOString(),
        channel: channelId,
        hasApiKey: !!apiKey,
        endpoints: ["/health", "/api/videos", "/api/channel", "/api/search"],
      });
    }

    if (url.pathname === "/api/videos") {
      if (!apiKey) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
      }
      try {
        const chRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const chData = await chRes.json() as { items?: { contentDetails: { relatedPlaylists: { uploads: string } } }[]; error?: { message: string } };
        if (chData.error) throw new Error(chData.error.message);
        const uploadsId = chData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (!uploadsId) throw new Error("Uploads playlist not found");

        const maxResults = url.searchParams.get("maxResults") ?? "12";
        const pageToken = url.searchParams.get("pageToken") ?? "";
        const plRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsId}&pageToken=${pageToken}&key=${apiKey}`
        );
        const plData = await plRes.json() as { items?: { snippet: { resourceId: { videoId: string }; title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } }; publishedAt: string; channelTitle: string } }[]; error?: { message: string }; nextPageToken?: string };
        if (plData.error) throw new Error(plData.error.message);

        const videos = (plData.items ?? []).map((item) => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? "",
          publishedAt: item.snippet.publishedAt,
          channel: item.snippet.channelTitle,
        }));

        return json({
          isDemo: false,
          videos,
          count: videos.length,
          nextPageToken: plData.nextPageToken ?? null,
        }, 200);
      } catch (err) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
      }
    }

    if (url.pathname === "/api/channel") {
      if (!apiKey) {
        return json({ isDemo: true, channel: { id: channelId, title: "Ruh Al Tarikh" } });
      }
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${apiKey}`
        );
        const data = await res.json() as { items?: { id: string; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } } }; statistics: { subscriberCount: string; viewCount: string; videoCount: string } }[]; error?: { message: string } };
        if (data.error) throw new Error(data.error.message);
        const ch = data.items?.[0];
        if (!ch) throw new Error("Channel not found");
        return json({
          isDemo: false,
          channel: {
            id: ch.id,
            title: ch.snippet.title,
            description: ch.snippet.description,
            thumbnail: ch.snippet.thumbnails.high?.url ?? ch.snippet.thumbnails.default?.url ?? "",
            subscribers: ch.statistics.subscriberCount,
            views: ch.statistics.viewCount,
            videoCount: parseInt(ch.statistics.videoCount, 10),
          },
        });
      } catch (err) {
        return json({ isDemo: true, channel: { id: channelId }, error: String(err) });
      }
    }

    if (url.pathname === "/api/search") {
      const q = url.searchParams.get("q");
      if (!q) return json({ error: "Missing query parameter q" }, 400);
      if (!apiKey) return json({ isDemo: true, results: [], error: "No API key configured" });
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
        );
        const data = await res.json() as { items?: { id: { videoId: string }; snippet: { title: string; description: string; thumbnails: { high?: { url: string }; default?: { url: string } }; publishedAt: string } }[]; error?: { message: string } };
        if (data.error) throw new Error(data.error.message);
        const results = (data.items ?? []).map((item) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high?.url ?? item.snippet.thumbnails.default?.url ?? "",
          publishedAt: item.snippet.publishedAt,
        }));
        return json({ isDemo: false, results, count: results.length });
      } catch (err) {
        return json({ isDemo: true, results: [], error: String(err) }, 500);
      }
    }

    return json({ error: "Not Found", endpoints: ["/health", "/api/videos", "/api/channel", "/api/search"] }, 404);
  },
} satisfies ExportedHandler<Env>;
