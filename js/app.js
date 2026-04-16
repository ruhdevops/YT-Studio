const WORKER_URL = "https://ruhaltarikh-api.workers.dev";

const grid = document.getElementById("video-grid");

let allVideos = [];

/**
 * 🎬 Parse season + episode
 */
function parseMeta(title) {
  const t = title.toLowerCase();

  let season = 1;
  let episode = 0;

  const s = t.match(/season\s*(\d+)/);
  const e = t.match(/(ep|episode)\s*(\d+)/);

  if (s) season = +s[1];
  if (e) episode = +e[2];

  return { season, episode };
}

/**
 * 🔥 Featured banner
 */
function setFeatured(video) {
  const banner = document.getElementById("featured-banner");
  const title = document.getElementById("featured-title");
  const meta = document.getElementById("featured-meta");
  const btn = document.getElementById("play-btn");

  banner.style.backgroundImage = `url(${video.thumbnail})`;

  title.textContent = video.title;
  meta.textContent = `Season ${video.season} • Episode ${video.episode}`;

  btn.onclick = () => {
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, "_blank");
  };
}

/**
 * 📺 Load videos
 */
async function loadVideos() {
  try {
    grid.innerHTML = "<p>Loading...</p>";

    const res = await fetch(WORKER_URL);
    const data = await res.json();

    allVideos = (data.videos || [])
      .map(v => ({ ...v, ...parseMeta(v.title) }))
      .sort((a, b) => a.season - b.season || a.episode - b.episode);

    if (!allVideos.length) return;

    // 🎬 Featured = latest
    setFeatured(allVideos[allVideos.length - 1]);

    render(allVideos);

  } catch (e) {
    grid.innerHTML = "<p>Failed to load</p>";
  }
}

/**
 * 🎥 Render grid
 */
function render(list) {
  grid.innerHTML = "";

  list.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${v.thumbnail}">
      <h3>S${v.season} • E${v.episode}</h3>
      <p>${v.title}</p>
      <iframe
        src="https://www.youtube.com/embed/${v.videoId}"
        allowfullscreen>
      </iframe>
    `;

    grid.appendChild(card);
  });
}

/**
 * 🎛 Filter system
 */
function initFilters() {
  document.querySelectorAll(".season-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".season-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const s = btn.dataset.season;

      if (s === "all") render(allVideos);
      else {
        const num = +s.replace("season", "");
        render(allVideos.filter(v => v.season === num));
      }
    };
  });
}

/**
 * INIT
 */
loadVideos();
initFilters();