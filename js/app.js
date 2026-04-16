const WORKER_URL = "https://ruhaltarikh-api.workers.dev";

const grid = document.getElementById("video-grid");

/**
 * Load videos from Cloudflare Worker
 */
async function loadVideos() {
  try {
    grid.innerHTML = "<p class='loading'>Loading videos...</p>";

    const res = await fetch(WORKER_URL);
    const data = await res.json();

    const videos = data.items || [];

    grid.innerHTML = "";

    videos.forEach((item) => {
      const snippet = item.snippet;
      const videoId = snippet.resourceId.videoId;
      const title = snippet.title;
      const thumbnail = snippet.thumbnails.medium.url;

      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <div class="video-container">
          <img src="${thumbnail}" alt="${title}" style="width:100%; border-radius:10px;">
          <div class="play-overlay">▶</div>
        </div>

        <h3>${title}</h3>

        <iframe
          width="100%"
          height="200"
          src="https://www.youtube.com/embed/${videoId}"
          frameborder="0"
          allowfullscreen>
        </iframe>
      `;

      grid.appendChild(card);
    });

  } catch (err) {
    console.error("Video load failed:", err);
    grid.innerHTML = "<p>Failed to load videos</p>";
  }
}

/**
 * Init app
 */
loadVideos();

/**
 * Optional: click-to-play enhancement (future-ready)
 */
grid.addEventListener("click", (e) => {
  const container = e.target.closest(".video-container");
  if (!container) return;

  const iframe = container.parentElement.querySelector("iframe");
  if (iframe) {
    iframe.src += "?autoplay=1";
  }
});