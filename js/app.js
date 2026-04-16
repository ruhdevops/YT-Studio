const WORKER_URL = "https://yt-studio-api.<your-subdomain>.workers.dev";
const grid = document.getElementById("video-grid");

async function loadVideos() {
  try {
    grid.innerHTML = "Loading...";
    const res = await fetch(WORKER_URL);

    if (!res.ok) throw new Error("Worker failed");

    const data = await res.json();
    
    // Check if videos exist and is an array
    if (!data.videos || !Array.isArray(data.videos)) {
      throw new Error("Invalid response");
    }

    render(data.videos);

  } catch (e) {
    console.error(e);
    grid.innerHTML = "<p style='color:red'>API not available</p>";
  }
}

// FIXED: Added missing function declaration
function render(videos) {
  grid.innerHTML = ""; // Clear "Loading..." text

  videos.forEach(v => {
    const card = document.createElement("div");
    card.className = "card";

    // FIXED: Usually you want the iframe OR the thumbnail, not both 
    // stacked. Added a container for the iframe.
    card.innerHTML = `
      <div class="video-container">
        <iframe 
          src="https://www.youtube.com/embed/${v.videoId}" 
          allowfullscreen 
          frameborder="0">
        </iframe>
      </div>
      <h3>${v.title}</h3>
    `;

    grid.appendChild(card);
  });
}

loadVideos();
