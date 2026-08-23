let SCRIPT_HTML=`
<div class="script-studio-container">
    <div class="script-editor-main">
        <div class="section-heading flex-between">
            <div>
                <h2 class="section-title">Script Studio</h2>
                <p class="section-copy">Draft your documentary script with structured sections.</p>
            </div>
            <div class="script-tools">
                <button class="secondary-button small" id="toggleFocusMode" title="Focus Mode">
                    <i class="fa-solid fa-expand"></i> Focus
                </button>
                <button class="secondary-button small" id="insertPauseBtn" title="Insert Pause Marker">
                    ⏱ Add Pause
                </button>
                <button class="secondary-button small" id="insertEmphasisBtn" title="Emphasis">
                    <strong>B</strong>
                </button>
            </div>
        </div>

        <div class="timeline-mapper-container mb-6">
            <h3 class="text-sm font-bold mb-3">
                <i class="fa-solid fa-route mr-2"></i> Timeline Mapper (Visual Beats)
            </h3>
            <div id="timelineBeats" class="timeline-beats-grid" style="display: flex; gap: 1rem; overflow-x: auto; padding-bottom: 1rem;"></div>
            <button class="pill-button small" id="addBeatBtn"><i class="fa-solid fa-plus"></i> Add Beat</button>
        </div>

        <div class="script-sections">
            <div class="script-section-block">
                <label>1. The Hook (0:00 - 0:30)</label>
                <textarea class="script-textarea" data-section="hook" placeholder="Start with a compelling question or statement..."></textarea>
            </div>
            <div class="script-section-block">
                <label>2. The Story / Context</label>
                <textarea class="script-textarea" data-section="story" placeholder="Explain the historical background..."></textarea>
            </div>
            <div class="script-section-block">
                <label>3. Core Lesson / Evidence</label>
                <textarea class="script-textarea" data-section="lesson" placeholder="Provide evidence, Quran/Hadith references..."></textarea>
            </div>
            <div class="script-section-block">
                <label>4. Outro & Call to Action</label>
                <textarea class="script-textarea" data-section="outro" placeholder="Conclude the video..."></textarea>
            </div>
        </div>
    </div>

    <aside class="script-sidebar glass-panel">
        <div class="metrics-card">
            <h3>Live Metrics</h3>
            <div class="metric-row"><span class="metric-label">Word Count:</span><span class="metric-value" id="scriptWordCount">0</span></div>
            <div class="metric-row"><span class="metric-label">Est. Duration:</span><span class="metric-value" id="scriptDuration">0:00</span></div>
        </div>
        <div class="ai-assistant-card" id="aiAssistantContainer">
            <h3>AI Assistant</h3>
            <p class="text-sm text-soft mb-3">Highlight text to rewrite or translate.</p>
            <div class="ai-actions">
                <button class="secondary-button full-width mb-2" id="aiTranslateBtn"><i class="fa-solid fa-language"></i> Translate to Tamil</button>
                <button class="secondary-button full-width" id="aiImproveBtn"><i class="fa-solid fa-wand-magic-sparkles"></i> Improve Phrasing</button>
            </div>
        </div>
    </aside>
</div>
<div id="focusModeOverlay" class="focus-mode-overlay" aria-hidden="true">
    <button id="exitFocusMode" class="icon-button" aria-label="Exit Focus Mode"><i class="fa-solid fa-compress"></i></button>
    <div class="focus-editor-container">
        <h2 id="focusTitle">Hook</h2>
        <textarea id="focusTextArea" class="focus-textarea"></textarea>
        <div class="focus-footer"><span id="focusMetrics">0 words</span></div>
    </div>
</div>
`;function initScriptStudio(){var t=document.getElementById("ptab-script");t&&!t.querySelector(".script-studio-container")&&(t.innerHTML=SCRIPT_HTML,initTextAreas(),initButtons(),loadTimelineBeats(),updateMetrics())}function initTextAreas(){document.querySelectorAll(".script-textarea").forEach(e=>{let a=e.dataset.section,t=localStorage.getItem("script_section_"+a);t&&(e.value=t),e.addEventListener("input",t=>{localStorage.setItem("script_section_"+a,t.target.value),updateMetrics()}),e.addEventListener("mouseup",()=>{var t=e.value.substring(e.selectionStart,e.selectionEnd).trim();5<t.length?showMappingPopup(e,t):hideMappingPopup()})})}function initButtons(){document.getElementById("insertPauseBtn")?.addEventListener("click",()=>insertAtCursor(" [PAUSE] ")),document.getElementById("insertEmphasisBtn")?.addEventListener("click",()=>insertAtCursor(" ** **")),document.getElementById("toggleFocusMode")?.addEventListener("click",toggleFocusMode),document.getElementById("exitFocusMode")?.addEventListener("click",exitFocusMode),document.getElementById("addBeatBtn")?.addEventListener("click",()=>addTimelineBeat("New Beat"))}let activeTextarea=null;function toggleFocusMode(){var t,e,a,i,s=document.activeElement;s?.classList?.contains("script-textarea")?(activeTextarea=s,t=document.getElementById("focusModeOverlay"),e=document.getElementById("focusTitle"),a=document.getElementById("focusTextArea"),i=s.closest(".script-section-block")?.querySelector("label"),e&&i&&(e.textContent=i.textContent),a&&(a.value=s.value,a.addEventListener("input",updateFocusMetrics)),t&&(t.setAttribute("aria-hidden","false"),t.classList.add("show"),a?.focus(),updateFocusMetrics())):alert("Please click inside a section to focus.")}function exitFocusMode(){var t=document.getElementById("focusModeOverlay"),e=document.getElementById("focusTextArea");activeTextarea&&e&&(activeTextarea.value=e.value,activeTextarea.dispatchEvent(new Event("input"))),t&&(t.setAttribute("aria-hidden","true"),t.classList.remove("show")),activeTextarea=null}function addTimelineBeat(t="New Beat"){var e,a=document.getElementById("timelineBeats");a&&((e=document.createElement("div")).className="timeline-beat",e.innerHTML=`<input type="text" value="${escapeHtml(t)}" class="beat-input" style="background:transparent; border:none; width:100px; font-size:0.8rem; font-weight:600;">`,a.appendChild(e),e.querySelector("input").addEventListener("input",saveTimelineBeats),saveTimelineBeats())}function saveTimelineBeats(){var t=Array.from(document.querySelectorAll(".beat-input")).map(t=>t.value);localStorage.setItem("timeline_beats",JSON.stringify(t))}function loadTimelineBeats(){var t=JSON.parse(localStorage.getItem("timeline_beats")||"[]"),e=document.getElementById("timelineBeats");e&&(e.innerHTML=""),0===t.length?["Hook","Exposition","Climax","Resolution"].forEach(t=>addTimelineBeat(t)):t.forEach(t=>addTimelineBeat(t))}function updateMetrics(){let e="";document.querySelectorAll(".script-textarea").forEach(t=>e+=t.value+" ");var t=e.trim().split(/\s+/).filter(t=>0<t.length).length,a=Math.floor(t/130),i=Math.floor(t%130/(130/60)),s=document.getElementById("scriptWordCount"),n=document.getElementById("scriptDuration");s&&(s.textContent=t),n&&(n.textContent=a+":"+i.toString().padStart(2,"0"))}function updateFocusMetrics(){var t,e=document.getElementById("focusTextArea");e&&(e=e.value.trim().split(/\s+/).filter(t=>0<t.length).length,t=document.getElementById("focusMetrics"))&&(t.textContent=e+" words")}function insertAtCursor(t){var e,a,i,s=document.activeElement;s?.classList?.contains("script-textarea")||s?.classList?.contains("focus-textarea")?(e=s.selectionStart,a=s.selectionEnd,i=s.value,s.value=i.substring(0,e)+t+i.substring(a),s.selectionStart=s.selectionEnd=e+t.length,s.focus(),updateMetrics()):alert("Please focus on a text area first.")}function showMappingPopup(t,e){let a=document.getElementById("mappingPopup");a||((a=document.createElement("div")).id="mappingPopup",a.className="mapping-popup",a.innerHTML='<button id="linkRefBtn"><i class="fa-solid fa-book-quran"></i> Link to Reference</button>',document.body.appendChild(a)),t=t.getBoundingClientRect(),a.style.display="block",a.style.top=window.scrollY+t.top-40+"px",a.style.left=window.scrollX+t.left+20+"px",document.getElementById("linkRefBtn").onclick=()=>{document.querySelector('.studio-nav-btn[data-tab="islamic"]')?.click(),hideMappingPopup()}}function hideMappingPopup(){var t=document.getElementById("mappingPopup");t&&(t.style.display="none")}function escapeHtml(t){var e=document.createElement("div");return e.textContent=t,e.innerHTML}document.addEventListener("DOMContentLoaded",initScriptStudio);export{initScriptStudio};