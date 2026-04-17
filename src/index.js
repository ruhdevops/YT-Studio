export default {
  async fetch() {
    try {
      const API_KEY = "AIzaSyAjd6rE_KTxT9mdkT4XPrEL2vD0fEEc9DA";
      const CHANNEL_ID = "UCrjJP_SHUeCmqpTSHJCXkdA";

      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`
      );
      const channelData = await channelRes.json();

      const uploads =
        channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploads}&maxResults=12&key=${API_KEY}`
      );
      const videosData = await videosRes.json();

      const videos = (videosData.items || []).map(item => ({
        title: item.snippet.title,
        videoId: item.snippet.resourceId.videoId,
        thumbnail: item.snippet.thumbnails.medium.url
      }));

      return new Response(JSON.stringify({ videos }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
  }
};