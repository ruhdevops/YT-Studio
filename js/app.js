(function() {
  const API = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";
  const LOCAL_DATA = "data/videos.json";
  const STORAGE_KEY = "watch_progress";

  let videos = [];
  let current = null;
  let progressInterval = null;

  document.addEventListener("DOMContentLoaded", () => {
    init();
    setupEventListeners();
  });

  async function init() {
    const heroTitle = document.getElementById("hero-title");

    try {
      let res = await fetch(API);
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      videos = data.videos || [];
    } catch (e) {
      console.warn("API failed, falling back to local data:", e);
      try {
        let res = await fetch(LOCAL_DATA);
        if (res.ok) {
          videos = await res.json();
        }
      } catch (err) {
        console.error("Local data failed:", err);
      }
    }

    if (!videos || !videos.length) {
      if (heroTitle) heroTitle.textContent = "No videos available";
      return;
    }

    setHero(videos[0]);
    render();
    renderContinue();
  }

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch (e) {
      return {};
    }
  }

  function saveProgress(id, time) {
    const data = getProgress();
    data[id] = time;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function setHero(v) {
    if (!v) return;
    const title = document.getElementById("hero-title");
    const bg = document.getElementById("bg");
    const hero = document.querySelector(".hero");
    const btn = document.getElementById("hero-btn");

    if (title) title.textContent = v.title;

    if (bg) {
      bg.style.backgroundImage = `url(https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg)`;
    }

    if (hero) {
      hero.style.background = `linear-gradient(to top, black, transparent), url(https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg) center/cover`;
    }

    if (btn) {
      btn.onclick = () => openModal(v);
    }
  }

  function renderContinue() {
    const row = document.getElementById("continue-row");
    if (!row) return;

    const progress = getProgress();
    row.innerHTML = "";

    const keys = Object.keys(progress);
    const title = row.previousElementSibling;

    if (!keys.length) {
       row.style.display = 'none';
       if (title && title.classList.contains('section')) title.style.display = 'none';
       return;
    } else {
       row.style.display = 'flex';
       if (title && title.classList.contains('section')) title.style.display = 'block';
    }

    keys.forEach(id => {
      const v = videos.find(x => x.videoId === id);
      if (!v) return;

      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Continue watching ${v.title}`);
      card.innerHTML = `
        <img src="https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg" alt="${v.title} thumbnail">
        <div class="progress" style="width:${progress[id].percent || 0}%"></div>
      `;
      card.onclick = () => openModal(v, progress[id].time || 0);
      card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(v, progress[id].time || 0);
        }
      };
      row.appendChild(card);
    });
  }

  function render() {
    const grid = document.getElementById("grid");
    const preview = document.getElementById("hover-preview");
    if (!grid) return;

    grid.innerHTML = "";

    videos.forEach(v => {
      const card = document.createElement("div");
      card.className = "card";
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("aria-label", `Watch ${v.title}`);
      card.innerHTML = `<img src="https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg" alt="${v.title} thumbnail">`;

      card.onmouseenter = () => {
        if (preview) {
          preview.style.display = "block";
          preview.src = `https://www.youtube.com/embed/${v.videoId}?autoplay=1&mute=1&controls=0`;
        }
      };

      card.onmousemove = (e) => {
        if (preview) {
          preview.style.top = e.clientY + 15 + "px";
          preview.style.left = e.clientX + 15 + "px";
        }
      };

      card.onmouseleave = () => {
        if (preview) {
          preview.style.display = "none";
          preview.src = "";
        }
      };

      card.onclick = () => openModal(v);
      card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(v);
        }
      };
      grid.appendChild(card);
    });
  }

  function openModal(v, startTime = 0) {
    if (!v) return;
    current = v;

    const modal = document.getElementById("modal");
    const player = document.getElementById("player");
    const title = document.getElementById("video-title");

    if (modal) modal.style.display = "block";
    if (player) {
      player.src = `https://www.youtube.com/embed/${v.videoId}?autoplay=1&start=${startTime}`;
      trackProgress(v.videoId, player);
    }
    if (title) title.textContent = v.title;

    // Focus close button for accessibility
    const closeBtn = document.getElementById("close");
    if (closeBtn) closeBtn.focus();
  }

  function trackProgress(id, player) {
    if (!player) return;

    if (progressInterval) clearInterval(progressInterval);

    progressInterval = setInterval(() => {
      try {
        // Attempting to read from iframe might fail due to CORS
        // Real tracking would require YouTube IFrame Player API
      } catch (e) {}
    }, 5000);
  }

  function setupEventListeners() {
    const closeBtn = document.getElementById("close");
    if (closeBtn) {
      const closeModal = () => {
        const modal = document.getElementById("modal");
        const player = document.getElementById("player");
        if (modal) modal.style.display = "none";
        if (player) player.src = "";
        if (progressInterval) clearInterval(progressInterval);
        renderContinue();
      };
      closeBtn.onclick = closeModal;
      closeBtn.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          closeModal();
        }
      };
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const modal = document.getElementById("modal");
        if (modal && modal.style.display === "block") {
          const closeBtn = document.getElementById("close");
          if (closeBtn) closeBtn.click();
        }
      }
    });
  }
})();
