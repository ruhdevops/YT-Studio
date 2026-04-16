const WORKER_URL = "https://ruhaltarikh-api.workers.dev";

const grid = document.getElementById("video-grid");

let allVideos = [];

/**
 * 🎬 Extract season & episode from title
 */
function parseVideoMeta(title) {
  const lower = title.toLowerCase();

  let season = 1;
  let episode = 0;

  // Detect Season
  const seasonMatch = lower.match(/season\s*(\d+)/);
  if (seasonMatch) season = parseInt(seasonMatch[1]);

  // Detect Episode
  const episodeMatch = lower.match(/(ep|episode)\s*(\d+)/);
  if (episodeMatch) episode = parseInt(episodeMatch[2]);

  return { season, episode };
}

/**
 * Load videos
 */
async function loadVideos() {
  try {
    grid.innerHTML = "<p class='loading'>🎬 Loading episodes...</p>";

    const res = await fetch(WORKER_URL);
    const data = await res.json();

    allVideos = (data.videos || []).map(v => {
      const meta = parseVideoMeta(v.title);
      return { ...v, ...meta };
    });

    // 🔥 Sort by season → episode
    allVideos.sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.episode - b.episode;
    });

    renderVideos(allVideos);

  } catch (err) {
    console.error(err);
    grid.innerHTML = "<p>Failed to load videos</p>";
  }
}

/**
 * Render videos
 */
function renderVideos(videos) {
  grid.innerHTML = "";

  videos.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <img src="${item.thumbnail}" style="width:100%; border-radius:10px;">
      <h3>Season ${item.season} • Episode ${item.episode}</h3>
      <p>${item.title}</p>
      <iframe
        width="100%"
        height="200"
        src="https://www.youtube.com/embed/${item.videoId}"
        frameborder="0"
        allowfullscreen>
      </iframe>
    `;

    grid.appendChild(card);
  });
}

/**
 * 🎬 Season filter (SMART)
 */
function initSeasonFilter() {
  const buttons = document.querySelectorAll(".season-btn");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const season = btn.dataset.season;

      if (season === "all") {
        renderVideos(allVideos);
      } else {
        const seasonNum = parseInt(season.replace("season", ""));
        const filtered = allVideos.filter(v => v.season === seasonNum);
        renderVideos(filtered);
      }
    });
  });
}

/**
 * INIT
 */
loadVideos();
initSeasonFilter();