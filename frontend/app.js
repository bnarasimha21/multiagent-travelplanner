/* ============================================
   Multi-Agent Travel Planner - Frontend
   ============================================ */

let map = null;
let markers = [];
let mapboxToken = "";
let agentTimings = {};

// Category colors for map markers and badges
const CATEGORY_COLORS = {
    flights: "#4f8ff7",
    hotels: "#a78bfa",
    restaurants: "#f472b6",
    attractions: "#f59e0b",
    weather: "#22d3ee",
    visa: "#ef4444",
    transportation: "#34d399",
    budget: "#f59e0b",
    safety: "#ef4444",
    culture: "#a78bfa",
    packing: "#22d3ee",
    family: "#f472b6",
    accessibility: "#34d399",
    hiking: "#22c55e",
    adventure: "#f97316",
    nature: "#10b981",
    shopping: "#ec4899",
    nightlife: "#8b5cf6",
    general: "#8b8fa3",
};

// Map free-text category strings from agents to our icon keys
function resolveCategory(raw) {
    if (!raw) return "general";
    const c = raw.toLowerCase();
    if (c.includes("flight") || c.includes("airline") || c.includes("airport")) return "flights";
    if (c.includes("hotel") || c.includes("hostel") || c.includes("lodge") || c.includes("accommodation") || c.includes("stay") || c.includes("resort") || c.includes("inn") || c.includes("bnb")) return "hotels";
    if (c.includes("restaurant") || c.includes("food") || c.includes("dining") || c.includes("cafe") || c.includes("bistro") || c.includes("cuisine") || c.includes("eat")) return "restaurants";
    if (c.includes("hik") || c.includes("trail") || c.includes("trek") || c.includes("walk")) return "hiking";
    if (c.includes("adventure") || c.includes("kayak") || c.includes("bungee") || c.includes("skydiv") || c.includes("raft") || c.includes("surf") || c.includes("bike") || c.includes("climb") || c.includes("sport")) return "adventure";
    if (c.includes("museum") || c.includes("cultur") || c.includes("art") || c.includes("histor") || c.includes("temple") || c.includes("heritage")) return "culture";
    if (c.includes("park") || c.includes("nature") || c.includes("garden") || c.includes("wildlife") || c.includes("scenic") || c.includes("landscape")) return "nature";
    if (c.includes("weather") || c.includes("climate") || c.includes("forecast")) return "weather";
    if (c.includes("transport") || c.includes("bus") || c.includes("train") || c.includes("metro") || c.includes("taxi") || c.includes("car")) return "transportation";
    if (c.includes("visa") || c.includes("passport") || c.includes("document")) return "visa";
    if (c.includes("budget") || c.includes("cost") || c.includes("money") || c.includes("price")) return "budget";
    if (c.includes("safe")) return "safety";
    if (c.includes("family") || c.includes("kid") || c.includes("child")) return "family";
    if (c.includes("shop") || c.includes("market") || c.includes("mall") || c.includes("store")) return "shopping";
    if (c.includes("attract") || c.includes("landmark") || c.includes("sight") || c.includes("monument") || c.includes("tower") || c.includes("view")) return "attractions";
    if (c.includes("nightlife") || c.includes("bar") || c.includes("club") || c.includes("pub") || c.includes("entertainment")) return "nightlife";
    return "attractions"; // default to attractions pin rather than generic
}

