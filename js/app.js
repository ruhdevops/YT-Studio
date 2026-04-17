const WORKER_URL = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

const grid = document.getElementById("video-grid");

const modal = document.getElementById("video-modal");
const player = document.getElementById("modal-player");
const closeBtn = document.getElementById("close-modal");

let allVideos = [];

/* 🎬 HERO */
function setFeatured(video) {
  const section = document.getElementById("featured");
  const title = document.getElementById("featured-title");
  const btn = document.getElementById("featured-btn");

  section.style.display = "block";
  section.style.backgroundImage = `url(${video.thumbnail})`;
  title.textContent = video.title;

  btn.onclick = () => openModal(video.videoId);
}

/* 🎥 OPEN MODAL */
function openModal(videoId) {
  modal.style.display = "block";
  player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
}

/* ❌ CLOSE MODAL */
closeBtn.onclick = () => {
  modal.style.display = "none";
  player.src = "";
};

window.onclick = (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
    player.src = "";
  }
};

/* LOAD */
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

    setFeatured(allVideos[0]);
    render(allVideos);

  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>❌ Failed to load videos</p>";
  }
}

/* 🎥 RENDER */
function render(videos) {
  grid.innerHTML = "";

  videos.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${v.thumbnail}">
      <iframe class="preview"
        src="https://www.youtube.com/embed/${v.videoId}?autoplay=1&mute=1&controls=0"
        allow="autoplay">
      </iframe>
      <h3>${v.title}</h3>
    `;

    card.onclick = () => openModal(v.videoId);

    grid.appendChild(card);
  });
}

loadVideos();