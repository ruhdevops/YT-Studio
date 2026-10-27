export interface Env {
  YOUTUBE_API_KEY?: string;
  ENVIRONMENT?: string;
  CHANNEL_ID?: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channel?: string;
}

const DEMO_VIDEOS: Video[] = [
  {
    id: "Zzcdtm7Il9U",
    title: "The hidden wall of Dhul-Qarnayn explained",
    description: "Deep dive into the archeological and scriptural evidence of the wall.",
    thumbnail: "https://i.ytimg.com/vi/Zzcdtm7Il9U/hqdefault.jpg",
    publishedAt: "2024-01-15T10:00:00Z",
    channel: "Ruh Al Tarikh",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Islamic History: The Umayyad Dynasty",
    description: "Tracing the rise and fall of the first major Islamic caliphate.",
    thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    publishedAt: "2024-01-10T14:30:00Z",
    channel: "Ruh Al Tarikh",
  },
  {
    id: "jNQXAC9IVRw",
    title: "Quran Tafsir: Surah Al-Fatiha",
    description: "Examine the prophetic narratives of the Quran and their interpretations.",
    thumbnail: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
    publishedAt: "2024-01-08T09:15:00Z",
    channel: "Ruh Al Tarikh",
  },
];

const DEFAULT_CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const channelId = env.CHANNEL_ID || DEFAULT_CHANNEL_ID;
    const apiKey = env.YOUTUBE_API_KEY || "";

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

    const { pathname } = url;

    if (pathname === "/" || pathname === "/health") {
      return json({
        status: "healthy",
        worker: "yt-studio-worker",
        timestamp: new Date().toISOString(),
        channel: channelId,
        environment: env.ENVIRONMENT || "development",
        hasApiKey: !!apiKey,
        endpoints: ["/", "/api/videos", "/api/channel", "/api/search"],
      });
    }

    if (pathname === "/api/videos") {
      if (!apiKey) {
        return json({
          isDemo: true,
          videos: DEMO_VIDEOS,
          count: DEMO_VIDEOS.length,
        });
      }

      try {
        const channelRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`
        );
        const channelData = (await channelRes.json()) as {
          items?: Array<{ contentDetails: { relatedPlaylists: { uploads: string } } }>;
          error?: { message: string };
        };

        if (channelData.error) throw new Error(channelData.error.message);
        if (!channelData.items?.[0]) throw new Error("Channel not found");

        const uploadsId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        const maxResults = url.searchParams.get("maxResults") || "12";
        const pageToken = url.searchParams.get("pageToken") || "";

        const playlistRes = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&pageToken=${pageToken}&key=${apiKey}`
        );
        const playlistData = (await playlistRes.json()) as {
          items?: Array<{
            snippet: {
              title: string;
              description: string;
              publishedAt: string;
              channelTitle: string;
              thumbnails: { high?: { url: string }; default?: { url: string } };
            };
            contentDetails: { videoId: string };
          }>;
          nextPageToken?: string;
          pageInfo?: { totalResults: number };
          error?: { message: string };
        };

        if (playlistData.error) throw new Error(playlistData.error.message);

        const videos: Video[] = (playlistData.items || []).map((item) => ({
          id: item.contentDetails.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || "",
          publishedAt: item.snippet.publishedAt,
          channel: item.snippet.channelTitle,
        }));

        return json(
          {
            isDemo: false,
            videos,
            count: videos.length,
            nextPageToken: playlistData.nextPageToken || null,
            totalResults: playlistData.pageInfo?.totalResults || videos.length,
          },
          200
        );
      } catch (err) {
        return json({
          isDemo: true,
          videos: DEMO_VIDEOS,
          count: DEMO_VIDEOS.length,
          error: String(err),
        });
      }
    }

    if (pathname === "/api/channel") {
      if (!apiKey) {
        return json({
          isDemo: true,
          channel: {
            id: channelId,
            title: "Ruh Al Tarikh - Cinematic Islamic Archive",
            url: `https://www.youtube.com/channel/${channelId}`,
          },
        });
      }

      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
        );
        const data = (await res.json()) as {
          items?: Array<{
            id: string;
            snippet: {
              title: string;
              description: string;
              thumbnails: { high?: { url: string }; default?: { url: string } };
            };
            statistics: { subscriberCount: string; viewCount: string; videoCount: string };
          }>;
          error?: { message: string };
        };

        if (data.error) throw new Error(data.error.message);
        if (!data.items?.[0]) throw new Error("Channel not found");

        const ch = data.items[0];
        return json({
          isDemo: false,
          channel: {
            id: ch.id,
            title: ch.snippet.title,
            description: ch.snippet.description,
            thumbnail: ch.snippet.thumbnails.high?.url || ch.snippet.thumbnails.default?.url || "",
            subscribers: ch.statistics.subscriberCount,
            views: ch.statistics.viewCount,
            videos: parseInt(ch.statistics.videoCount, 10),
            url: `https://www.youtube.com/channel/${ch.id}`,
          },
        });
      } catch (err) {
        return json({
          isDemo: true,
          channel: {
            id: channelId,
            title: "Ruh Al Tarikh - Cinematic Islamic Archive",
            url: `https://www.youtube.com/channel/${channelId}`,
          },
          error: String(err),
        });
      }
    }

    if (pathname === "/api/search") {
      const query = url.searchParams.get("q");
      if (!query) return json({ error: "Query parameter q is required", results: [] }, 400);
      if (!apiKey) return json({ isDemo: true, results: [], error: "No API key configured" });

      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&channelId=${channelId}&q=${encodeURIComponent(query)}&maxResults=10&key=${apiKey}`
        );
        const data = (await res.json()) as {
          items?: Array<{
            id: { videoId: string };
            snippet: {
              title: string;
              description: string;
              publishedAt: string;
              thumbnails: { high?: { url: string }; default?: { url: string } };
            };
          }>;
          error?: { message: string };
        };

        if (data.error) throw new Error(data.error.message);

        const results = (data.items || []).map((item) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url || "",
          publishedAt: item.snippet.publishedAt,
        }));

        return json({ isDemo: false, results });
      } catch (err) {
        return json({ isDemo: true, results: [], error: String(err) }, 500);
      }
    }

    return json(
      { error: "Not Found", endpoints: ["/", "/api/videos", "/api/channel", "/api/search"] },
      404
    );
  },
} satisfies ExportedHandler<Env>;
