/**
 * YouTube API v3 Worker - Cloudflare Worker (app/)
 * Fetches channel stats and video listings from YouTube Data API v3.
 * Channel: UCrjJP_SHUeCmqpTSHJCXkdA (Ruh Al Tarikh)
 */

export interface Env {
  YOUTUBE_API_KEY?: string;
  CHANNEL_ID?: string;
}

const DEFAULT_CHANNEL = "UCrjJP_SHUeCmqpTSHJCXkdA";

const DEMO_VIDEOS = [
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

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);
    const channelId = env.CHANNEL_ID ?? DEFAULT_CHANNEL;
    const apiKey = env.YOUTUBE_API_KEY ?? "";
    const path = url.pathname;

    if (path === "/" || path === "/health") {
      return json({
        status: "ok",
        worker: "ytstudio-app",
        channel: channelId,
        hasApiKey: !!apiKey,
        endpoints: ["/api/channel", "/api/videos", "/api/search"],
      });
    }

    if (path === "/api/channel") {
      if (!apiKey) {
        return json({ isDemo: true, error: "YOUTUBE_API_KEY not configured", channel: { id: channelId } });
      }
      try {
        const resp = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${encodeURIComponent(channelId)}&key=${apiKey}`
        );
        const data = await resp.json() as Record<string, unknown>;
        const items = data.items as Array<Record<string, unknown>> | undefined;
        if (!items || items.length === 0) throw new Error("Channel not found");
        const ch = items[0];
        const snippet = ch.snippet as Record<string, unknown>;
        const stats = ch.statistics as Record<string, unknown>;
        const thumbs = snippet.thumbnails as Record<string, Record<string, string>>;
        return json({
          isDemo: false,
          channel: {
            id: ch.id,
            title: snippet.title,
            description: snippet.description,
            thumbnail: thumbs?.high?.url ?? thumbs?.default?.url ?? "",
            subscribers: stats?.subscriberCount ?? "Hidden",
            views: stats?.viewCount ?? "0",
            videoCount: stats?.videoCount ?? "0",
            url: `https://www.youtube.com/channel/${channelId}`,
          },
        });
      } catch (err) {
        return json({ isDemo: true, error: String(err), channel: { id: channelId } });
      }
    }

    if (path === "/api/videos") {
      const maxResults = url.searchParams.get("maxResults") ?? "12";
      const pageToken = url.searchParams.get("pageToken") ?? "";

      if (!apiKey) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length });
      }
      try {
        const chResp = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${apiKey}`
        );
        const chData = await chResp.json() as Record<string, unknown>;
        const chItems = chData.items as Array<Record<string, unknown>> | undefined;
        if (!chItems || chItems.length === 0) throw new Error("Channel not found");
        const details = chItems[0].contentDetails as Record<string, Record<string, string>>;
        const uploadsId = details?.relatedPlaylists?.uploads;
        if (!uploadsId) throw new Error("Uploads playlist not found");

        const ptParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
        const plResp = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}${ptParam}&key=${apiKey}`
        );
        const plData = await plResp.json() as Record<string, unknown>;
        const plItems = plData.items as Array<Record<string, unknown>> | undefined;
        if (!plItems) throw new Error("No videos returned");

        const videos = plItems.map((item) => {
          const s = item.snippet as Record<string, unknown>;
          const cd = item.contentDetails as Record<string, string>;
          const thumbs = s.thumbnails as Record<string, Record<string, string>>;
          return {
            id: cd?.videoId ?? "",
            title: s?.title ?? "Untitled",
            thumbnail: thumbs?.high?.url ?? thumbs?.default?.url ?? "",
            publishedAt: s?.publishedAt ?? new Date().toISOString(),
            channel: s?.channelTitle ?? "Ruh Al Tarikh",
            description: s?.description ?? "",
          };
        });

        return json({
          isDemo: false,
          videos,
          count: videos.length,
          nextPageToken: plData.nextPageToken ?? null,
          totalResults: (plData.pageInfo as Record<string, number> | undefined)?.totalResults ?? videos.length,
        });
      } catch (err) {
        return json({ isDemo: true, videos: DEMO_VIDEOS, count: DEMO_VIDEOS.length, error: String(err) });
      }
    }

    if (path === "/api/search") {
      const q = url.searchParams.get("q");
      if (!q) return json({ error: "q parameter required" }, 400);
      if (!apiKey) return json({ isDemo: true, results: [] });
      try {
        const resp = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${encodeURIComponent(channelId)}&q=${encodeURIComponent(q)}&maxResults=10&key=${apiKey}`
        );
        const data = await resp.json() as Record<string, unknown>;
        const items = data.items as Array<Record<string, unknown>> | undefined;
        const results = (items ?? []).map((item) => {
          const id = item.id as Record<string, string>;
          const s = item.snippet as Record<string, unknown>;
          const thumbs = s?.thumbnails as Record<string, Record<string, string>> | undefined;
          return {
            id: id?.videoId ?? "",
            title: s?.title ?? "Untitled",
            thumbnail: thumbs?.high?.url ?? thumbs?.default?.url ?? "",
            publishedAt: s?.publishedAt ?? "",
          };
        });
        return json({ isDemo: false, results });
      } catch (err) {
        return json({ isDemo: true, results: [], error: String(err) });
      }
    }

    return json({ error: "Not found", endpoints: ["/", "/api/channel", "/api/videos", "/api/search"] }, 404);
  },
} satisfies ExportedHandler<Env>;
