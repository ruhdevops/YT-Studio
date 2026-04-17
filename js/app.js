const WORKER_URL = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

const grid = document.getElementById("video-grid");

let allVideos = [];

/* 🎬 HERO FEATURE */
function setFeatured(video) {
  const section = document.getElementById("featured");
  const title = document.getElementById("featured-title");
  const btn = document.getElementById("featured-btn");

  if (!video) return;

  section.style.display = "block";
  section.style.backgroundImage = `url(${video.thumbnail})`;

  title.textContent = video.title;

  btn.onclick = () => {
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, "_blank");
  };
}

/* 📺 LOAD VIDEOS */
async function loadVideos() {
  try {
    grid.innerHTML = "<p>🎬 Loading...</p>";

    const res = await fetch(WORKER_URL);

    if (!res.ok) throw new Error("API failed");

    const data = await res.json();

    if (!data.videos || data.videos.length === 0) {
      grid.innerHTML = "<p>No videos found</p>";
      return;
    }

    allVideos = data.videos;

    // 🎬 Set latest video as hero
    setFeatured(allVideos[0]);

    render(allVideos);

  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>❌ Failed to load videos</p>";
  }
}

/* 🎥 RENDER GRID */
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