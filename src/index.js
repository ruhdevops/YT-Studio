var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var index_default = {
  async fetch(request, env) {
    try {
      const API_KEY = env.AIzaSyAjd6rE_KTxT9mdkT4XPrEL2vD0fEEc9DA;
      if (!API_KEY) {
        return jsonResponse({ error: "Missing API key" }, 500);
      }
      const CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";
      const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`;
      const channelRes = await fetch(channelUrl);
      const channelData = await channelRes.json();
      if (!channelRes.ok || !channelData.items?.length) {
        return jsonResponse({ error: "Channel not found" }, 404);
      }
      const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
      const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=10&key=${API_KEY}`;
      const videosRes = await fetch(videosUrl);
      const videosData = await videosRes.json();
      const videos = (videosData.items || []).map((item) => {
        const snippet = item.snippet || {};
        return {
          title: snippet.title || "No title",
          videoId: snippet.resourceId?.videoId || "",
          publishedAt: snippet.publishedAt || "",
          thumbnail: snippet.thumbnails?.high?.url || ""
        };
      });
      return jsonResponse({ videos });
    } catch (err) {
      return jsonResponse(
        { error: "Worker crashed", details: err.message },
        500
      );
    }
  }
};
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(jsonResponse, "jsonResponse");
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
