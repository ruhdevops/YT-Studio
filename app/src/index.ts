export interface Env {
  YOUTUBE_API_KEY: string;
}

interface YouTubeChannelItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    customUrl?: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    subscriberCount: string;
    hiddenSubscriberCount: boolean;
    videoCount: string;
  };
}

interface YouTubeChannelResponse {
  items?: YouTubeChannelItem[];
  error?: { message: string; code: number };
}

interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    channelId: string;
    channelTitle: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  statistics: {
    viewCount: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface YouTubeVideoResponse {
  items?: YouTubeVideoItem[];
  error?: { message: string; code: number };
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

async function fetchChannelStats(channelId: string, apiKey: string): Promise<Response> {
  const params = new URLSearchParams({
    part: "snippet,statistics",
    id: channelId,
    key: apiKey,
  });
  const resp = await fetch(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  const data = (await resp.json()) as YouTubeChannelResponse;

  if (!resp.ok) {
    return jsonResponse(
      { error: data.error?.message ?? "YouTube API request failed" },
      resp.status,
    );
  }
  if (!data.items || data.items.length === 0) {
    return jsonResponse({ error: "Channel not found" }, 404);
  }

  const ch = data.items[0];
  return jsonResponse({
    id: ch.id,
    title: ch.snippet.title,
    description: ch.snippet.description,
    customUrl: ch.snippet.customUrl ?? null,
    publishedAt: ch.snippet.publishedAt,
    thumbnail:
      ch.snippet.thumbnails.high?.url ??
      ch.snippet.thumbnails.medium?.url ??
      ch.snippet.thumbnails.default?.url ??
      null,
    statistics: {
      viewCount: ch.statistics.viewCount,
      subscriberCount: ch.statistics.subscriberCount,
      videoCount: ch.statistics.videoCount,
    },
  });
}

async function fetchVideoStats(videoId: string, apiKey: string): Promise<Response> {
  const params = new URLSearchParams({
    part: "snippet,statistics",
    id: videoId,
    key: apiKey,
  });
  const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`);
  const data = (await resp.json()) as YouTubeVideoResponse;

  if (!resp.ok) {
    return jsonResponse(
      { error: data.error?.message ?? "YouTube API request failed" },
      resp.status,
    );
  }
  if (!data.items || data.items.length === 0) {
    return jsonResponse({ error: "Video not found" }, 404);
  }

  const video = data.items[0];
  return jsonResponse({
    id: video.id,
    title: video.snippet.title,
    description: video.snippet.description,
    publishedAt: video.snippet.publishedAt,
    channelId: video.snippet.channelId,
    channelTitle: video.snippet.channelTitle,
    thumbnail:
      video.snippet.thumbnails.high?.url ??
      video.snippet.thumbnails.medium?.url ??
      video.snippet.thumbnails.default?.url ??
      null,
    statistics: {
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount ?? null,
      commentCount: video.statistics.commentCount ?? null,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);
    const { pathname, searchParams } = url;

    if (pathname === "/" || pathname === "") {
      return jsonResponse({
        name: "YT-Studio YouTube API v3 Worker",
        version: "1.0.0",
        endpoints: {
          "/channel": "GET ?id=CHANNEL_ID — fetch channel statistics",
          "/video": "GET ?id=VIDEO_ID — fetch video statistics",
        },
      });
    }

    if (pathname === "/channel") {
      const id = searchParams.get("id");
      if (!id) {
        return jsonResponse({ error: "Missing required query parameter: id" }, 400);
      }
      if (!env.YOUTUBE_API_KEY) {
        return jsonResponse({ error: "YOUTUBE_API_KEY is not configured" }, 503);
      }
      return fetchChannelStats(id, env.YOUTUBE_API_KEY);
    }

    if (pathname === "/video") {
      const id = searchParams.get("id");
      if (!id) {
        return jsonResponse({ error: "Missing required query parameter: id" }, 400);
      }
      if (!env.YOUTUBE_API_KEY) {
        return jsonResponse({ error: "YOUTUBE_API_KEY is not configured" }, 503);
      }
      return fetchVideoStats(id, env.YOUTUBE_API_KEY);
    }

    return jsonResponse({ error: "Not found", path: pathname }, 404);
  },
} satisfies ExportedHandler<Env>;
