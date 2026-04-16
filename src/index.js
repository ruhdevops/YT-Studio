export default {
  async fetch(request, env) {
    const API_KEY = env.YOUTUBE_API_KEY;

    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "latest";

    // STEP 1: Get uploads playlist from channel handle
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=Ruh-Al-Tarikh&key=${API_KEY}`
    );

    const channelData = await channelRes.json();

    const uploads =
      channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploads) {
      return new Response("Channel not found", { status: 404 });
    }

    // STEP 2: Fetch latest videos
    const videosRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploads}&maxResults=10&key=${API_KEY}`
    );

    const videos = await videosRes.json();

    return new Response(JSON.stringify(videos), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};