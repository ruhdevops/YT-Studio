const API = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";

let videos = [];
let current = 0;

/* LOAD */
async function load() {
  const res = await fetch(API);
  const data = await res.json();

  videos = data.videos || [];

  if (!videos.length) return;

  setHero(videos[0]);
  render(videos);
}

/* HERO */
function setHero(v) {
  const hero = document.getElementById("hero");

  hero.style.background =
    `linear-gradient(to top, black, transparent),
     url(https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg) center/cover`;

  document.getElementById("hero-title").textContent = v.title;
  document.getElementById("hero-btn").onclick = () => open(v);
}

/* RENDER */
function render(list) {
  const row = document.getElementById("video-row");
  row.innerHTML = "";

  list.forEach((v, i) => {
    const card = document.createElement("div");
    card.className = "card";

    // default image
    card.innerHTML = `
      <img src="https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg">
    `;

    // 🎥 HOVER PREVIEW
    card.onmouseenter = () => {
      card.innerHTML = `
        <iframe 
          src="https://www.youtube.com/embed/${v.videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${v.videoId}"
          frameborder="0">
        </iframe>
      `;

      // 🌫 BACKGROUND BLUR UPDATE
      document.getElementById("bg-blur").style.backgroundImage =
        `url(https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg)`;
    };

    // restore thumbnail
    card.onmouseleave = () => {
      card.innerHTML = `
        <img src="https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg">
      `;
    };

    card.onclick = () => open(v);

    row.appendChild(card);
  });
}

/* MODAL */
function open(v) {
  current = videos.indexOf(v);

  const modal = document.getElementById("modal");
  const player = document.getElementById("player");

  modal.style.display = "block";

  player.src =
    `https://www.youtube.com/embed/${v.videoId}?autoplay=1&origin=https://ruhdevops.github.io`;

  document.getElementById("title").textContent = v.title;
}

/* CLOSE */
document.getElementById("close").onclick = () => {
  document.getElementById("modal").style.display = "none";
  document.getElementById("player").src = "";
};

/* NEXT */
document.getElementById("next").onclick = () => {
  if (current < videos.length - 1) {
    open(videos[current + 1]);
  }
};

load();