// SVG icons per category for map markers
const CATEGORY_ICONS = {
    flights: `<path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>`,
    hotels: `<path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM19 7h-8v7H3V5H1v15h2v-3h18v3h2V11c0-2.21-1.79-4-4-4z"/>`,
    restaurants: `<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>`,
    attractions: `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>`,
    weather: `<path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z"/>`,
    visa: `<path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>`,
    transportation: `<path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>`,
    budget: `<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>`,
    safety: `<path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>`,
    culture: `<path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"/>`,
    packing: `<path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>`,
    family: `<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>`,
    accessibility: `<path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z"/>`,
    hiking: `<path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.5 15l2-6 2.5 2.5V22h2v-6.5l-2.5-2.5.5-3c1.5 1.5 3.5 2.5 6 2.5v-2c-2 0-3.5-.9-4.5-2l-1-1.5c-.5-.5-1-1-1.5-1-.5 0-1 0-1.5.5L6 9v6h2v-4l2 2-3 9h2z"/>`,
    adventure: `<path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6z"/>`,
    nature: `<path d="M14 6l-3.75 5 2.85 3.8-1.6 1.2C9.81 13.75 7 10 7 10l-6 8h22L14 6zm-5.34 7.48l.98 1.3L12 11.4l3.84 5.1H4.16l4.5-6.02z"/>`,
    shopping: `<path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/>`,
    nightlife: `<path d="M2 22h20v-2H2v2zm1-4h4V12H3v6zm6 0h4V6H9v12zm6 0h4V2h-4v16z"/>`,
    general: `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z"/>`,
};

// BYOK (Bring Your Own Key) management
const FREE_USES = 2;
const STORAGE_KEY_USAGE = "travelplanner_usage_count";
const STORAGE_KEY_API = "travelplanner_api_key";
const STORAGE_KEY_PROVIDER = "travelplanner_provider";

const PROVIDER_CONFIG = {
    openai: { label: "OpenAI", prefix: "sk-", placeholder: "sk-...", url: "platform.openai.com" },
    anthropic: { label: "Anthropic", prefix: "sk-ant-", placeholder: "sk-ant-...", url: "console.anthropic.com" },
    gemini: { label: "Google Gemini", prefix: "AI", placeholder: "AI...", url: "aistudio.google.com/apikey" },
};

let selectedProvider = "openai";

function getUsageCount() {
    return parseInt(localStorage.getItem(STORAGE_KEY_USAGE) || "0", 10);
}

function incrementUsage() {
    const count = getUsageCount() + 1;
    localStorage.setItem(STORAGE_KEY_USAGE, count.toString());
    return count;
}

function getApiKey() {
    return localStorage.getItem(STORAGE_KEY_API) || "";
}

function getProvider() {
    return localStorage.getItem(STORAGE_KEY_PROVIDER) || "openai";
}

function setApiKey(key, provider) {
    localStorage.setItem(STORAGE_KEY_API, key);
    localStorage.setItem(STORAGE_KEY_PROVIDER, provider);
}

function clearApiKey() {
    localStorage.removeItem(STORAGE_KEY_API);
    localStorage.removeItem(STORAGE_KEY_PROVIDER);
}

function needsApiKey() {
    return getUsageCount() >= FREE_USES && !getApiKey();
}

function showByokModal() {
    selectedProvider = getProvider() || "openai";
    updateByokUI();
    document.getElementById("byokModal").style.display = "flex";
}

function hideByokModal() {
    document.getElementById("byokModal").style.display = "none";
}

function selectByokProvider(provider) {
    selectedProvider = provider;
    document.getElementById("apiKeyInput").value = "";
    document.getElementById("byokError").style.display = "none";
    updateByokUI();
}

function updateByokUI() {
    const config = PROVIDER_CONFIG[selectedProvider];
    // Update tab buttons
    document.querySelectorAll(".byok-provider-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.provider === selectedProvider);
    });
    // Update instructions
    const urlEl = document.getElementById("byokProviderUrl");
    if (urlEl) urlEl.textContent = config.url;
    // Update placeholder
    const input = document.getElementById("apiKeyInput");
    if (input) input.placeholder = config.placeholder;
}

function submitApiKey() {
    const input = document.getElementById("apiKeyInput");
    const key = input.value.trim();
    if (!key) return;
    const config = PROVIDER_CONFIG[selectedProvider];
    if (!key.startsWith(config.prefix)) {
        document.getElementById("byokError").textContent = `Key should start with ${config.prefix}`;
        document.getElementById("byokError").style.display = "block";
        return;
    }
    setApiKey(key, selectedProvider);
    hideByokModal();
    document.getElementById("byokError").style.display = "none";
    updateKeyStatus();
    // Retry the planning if user was blocked
    startPlanning();
}

