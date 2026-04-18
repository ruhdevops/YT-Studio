export default {
  async fetch(request, env) {
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
      // 📺 Get uploads playlist
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`
      );

      if (!channelRes.ok) {
        return json({ error: "YouTube API Channel Fetch Failed" }, channelRes.status);
      }

      const channelData = await channelRes.json();
      const uploads = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploads) {
        return json({ error: "Channel uploads playlist not found" }, 404);
      }

      // 📺 Get videos
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploads}&maxResults=20&key=${API_KEY}`
      );

      if (!videosRes.ok) {
        return json({ error: "YouTube API Playlist Fetch Failed" }, videosRes.status);
      }

      const videosData = await videosRes.json();
      const videos = (videosData.items || []).map((item) => ({
        title: item.snippet.title,
        videoId: item.snippet.resourceId.videoId,
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url
      }));

      return json({ videos });

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
