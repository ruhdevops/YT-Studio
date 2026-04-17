const WORKER_URL = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

let allVideos = [];
let currentIndex = 0;

async function loadVideos() {
  const grid = document.getElementById("video-grid");

  try {
    grid.innerHTML = "Loading...";

    const res = await fetch(WORKER_URL);
    const data = await res.json();

    allVideos = data.videos || [];

    if (!allVideos.length) {
      document.getElementById("featured-title").textContent =
        "No episodes found";
      return;
    }

    render(allVideos);
    setFeatured(allVideos[0]); // ✅ ALWAYS SET FEATURED

  } catch (e) {
    console.error(e);

    // ✅ FALLBACK FEATURED
    document.getElementById("featured-title").textContent =
      "Failed to load content";
  }
}

/* ✅ FEATURED FIX */
function setFeatured(video) {
  const section = document.getElementById("featured");
  const title = document.getElementById("featured-title");
  const btn = document.getElementById("featured-btn");

  section.style.backgroundImage = `url(${video.thumbnail})`;
  title.textContent = video.title;

  btn.onclick = () => openModal(0);
}

/* RENDER */
function render(videos) {
  const grid = document.getElementById("video-grid");
  grid.innerHTML = "";

  videos.forEach((v, i) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${v.thumbnail}">
      <h3>${v.title}</h3>
    `;

    card.onclick = () => openModal(i);

    grid.appendChild(card);
  });
}

/* MODAL */
function openModal(index) {
  currentIndex = index;

  const v = allVideos[index];

  document.getElementById("video-modal").style.display = "block";

  document.getElementById("modal-player").src =
    `https://www.youtube.com/embed/${v.videoId}?autoplay=1&origin=https://ruhdevops.github.io`;

  document.getElementById("episode-title").textContent = v.title;
  document.getElementById("episode-meta").textContent = "Now Playing";
}

/* CLOSE */
document.getElementById("close-modal").onclick = () => {
  document.getElementById("video-modal").style.display = "none";
  document.getElementById("modal-player").src = "";
};

/* NEXT */
document.getElementById("next-btn").onclick = () => {
  if (currentIndex < allVideos.length - 1) {
    openModal(currentIndex + 1);
  }
};

loadVideos();