function removeStoredKey() {
    clearApiKey();
    updateKeyStatus();
}

function updateKeyStatus() {
    const badge = document.getElementById("keyStatusBadge");
    if (!badge) return;
    const key = getApiKey();
    const provider = getProvider();
    const usage = getUsageCount();
    if (key) {
        const label = PROVIDER_CONFIG[provider]?.label || provider;
        badge.innerHTML = `<span class="key-badge key-badge-active" title="Using your ${label} key">${label}</span><button class="key-remove-btn" onclick="removeStoredKey()" title="Remove key">&times;</button>`;
        badge.style.display = "flex";
    } else if (usage < FREE_USES) {
        badge.innerHTML = `<span class="key-badge key-badge-free">${FREE_USES - usage} free ${FREE_USES - usage === 1 ? 'use' : 'uses'} left</span>`;
        badge.style.display = "flex";
    } else {
        badge.innerHTML = `<span class="key-badge key-badge-expired" onclick="showByokModal()" style="cursor:pointer;">Add API Key</span>`;
        badge.style.display = "flex";
    }
}

// Initialize
async function init() {
    const resp = await fetch("api/config");
    const config = await resp.json();
    mapboxToken = config.mapbox_token;
    updateKeyStatus();
}

init();

function setQuery(text) {
    document.getElementById("queryInput").value = text;
}

function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll(".tab-content").forEach((el) => {
        el.style.display = "none";
    });
    // Show the selected tab
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.style.display = "block";

    // Update tab button styles
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === tabName);
    });

    // If switching to experience tab, resize map (may have been hidden)
    if (tabName === "experience" && map) {
        setTimeout(() => map.resize(), 100);
    }

    // Clear notification dot when switching to that tab
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    const dot = btn ? btn.querySelector(".notification-dot") : null;
    if (dot) dot.remove();
}

function notifyTab(tabName) {
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (!btn || btn.classList.contains("active")) return;
    // Add a green dot if not already present
    if (!btn.querySelector(".notification-dot")) {
        const dot = document.createElement("span");
        dot.className = "notification-dot";
        btn.appendChild(dot);
    }
}

async function startPlanning() {
    const query = document.getElementById("queryInput").value.trim();
    if (!query) return;

    // Check if user needs to provide an API key
    if (needsApiKey()) {
        showByokModal();
        return;
    }

    // Increment usage if using free tier (no user key)
    if (!getApiKey()) {
        incrementUsage();
        updateKeyStatus();
    }

    const btn = document.getElementById("planBtn");
    btn.disabled = true;

    // Reset state
    agentTimings = {};
    clearMarkers();
    document.getElementById("tabNav").style.display = "flex";
    switchTab("dashboard");
    document.getElementById("reasoningCard").style.display = "none";
    document.getElementById("agentsCard").style.display = "none";
    document.getElementById("timingCard").style.display = "none";
    document.getElementById("itineraryCard").style.display = "none";
    showLoading("Analyzing your travel query...");

    // Start SSE connection
    const apiKey = getApiKey();
    const url = `api/plan?query=${encodeURIComponent(query)}${apiKey ? '&api_key=' + encodeURIComponent(apiKey) + '&provider=' + encodeURIComponent(getProvider()) : ''}`;
    const eventSource = new EventSource(url);
    let planData = null;

    eventSource.addEventListener("plan", (e) => {
        const data = JSON.parse(e.data);
        planData = data;
        hideLoading();
        renderReasoning(data);
        renderAgentCards(data.tasks);
        initMap(data.destination);
    });

    eventSource.addEventListener("phase", (e) => {
        const data = JSON.parse(e.data);
        updateLoadingText(data.message);
    });

    eventSource.addEventListener("agent_start", (e) => {
        const data = JSON.parse(e.data);
        agentTimings[data.task_id] = { start: Date.now() };
        setAgentStatus(data.task_id, "running");
    });

    eventSource.addEventListener("agent_complete", (e) => {
        const data = JSON.parse(e.data);
        if (agentTimings[data.task_id]) {
            agentTimings[data.task_id].end = Date.now();
            agentTimings[data.task_id].duration_ms = data.execution_time_ms;
        }
        setAgentStatus(data.task_id, "completed", data.execution_time_ms, data.summary);
    });

    eventSource.addEventListener("timing", (e) => {
        const data = JSON.parse(e.data);
        renderTiming(data, planData);
        // Show itinerary card with a generating indicator
        showItineraryGenerating();
    });

    eventSource.addEventListener("result", (e) => {
        const data = JSON.parse(e.data);
        renderItinerary(data.itinerary);
        renderMapMarkers(data.markers, data.destination);
        btn.disabled = false;
        // Auto-switch to Trip Experience and add notification dot on it
        notifyTab("experience");
        switchTab("experience");
    });

    eventSource.addEventListener("done", () => {
        eventSource.close();
        hideLoading();
    });

    eventSource.onerror = () => {
        eventSource.close();
        hideLoading();
        btn.disabled = false;
    };
}

