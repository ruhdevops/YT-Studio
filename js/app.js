const API_KEY = "AIzaSyAjd6rE_KTxT9mdkT4XPrEL2vD0fEEc9DA";
const CHANNEL_HANDLE = "Ruh-Al-Tarikh"; // without @

const grid = document.getElementById("video-grid");

/**
 * STEP 1: Get Uploads Playlist ID from Channel Handle
 */
async function getUploadsPlaylistId() {
  const url =
    `https://www.googleapis.com/youtube/v3/channels?` +
    `part=contentDetails&forHandle=${CHANNEL_HANDLE}&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.items || data.items.length === 0) {
    throw new Error("Channel not found. Check handle name.");
  }

  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

/**
 * STEP 2: Fetch Videos from Uploads Playlist
 */
async function getVideos(playlistId) {
  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems?` +
    `part=snippet&playlistId=${playlistId}&maxResults=10&key=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  return data.items;
}

/**
 * STEP 3: Render Videos
 */
function renderVideos(videos) {
  grid.innerHTML = "";

  videos.forEach((item) => {
    const snippet = item.snippet;
    const videoId = snippet.resourceId.videoId;
    const title = snippet.title;
    const thumbnail = snippet.thumbnails.medium.url;

    const card = document.createElement("div");
    card.className = "card";

    // ⚡ Bolt: Implemented Iframe Facade to reduce initial page load weight and network requests.
    card.innerHTML = `
      <div class="video-facade" data-video-id="${videoId}" style="position:relative; cursor:pointer;">
        <img src="${thumbnail}" style="width:100%; border-radius:10px;" loading="lazy">
        <div class="play-button"></div>
      </div>
      <h3>${title}</h3>
    `;

    grid.appendChild(card);
  });
}

/**
 * STEP 4: Handle Video Loading (Facade Click)
 */
grid.addEventListener("click", (e) => {
  const facade = e.target.closest(".video-facade");
  if (!facade) return;

  const videoId = facade.dataset.videoId;
  facade.innerHTML = `
    <iframe
      width="100%"
      height="200"
      src="https://www.youtube.com/embed/${videoId}?autoplay=1"
      frameborder="0"
      allow="autoplay; fullscreen" allowfullscreen
      style="border-radius:10px;">
    </iframe>
  `;
});

/**
 * MAIN EXECUTION
 */
(async function init() {
  try {
    const uploadsPlaylistId = await getUploadsPlaylistId();
    const videos = await getVideos(uploadsPlaylistId);
    renderVideos(videos);
  } catch (error) {
    console.error("Error loading YouTube videos:", error);
    grid.innerHTML = "<p>Failed to load videos. Check API key or channel handle.</p>";
  }
})();
