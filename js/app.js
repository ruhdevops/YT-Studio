const WORKER_URL = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

const grid = document.getElementById("video-grid");

let allVideos = [];

async function loadVideos() {
  try {
    grid.innerHTML = "Loading episodes...";

    const res = await fetch(WORKER_URL);

    if (!res.ok) throw new Error("Worker failed");

    const data = await res.json();

    allVideos = data.videos || [];

    if (!allVideos.length) {
      grid.innerHTML = "No videos found";
      return;
    }

    render(allVideos);

  } catch (err) {
    console.error(err);
    grid.innerHTML = "Failed to load videos";
  }
}

function render(videos) {
  grid.innerHTML = "";

  videos.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${v.thumbnail}">
      <h3>${v.title}</h3>
    `;

    card.onclick = () => {
      window.open(`https://www.youtube.com/watch?v=${v.videoId}`, "_blank");
    };

    grid.appendChild(card);
  });
}

loadVideos();