// Allow Enter key to trigger planning
document.getElementById("queryInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") startPlanning();
});

/* ---- Rendering Functions ---- */

function renderReasoning(data) {
    const card = document.getElementById("reasoningCard");
    card.style.display = "block";
    document.getElementById("analysisText").textContent = data.analysis;
}

function renderAgentCards(tasks) {
    const card = document.getElementById("agentsCard");
    card.style.display = "block";
    document.getElementById("agentCount").textContent = `${tasks.length} agents`;

    const list = document.getElementById("agentsList");
    list.innerHTML = tasks
        .map(
            (t) => `
        <div class="agent-card" id="agent-${t.id}">
            <div class="agent-status-dot"></div>
            <div class="agent-info">
                <div class="agent-name">${t.name}</div>
                <div class="agent-reason">${t.reason}</div>
            </div>
            <span class="agent-category-badge cat-${t.category}">${t.category}</span>
            <span class="agent-time" id="agent-time-${t.id}">pending</span>
        </div>
    `
        )
        .join("");
}

function setAgentStatus(taskId, status, timeMs, summary) {
    const card = document.getElementById(`agent-${taskId}`);
    if (!card) return;

    card.className = `agent-card ${status}`;
    const timeEl = document.getElementById(`agent-time-${taskId}`);
    if (status === "running") {
        timeEl.textContent = "running...";
        timeEl.style.color = "var(--accent-orange)";
    } else if (status === "completed" && timeMs !== undefined) {
        timeEl.textContent = `${(timeMs / 1000).toFixed(1)}s`;
        timeEl.style.color = "var(--accent-green)";
    }
}

function renderTiming(data, planData) {
    const card = document.getElementById("timingCard");
    card.style.display = "block";

    const maxTime = Math.max(data.sequential_time_ms, data.parallel_time_ms);

    // Build gantt chart data from agent timings
    let ganttHtml = "";
    if (planData && planData.tasks) {
        ganttHtml = `
            <div class="gantt-chart">
                <div class="gantt-title">Individual Agent Execution (all ran simultaneously)</div>
                ${planData.tasks
                    .map((t) => {
                        const timing = agentTimings[t.id];
                        const duration = timing ? timing.duration_ms : 0;
                        const widthPct = maxTime > 0 ? (duration / maxTime) * 100 : 0;
                        const color = CATEGORY_COLORS[t.category] || CATEGORY_COLORS.general;
                        return `
                        <div class="gantt-row">
                            <span class="gantt-label">${t.name}</span>
                            <div class="gantt-track">
                                <div class="gantt-bar" style="width:${widthPct}%; background:${color}; left:0;">
                                    ${(duration / 1000).toFixed(1)}s
                                </div>
                            </div>
                        </div>`;
                    })
                    .join("")}
            </div>`;
    }

    document.getElementById("timingContent").innerHTML = `
        <div class="timing-bars">
            <div class="timing-bar-row">
                <div class="timing-bar-label">
                    <span>Sequential (one after another)</span>
                    <span style="color:var(--accent-red)">${(data.sequential_time_ms / 1000).toFixed(1)}s</span>
                </div>
                <div class="timing-bar-track">
                    <div class="timing-bar-fill sequential" style="width:100%">
                    </div>
                </div>
            </div>
            <div class="timing-bar-row">
                <div class="timing-bar-label">
                    <span>Parallel (all at once)</span>
                    <span style="color:var(--accent-green)">${(data.parallel_time_ms / 1000).toFixed(1)}s</span>
                </div>
                <div class="timing-bar-track">
                    <div class="timing-bar-fill parallel" style="width:${(data.parallel_time_ms / maxTime) * 100}%">
                    </div>
                </div>
            </div>
        </div>
        <div class="speedup-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            ${data.speedup_factor}x faster with parallel execution
        </div>
        ${ganttHtml}
    `;
}

