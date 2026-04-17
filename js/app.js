const WORKER_URL = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

const grid = document.getElementById("video-grid");

let allVideos = [];

async function loadVideos() {
  try {
    grid.innerHTML = "<p>🎬 Loading episodes...</p>";

    const res = await fetch(WORKER_URL);

    if (!res.ok) throw new Error("Worker failed");

    const data = await res.json();

    // ✅ Ensure proper structure
    if (!data || !Array.isArray(data.videos)) {
      throw new Error("Invalid API response");
    }

    allVideos = data.videos;

    if (allVideos.length === 0) {
      grid.innerHTML = "<p>No episodes found</p>";
      return;
    }

    render(allVideos);

  } catch (err) {
    console.error("Error:", err);
    grid.innerHTML = "<p>❌ Failed to load videos</p>";
  }
}

function render(videos) {
  grid.innerHTML = "";

  videos.forEach(v => {
    if (!v.videoId) return;

    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${v.thumbnail}" style="width:100%; border-radius:10px;">
      <h3>${v.title}</h3>
    `;

    card.onclick = () => {
      window.open(`https://www.youtube.com/watch?v=${v.videoId}`, "_blank");
    };

    grid.appendChild(card);
  });
}

loadVideos();