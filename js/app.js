const WORKER_URL = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

let allVideos = [];
let currentIndex = 0;

/* 🎬 PARSE META */
function parseMeta(title) {
  const t = title.toLowerCase();

  const seasonMatch = t.match(/season\s*(\d+)/);
  const episodeMatch = t.match(/(ep|episode)\s*(\d+)/);

  return {
    season: seasonMatch ? Number(seasonMatch[1]) : 1,
    episode: episodeMatch ? Number(episodeMatch[2]) : 0
  };
}

/* 🎥 OPEN MODAL */
function openModal(index) {
  currentIndex = index;

  const video = allVideos[index];
  if (!video) return;

  const modal = document.getElementById("video-modal");
  const player = document.getElementById("modal-player");

  modal.style.display = "block";

  // ✅ FIXED EMBED (VIDEO + AUTOPLAY)
  player.src = `https://www.youtube.com/embed/${video.videoId}?autoplay=1&rel=0&modestbranding=1`;

  document.getElementById("episode-title").textContent = video.title;
  document.getElementById("episode-meta").textContent =
    `Season ${video.season} • Episode ${video.episode}`;

  // 💾 SAVE PROGRESS
  localStorage.setItem("lastWatched", index);
}

/* ⏭ NEXT EPISODE */
document.getElementById("next-btn").onclick = () => {
  if (currentIndex < allVideos.length - 1) {
    openModal(currentIndex + 1);
  }
};

/* ❌ CLOSE BUTTON (FIXED CORE ISSUE) */
function closeModal() {
  const modal = document.getElementById("video-modal");
  const player = document.getElementById("modal-player");

  modal.style.display = "none";

  // ✅ IMPORTANT: stop video completely
  player.src = "";
}

/* bind close button safely */
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.getElementById("close-modal");

  if (closeBtn) {
    closeBtn.addEventListener("click", closeModal);
  }
});

/* 🎬 CARD CREATION */
function createCard(video, index) {
  const card = document.createElement("div");
  card.className = "card";

  card.innerHTML = `
    <img src="${video.thumbnail}">
    <h3>S${video.season} • E${video.episode}</h3>
    <p>${video.title}</p>
  `;

  card.onclick = () => openModal(index);

  return card;
}

/* 📺 RENDER */
function render(videos) {
  const grid = document.getElementById("video-grid");
  grid.innerHTML = "";

  videos.forEach((v, i) => {
    grid.appendChild(createCard(v, i));
  });
}

/* 🔥 LOAD */
async function loadVideos() {
  try {
    const grid = document.getElementById("video-grid");
    grid.innerHTML = "Loading episodes...";

    const res = await fetch(WORKER_URL);
    const data = await res.json();

    if (!data.videos || !data.videos.length) {
      grid.innerHTML = "No videos found";
      return;
    }

    // enrich metadata
    allVideos = data.videos.map(v => ({
      ...v,
      ...parseMeta(v.title)
    }));

    render(allVideos);

  } catch (err) {
    console.error("Load error:", err);
    document.getElementById("video-grid").innerHTML =
      "Failed to load videos";
  }
}

/* 🚀 INIT */
loadVideos();