function renderItinerary(itinerary) {
    const card = document.getElementById("itineraryCard");
    card.style.display = "block";

    const days = itinerary.days || [];
    const tips = itinerary.key_tips || [];

    let daysHtml = days
        .map(
            (day, i) => `
        <div class="day-card ${i === 0 ? "open" : ""}">
            <div class="day-header" onclick="toggleDay(this)">
                <span class="day-number">Day ${day.day}</span>
                <span class="day-title">${day.title}</span>
                <svg class="day-toggle" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </div>
            <div class="day-activities">
                ${(day.activities || [])
                    .map(
                        (a) => `
                    <div class="activity">
                        <span class="activity-time">${a.time || ""}</span>
                        <div class="activity-details">
                            <div class="activity-name">${a.name}</div>
                            <div class="activity-desc">${a.description || ""}</div>
                            <div class="activity-meta">
                                ${a.location ? `<span class="activity-location">${a.location.name || ""}</span>` : ""}
                                ${a.cost_estimate ? `<span class="activity-cost">${a.cost_estimate}</span>` : ""}
                            </div>
                        </div>
                    </div>
                `
                    )
                    .join("")}
            </div>
        </div>
    `
        )
        .join("");

    let tipsHtml = "";
    if (tips.length > 0) {
        tipsHtml = `
            <div class="tips-section">
                <div class="tips-title">Key Tips</div>
                <ul class="tips-list">
                    ${tips.map((t) => `<li>${t}</li>`).join("")}
                </ul>
            </div>
        `;
    }

    document.getElementById("itineraryContent").innerHTML = `
        <div class="itinerary-title">${itinerary.title || "Your Trip"}</div>
        <div class="itinerary-summary">${itinerary.summary || ""}</div>
        ${itinerary.total_estimated_cost_usd ? `<div class="itinerary-cost">Estimated Total: $${itinerary.total_estimated_cost_usd.toLocaleString()}</div>` : ""}
        ${daysHtml}
        ${tipsHtml}
    `;
}

function toggleDay(header) {
    header.parentElement.classList.toggle("open");
}

function showItineraryGenerating() {
    const card = document.getElementById("itineraryCard");
    card.style.display = "block";
    document.getElementById("itineraryContent").innerHTML = `
        <div class="generating-indicator">
            <div class="generating-spinner"></div>
            <div class="generating-text">
                <div class="generating-title">Building your itinerary...</div>
                <div class="generating-sub">Combining results from all agents into a day-by-day plan</div>
            </div>
        </div>
    `;
}

/* ---- Map Functions ---- */

