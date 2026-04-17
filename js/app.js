const WORKER_URL = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

const grid = document.getElementById("video-grid");

let allVideos = [];

/**
 * 🚀 Load videos from Cloudflare Worker
 */
async function loadVideos() {
  try {
    grid.innerHTML = "<p class='loading'>🎬 Loading episodes...</p>";

    const res = await fetch(WORKER_URL);

    if (!res.ok) {
      throw new Error(`Worker failed: ${res.status}`);
    }

    const data = await res.json();

    // ✅ Ensure correct structure
    if (!data || !Array.isArray(data.videos)) {
      throw new Error("Invalid API response");
    }

    allVideos = data.videos;

    if (allVideos.length === 0) {
      grid.innerHTML = "<p>No videos found</p>";
      return;
    }

    render(allVideos);

  } catch (err) {
    console.error("🔥 Load Error:", err);
    grid.innerHTML = "<p>❌ Failed to load videos</p>";
  }
}

/**
 * 🎥 Render video cards
 */
function render(videos) {
  grid.innerHTML = "";

  videos.forEach(v => {
    if (!v.videoId || !v.thumbnail) return; // safety check

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${v.thumbnail}" alt="${v.title}" loading="lazy">
      <h3>${v.title}</h3>
    `;

    card