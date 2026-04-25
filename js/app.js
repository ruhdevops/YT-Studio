(function() {
  'use strict';

  const API = 'https://yt-studio-api.ruhdevopsytstudio.workers.dev';
  const CACHE_KEY = 'yt_studio_videos_cache';
  const CACHE_EXPIRY = 24 * 60 * 60 * 1000;
  const PROGRESS_KEY = 'watch_progress';
  const LAST_PLAYED_KEY = 'last_played_video';
  const WATCH_LATER_KEY = 'watch_later';
  const THEME_KEY = 'ui_theme';
  const ASSUMED_VIDEO_DURATION = 600;

  const CATEGORY_RULES = [
    { key: 'quran', label: 'Quran', terms: ['quran', 'qur', 'surah', 'ayah', 'allah', 'tafsir', 'islam'] },
    { key: 'prophecy', label: 'Prophecy', terms: ['prophecy', 'prophet', 'end times', 'dajjal', 'gog', 'magog', 'signs'] },
    { key: 'discussion', label: 'Discussion', terms: ['podcast', 'debate', 'discussion', 'conversation', 'talk', 'interview'] },
    { key: 'educational', label: 'Educational', terms: ['lesson', 'explained', 'guide', 'education', 'study', 'documentary'] },
    { key: 'history', label: 'History', terms: ['history', 'empire', 'caliph', 'scroll', 'civilization', 'war', 'king', 'dead sea'] }
  ];

  const elements = {
    body: document.body,
    bg: document.getElementById('bg'),
    heroSection: document.querySelector('.hero'),
    heroTitle: document.getElementById('hero-title'),
    heroSubtitle: document.getElementById('hero-subtitle'),
    heroCategory: document.getElementById('hero-category'),
    heroDate: document.getElementById('hero-date'),
    heroBtn: document.getElementById('hero-btn'),
    heroSaveBtn: document.getElementById('hero-save-btn'),
    statTotal: document.getElementById('stat-total'),
    statProgress: document.getElementById('stat-progress'),
    statSaved: document.getElementById('stat-saved'),
    latestTitle: document.getElementById('highlight-latest-title'),
    latestCopy: document.getElementById('highlight-latest-copy'),
    themeTitle: document.getElementById('highlight-theme-title'),
    themeCopy: document.getElementById('highlight-theme-copy'),
    progressTitle: document.getElementById('highlight-progress-title'),
    progressCopy: document.getElementById('highlight-progress-copy'),
    searchInput: document.getElementById('searchInput'),
    clearSearch: document.getElementById('clearSearch'),
    chips: Array.from(document.querySelectorAll('.chip')),
    resultsMeta: document.getElementById('results-meta'),
    grid: document.getElementById('grid'),
    continueBlock: document.getElementById('continue-block'),
    continueRow: document.getElementById('continue-row'),
    trendingBlock: document.getElementById('trending-block'),
    trendingRow: document.getElementById('trending-row'),
    modal: document.getElementById('modal'),
    player: document.getElementById('player'),
    videoTitle: document.getElementById('video-title'),
    closeBtn: document.getElementById('close'),
    errorContainer: document.getElementById('error-container'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    loadingState: document.getElementById('loading-state'),
    watchLaterBadge: document.getElementById('watchLaterBadge'),
    watchLaterCount: document.getElementById('watchLaterCount'),
    watchLaterPage: document.getElementById('watchLaterPage'),
    watchLaterContainer: document.getElementById('watchLaterContainer'),
    closeWatchLater: document.getElementById('closeWatchLater'),
    dashboardBtn: document.getElementById('dashboardBtn'),
    dashboardModal: document.getElementById('dashboardModal'),
    closeDashboard: document.getElementById('closeDashboard'),
    dashboardTotal: document.getElementById('dashboard-total'),
    dashboardSaved: document.getElementById('dashboard-saved'),
    dashboardProgress: document.getElementById('dashboard-progress'),
    dashboardHours: document.getElementById('dashboard-hours'),
    dashboardCategories: document.getElementById('dashboardCategories'),
    dashboardResumeList: document.getElementById('dashboardResumeList'),
    darkModeToggle: document.getElementById('darkModeToggle'),
    toast: document.getElementById('toast')
  };

  const state = {
    videos: [],
    filteredVideos: [],
    heroVideo: null,
    currentVideo: null,
    progressInterval: null,
    activeCategory: 'all',
    searchTerm: '',
    theme: 'dark'
  };

  function sanitizeText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function truncate(text, limit) {
    const cleanText = String(text || '');
    return cleanText.length > limit ? `${cleanText.slice(0, limit).trim()}...` : cleanText;
  }

  function formatDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return 'Recently added';
    }

    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function mapVideo(video) {
    const id = video.id || video.videoId;
    return {
      id,
      videoId: video.videoId || id,
      title: video.title || 'Untitled',
      thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${id}/mqdefault.jpg`,
      heroImage: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
      publishedAt: video.publishedAt || new Date().toISOString(),
      channel: video.channel || 'Ruh Al Tarikh',
      category: detectCategory(video.title || ''),
      description: buildDescription(video.title || 'Untitled')
    };
  }

  function detectCategory(title) {
    const lower = title.toLowerCase();
    const matched = CATEGORY_RULES.find((rule) => rule.terms.some((term) => lower.includes(term)));
    return matched ? matched.key : 'history';
  }

  function getCategoryLabel(category) {
    const matched = CATEGORY_RULES.find((rule) => rule.key === category);
    return matched ? matched.label : 'History';
  }

  function buildDescription(title) {
    const category = getCategoryLabel(detectCategory(title));
    return `${category} episode exploring ${truncate(title, 96)}.`;
  }

  async function fetchVideos() {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY && Array.isArray(data) && data.length) {
          return data.map(mapVideo);
        }
      } catch (error) {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    const response = await fetch(API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await response.json();
    const fetchedVideos = (json.videos || []).map(mapVideo);

    if (!fetchedVideos.length) {
      return [
        mapVideo({
          id: 'Zzcdtm7Il9U',
          title: 'The hidden wall of Dhul-Qarnayn explained',
          thumbnail: 'https://i.ytimg.com/vi/Zzcdtm7Il9U/mqdefault.jpg'
        })
      ];
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify({ data: fetchedVideos, timestamp: Date.now() }));
    return fetchedVideos;
  }

  function getProgress() {
    try {
      return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveProgress(id, time, percent) {
    const progress = getProgress();
    progress[id] = { time, percent, updatedAt: Date.now() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }

  function getSavedList() {
    try {
      const saved = JSON.parse(localStorage.getItem(WATCH_LATER_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  function saveSavedList(list) {
    localStorage.setItem(WATCH_LATER_KEY, JSON.stringify(list));
  }

  function isSaved(id) {
    return getSavedList().includes(id);
  }

  function toggleSaved(id) {
    const saved = new Set(getSavedList());
    let message = 'Added to Watch Later';

    if (saved.has(id)) {
      saved.delete(id);
      message = 'Removed from Watch Later';
    } else {
      saved.add(id);
    }

    saveSavedList(Array.from(saved));
    updateWatchLaterCount();
    renderWatchLater();
    renderHero(state.heroVideo);
    renderDashboard();
    showToast(message);
  }

  function setLastPlayed(video) {
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify({ id: video.id, timestamp: Date.now() }));
  }

  function getLastPlayed() {
    try {
      const last = JSON.parse(localStorage.getItem(LAST_PLAYED_KEY));
      return last ? state.videos.find((video) => video.id === last.id) || null : null;
    } catch (error) {
      return null;
    }
  }

  function showLoading() {
    if (elements.loadingState) {
      elements.loadingState.style.display = 'flex';
    }
  }

  function hideLoading() {
    if (elements.loadingState) {
      elements.loadingState.style.display = 'none';
    }
  }

  function showError(message) {
    if (!elements.errorContainer || !elements.errorMessage) {
      return;
    }

    elements.errorMessage.textContent = message;
    elements.errorContainer.style.display = 'block';
  }

  function hideError() {
    if (elements.errorContainer) {
      elements.errorContainer.style.display = 'none';
    }
  }

  function showToast(message) {
    if (!elements.toast) {
      return;
    }

    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    window.clearTimeout(showToast.timeoutId);
    showToast.timeoutId = window.setTimeout(() => {
      elements.toast.classList.remove('show');
    }, 2200);
  }

  function getFilteredVideos() {
    const search = state.searchTerm.trim().toLowerCase();

    return state.videos.filter((video) => {
      const matchesCategory = state.activeCategory === 'all' || video.category === state.activeCategory;
      const matchesSearch = !search || `${video.title} ${video.channel} ${video.category}`.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }

  function getTrendingVideos() {
    const progress = getProgress();
    return state.videos
      .slice()
      .sort((a, b) => {
        const progressScoreA = progress[a.id]?.percent || 0;
        const progressScoreB = progress[b.id]?.percent || 0;
        return new Date(b.publishedAt).getTime() + progressScoreB * 1000 - (new Date(a.publishedAt).getTime() + progressScoreA * 1000);
      })
      .slice(0, 8);
  }

  function createCardMarkup(video, options = {}) {
    const progress = getProgress()[video.id];
    const progressPercent = Math.round(progress?.percent || 0);
    const saved = isSaved(video.id);
    const badge = options.badge ? `<span class="trending-badge">${sanitizeText(options.badge)}</span>` : '';
    const meta = `<div class="card-meta"><span>${sanitizeText(getCategoryLabel(video.category))}</span><span>${sanitizeText(formatDate(video.publishedAt))}</span></div>`;

    return `
      <article class="card" data-id="${sanitizeText(video.id)}" tabindex="0" role="button" aria-label="Play ${sanitizeText(video.title)}">
        ${badge}
        <button
          class="watch-later-btn${saved ? ' active' : ''}"
          type="button"
          data-save-id="${sanitizeText(video.id)}"
          aria-label="${saved ? 'Remove from watch later' : 'Save to watch later'}"
        >
          <i class="fa-${saved ? 'solid' : 'regular'} fa-bookmark" aria-hidden="true"></i>
        </button>
        <img src="${sanitizeText(video.thumbnail)}" loading="lazy" alt="${sanitizeText(video.title)}">
        <div class="card-copy">
          <div class="card-title">${sanitizeText(truncate(video.title, 88))}</div>
          ${meta}
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${progressPercent}%"></div></div>
      </article>
    `;
  }

  function renderGrid() {
    if (!elements.grid) {
      return;
    }

    state.filteredVideos = getFilteredVideos();
    const total = state.filteredVideos.length;
    const label = state.activeCategory === 'all' ? 'All themes' : getCategoryLabel(state.activeCategory);
    elements.resultsMeta.textContent = `${total} episode${total === 1 ? '' : 's'} • ${label}${state.searchTerm ? ` • Search: "${state.searchTerm.trim()}"` : ''}`;

    if (!total) {
      elements.grid.innerHTML = '<div class="no-results">No episodes matched this search. Try a broader phrase or switch theme.</div>';
      return;
    }

    elements.grid.innerHTML = state.filteredVideos.map((video) => createCardMarkup(video)).join('');
  }

  function renderContinue() {
    if (!elements.continueBlock || !elements.continueRow) {
      return;
    }

    const progress = getProgress();
    const items = Object.keys(progress)
      .map((id) => ({ id, ...progress[id] }))
      .filter((item) => state.videos.find((video) => video.id === item.id))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 8);

    if (!items.length) {
      elements.continueBlock.style.display = 'none';
      elements.continueRow.innerHTML = '';
      return;
    }

    elements.continueBlock.style.display = 'block';
    elements.continueRow.innerHTML = items
      .map((item) => {
        const video = state.videos.find((entry) => entry.id === item.id);
        return createCardMarkup(video, { badge: `${Math.round(item.percent)}% watched` });
      })
      .join('');
  }

  function renderTrending() {
    if (!elements.trendingBlock || !elements.trendingRow) {
      return;
    }

    const trending = getTrendingVideos();
    if (!trending.length) {
      elements.trendingBlock.style.display = 'none';
      return;
    }

    elements.trendingBlock.style.display = 'block';
    elements.trendingRow.innerHTML = trending
      .map((video, index) => createCardMarkup(video, { badge: index < 3 ? 'Trending' : 'Fresh pick' }))
      .join('');
  }

  function renderHero(video) {
    if (!video || !elements.heroTitle) {
      return;
    }

    state.heroVideo = video;
    const image = video.heroImage;

    elements.heroTitle.textContent = video.title;
    elements.heroSubtitle.textContent = video.description;
    elements.heroCategory.textContent = getCategoryLabel(video.category);
    elements.heroDate.textContent = formatDate(video.publishedAt);
    elements.heroSaveBtn.innerHTML = isSaved(video.id)
      ? '<i class="fa-solid fa-bookmark" aria-hidden="true"></i><span>Saved</span>'
      : '<i class="fa-regular fa-bookmark" aria-hidden="true"></i><span>Save</span>';

    if (elements.bg) {
      elements.bg.style.backgroundImage = `url(${image})`;
    }

    if (elements.heroSection) {
      elements.heroSection.style.backgroundImage =
        `linear-gradient(90deg, rgba(5, 10, 20, 0.94) 0%, rgba(5, 10, 20, 0.72) 48%, rgba(5, 10, 20, 0.18) 100%), url(${image})`;
    }
  }

  function renderHighlights() {
    const latest = state.videos
      .slice()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())[0];

    const progress = getProgress();
    const progressEntries = Object.keys(progress);

    if (latest) {
      elements.latestTitle.textContent = truncate(latest.title, 72);
      elements.latestCopy.textContent = `${getCategoryLabel(latest.category)} • ${formatDate(latest.publishedAt)}`;
    }

    elements.themeTitle.textContent = getCategoryLabel(state.activeCategory === 'all' ? 'history' : state.activeCategory);
    elements.themeCopy.textContent = state.activeCategory === 'all'
      ? 'Browsing the full archive across history, scripture, and live discussion.'
      : `Focused on ${getCategoryLabel(state.activeCategory).toLowerCase()} episodes from the archive.`;

    if (progressEntries.length) {
      const mostRecent = progressEntries
        .map((id) => ({ id, ...progress[id] }))
        .sort((a, b) => b.updatedAt - a.updatedAt)[0];
      const video = state.videos.find((entry) => entry.id === mostRecent.id);
      elements.progressTitle.textContent = video ? truncate(video.title, 60) : 'Viewing activity active';
      elements.progressCopy.textContent = `${Math.round(mostRecent.percent)}% watched • Resume from your continue watching row.`;
    } else {
      elements.progressTitle.textContent = 'No active sessions yet';
      elements.progressCopy.textContent = 'Start an episode and your progress will be tracked here.';
    }
  }

  function renderWatchLater() {
    if (!elements.watchLaterContainer) {
      return;
    }

    const savedIds = getSavedList();
    const savedVideos = savedIds
      .map((id) => state.videos.find((video) => video.id === id))
      .filter(Boolean);

    if (!savedVideos.length) {
      elements.watchLaterContainer.innerHTML = '<div class="empty-state">Your saved queue is empty. Bookmark an episode to keep it close.</div>';
      return;
    }

    elements.watchLaterContainer.innerHTML = savedVideos.map((video) => createCardMarkup(video, { badge: 'Saved' })).join('');
  }

  function updateWatchLaterCount() {
    const count = getSavedList().length;
    if (elements.watchLaterCount) {
      elements.watchLaterCount.textContent = String(count);
    }
    if (elements.statSaved) {
      elements.statSaved.textContent = String(count);
    }
  }

  function renderDashboard() {
    const progress = getProgress();
    const savedCount = getSavedList().length;
    const inProgressCount = Object.keys(progress).length;
    const estimatedHours = ((state.videos.length * ASSUMED_VIDEO_DURATION) / 3600).toFixed(1);

    if (elements.statTotal) {
      elements.statTotal.textContent = String(state.videos.length);
    }
    if (elements.statProgress) {
      elements.statProgress.textContent = String(inProgressCount);
    }

    if (elements.dashboardTotal) {
      elements.dashboardTotal.textContent = String(state.videos.length);
      elements.dashboardSaved.textContent = String(savedCount);
      elements.dashboardProgress.textContent = String(inProgressCount);
      elements.dashboardHours.textContent = `${estimatedHours}h`;
    }

    const counts = CATEGORY_RULES.map((rule) => ({
      label: rule.label,
      value: state.videos.filter((video) => video.category === rule.key).length
    })).filter((item) => item.value > 0);

    elements.dashboardCategories.innerHTML = counts.length
      ? counts.map((item) => `<div class="dashboard-list-row"><span>${sanitizeText(item.label)}</span><strong>${item.value}</strong></div>`).join('')
      : '<div class="empty-state compact">No category data available yet.</div>';

    const resumeEntries = Object.keys(progress)
      .map((id) => ({ id, ...progress[id] }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5);

    elements.dashboardResumeList.innerHTML = resumeEntries.length
      ? resumeEntries
          .map((item) => {
            const video = state.videos.find((entry) => entry.id === item.id);
            return `<div class="dashboard-list-row"><span>${sanitizeText(truncate(video?.title || 'Unknown episode', 44))}</span><strong>${Math.round(item.percent)}%</strong></div>`;
          })
          .join('')
      : '<div class="empty-state compact">No resume queue yet.</div>';
  }

  function openModal(video, start = 0) {
    if (!video || !elements.modal || !elements.player || !elements.videoTitle) {
      return;
    }

    state.currentVideo = video;
    setLastPlayed(video);
    elements.modal.style.display = 'flex';
    elements.modal.setAttribute('aria-hidden', 'false');
    elements.videoTitle.textContent = video.title;
    elements.player.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&start=${start}`;

    if (state.progressInterval) {
      window.clearInterval(state.progressInterval);
    }

    let time = start;
    state.progressInterval = window.setInterval(() => {
      time += 5;
      saveProgress(video.id, time, Math.min(100, (time / ASSUMED_VIDEO_DURATION) * 100));
      renderContinue();
      renderDashboard();
      renderHighlights();
    }, 5000);
  }

  function closeModal() {
    if (elements.modal) {
      elements.modal.style.display = 'none';
      elements.modal.setAttribute('aria-hidden', 'true');
    }
    if (elements.player) {
      elements.player.src = '';
    }
    if (state.progressInterval) {
      window.clearInterval(state.progressInterval);
      state.progressInterval = null;
    }
    renderContinue();
    renderDashboard();
    renderHighlights();
  }

  function toggleOverlay(element, open) {
    if (!element) {
      return;
    }

    element.style.display = open ? 'block' : 'none';
    element.setAttribute('aria-hidden', open ? 'false' : 'true');
  }

  function applyTheme(theme) {
    state.theme = theme === 'light' ? 'light' : 'dark';
    const isLight = state.theme === 'light';
    elements.body.classList.toggle('light-mode', isLight);
    elements.darkModeToggle.innerHTML = isLight
      ? '<i class="fa-regular fa-sun" aria-hidden="true"></i>'
      : '<i class="fa-regular fa-moon" aria-hidden="true"></i>';
    localStorage.setItem(THEME_KEY, state.theme);
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  }

  function handleCardClick(target) {
    const saveButton = target.closest('[data-save-id]');
    if (saveButton) {
      toggleSaved(saveButton.getAttribute('data-save-id'));
      renderGrid();
      renderContinue();
      renderTrending();
      return;
    }

    const card = target.closest('.card[data-id]');
    if (!card) {
      return;
    }

    const id = card.getAttribute('data-id');
    const video = state.videos.find((entry) => entry.id === id);
    const start = getProgress()[id]?.time || 0;
    openModal(video, start);
  }

  function syncChipState() {
    elements.chips.forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.cat === state.activeCategory);
    });
  }

  function bindEvents() {
    elements.heroBtn?.addEventListener('click', () => openModal(state.heroVideo, getProgress()[state.heroVideo?.id]?.time || 0));
    elements.heroSaveBtn?.addEventListener('click', () => {
      if (state.heroVideo) {
        toggleSaved(state.heroVideo.id);
        renderGrid();
        renderContinue();
        renderTrending();
      }
    });

    elements.closeBtn?.addEventListener('click', closeModal);
    elements.retryBtn?.addEventListener('click', init);
    elements.darkModeToggle?.addEventListener('click', toggleTheme);
    elements.watchLaterBadge?.addEventListener('click', () => toggleOverlay(elements.watchLaterPage, true));
    elements.closeWatchLater?.addEventListener('click', () => toggleOverlay(elements.watchLaterPage, false));
    elements.dashboardBtn?.addEventListener('click', () => toggleOverlay(elements.dashboardModal, true));
    elements.closeDashboard?.addEventListener('click', () => toggleOverlay(elements.dashboardModal, false));

    elements.searchInput?.addEventListener('input', (event) => {
      state.searchTerm = event.target.value || '';
      elements.clearSearch.style.display = state.searchTerm ? 'inline-flex' : 'none';
      renderGrid();
      renderHighlights();
    });

    elements.clearSearch?.addEventListener('click', () => {
      state.searchTerm = '';
      elements.searchInput.value = '';
      elements.clearSearch.style.display = 'none';
      renderGrid();
      renderHighlights();
    });

    elements.chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        state.activeCategory = chip.dataset.cat || 'all';
        syncChipState();
        renderGrid();
        renderHighlights();
      });
    });

    document.addEventListener('click', (event) => {
      handleCardClick(event.target);

      if (event.target === elements.modal) {
        closeModal();
      }
      if (event.target === elements.watchLaterPage) {
        toggleOverlay(elements.watchLaterPage, false);
      }
      if (event.target === elements.dashboardModal) {
        toggleOverlay(elements.dashboardModal, false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeModal();
        toggleOverlay(elements.watchLaterPage, false);
        toggleOverlay(elements.dashboardModal, false);
      }

      if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('card')) {
        event.preventDefault();
        handleCardClick(event.target);
      }
    });
  }

  async function init() {
    hideError();
    showLoading();

    try {
      state.videos = await fetchVideos();
      state.videos.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      renderHero(getLastPlayed() || state.videos[0]);
      renderGrid();
      renderContinue();
      renderTrending();
      renderWatchLater();
      updateWatchLaterCount();
      renderDashboard();
      renderHighlights();
    } catch (error) {
      showError('Failed to load content. Please try again.');
    } finally {
      hideLoading();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyTheme(localStorage.getItem(THEME_KEY) || 'dark');
    bindEvents();
    init();
  });
})();
