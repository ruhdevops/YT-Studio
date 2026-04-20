export default {
  async fetch(request, env, ctx) {
    const cacheUrl = new URL(request.url);
    const cacheKey = new Request(cacheUrl.toString(), request);
    const cache = caches.default;

    // ⚡ Performance: Check Edge Cache first
    let response = await cache.match(cacheKey);
    if (response) {
      // Add a header to indicate cache hit for measurement
      const newHeaders = new Headers(response.headers);
      newHeaders.set("X-Cache", "HIT");
      return new Response(response.body, { ...response, headers: newHeaders });
    }

    // 🛡️ Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const API_KEY = env.YOUTUBE_API_KEY;
    const CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

    try {
      if (!API_KEY) throw new Error("Missing YOUTUBE_API_KEY");

      // 📺 Get uploads playlist (Optimized with internal fetch cache)
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`,
        { cf: { cacheTtl: 86400, cacheEverything: true } }
      );

      if (!channelRes.ok) return json({ error: "YouTube API Channel Fetch Failed" }, channelRes.status);

      const channelData = await channelRes.json();
      const uploads = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploads) return json({ error: "Channel uploads playlist not found" }, 404);

      // 📺 Get videos (Optimized with internal fetch cache)
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploads}&maxResults=20&key=${API_KEY}`,
        { cf: { cacheTtl: 3600, cacheEverything: true } }
      );

      if (!videosRes.ok) return json({ error: "YouTube API Playlist Fetch Failed" }, videosRes.status);

      const videosData = await videosRes.json();

      // ⚡ Correctness: Map videoId to id as expected by the frontend
      const videos = (videosData.items || []).map((item) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url
      }));

      response = json({ videos });

      // ⚡ Performance: Set Cache-Control for browser and edge
      response.headers.set("Cache-Control", "public, max-age=3600");
      response.headers.set("X-Cache", "MISS");

      // ⚡ Performance: Store in Edge Cache
      ctx.waitUntil(cache.put(cacheKey, response.clone()));

      return response;

    } catch (err) {
      return json({ error: "Internal Server Error", message: err.message }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    }
  });
}
