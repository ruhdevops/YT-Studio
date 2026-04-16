export default {
  async fetch(request, env) {
    try {
      const API_KEY = env.YOUTUBE_API_KEY;

      // ✅ FIXED: direct channel ID method (MOST RELIABLE)
      const CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA"; // ← replace with your real channel ID

      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`
      );

      const channelData = await channelRes.json();

      const uploads =
        channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploads) {
        return json({ error: "Uploads not found" }, 404);
      }

      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploads}&maxResults=20&key=${API_KEY}`
      );

      const videosData = await videosRes.json();

      const videos = (videosData.items || []).map(item => ({
        title: item.snippet.title,
        videoId: item.snippet.resourceId.videoId,
        thumbnail: item.snippet.thumbnails?.high?.url
      }));

      return json({ videos });

    } catch (err) {
      return json({ error: err.message }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}