function initMap(destination) {
    if (!mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    if (map) {
        // Container may have been hidden; force resize then fly
        setTimeout(() => {
            map.resize();
            map.flyTo({ center: [destination.lng, destination.lat], zoom: 11, duration: 2000 });
        }, 100);
        return;
    }

    // Small delay to ensure the container is visible and has dimensions
    setTimeout(() => {
        map = new mapboxgl.Map({
            container: "map",
            style: "mapbox://styles/mapbox/dark-v11",
            center: [destination.lng, destination.lat],
            zoom: 11,
        });

        map.addControl(new mapboxgl.NavigationControl(), "top-right");

        // Resize once the map is loaded to handle any layout shifts
        map.on("load", () => {
            map.resize();
        });
    }, 150);
}

function clearMarkers() {
    markers.forEach((m) => m.remove());
    markers = [];
    // Clear route layers if they exist
    if (map) {
        if (map.getLayer("route-line")) map.removeLayer("route-line");
        if (map.getSource("route")) map.removeSource("route");
    }
}

function renderMapMarkers(markerData, destination) {
    if (!mapboxToken) return;

    // If map isn't ready yet, retry after a short delay
    if (!map || !map.loaded()) {
        setTimeout(() => renderMapMarkers(markerData, destination), 500);
        return;
    }

    clearMarkers();

    const categoriesUsed = new Set();
    const bounds = new mapboxgl.LngLatBounds();

    markerData.forEach((m) => {
        if (!m.lat || !m.lng) return;

        const resolved = resolveCategory(m.category);
        const color = CATEGORY_COLORS[resolved] || CATEGORY_COLORS.general;
        categoriesUsed.add(resolved);

        // Create custom marker with category-specific SVG icon
        const el = document.createElement("div");
        el.style.width = "36px";
        el.style.height = "36px";
        el.style.cursor = "pointer";
        el.style.filter = `drop-shadow(0 2px 6px ${color}aa)`;
        const iconPath = CATEGORY_ICONS[resolved] || CATEGORY_ICONS.general;
        el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="${color}" style="background:rgba(15,17,23,0.85);border-radius:50%;padding:6px;border:2px solid ${color};">${iconPath}</svg>`;

        const popup = new mapboxgl.Popup({ offset: 12 }).setHTML(`
            <div class="popup-title">${m.name}</div>
            <div class="popup-desc">${m.description || ""}</div>
            ${m.cost_estimate ? `<div class="popup-cost">${m.cost_estimate}</div>` : ""}
        `);

        const marker = new mapboxgl.Marker(el)
            .setLngLat([m.lng, m.lat])
            .setPopup(popup)
            .addTo(map);

        markers.push(marker);
        bounds.extend([m.lng, m.lat]);
    });

    // Fit map to markers
    if (markers.length > 1) {
        map.fitBounds(bounds, { padding: 60, duration: 1500 });
    }

    // Draw route connecting markers
    if (markers.length > 1) {
        const coords = markerData
            .filter((m) => m.lat && m.lng)
            .map((m) => [m.lng, m.lat]);

        map.on("idle", function addRoute() {
            map.off("idle", addRoute);
            if (!map.getSource("route")) {
                map.addSource("route", {
                    type: "geojson",
                    data: {
                        type: "Feature",
                        geometry: { type: "LineString", coordinates: coords },
                    },
                });
                map.addLayer({
                    id: "route-line",
                    type: "line",
                    source: "route",
                    paint: {
                        "line-color": "#4f8ff7",
                        "line-width": 2,
                        "line-opacity": 0.5,
                        "line-dasharray": [2, 4],
                    },
                });
            }
        });
    }

    // Render legend with friendly labels
    const CATEGORY_LABELS = {
        flights: "Flights", hotels: "Hotels", restaurants: "Dining",
        attractions: "Attractions", weather: "Weather", visa: "Visa",
        transportation: "Transport", budget: "Budget", safety: "Safety",
        culture: "Culture", family: "Family", hiking: "Hiking",
        adventure: "Adventure", nature: "Nature", shopping: "Shopping",
        nightlife: "Nightlife", general: "Other",
    };
    const legend = document.getElementById("mapLegend");
    legend.innerHTML = Array.from(categoriesUsed)
        .map(
            (cat) => `
        <div class="legend-item">
            <div class="legend-dot" style="background:${CATEGORY_COLORS[cat] || CATEGORY_COLORS.general}"></div>
            ${CATEGORY_LABELS[cat] || cat}
        </div>
    `
        )
        .join("");
}

/* ---- Loading ---- */

function showLoading(text) {
    document.getElementById("loadingOverlay").style.display = "flex";
    document.getElementById("loadingText").textContent = text;
}

function hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none";
}

function updateLoadingText(text) {
    document.getElementById("loadingText").textContent = text;
}
