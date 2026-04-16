export default {
  async fetch(request, env) {
    try {
      const API_KEY = env.YOUTUBE_API_KEY;

      if (!API_KEY) {
        return json({ error: "Missing API key" }, 500);
      }

      // 🎯 Your Channel ID (REQUIRED)
      const CHANNEL_ID = "UCxxxxxxxxxxxxxxxxxxxx";

      // 📺 Get uploads playlist
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`
      );

      const channelData = await channelRes.json();

      if (!channelData.items?.length) {
        return json({ error: "Channel not found" }, 404);
      }

      const uploads =
        channelData.items[0].contentDetails.relatedPlaylists.uploads;

      // 📺 Get videos
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploads}&maxResults=20&key=${API_KEY}`
      );

      const videosData = await videosRes.json();

      const videos = (videosData.items || []).map((item) => {
        const s = item.snippet || {};

        return {
          title: s.title || "",
          videoId: s.resourceId?.videoId || "",
          publishedAt: s.publishedAt || "",
          thumbnail: s.thumbnails?.high?.url || ""
        };
      });

      return json({ videos });

    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
};

// 📦 helper
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}