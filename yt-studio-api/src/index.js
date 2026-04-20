export default {
  async fetch(request, env) {
    const jsonResponse = (data, status = 200) => {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
        }
      });
    };

    try {
      const API_KEY = env.YOUTUBE_API_KEY;
      const CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

      if (!API_KEY) {
        return jsonResponse({ error: "Missing YouTube API Key in environment" }, 500);
      }

      // 1. Get uploads playlist ID
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`
      );

      if (!channelRes.ok) {
        const errorData = await channelRes.json();
        return jsonResponse({ error: "YouTube API Error (Channel)", details: errorData }, channelRes.status);
      }

      const channelData = await channelRes.json();
      const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      if (!uploadsPlaylistId) {
        return jsonResponse({ error: "Uploads playlist not found for this channel" }, 404);
      }

      // 2. Get videos from the uploads playlist
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=50&key=${API_KEY}`
      );

      if (!videosRes.ok) {
        const errorData = await videosRes.json();
        return jsonResponse({ error: "YouTube API Error (PlaylistItems)", details: errorData }, videosRes.status);
      }

      const videosData = await videosRes.json();

      // 3. Normalize data structure
      const videos = (videosData.items || []).map(item => {
        const snippet = item.snippet;
        return {
          id: snippet.resourceId.videoId,
          title: snippet.title,
          thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url,
          publishedAt: snippet.publishedAt,
          channel: snippet.channelTitle
        };
      });

      return jsonResponse({ videos });

    } catch (err) {
      return jsonResponse({ error: "Worker Internal Error", message: err.message }, 500);
    }
  }
};
