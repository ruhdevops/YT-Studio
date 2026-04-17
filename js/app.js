const WORKER_URL = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

const grid = document.getElementById("video-grid");

let allVideos = [];

function setFeatured(video) {
  const section = document.getElementById("featured");
  const title = document.getElementById("featured-title");
  const btn = document.getElementById("featured-btn");

  if (!video) return;

  section.style.display = "flex";
  section.style.backgroundImage = `url(${video.thumbnail})`;

  title.textContent = video.title;

  btn.onclick = () => {
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, "_blank");
  };
}

async function loadVideos() {
  try {
    grid.innerHTML = "<p>🎬 Loading...</p>";

    const res = await fetch(WORKER_URL);
    const data = await res.json();

    if (!data.videos || !data.videos.length) {
      grid.innerHTML = "<p>No videos found</p>";
      return;
    }

    allVideos = data.videos;

    setFeatured(allVideos[0]); // ✅ FIXED
    render(allVideos);

  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>❌ Failed to load videos</p>";
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