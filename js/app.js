(function() {
  'use strict';

  /* CONFIG */
  const API = "https://yt-studio-api.ruhdevopsytstudio.workers.dev";
  const CACHE_KEY = "yt_studio_videos_cache";
  const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  const PROGRESS_KEY = "watch_progress";
  const LAST_PLAYED_KEY = "last_played_video";

  /* STATE */
  let videos = [];
  let currentVideo = null;
  let progressInterval = null;

  /* DOM ELEMENTS */
  const elements = {
    appRoot: document.getElementById("app-root"),
    heroTitle: document.getElementById("hero-title"),
    heroBtn: document.getElementById("hero-btn"),
    heroSection: document.querySelector(".hero"),
    bg: document.getElementById("bg"),
    grid: document.getElementById("grid"),
    continueRow: document.getElementById("continue-row"),
    continueSection: document.getElementById("continue-section"),
    modal: document.getElementById("modal"),
    player: document.getElementById("player"),
    videoTitle: document.getElementById("video-title"),
    closeBtn: document.getElementById("close"),
    errorContainer: document.getElementById("error-container"),
    errorMessage: document.getElementById("error-message"),
    retryBtn: document.getElementById("retry-btn"),
    loadingState: document.getElementById("loading-state")
  };

  /* DATA HELPERS */
  async function fetchVideos() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) return data;
      } catch (e) { localStorage.removeItem(CACHE_KEY); }
    }

    try {
      const res = await fetch(API);
      if (!res.ok) throw new Error("API error: " + res.status);
      const json = await res.json();
      const fetchedVideos = (json.videos || []).map(v => ({
        id: v.id,
        title: v.title || "Untitled",
        thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        publishedAt: v.publishedAt,
        channel: v.channel || "Ruh Al Tarikh"
      }));

      localStorage.setItem(CACHE_KEY, JSON.stringify({ data: fetchedVideos, timestamp: Date.now() }));
      return fetchedVideos;
    } catch (e) {
      console.error("Fetch failed:", e);
      throw e;
    }
  }

  /* STORAGE HELPERS */
  function getProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); } catch (e) { return {}; }
  }

  function saveProgress(id, time, percent) {
    const progress = getProgress();
    progress[id] = { time, percent, updatedAt: Date.now() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function setLastPlayed(video) {
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify({ id: video.id, timestamp: Date.now() }));
  }

  function getLastPlayed() {
    try {
      const last = JSON.parse(localStorage.getItem(LAST_PLAYED_KEY));
      return last ? videos.find(v => v.id === last.id) : null;
    } catch (e) { return null; }
  }

  /* UI HELPERS */
  function showLoading() { if (elements.loadingState) elements.loadingState.style.display = "flex"; }
  function hideLoading() { if (elements.loadingState) elements.loadingState.style.display = "none"; }

  function showError(msg) {
    if (elements.errorContainer) {
      elements.errorContainer.style.display = "block";
      elements.errorMessage.textContent = msg;
    }
  }

  function hideError() { if (elements.errorContainer) elements.errorContainer.style.display = "none"; }

  /* RENDERING */
  function renderGrid() {
    if (!elements.grid) return;
    const fragment = document.createDocumentFragment();
    videos.forEach(v => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${v.thumbnail}" loading="lazy" alt="${v.title}">
        <div class="card-title">${v.title.substring(0, 80)}${v.title.length > 80 ? '...' : ''}</div>
        <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
    `;
      card.onclick = () => openModal(v);
      fragment.appendChild(card);
    });
    elements.grid.innerHTML = "";
    elements.grid.appendChild(fragment);
  }

  function renderContinue() {
    if (!elements.continueRow) return;
    const progress = getProgress();
    const items = Object.keys(progress)
      .map(id => ({ id, ...progress[id] }))
      .filter(p => videos.find(v => v.id === p.id))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10);

    if (!items.length) {
      if (elements.continueSection) elements.continueSection.style.display = "none";
      return;
    }

    if (elements.continueSection) elements.continueSection.style.display = "block";
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
      const v = videos.find(x => x.id === item.id);
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${v.thumbnail}" loading="lazy" alt="${v.title}">
        <div class="card-title">${v.title.substring(0, 80)}${v.title.length > 80 ? '...' : ''}</div>
        <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
    `;
      card.onclick = () => openModal(v, item.time);
      fragment.appendChild(card);
    });
    elements.continueRow.innerHTML = "";
    elements.continueRow.appendChild(fragment);
  }

  function setHero(v) {
    if (!v || !elements.heroTitle) return;
    elements.heroTitle.textContent = v.title;
    const img = `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`;
    if (elements.bg) elements.bg.style.backgroundImage = `url(${img})`;
    if (elements.heroSection) elements.heroSection.style.background = `linear-gradient(to top, var(--bg-deep), transparent), url(${img}) center/cover`;
    if (elements.heroBtn) elements.heroBtn.onclick = () => openModal(v);
  }

  /* MODAL */
  function openModal(v, start = 0) {
    currentVideo = v;
    setLastPlayed(v);
    if (elements.modal) elements.modal.style.display = "block";
    if (elements.videoTitle) elements.videoTitle.textContent = v.title;

    // Iframe Facade: Only load the actual player when requested
    if (elements.player) {
      elements.player.src = `https://www.youtube.com/embed/${v.id}?autoplay=1&start=${start}`;
    }

    if (progressInterval) clearInterval(progressInterval);
    let time = start;
    progressInterval = setInterval(() => {
      time += 5;
      saveProgress(v.id, time, Math.min(100, (time / 600) * 100));
    }, 5000);
  }

  function closeModal() {
    if (elements.modal) elements.modal.style.display = "none";
    if (elements.player) elements.player.src = "";
    if (progressInterval) clearInterval(progressInterval);
    renderContinue();
  }

  /* INIT */
  async function init() {
    hideError();
    showLoading();
    try {
      videos = await fetchVideos();
      if (!videos.length) return showError("No videos found.");
      setHero(getLastPlayed() || videos[0]);
      renderGrid();
      renderContinue();
    } catch (e) {
      showError("Failed to load content.");
    } finally {
      hideLoading();
    }
  }

  /* EVENTS */
  if (elements.closeBtn) elements.closeBtn.onclick = closeModal;
  if (elements.retryBtn) elements.retryBtn.onclick = init;
  window.onclick = (e) => { if (e.target === elements.modal) closeModal(); };

  document.addEventListener("DOMContentLoaded", () => {
    init();
    setupHeroButton();
});
})();










