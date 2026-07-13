import { DeepSearch } from './search.js';
import { isFeatureEnabled } from './config.js';
import { initMonitoring } from './monitoring.js';
import { initScriptStudio } from './script.js';
import { initIslamic } from './islamic.js';

/**
 * YT Studio - Main Application
 * YouTube API V3 Integration via Cloudflare Worker
 * Version: 2.0.0
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    // API Endpoints
    API: {
        YOUTUBE_WORKER: window.__API_CONFIG__?.YOUTUBE_WORKER || 'https://yt-studio-youtube-api.ruhdevopsytstudio.workers.dev',
        FALLBACK_DATA: '/data/demo.json'
    },

    // Storage Keys
    STORAGE: {
        CHANNEL_KEY: 'yt_studio_channel_id',
        CACHE_KEY: 'yt_studio_videos_cache_v4',
        CACHE_EXPIRY: 86400000, // 24 hours
        PROJECTS_KEY: 'yt_studio_projects',
        RESEARCH_KEY: 'yt_studio_research',
        WATCH_LATER_KEY: 'watch_later_list',
        THEME_KEY: 'ui_theme',
        SEARCH_HISTORY_KEY: 'search_history',
        PROGRESS_KEY: 'watch_progress'
    },

    // UI Settings
    UI: {
        ITEMS_PER_PAGE: 15,
        LAZY_LOAD_THRESHOLD: 400
    },

    // API Retry Config
    API_CONFIG: {
        timeout: 10000,
        retries: 3,
        backoff: 1.5,
        delay: 500
    }
};
// ============================================
// CATEGORIES
// ============================================
const CATEGORIES = [
    { key: 'quran', label: 'Quran', terms: ['quran', 'surah', 'ayah', 'allah', 'tafsir', 'islam'] },
    { key: 'prophecy', label: 'Prophecy', terms: ['prophecy', 'dajjal', 'gog', 'magog', 'end times'] },
    { key: 'discussion', label: 'Discussion', terms: ['podcast', 'debate', 'interview', 'conversation'] },
    { key: 'educational', label: 'Educational', terms: ['lesson', 'guide', 'explained', 'documentary'] },
    { key: 'history', label: 'History', terms: ['history', 'empire', 'caliph', 'war', 'civilization'] }
];

// ============================================
// DOM ELEMENTS
// ============================================
const DOM = {
    // Core elements
    body: document.body,
    navbarBrand: document.getElementById('navbarBrand'),
    navbarBrand: document.getElementById('navbarBrand'),
    navbarBrand: document.getElementById('navbarBrand'),
    grid: document.getElementById('grid'),
    modal: document.getElementById('modal'),
    modalSaveBtn: document.getElementById('modalSaveBtn'),
    player: document.getElementById('player'),
    closeModal: document.getElementById('close'),
    toast: document.getElementById('toast'),

    // Hero section
    heroTitle: document.getElementById('hero-title'),
    heroDesc: document.getElementById('hero-desc'),
    heroBtn: document.getElementById('hero-btn'),
    heroSave: document.getElementById('hero-save'),
    heroCategory: document.getElementById('hero-category'),
    heroDate: document.getElementById('hero-date'),
    bg: document.getElementById('bg'),

    // Search
    search: document.getElementById('searchInput'),
    searchToggle: document.getElementById('searchToggleBtn'),
    searchSection: document.getElementById('searchSection'),
    clearSearch: document.getElementById('clearSearch'),
    resultsMeta: document.getElementById('results-meta'),

    // Pagination & Loading
    loadMore: document.getElementById('loadMoreBtn'),
    loadMoreContainer: document.getElementById('loadMoreContainer'),
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    errorMsg: document.getElementById('error-msg'),
    retryBtn: document.getElementById('retryBtn'),

    // Theme & UI
    themeToggle: document.getElementById('themeToggleBtn'),
    themeMenu: document.getElementById('themeMenu'),
    episodesNavBtn: document.querySelector('[data-action="scroll-to-episodes"]'),
    episodesSection: document.getElementById('episodesSection'),
    episodesNavBtn: document.querySelector('[data-action="scroll-to-episodes"]'),
    episodesSection: document.getElementById('episodesSection'),
    episodesNavBtn: document.querySelector('[data-action="scroll-to-episodes"]'),
    episodesSection: document.getElementById('episodesSection'),
    episodesNavBtn: document.querySelector('[data-action="scroll-to-episodes"]'),
    episodesSection: document.getElementById('episodesSection'),
    episodesNavBtn: document.querySelector('[data-action="scroll-to-episodes"]'),
    episodesSection: document.getElementById('episodesSection'),
    episodesNavBtn: document.querySelector('[data-action="scroll-to-episodes"]'),
    episodesSection: document.getElementById('episodesSection'),
    episodesNavBtn: document.querySelector('[data-action="scroll-to-episodes"]'),
    episodesSection: document.getElementById('episodesSection'),
    episodesNavBtn: document.querySelector('[data-action="scroll-to-episodes"]'),
    episodesSection: document.getElementById('episodesSection'),
    menuToggle: document.getElementById('menuToggleBtn'),
    scrollToTop: document.getElementById('scrollToTop'),

    // Watch Later
    watchLaterBtn: document.getElementById('watchLaterBtn'),
    watchLaterBadge: document.getElementById('watchLaterBadge'),
    watchLaterCount: document.getElementById('watchLaterCount'),
    watchLaterPage: document.getElementById('watchLaterPage'),
    watchLaterContainer: document.getElementById('watchLaterContainer'),
    closeWatchLater: document.getElementById('closeWatchLater'),

    // Dashboard
    dashboardBtn: document.getElementById('dashboardBtn'),
    dashboardModal: document.getElementById('dashboardModal'),
    closeDashboard: document.getElementById('closeDashboard'),
    dashTotal: document.getElementById('dashboard-total'),
    dashSaved: document.getElementById('dashboard-saved'),
    dashProgress: document.getElementById('dashboard-progress'),
    dashHours: document.getElementById('dashboard-hours'),
    dashCategories: document.getElementById('dashboardCategories'),
    dashResumeList: document.getElementById('dashboardResumeList'),

    // Studio Mode
    modeSwitcher: document.getElementById('modeSwitcher'),
    modeBtns: document.querySelectorAll('.mode-btn'),
    studioRoot: document.getElementById('studio-root'),
    appRoot: document.getElementById('app-root'),
    heroSection: document.getElementById('hero'),
    continueBlock: document.getElementById('continue-block'),
    continueRow: document.getElementById('continue-row'),
    emptyHistory: document.getElementById('empty-history'),
    recommendedRow: document.getElementById('recommended-row'),
    recommendedBlockSec: document.getElementById('recommended-block'),
    continueBlockSec: document.getElementById('continue-block'),

    // Studio Navigation
    studioNavBtns: document.querySelectorAll('.studio-nav-btn'),
    studioViews: document.querySelectorAll('.studio-view'),
    studioBreadcrumbs: document.getElementById('studioBreadcrumbs'),
    studioViewProjects: document.getElementById('studio-view-projects'),
    activeProjectView: document.getElementById('active-project-view'),
    newProjectBtn: document.getElementById('newProjectBtn'),
    backToProjectsBtn: document.getElementById('backToProjectsBtn'),
    projectTabBtns: document.querySelectorAll('.project-tab-btn'),
    ptabContents: document.querySelectorAll('.ptab-content'),

    // Misc
    channelInput: document.getElementById('channelIdInput'),
    connectBtn: document.getElementById('connectChannelBtn'),
    clearFilters: document.getElementById('clearFilters')
};

// ============================================
// APPLICATION STATE
// ============================================
const AppState = {
    videos: [],
    filtered: [],
    hero: null,
    current: null,
    categories: ['all'],
    search: '',
    page: 0,
    watchLater: [],
    theme: 'dark',
    debounceTimer: null,
    searchHistory: [],
    progress: {},
    ytPlayer: null,
    isPlaying: false,
    isMuted: false,
    currentView: 'list', lastFocused: null
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
    sanitize(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    truncate(str, maxLength) {
        if (!str) return '';
        return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
    },

    formatDate(dateStr) {
        try {
            return new Intl.DateTimeFormat('en', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            }).format(new Date(dateStr));
        } catch {
            return '';
        }
    },

    highlight(text, search) {
        if (!search) return text;
        const regex = new RegExp('(' + this.escapeRegex(search) + ')', 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    },

    saveLS(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('LS Save Error:', e);
        }
    },

    getLS(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch {
            return defaultValue;
        }
    },

    async fetchWithRetry(url, config = CONFIG.API_CONFIG) {
        let delay = config.delay;
        for (let i = 0; i < config.retries; i++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), config.timeout);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);
                if (response.ok) return response;
                throw new Error(`API Error: ${response.status}`);
            } catch (error) {
                if (i === config.retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= config.backoff;
            }
        }
    },

    showToast(message, type = "info") {
        if (DOM.toast) {
            DOM.toast.textContent = message;
            DOM.toast.className = "toast show";
            if (type !== "info") DOM.toast.classList.add(type);
            setTimeout(() => DOM.toast.classList.remove("show"), 3000);
        }
    },

    async copyToClipboard(text, element) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast("Copied to clipboard!", "success");
            if (element) {
                const feedback = document.createElement("span");
                feedback.className = "copy-feedback";
                feedback.textContent = "Copied!";
                element.style.position = "relative";
                element.appendChild(feedback);
                setTimeout(() => feedback.classList.add("show"), 10);
                setTimeout(() => {
                    feedback.classList.remove("show");
                    setTimeout(() => feedback.remove(), 200);
                }, 2000);
            }
        } catch (err) {
            console.error("Failed to copy: ", err);
            this.showToast("Failed to copy", "error");
        }
    },

    trapFocus(element) {
        AppState.lastFocused = document.activeElement;
        const focusableEls = element.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstFocusableEl = focusableEls[0];
        const lastFocusableEl = focusableEls[focusableEls.length - 1];

        element.addEventListener('keydown', (e) => {
            const isTabPressed = (e.key === 'Tab' || e.keyCode === 9);
            if (!isTabPressed) return;

            if (e.shiftKey) {
                if (document.activeElement === firstFocusableEl) {
                    lastFocusableEl.focus();
                    e.preventDefault();
                }
            } else {
                if (document.activeElement === lastFocusableEl) {
                    firstFocusableEl.focus();
                    e.preventDefault();
                }
            }
        });

        if (firstFocusableEl) firstFocusableEl.focus();
    }
};

// ============================================
// CATEGORY HELPERS
// ============================================
function getCategoryLabel(key) {
    const cat = CATEGORIES.find(c => c.key === key);
    return cat ? cat.label : 'History';
}

function detectCategory(title) {
    const text = (title || '').toLowerCase();
    const cat = CATEGORIES.find(c => c.terms.some(term => text.includes(term)));
    return cat ? cat.key : 'history';
}

// ============================================
// PROGRESS TRACKING
// ============================================
function getProgress(videoId) {
    return AppState.progress[videoId] || null;
}

// ============================================
// YOUTUBE API INTEGRATION (via Cloudflare Worker)
// ============================================
async function fetchYouTubeChannelData() {
    try {
        const response = await fetch(`${CONFIG.API.YOUTUBE_WORKER}/api/channel`);
        if (!response.ok) throw new Error('Failed to fetch channel data');
        return await response.json();
    } catch (error) {
        console.error('YouTube Worker Error:', error);
        return null;
    }
}

async function loadVideos() {
    if (DOM.loading) DOM.loading.style.display = 'block';

    // Check cache first
    const cached = Utils.getLS(CONFIG.STORAGE.CACHE_KEY);
    if (cached && cached.data && cached.data.length && Date.now() - cached.time < CONFIG.STORAGE.CACHE_EXPIRY) {
        if (DOM.loading) DOM.loading.style.display = 'none';
        return cached.data;
    }

    try {
        // Use the correct worker endpoint: /api/videos
        const channelId = Utils.getLS(CONFIG.STORAGE.CHANNEL_KEY);
        let url = `${CONFIG.API.YOUTUBE_WORKER}/api/videos`;
        if (channelId) {
            url += `?channelId=${channelId}`;
        }

        const response = await Utils.fetchWithRetry(url);
        const data = await response.json();
        console.log('API Fetch Success:', data);

        const videos = (data.videos || []).map(video => ({
            id: video.id || video.videoId,
            title: video.title || 'Untitled',
            thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
            publishedAt: video.publishedAt || new Date().toISOString(),
            category: detectCategory(video.title),
            description: video.description || 'Deep dive into Islamic history and theology.'
        }));

        console.log('Processed Videos:', videos.length);

        if (videos.length) {
            Utils.saveLS(CONFIG.STORAGE.CACHE_KEY, { data: videos, time: Date.now() });
        }

        if (DOM.loading) DOM.loading.style.display = 'none';
        return videos;

    } catch (error) {
        if (DOM.loading) DOM.loading.style.display = 'none';
        console.error('Worker fetch failed, using fallback:', error);
        try {
            const fallback = await fetch(CONFIG.API.FALLBACK_DATA);
            if (!fallback.ok) throw new Error(`Fallback HTTP error: ${fallback.status}`);
            const data = await fallback.json();
            console.log('Fallback Data Loaded:', data);

            document.body.classList.add('demo-mode');
            const videos = (data.videos || []).map(video => ({
                ...video,
                category: video.category || 'history',
                description: video.description || 'Deep dive into Islamic history and theology.'
            }));
            console.log('Processed Fallback Videos:', videos.length);
            return videos;
        } catch (fallbackError) {
            console.error('Fallback fetch also failed:', fallbackError);
            return [];
        }
    }
}

// ============================================
// RENDER FUNCTIONS
// ============================================
function renderCard(video, index = 0) {
    const isSaved = AppState.watchLater.some(v => v.id === video.id);
    const thumbnail = video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
    const progress = getProgress(video.id);

    return `
        <div class="card animate-in"
             style="--index: ${e}"
             data-id="${t.id}"
             role="button"
             tabindex="0"
             aria-label="Watch ${Utils.sanitize(t.title)}">
            <div class="card-thumb-wrapper">
                <img data-src="${o}" 
                     src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" 
                     alt=""
                     class="lazy-img" 
                     loading="lazy">
                <div class="card-thumb-overlay">
                    <i class="fa-solid fa-play play-icon" aria-hidden="true"></i>
                </div>
                <div class="duration-badge">HD</div>
                ${s?`<div class="progress-bar-container"><div class="progress-bar-fill" style="width:${s.percent}%"></div></div>`:""}
                <button class="watch-later-btn ${a?"active":""}" 
                        data-id="${t.id}" 
                        aria-label="${a?"Remove from Watch Later":"Save for later"}"
                        title="${a?"Remove from Watch Later":"Save for later"}">
                    <i class="fa-${a?"solid":"regular"} fa-bookmark"></i>
                </button>
            </div>
            <div class="card-copy">
                <div class="card-title">${Utils.highlight(Utils.sanitize(Utils.truncate(t.title,60)),AppState.search)}</div>
                <div class="card-meta">
                    <span class="card-tag">${getCategoryLabel(t.category)}</span>
                    <span>${Utils.formatDate(t.publishedAt)}</span>
                </div>
            </div>
        </div>
    `}function renderHero(t){var e;t&&(DOM.heroTitle&&(DOM.heroTitle.textContent=t.title),DOM.heroDesc&&(DOM.heroDesc.textContent=t.description||""),DOM.heroCategory&&(DOM.heroCategory.textContent=getCategoryLabel(t.category)),DOM.heroDate&&(DOM.heroDate.textContent=Utils.formatDate(t.publishedAt)),DOM.bg&&(DOM.bg.style.backgroundImage=`url(${t.thumbnail})`),e=AppState.watchLater.some(e=>e.id===t.id),DOM.heroSave)&&(DOM.heroSave.innerHTML=`<i class="fa-${e?"solid":"regular"} fa-bookmark"></i> <span>${e?"Saved":"Save"}</span>`)}function renderGrid(){let a=AppState.search.toLowerCase();AppState.filtered=AppState.videos.filter(e=>{var t=AppState.categories.includes("all")||AppState.categories.includes(e.category),e=!a||e.title.toLowerCase().includes(a);return t&&e}),DOM.clearFilters&&(DOM.clearFilters.style.display=AppState.categories.includes("all")?"none":"inline-flex"),DOM.resultsMeta&&(DOM.resultsMeta.textContent=`${AppState.filtered.length} episode${1!==AppState.filtered.length?"s":""} found`);var e=AppState.filtered.slice(0,CONFIG.UI.ITEMS_PER_PAGE*(AppState.page+1));if(DOM.grid)if(0===AppState.filtered.length)DOM.grid.innerHTML=`
                <div class="empty-state-card" style="grid-column: 1 / -1; margin-top: 40px;">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <h3>No results found</h3>
                    <p>Try different keywords or browse by category to find what you're looking for.</p>
                    <button type="button" id="clearSearchEmpty" class="btn btn-secondary" style="margin-top: 20px;">
                        Clear Search
                    </button>
                </div>
            `;else if(DOM.grid.innerHTML=e.map((e,t)=>renderCard(e,t)).join(""),e.length<AppState.filtered.length){var o=document.createElement("div");o.id="grid-sentinel",o.style.height="10px",DOM.grid.appendChild(o);let t=new IntersectionObserver(e=>{e[0].isIntersecting&&(t.disconnect(),AppState.page++,renderGrid())},{rootMargin:"400px"});t.observe(o)}lazyLoadImages(),DOM.loadMoreContainer&&(DOM.loadMoreContainer.style.display=e.length<AppState.filtered.length?"block":"none")}function lazyLoadImages(){let t=new IntersectionObserver((e,a)=>{e.forEach(t=>{if(t.isIntersecting){let e=t.target;e.src=e.dataset.src,e.onload=()=>e.classList.add("loaded"),a.unobserve(e)}})},{rootMargin:"100px"});document.querySelectorAll(".lazy-img").forEach(e=>t.observe(e))}function renderContinueWatching(){var e;DOM.continueBlock&&DOM.continueRow&&((e=AppState.videos.filter(e=>{e=getProgress(e.id);return e&&5<=e.percent&&e.percent<95}).sort((e,t)=>getProgress(t.id).updated-getProgress(e.id).updated).slice(0,4)).length?(DOM.continueBlock.style.display="block",DOM.continueRow.innerHTML=e.map((e,t)=>renderCard(e,t)).join(""),DOM.emptyHistory&&(DOM.emptyHistory.style.display="none")):(DOM.continueBlock.style.display="none",DOM.emptyHistory&&AppState.videos.length&&(DOM.emptyHistory.style.display="block")))}function renderWatchLater(){DOM.watchLaterContainer&&(AppState.watchLater.length?(DOM.watchLaterContainer.innerHTML=AppState.watchLater.map(e=>{var t=e.thumbnail||`https://i.ytimg.com/vi/${e.id}/hqdefault.jpg`;return`
                <div class="card" data-id="${e.id}" data-wl="1" role="button" tabindex="0" aria-label="Watch ${Utils.sanitize(e.title)}">
                    <div class="card-thumb-wrapper">
                        <img data-src="${t}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" alt="" class="lazy-img" loading="lazy">
                        <button class="watch-later-btn active" data-id="${e.id}" aria-label="Remove ${Utils.sanitize(e.title)} from Watch Later">
                            <i class="fa-solid fa-bookmark" aria-hidden="true"></i>
                        </button>
                    </div>
                    <div class="card-copy">
                        <div class="card-title">${Utils.highlight(Utils.sanitize(Utils.truncate(e.title,60)),AppState.search)}</div>
                        <div class="card-meta">
                            <span class="card-tag">${getCategoryLabel(e.category)}</span>
                            <span>${Utils.formatDate(e.publishedAt)}</span>
                        </div>
                    </div>
                </div>
            `}).join(""),lazyLoadImages()):DOM.watchLaterContainer.innerHTML='<div class="empty-state">No episodes saved yet. Click the bookmark icon on any episode to save it.</div>')}// ============================================
// VIDEO PLAYER FUNCTIONS
// ============================================
function openVideo(video) {
    if (!DOM.modal || !DOM.player) return;

    AppState.current = video;
    const progress = getProgress(video.id);
    const startTime = progress?.time || 0;

    DOM.player.src = `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1&start=${Math.floor(startTime)}`;

    DOM.modal.style.display = 'flex';
    DOM.modal.setAttribute('aria-hidden', 'false');
    Utils.trapFocus(DOM.modal);
    DOM.body.style.overflow = 'hidden';
    DOM.body.classList.add('modal-open');

    const titleEl = document.getElementById('video-title');
    if (titleEl) titleEl.textContent = video.title;
    document.title = `${video.title} | Ruh Al Tarikh`;
    document.title = `${video.title} | Ruh Al Tarikh`;
    document.title = `${video.title} | Ruh Al Tarikh`;

    if (DOM.transcriptPanel) DOM.transcriptPanel.setAttribute('aria-hidden', 'true');
    if (DOM.sharePanel) DOM.sharePanel.setAttribute('aria-hidden', 'true');

    // Update modal save button state
    if (DOM.modalSaveBtn) {
        const isSaved = AppState.watchLater.some(v => v.id === video.id);
        DOM.modalSaveBtn.classList.toggle('active', isSaved);
        const icon = DOM.modalSaveBtn.querySelector('i');
        if (icon) {
            icon.className = isSaved ? 'fas fa-bookmark' : 'far fa-bookmark';
        }
        DOM.modalSaveBtn.setAttribute('aria-label', isSaved ? 'Remove from Watch Later' : 'Save for later');
    }
}

function closeVideo() {
    if (!DOM.modal || !DOM.player) return;
    DOM.player.src = "";
    DOM.modal.style.display = "none";
    DOM.modal.setAttribute("aria-hidden", "true");
    DOM.body.style.overflow = "";
    DOM.body.classList.remove("modal-open");
    AppState.current = null;
    document.title = 'Ruh Al Tarikh | Cinematic Islamic Archive';
    document.title = 'Ruh Al Tarikh | Cinematic Islamic Archive';
    document.title = 'Ruh Al Tarikh | Cinematic Islamic Archive';
    clearInterval(AppState.progressTimer);
    renderContinueWatching();
    if (AppState.lastFocused) { AppState.lastFocused.focus(); AppState.lastFocused = null; }
}

function navigateVideo(direction) {
    if (!AppState.current || !AppState.filtered.length) return;

    const currentIndex = AppState.filtered.findIndex(v => v.id === AppState.current.id);
    if (currentIndex === -1) return;

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = AppState.filtered.length - 1;
    if (newIndex >= AppState.filtered.length) newIndex = 0;

    openVideo(AppState.filtered[newIndex]);
}

// ============================================
// WATCH LATER FUNCTIONS
// ============================================
function toggleWatchLater(video) {
    const index = AppState.watchLater.findIndex(v => v.id === video.id);

    if (index === -1) {
        AppState.watchLater.push(video);
        Utils.showToast('Added to Watch Later');
    } else {
        AppState.watchLater.splice(index, 1);
        Utils.showToast('Removed from Watch Later');
    }

    Utils.saveLS(CONFIG.STORAGE.WATCH_LATER_KEY, AppState.watchLater);
    updateStats();

    // Re-render affected components
    if (AppState.hero && AppState.hero.id === video.id) renderHero(AppState.hero);
    renderGrid();
    if (DOM.watchLaterContainer) renderWatchLater();

    // Sync modal save button if open
    if (DOM.modalSaveBtn && AppState.current && AppState.current.id === video.id) {
        const isSaved = AppState.watchLater.some(v => v.id === video.id);
        DOM.modalSaveBtn.classList.toggle('active', isSaved);
        const icon = DOM.modalSaveBtn.querySelector('i');
        if (icon) {
            icon.className = isSaved ? 'fas fa-bookmark' : 'far fa-bookmark';
        }
        DOM.modalSaveBtn.setAttribute('aria-label', isSaved ? 'Remove from Watch Later' : 'Save for later');
    }
}

function openWatchLater() {
    if (!DOM.watchLaterPage) return;
    renderWatchLater();
    DOM.watchLaterPage.style.display = 'block';
    DOM.watchLaterPage.setAttribute('aria-hidden', 'false');
    if (DOM.watchLaterBtn) DOM.watchLaterBtn.setAttribute('aria-expanded', 'true');
    Utils.trapFocus(DOM.watchLaterPage);
    DOM.body.style.overflow = 'hidden';
    DOM.body.classList.add('modal-open');
}

function closeWatchLater() {
    if (!DOM.watchLaterPage) return;
    DOM.watchLaterPage.style.display = "none";
    DOM.watchLaterPage.setAttribute("aria-hidden", "true");
    if (DOM.watchLaterBtn) DOM.watchLaterBtn.setAttribute('aria-expanded', 'false');
    DOM.body.style.overflow = "";
    DOM.body.classList.remove("modal-open");
    if (AppState.lastFocused) { AppState.lastFocused.focus(); AppState.lastFocused = null; }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================
const initAnalyticsChart = async () => {
    const canvas = document.getElementById('analyticsChart');
    if (!canvas) return;

    if (!window.Chart) {
        await new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = resolve;
            document.head.appendChild(script);
        });
    }

    const ctx = canvas.getContext('2d');
    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Subscriber Growth',
                data: [12, 19, 3, 5, 2, 3, 9],
                borderColor: '#e50914',
                backgroundColor: 'rgba(229, 9, 20, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { display: false },
                x: { grid: { display: false }, ticks: { color: '#808080', font: { size: 10 } } }
            }
        }
    });
};

const initAIAssistant = () => {
    if (!isFeatureEnabled('AI_ASSISTANT')) {
        const aiPanel = document.getElementById('ai-assistant-panel');
        if (aiPanel) aiPanel.style.display = 'none';
        return;
    }
    const scoreBtn = document.getElementById('ai-score-title');
    const hookBtn = document.getElementById('ai-generate-hook');
    const titleInput = document.getElementById('ai-title-input');

    if (scoreBtn) {
        scoreBtn.addEventListener('click', () => {
            const title = titleInput.value.trim();
            if (!title) {
                Utils.showToast('Please enter a title', 'warning');
                return;
            }

            scoreBtn.disabled = true;
            scoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

            setTimeout(() => {
                const score = Math.floor(Math.random() * (95 - 65) + 65);
                const result = document.getElementById('ai-score-result');
                const scoreVal = document.getElementById('ai-score-value');
                const scoreBar = document.getElementById('ai-score-bar');

                result.classList.remove('hidden');
                scoreVal.textContent = `${score}/100`;
                scoreBar.style.width = `${score}%`;

                scoreBtn.disabled = false;
                scoreBtn.textContent = 'Score';
                Utils.showToast('Title analyzed!', 'success');
            }, 1000);
        });
    }

    if (hookBtn) {
        hookBtn.addEventListener('click', () => {
            hookBtn.disabled = true;
            hookBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';

            const hooks = [
                "What if everything you knew about the fall of Andalusia was wrong?",
                "Behind the silence of history lies a truth far more cinematic than fiction.",
                "The year was 1492. The world was changing. And at the center of it all?",
                "How did one decision change the course of human history forever?"
            ];

            setTimeout(() => {
                const result = document.getElementById('ai-hook-result');
                result.classList.remove('hidden');
                result.textContent = hooks[Math.floor(Math.random() * hooks.length)];

                hookBtn.disabled = false;
                hookBtn.innerHTML = '<i class="fas fa-bolt mr-2 text-primary"></i> Generate Viral Hook';
                Utils.showToast('Hook generated!', 'success');
            }, 1200);
        });
    }

    const topicChips = document.querySelectorAll('#ai-topics span');
    topicChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const topic = chip.textContent;
            if (titleInput) {
                titleInput.value = topic;
                Utils.showToast(`Selected: ${topic}`, 'info');
            }
        });
        chip.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); chip.click(); } });
    });
};

function openDashboard() {
    if (!DOM.dashboardModal) return;
    renderDashboard();
    initAnalyticsChart();
    initAIAssistant();
    DOM.dashboardModal.style.display = 'block';
    DOM.dashboardModal.setAttribute('aria-hidden', 'false');
    if (DOM.dashboardBtn) DOM.dashboardBtn.setAttribute('aria-expanded', 'true');
    Utils.trapFocus(DOM.dashboardModal);
    DOM.body.style.overflow = 'hidden';
    DOM.body.classList.add('modal-open');
}

function closeDashboard() {
    if (!DOM.dashboardModal) return;
    DOM.dashboardModal.style.display = "none";
    DOM.dashboardModal.setAttribute("aria-hidden", "true");
    if (DOM.dashboardBtn) DOM.dashboardBtn.setAttribute('aria-expanded', 'false');
    DOM.body.style.overflow = "";
    DOM.body.classList.remove("modal-open");
    if (AppState.lastFocused) { AppState.lastFocused.focus(); AppState.lastFocused = null; }
}

// ============================================
// THEME FUNCTIONS
// ============================================
function setTheme(theme) {
    AppState.theme = theme;
    Utils.saveLS(CONFIG.STORAGE.THEME_KEY, theme);

    DOM.body.classList.remove('light-mode', 'theme-neon');
    if (theme === 'light') {
        DOM.body.classList.add('light-mode');
    } else if (theme === 'neon') {
        DOM.body.classList.add('theme-neon');
    }

    const icon = DOM.themeToggle?.querySelector('i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fa-regular fa-moon' : theme === 'neon' ? 'fa-solid fa-bolt' : 'fa-regular fa-sun';
    }

    document.querySelectorAll('.theme-opt').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.theme === theme);
    });
}

function toggleTheme() {
    const newTheme = AppState.theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// ============================================
// STUDIO MODE & PROJECTS
// ============================================
function switchMode(mode) {
    if (mode === 'creator') {
        if (DOM.studioRoot) DOM.studioRoot.style.display = 'block';
        if (DOM.appRoot) DOM.appRoot.style.display = 'none';
        if (DOM.heroSection) DOM.heroSection.style.display = 'none';
        if (DOM.continueBlockSec) DOM.continueBlockSec.style.display = 'none';
        updateBreadcrumbs('Studio > Projects');
    } else {
        if (DOM.studioRoot) DOM.studioRoot.style.display = 'none';
        if (DOM.appRoot) DOM.appRoot.style.display = 'block';
        if (DOM.heroSection) DOM.heroSection.style.display = 'block';
        if (DOM.continueBlockSec && AppState.videos.some(v => getProgress(v.id))) {
            DOM.continueBlockSec.style.display = 'block';
        }
    }
}

function updateBreadcrumbs(path) {
    if (!DOM.studioBreadcrumbs) return;

    const parts = path.split(' > ');
    DOM.studioBreadcrumbs.innerHTML = parts.map((part, i) =>
        i === parts.length - 1
            ? `<span class="current">${part}</span>`
            : `<span>${part}</span>`
    ).join(' <i class="fa-solid fa-chevron-right" style="font-size:0.7rem; margin:0 8px; opacity:0.5;"></i> ');
}

function renderProjects() {
    const projectsList = document.getElementById('studioProjectsList');
    if (!projectsList) return;

    const projects = Utils.getLS(CONFIG.STORAGE.PROJECTS_KEY, [
        { id: 'p1', title: 'The Fall of the Abbasids', status: 'Writing', progress: 65, date: '2024-05-10' },
        { id: 'p2', title: 'Prophecy & Modernity', status: 'Researching', progress: 30, date: '2024-05-12' },
        { id: 'p3', title: 'The Silent Silk Road', status: 'Editing', progress: 90, date: '2024-05-08' },
        { id: 'p4', title: 'The Golden Age', status: 'Published', progress: 100, date: '2024-05-01' }
    ]);

    if (AppState.currentView === 'list') {
        projectsList.className = 'studio-projects-grid';
        projectsList.innerHTML = projects.map(e => `
            <div class="project-card">
                <div class="project-card-header">
                    <span class="status-badge ${e.status.toLowerCase()}">${e.status}</span>
                    <span class="project-date">${e.date}</span>
                </div>
                <h3 class="project-title">${e.title}</h3>
                <div class="project-progress-container">
                    <div class="project-progress-bar" style="width: ${e.progress}%"></div>
                </div>
                <div class="project-card-footer">
                    <span>${e.progress}% Complete</span>
                    <button class="secondary-button small resume-project-btn" data-id="${e.id}">Resume</button>
                </div>
            </div>
        `).join("");
    } else {
        projectsList.className = "kanban-grid";
        projectsList.innerHTML = ["Research", "Writing", "Editing", "Published"].map(t => {
            const filtered = projects.filter(p => p.status === t || (t === "Research" && p.status === "Researching"));
            return `
                <div class="kanban-column">
                    <h3>${t} <span class="kanban-count">${filtered.length}</span></h3>
                    <div class="kanban-cards">
                        ${filtered.map(p => `
                            <div class="kanban-card resume-project-btn" data-id="${p.id}">
                                <h4 class="text-sm font-bold mb-2">${p.title}</h4>
                                <div class="project-progress-container" style="height:4px;">
                                    <div class="project-progress-bar" style="width: ${p.progress}%"></div>
                                </div>
                                <div class="flex justify-between items-center mt-2 text-xs text-soft">
                                    <span>${p.progress}%</span>
                                    <span>${p.date}</span>
                                </div>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        }).join("");
    }

    projectsList.querySelectorAll(".resume-project-btn").forEach(btn => {
        btn.addEventListener("click", e => {
            let id = e.currentTarget.dataset.id;
            const project = projects.find(p => p.id === id);
            if (project) {
                if (DOM.studioViews) DOM.studioViews.forEach(v => v.style.display = "none");
                if (DOM.activeProjectView) DOM.activeProjectView.style.display = "block";
                const titleEl = document.getElementById("current-project-title");
                if (titleEl) titleEl.textContent = project.title;
                updateBreadcrumbs("Studio > Projects > " + project.title);
                if (DOM.projectTabBtns && DOM.projectTabBtns[0]) DOM.projectTabBtns[0].click();
            }
        });
    });
}


function setupRecommendedSection() {
    if (!DOM.recommendedRow) return;

    const watchedVideos = Object.keys(AppState.progress)
        .map(id => AppState.videos.find(v => v.id === id))
        .filter(Boolean);

    let recommended = [];

    if (watchedVideos.length === 0) {
        recommended = AppState.videos.slice(4, 8);
    } else {
        // Get most watched category
        const categoryCount = {};
        watchedVideos.forEach(v => {
            categoryCount[v.category] = (categoryCount[v.category] || 0) + 1;
        });
        const topCategory = Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a])[0];

        // Find videos in same category not watched
        recommended = AppState.videos
            .filter(v => v.category === topCategory && !watchedVideos.some(w => w.id === v.id))
            .slice(0, 4);

        // If not enough, add from other categories
        if (recommended.length < 4) {
            const otherVideos = AppState.videos
                .filter(v => v.category !== topCategory && !watchedVideos.some(w => w.id === v.id))
                .slice(0, 4 - recommended.length);
            recommended.push(...otherVideos);
        }
    }

    if (recommended.length) {
        if (DOM.recommendedBlockSec) DOM.recommendedBlockSec.style.display = 'block';
        DOM.recommendedRow.innerHTML = recommended.map((v, i) => renderCard(v, i)).join('');
        lazyLoadImages();
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function bindEvents() {
    // Theme toggle & Menu
    if (DOM.themeToggle && DOM.themeMenu) {
        DOM.themeToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = DOM.themeToggle.getAttribute('aria-expanded') === 'true';
            DOM.themeToggle.setAttribute('aria-expanded', !isExpanded);
            DOM.themeMenu.classList.toggle('hidden');
        });

        // Close theme menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!DOM.themeToggle.contains(e.target) && !DOM.themeMenu.contains(e.target)) {
                DOM.themeMenu.classList.add('hidden');
                DOM.themeToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }

            // Mobile Menu Toggle
    if (DOM.menuToggle) {
        DOM.menuToggle.addEventListener('click', () => {
            const isActive = document.body.classList.toggle('mobile-nav-active');
            DOM.menuToggle.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        });
    }

    // Navbar Brand Logo - Scroll to Top
    if (DOM.navbarBrand) {
        DOM.navbarBrand.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (document.body.classList.contains('mobile-nav-active')) {
                document.body.classList.remove('mobile-nav-active');
                if (DOM.menuToggle) DOM.menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
        // Handle keyboard trigger
        DOM.navbarBrand.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                DOM.navbarBrand.click();
            }
        });
    }

    // Navbar Episodes Scroll
    if (DOM.episodesNavBtn && DOM.episodesSection) {
        DOM.episodesNavBtn.addEventListener('click', () => {
            DOM.episodesSection.scrollIntoView({ behavior: 'smooth' });
            if (document.body.classList.contains('mobile-nav-active')) {
                document.body.classList.remove('mobile-nav-active');
                if (DOM.menuToggle) DOM.menuToggle.setAttribute('aria-expanded', 'false');
            }
        });
    }


    if (DOM.heroBtn) DOM.heroBtn.addEventListener('click', () => AppState.hero && openVideo(AppState.hero));
    if (DOM.heroSave) DOM.heroSave.addEventListener('click', () => AppState.hero && toggleWatchLater(AppState.hero));

    // Modal close
    if (DOM.closeModal) DOM.closeModal.addEventListener('click', closeVideo);
    if (DOM.modal) DOM.modal.addEventListener('click', (e) => { if (e.target === DOM.modal) closeVideo(); });

    // Grid click delegation
    if (DOM.grid) {
        DOM.grid.addEventListener('click', (e) => {
            const clearEmpty = e.target.closest('#clearSearchEmpty');
            if (clearEmpty) {
                if (DOM.search) DOM.search.value = '';
                AppState.search = '';
                if (DOM.clearSearch) DOM.clearSearch.style.display = 'none';
                renderGrid();
                return;
            }

            const wlBtn = e.target.closest('.watch-later-btn');
            if (wlBtn) {
                e.stopPropagation();
                const video = AppState.videos.find(v => v.id === wlBtn.dataset.id);
                if (video) toggleWatchLater(video);
                return;
            }

            const card = e.target.closest('.card');
            if (card) {
                const video = AppState.videos.find(v => v.id === card.dataset.id);
                if (video) openVideo(video);
            }
        });

        DOM.grid.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                const card = e.target.closest('.card');
                if (card) {
                    e.preventDefault();
                    const video = AppState.videos.find(v => v.id === card.dataset.id);
                    if (video) openVideo(video);
                }
            }
        });
    }

    // Load more button
    if (DOM.loadMore) {
        DOM.loadMore.addEventListener('click', () => {
            AppState.page++;
            renderGrid();
        });
    }

    // Watch Later
    if (DOM.watchLaterBtn) DOM.watchLaterBtn.addEventListener('click', openWatchLater);
    if (DOM.closeWatchLater) DOM.closeWatchLater.addEventListener('click', closeWatchLater);
    if (DOM.watchLaterPage) {
        DOM.watchLaterPage.addEventListener('click', (e) => {
            if (e.target === DOM.watchLaterPage) closeWatchLater();

            const wlBtn = e.target.closest('.watch-later-btn');
            if (wlBtn) {
                e.stopPropagation();
                const video = AppState.watchLater.find(v => v.id === wlBtn.dataset.id);
                if (video) toggleWatchLater(video);
                return;
            }

            const card = e.target.closest('.card');
            if (card) {
                const video = AppState.watchLater.find(v => v.id === card.dataset.id);
                if (video) {
                    closeWatchLater();
                    openVideo(video);
                }
            }
        });
    }

    // Dashboard
    if (DOM.dashboardBtn) DOM.dashboardBtn.addEventListener('click', openDashboard);
    if (DOM.closeDashboard) DOM.closeDashboard.addEventListener('click', closeDashboard);
    if (DOM.closeShare) DOM.closeShare.addEventListener('click', () => { DOM.sharePanel.style.display = 'none'; DOM.sharePanel.setAttribute('aria-hidden', 'true'); DOM.body.style.overflow = ''; DOM.body.classList.remove('modal-open'); if (AppState.lastFocused) { AppState.lastFocused.focus(); AppState.lastFocused = null; } });
    if (DOM.closeTranscript) DOM.closeTranscript.addEventListener('click', () => { DOM.transcriptPanel.style.display = 'none'; DOM.transcriptPanel.setAttribute('aria-hidden', 'true'); DOM.body.style.overflow = ''; DOM.body.classList.remove('modal-open'); if (AppState.lastFocused) { AppState.lastFocused.focus(); AppState.lastFocused = null; } });
    const shareEpBtn = document.getElementById('shareEpisode');
    if (shareEpBtn) shareEpBtn.addEventListener('click', openShare);
    if (DOM.modalSaveBtn) DOM.modalSaveBtn.addEventListener('click', () => AppState.current && toggleWatchLater(AppState.current));
    const transBtn = document.getElementById('toggleTranscript');
    if (transBtn) transBtn.addEventListener('click', openTranscript);
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) copyLinkBtn.addEventListener('click', (e) => { const link = document.getElementById('shareLink'); if (link) Utils.copyToClipboard(link.value, e.currentTarget); });
    const shareTwitter = document.getElementById('shareTwitter');
    const shareFacebook = document.getElementById('shareFacebook');
    const shareWhatsApp = document.getElementById('shareWhatsApp');

    const openSocialPopup = (url) => {
        const link = document.getElementById('shareLink');
        if (!link || !link.value) return;
        const shareUrl = url + encodeURIComponent(link.value);
        window.open(shareUrl, '_blank', 'width=550,height=450,toolbar=0,location=0,menubar=0,status=0,scrollbars=1,resizable=1');
    };

    if (shareTwitter) shareTwitter.addEventListener('click', () => openSocialPopup('https://twitter.com/intent/tweet?url='));
    if (shareFacebook) shareFacebook.addEventListener('click', () => openSocialPopup('https://www.facebook.com/sharer/sharer.php?u='));
    if (shareWhatsApp) shareWhatsApp.addEventListener('click', () => openSocialPopup('https://api.whatsapp.com/send?text='));

    if (DOM.dashboardModal) {
        DOM.dashboardModal.addEventListener('click', (e) => {
            if (e.target === DOM.dashboardModal) closeDashboard();
        });
    }

    // Retry button
    if (DOM.retryBtn) DOM.retryBtn.addEventListener('click', () => location.reload());

    // Connect channel
    if (DOM.connectBtn) {
        DOM.connectBtn.addEventListener('click', () => {
            const channelId = DOM.channelInput?.value.trim();
            if (channelId) {
                localStorage.setItem(CONFIG.STORAGE.CHANNEL_KEY, channelId);
                localStorage.removeItem(CONFIG.STORAGE.CACHE_KEY);
                Utils.showToast('Channel ID saved! Reloading archives...');
                setTimeout(() => location.reload(), 1500);
            } else {
                Utils.showToast('Please enter a valid Channel ID');
            }
        });
    }

    // Scroll to top
    if (DOM.scrollToTop) {
        window.addEventListener('scroll', () => {
            DOM.scrollToTop.classList.toggle('show', window.scrollY > 500);
        });
        DOM.scrollToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Header scroll effect
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', () => {
            header.classList.toggle('scrolled', window.scrollY > 20);
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();

        // Handle Escape for input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            if (key === 'escape') {
                e.target.blur();
                if (e.target === DOM.search && DOM.searchSection && DOM.searchSection.classList.contains('active')) {
                    DOM.searchSection.classList.remove('active');
                    if (DOM.searchToggle) DOM.searchToggle.setAttribute('aria-expanded', 'false');
                }
            }
            return;
        }

        // Search focus
        if (key === '/' && DOM.search) {
            e.preventDefault();
            if (DOM.searchSection && !DOM.searchSection.classList.contains('active')) {
                if (DOM.searchToggle) DOM.searchToggle.click();
            }
            DOM.search.focus();
        }

        // Escape - close all modals
        if (key === 'escape') {
            closeVideo();
            closeWatchLater();
            closeDashboard();
            if (DOM.searchSection && DOM.searchSection.classList.contains('active')) {
                DOM.searchSection.classList.remove('active');
                if (DOM.searchToggle) DOM.searchToggle.setAttribute('aria-expanded', 'false');
            }
            if (document.body.classList.contains('mobile-nav-active')) {
                document.body.classList.remove('mobile-nav-active');
                if (DOM.menuToggle) DOM.menuToggle.setAttribute('aria-expanded', 'false');
            }
            if (DOM.sharePanel) { DOM.sharePanel.style.display = "none"; DOM.sharePanel.setAttribute("aria-hidden", "true"); }
            if (DOM.transcriptPanel) { DOM.transcriptPanel.style.display = "none"; DOM.transcriptPanel.setAttribute("aria-hidden", "true"); }
            DOM.body.style.overflow = "";
            DOM.body.classList.remove("modal-open");
            if (AppState.lastFocused) { AppState.lastFocused.focus(); AppState.lastFocused = null; }
        }

        // Video navigation (when current video is playing)
        if (AppState.current) {
            if (key === 'j') {
                e.preventDefault();
                navigateVideo(-1);
            } else if (key === 'k') {
                e.preventDefault();
                navigateVideo(1);
            } else if (key === 'b') {
                e.preventDefault();
                toggleWatchLater(AppState.current);
            } else if (key === 's') {
                e.preventDefault();
                openShare();
            } else if (key === 'n') {
                e.preventDefault();
                openTranscript();
            } else if (key === 's') {
                e.preventDefault();
                openShare();
            } else if (key === 'n') {
                e.preventDefault();
                openTranscript();
            } else if (key === 's') {
                e.preventDefault();
                openShare();
            } else if (key === 'n') {
                e.preventDefault();
                openTranscript();
            }
        }

        // Theme toggle
        if (key === 't') {
            toggleTheme();
        }

        // Dashboard toggle
        if (key === 'd') {
            if (DOM.dashboardModal) {
                if (DOM.dashboardModal.style.display === 'block') {
                    closeDashboard();
                } else {
                    openDashboard();
                }
            }
        }

        // Watch Later toggle
        if (key === 'b') {
            if (AppState.current) {
                toggleWatchLater(AppState.current);
            } else if (key === 's') {
                e.preventDefault();
                openShare();
            } else if (key === 'n') {
                e.preventDefault();
                openTranscript();
            } else if (key === 's') {
                e.preventDefault();
                openShare();
            } else if (key === 'n') {
                e.preventDefault();
                openTranscript();
            } else if (key === 's') {
                e.preventDefault();
                openShare();
            } else if (key === 'n') {
                e.preventDefault();
                openTranscript();
            } else if (DOM.watchLaterPage) {
                if (DOM.watchLaterPage.style.display === 'block') {
                    closeWatchLater();
                } else {
                    openWatchLater();
                }
            }
        }
    });

    // Mouse move effect for cards
    document.addEventListener('mousemove', (e) => {
        document.querySelectorAll('.card').forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', `${x}%`);
            card.style.setProperty('--mouse-y', `${y}%`);
        });
    });

    // Mode switcher
    if (DOM.modeBtns) {
        DOM.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                DOM.modeBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                switchMode(mode);
            });
        });
    }

    // Studio Navigation
    if (DOM.studioNavBtns) {
        DOM.studioNavBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.studioNavBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                const tab = btn.dataset.tab;
                if (DOM.studioViews) {
                    DOM.studioViews.forEach(v => v.style.display = 'none');
                    if (DOM.activeProjectView) DOM.activeProjectView.style.display = 'none';
                    const target = document.getElementById(`studio-view-${tab}`);
                    if (target) target.style.display = 'block';
                    if (tab === 'islamic') initIslamic();
                    updateBreadcrumbs(`Studio > ${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
                }
            });
        });
    }

    // New project button
    if (DOM.newProjectBtn) {
        DOM.newProjectBtn.addEventListener('click', () => {
            if (DOM.studioViews) DOM.studioViews.forEach(v => v.style.display = 'none');
            if (DOM.activeProjectView) DOM.activeProjectView.style.display = 'block';
            const titleEl = document.getElementById('current-project-title');
            if (titleEl) titleEl.textContent = 'New Untitled Video';
            updateBreadcrumbs('Studio > Projects > New Untitled Video');
            if (DOM.projectTabBtns && DOM.projectTabBtns[0]) DOM.projectTabBtns[0].click();
        });
    }

    // Back to projects
    if (DOM.backToProjectsBtn) {
        DOM.backToProjectsBtn.addEventListener('click', () => {
            if (DOM.activeProjectView) DOM.activeProjectView.style.display = 'none';
            if (DOM.studioViewProjects) DOM.studioViewProjects.style.display = 'block';
            updateBreadcrumbs('Studio > Projects');
            if (DOM.studioNavBtns) {
                DOM.studioNavBtns.forEach(btn => {
                    btn.classList.remove('active');
                    if (btn.dataset.tab === 'projects') btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                });
            }
        });
    }

    // Project tab buttons
    if (DOM.projectTabBtns) {
        DOM.projectTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                DOM.projectTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                const tabId = btn.dataset.ptab;
                if (DOM.ptabContents) {
                    DOM.ptabContents.forEach(content => content.classList.remove('active'));
                    const activeTab = document.getElementById(`ptab-${tabId}`);
                    if (activeTab) activeTab.classList.add('active');
                }
            });
        });
    }
}

// ============================================
// START APPLICATION
// ============================================
// PWA Support & App Lifecycle
let deferredPrompt;
const setupPWA = () => {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[PWA] Service Worker registered'))
                .catch(err => console.log('[PWA] Registration failed:', err));
        });
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const installBtn = document.getElementById('installBtn');
        if (installBtn) {
            installBtn.classList.remove('hidden');
            installBtn.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`[PWA] Install outcome: ${outcome}`);
                    deferredPrompt = null;
                    installBtn.classList.add('hidden');
                }
            });
        }
    });

    window.addEventListener('online', () => {
        if (window.utils && utils.showToast) {
            utils.showToast('Back online! Syncing data...', 'success');
        }
        document.body.classList.remove('offline-mode');
    });

    window.addEventListener('offline', () => {
        if (window.utils && utils.showToast) {
            utils.showToast('You are offline. Some features may be limited.', 'warning');
        }
        document.body.classList.add('offline-mode');
    });
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init();
        bindEvents();
        setupPWA();
        initPullToRefresh();
        initBottomSheetGestures();
        document.body.addEventListener("touchstart", () => {}, { passive: true });
    });
} else {
    init();
    bindEvents();
    setupPWA();
        initPullToRefresh();
        initBottomSheetGestures();
        document.body.addEventListener("touchstart", () => {}, { passive: true });
}

function openShare() {
    if (!DOM.sharePanel) return;
    const shareLink = document.getElementById("shareLink");
    if (shareLink && AppState.current) {
        shareLink.value = "https://www.youtube.com/watch?v=" + AppState.current.id;
    }
    DOM.sharePanel.style.display = "block";
    DOM.sharePanel.setAttribute("aria-hidden", "false");
    DOM.body.style.overflow = "hidden";
    DOM.body.classList.add("modal-open");
    Utils.trapFocus(DOM.sharePanel);
}

function openTranscript() {
    if (!DOM.transcriptPanel) return;
    DOM.transcriptPanel.style.display = "block";
    DOM.transcriptPanel.setAttribute("aria-hidden", "false");
    DOM.body.style.overflow = "hidden";
    DOM.body.classList.add("modal-open");
    Utils.trapFocus(DOM.transcriptPanel);
}

// Mobile & Polish enhancements
function initBottomSheetGestures() {
    const panels = document.querySelectorAll('.side-panel');
    panels.forEach(panel => {
        let startY = 0;
        let currentY = 0;
        const header = panel.querySelector('.panel-header');
        if (!header) return;
        header.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
        header.addEventListener('touchmove', (e) => {
            currentY = e.touches[0].clientY;
            const diff = currentY - startY;
            if (diff > 0) panel.style.transform = "translateY(" + diff + "px)";
        }, { passive: true });
        header.addEventListener('touchend', (e) => {
            const diff = currentY - startY;
            if (diff > 150) {
                const id = panel.id;
                if (id === "watchLaterPage") closeWatchLater();
                else if (id === "dashboardModal") closeDashboard();
                else if (id === "sharePanel") DOM.closeShare.click();
                else if (id === "transcriptPanel") DOM.closeTranscript.click();
            }
            panel.style.transform = "";
            startY = 0; currentY = 0;
        }, { passive: true });
    });
}

function initPullToRefresh() {
    const grid = DOM.grid;
    if (!grid) return;
    let pullStartY = 0;
    let isPulling = false;
    const threshold = 150;
    const indicator = document.createElement('div');
    indicator.className = 'pull-indicator';
    indicator.innerHTML = '<i class="fas fa-sync fa-spin"></i>';
    document.body.prepend(indicator);
    window.addEventListener('touchstart', (e) => { if (window.scrollY === 0) { pullStartY = e.touches[0].clientY; isPulling = true; } }, { passive: true });
    window.addEventListener('touchmove', (e) => {
        if (!isPulling) return;
        const currentY = e.touches[0].clientY;
        const diff = currentY - pullStartY;
        if (diff > 0) {
            indicator.style.opacity = Math.min(diff / threshold, 1);
            indicator.style.transform = "translateY(" + Math.min(diff, threshold) + "px) rotate(" + (diff * 2) + "deg)";
        }
    }, { passive: true });
    window.addEventListener('touchend', async (e) => {
        if (!isPulling) return;
        const currentY = e.changedTouches[0].clientY;
        const diff = currentY - pullStartY;
        if (diff > threshold) {
            if ('vibrate' in navigator) navigator.vibrate(50);
            Utils.showToast('Refreshing archives...', 'info');
            indicator.classList.add('refreshing');
            localStorage.removeItem(CONFIG.STORAGE.CACHE_KEY);
            AppState.videos = await loadVideos();
            renderGrid();
            if ('vibrate' in navigator) navigator.vibrate([30, 30, 30]);
            Utils.showToast('Archives updated!', 'success');
        }
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(-100%)';
        indicator.classList.remove('refreshing');
        isPulling = false;
    }, { passive: true });
}

// Wrap original copyToClipboard for haptics
if (Utils.copyToClipboard) {
    const originalCopy = Utils.copyToClipboard;
    Utils.copyToClipboard = async function(text, element) {
        if ('vibrate' in navigator) navigator.vibrate(10);
        return originalCopy.call(this, text, element);
    };
}
