export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return json({ ok: true });
    }

    try {
      const API_KEY = env.YOUTUBE_API_KEY;
      const CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

      // 1. Get uploads playlist ID
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`
      );

      if (!channelRes.ok) {
        const errorData = await channelRes.json();
        return json(
          { error: "YouTube API Error", details: errorData },
          channelRes.status
        );
      }

      const channelData = await channelRes.json();

      const uploadsPlaylistId =
        channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        return json({ error: "Channel not found or has no uploads" }, 404);
      }

      // 2. Fetch videos from playlist
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=20&key=${API_KEY}`
      );

      if (!videosRes.ok) {
        const err = await videosRes.json();
        return json(
          { error: "Failed to fetch videos", details: err },
          videosRes.status
        );
      }

      const videosData = await videosRes.json();

      // 3. Map videos
      const videos = (videosData.items || []).map((item) => ({
        title: item.snippet.title,
        videoId: item.snippet.resourceId.videoId,
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
        shortUrl: `https://youtu.be/${item.snippet.resourceId.videoId}`,
        thumbnail:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt
      }));

      return json({ videos });

    } catch (err) {
      return json(
        { error: "Internal Server Error", message: err.message },
        500
      );
    }
  }
};

// 📦 JSON helper
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}