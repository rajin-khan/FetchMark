// popup.js - Enhanced for better UI/UX, onboarding, settings, and dark mode

// --- Constants ---
const STORAGE_KEYS = {
    ONBOARDING_COMPLETE: 'fetchmark_onboarding_complete_v1',
    GROQ_API_KEY: 'groqApiKey', // Re-use key used by query.js
    // Add other keys if needed later
};

// --- DOM Elements ---
// Views
const appContainer = document.getElementById('appContainer');
const onboardingView = document.getElementById('onboardingView');
const mainAppView = document.getElementById('mainAppView');
const settingsView = document.getElementById('settingsView');

// Onboarding Elements
const onboardingStep1 = document.getElementById('onboardingStep1');
const nextStep1Btn = document.getElementById('nextStep1Btn');
const onboardingStep2 = document.getElementById('onboardingStep2');
const onboardingGroqApiKeyInput = document.getElementById('onboardingGroqApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const backStep2Btn = document.getElementById('backStep2Btn');
const apiKeyErrorMsg = document.getElementById('apiKeyError');

// Main App Elements
const searchFormApp = document.getElementById('searchFormApp');
const searchInputApp = document.getElementById('searchInputApp');
const askButtonApp = document.getElementById('askButtonApp');
const askIconPaw = document.getElementById('askIconPaw');
const askIconSpinner = document.getElementById('askIconSpinner');
const resultsWrapperApp = document.getElementById('resultsWrapperApp');
const resultsContainerApp = document.getElementById('resultsApp');
const statusMessageApp = document.getElementById('statusMessageApp');
const loaderApp = document.getElementById('loaderApp');
const refreshBtnApp = document.getElementById('refreshBtnApp');
const settingsBtn = document.getElementById('settingsBtn'); // Button to open settings

// Settings Elements
const backFromSettingsBtn = document.getElementById('backFromSettingsBtn');
const settingsGroqApiKeyInput = document.getElementById('groqApiKey'); // Input within settings view
const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibilityBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// --- State ---
let allBookmarks = [];
let isLoading = false;
let currentSearchTerm = '';
let isReady = false;
let toastTimeout = null; // For temporary notifications

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initializePopup);

/**
 * Initializes the popup, checking onboarding status and API key.
 * Determines which view to show first.
 */
async function initializePopup() {
    console.log('Initializing FetchMark Popup...');
    try {
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.ONBOARDING_COMPLETE,
            STORAGE_KEYS.GROQ_API_KEY
        ]);

        const onboardingComplete = result[STORAGE_KEYS.ONBOARDING_COMPLETE] === true;
        const apiKey = result[STORAGE_KEYS.GROQ_API_KEY];

        if (onboardingComplete && apiKey) {
            console.log('Onboarding complete and API key found. Showing main app.');
            showView('main'); // Show main app
            await setupMainApp(); // Load bookmarks etc.
        } else {
            console.log('Needs onboarding or API key.');
            showView('onboarding'); // Show onboarding
        }
    } catch (error) {
        console.error("Initialization error:", error);
        showStatusApp("Error loading extension state. Please reload.", 'error'); // Show error in main view just in case
        showView('main'); // Default to main view on error, though it might be limited
    } finally {
         isReady = true; // Mark initialization attempt as complete
    }
}

// --- View Management ---

/**
 * Shows the specified view and hides others.
 * @param {'onboarding' | 'main' | 'settings'} viewName - The name of the view to show.
 * @param {number} [onboardingStep] - If showing onboarding, which step (1 or 2).
 */
function showView(viewName, onboardingStep = 1) {
    // Hide all views first
    onboardingView.classList.add('hidden');
    mainAppView.classList.add('hidden');
    settingsView.classList.add('hidden');

    // Show the requested view
    switch (viewName) {
        case 'onboarding':
            onboardingView.classList.remove('hidden');
            onboardingStep1.classList.toggle('hidden', onboardingStep !== 1);
            onboardingStep2.classList.toggle('hidden', onboardingStep !== 2);
            if (onboardingStep === 2) onboardingGroqApiKeyInput.focus();
            break;
        case 'settings':
            settingsView.classList.remove('hidden');
            loadSettingsIntoView(); // Load current settings when showing the view
            break;
        case 'main':
        default:
            mainAppView.classList.remove('hidden');
            searchInputApp?.focus(); // Focus search input if available
            break;
    }
}

// --- Onboarding Logic ---

if (nextStep1Btn) {
    nextStep1Btn.addEventListener('click', () => {
        showView('onboarding', 2); // Go to step 2
    });
}

if (backStep2Btn) {
    backStep2Btn.addEventListener('click', () => {
        apiKeyErrorMsg.classList.add('hidden'); // Hide error when going back
        showView('onboarding', 1); // Go back to step 1
    });
}

if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', async () => {
        const apiKey = onboardingGroqApiKeyInput.value.trim();

        // Basic validation
        if (!apiKey || !apiKey.startsWith('gsk_')) {
             apiKeyErrorMsg.textContent = 'Hmm, that doesn\'t look like a Groq key (should start with gsk_).';
             apiKeyErrorMsg.classList.remove('hidden');
             onboardingGroqApiKeyInput.classList.add('border-red-500', 'focus:ring-red-500');
             return;
        }

        apiKeyErrorMsg.classList.add('hidden');
        onboardingGroqApiKeyInput.classList.remove('border-red-500', 'focus:ring-red-500');

        saveApiKeyBtn.textContent = 'Saving...';
        saveApiKeyBtn.disabled = true;

        try {
            // Save key, mark onboarding complete, and set Groq as provider
            await chrome.storage.local.set({
                [STORAGE_KEYS.GROQ_API_KEY]: apiKey,
                [STORAGE_KEYS.ONBOARDING_COMPLETE]: true,
                'searchProvider': 'groq' // Default provider
            });

            console.log('API Key saved, onboarding complete.');
            await new Promise(resolve => setTimeout(resolve, 300));

            // Transition to main app view and set it up
            showView('main');
            await setupMainApp();

        } catch (error) {
            console.error("Error saving API key during onboarding:", error);
            apiKeyErrorMsg.textContent = 'Error saving key. Please try again.';
            apiKeyErrorMsg.classList.remove('hidden');
            saveApiKeyBtn.textContent = 'Let\'s Go! ✨';
            saveApiKeyBtn.disabled = false;
        }
    });
}

// --- Main App Setup and Logic ---

/**
 * Sets up the main application view: loads bookmarks and attaches listeners.
 */
async function setupMainApp() {
     console.log("Setting up main app view...");
     showStatusApp("Let me check your bookmarks...", 'info');
     await loadBookmarksApp();
     showStatusApp(
         allBookmarks.length > 0 ? '<span class="text-2xl block mb-2">🐾</span>What bookmarks can I fetch for you today?' : '<span class="text-2xl block mb-2">🤔</span>Looks like you have no bookmarks yet! Add some first.',
         'info',
         true // Allow HTML
     );

     // Attach listeners only once
     if (!mainAppView.dataset.listenersAttached) {
         if (searchFormApp) {
             searchFormApp.addEventListener('submit', (e) => {
                 e.preventDefault();
                 if (isReady) handleSearchApp(searchInputApp.value);
             });
         }
         if (refreshBtnApp) {
             refreshBtnApp.addEventListener('click', () => {
                  if (isReady) loadBookmarksApp(true); // Force refresh
             });
         }
         if (settingsBtn) {
             settingsBtn.addEventListener('click', () => {
                 showView('settings');
             });
         }
         mainAppView.dataset.listenersAttached = 'true';
     }
}

/** Displays status messages in the main app view status area */
function showStatusApp(message, type = 'info', allowHtml = false) {
    if (!statusMessageApp) return;
    if (!message) {
        statusMessageApp.classList.add('hidden');
        statusMessageApp.innerHTML = '';
        return;
    }
    if (allowHtml) { statusMessageApp.innerHTML = message; }
    else { statusMessageApp.textContent = message; }
    statusMessageApp.className = 'text-center text-sm py-6 px-4'; // Base classes
    switch (type) {
        case 'error': statusMessageApp.classList.add('text-red-400'); break;
        case 'success': statusMessageApp.classList.add('text-green-400'); break;
        case 'thinking': statusMessageApp.classList.add('text-cyan-400'); break;
        case 'info': default: statusMessageApp.classList.add('text-slate-400'); break;
    }
    statusMessageApp.classList.remove('hidden');
    if(loaderApp) loaderApp.classList.add('hidden');
    const initialMessages = ["Let me check your bookmarks...", "What bookmarks can I fetch for you today?", "Looks like you have no bookmarks yet!"];
    if(resultsContainerApp && !initialMessages.some(m => message.includes(m))) resultsContainerApp.innerHTML = '';
}

/** Sets the loading state (skeletons or thinking message) */
function setLoadingState(state) { // 'loading', 'thinking', 'idle'
    isLoading = (state === 'loading' || state === 'thinking');
    if(!searchInputApp || !askButtonApp || !loaderApp || !statusMessageApp || !resultsContainerApp) return;
    searchInputApp.disabled = isLoading;
    askButtonApp.disabled = isLoading;
    askButtonApp.classList.toggle('loading', isLoading);
    if(askIconPaw) askIconPaw.classList.toggle('hidden', isLoading);
    if(askIconSpinner) askIconSpinner.classList.toggle('hidden', !isLoading);

    if (state === 'loading') { // Skeletons
        statusMessageApp.classList.add('hidden'); resultsContainerApp.innerHTML = '';
        loaderApp.classList.remove('hidden'); resultsWrapperApp.scrollTop = 0;
    } else if (state === 'thinking') { // Thinking message
         loaderApp.classList.add('hidden'); resultsContainerApp.innerHTML = '';
         showStatusApp("Thinking... 🤔", 'thinking'); resultsWrapperApp.scrollTop = 0;
    } else { // Idle
        loaderApp.classList.add('hidden');
    }
}

/** Renders search results in the main app view */
function renderResultsApp(results) {
     if (!resultsContainerApp) return;
     resultsContainerApp.innerHTML = '';
    if (!results || results.length === 0) return;

    results.forEach((bm, index) => {
        const div = document.createElement('div');
        div.className = 'result-card-dark p-3 rounded-lg bg-slate-800 hover:bg-slate-700 shadow-md hover:shadow-lg cursor-pointer transition-colors duration-150';
        div.style.animationDelay = `${index * 0.06}s`;
        div.dataset.url = bm.url;
        const titleLink = document.createElement('a'); titleLink.href = bm.url; titleLink.textContent = bm.title || 'Untitled'; titleLink.className = 'block font-semibold text-cyan-400 hover:text-cyan-300 hover:underline text-base mb-1 truncate'; titleLink.title = bm.title; titleLink.target = '_blank'; titleLink.addEventListener('click', (e) => { e.preventDefault(); chrome.tabs.create({ url: bm.url, active: true }); });
        const path = document.createElement('p'); path.textContent = bm.folderPath || 'Root'; path.className = 'text-xs text-slate-500 truncate'; path.title = bm.folderPath;
        div.appendChild(titleLink); div.appendChild(path);
        div.addEventListener('click', (e) => { if (e.target !== titleLink && !titleLink.contains(e.target)) { chrome.tabs.create({ url: div.dataset.url, active: true }); } });
        resultsContainerApp.appendChild(div);
    });
    resultsWrapperApp.scrollTop = 0;
}

/** Loads bookmarks, handling cache and refresh */
async function loadBookmarksApp(forceRefresh = false) {
     if (isLoading && !forceRefresh) return;
     let statusWasShown = false;
     if (forceRefresh) {
         showStatusApp('Re-sniffing your bookmarks...', 'info');
         statusWasShown = true;
     }
     try {
         allBookmarks = await getBookmarks(forceRefresh); // Uses bookmarks.js
         console.log(`Loaded ${allBookmarks.length} bookmarks.`);
         if (forceRefresh) {
              showStatusApp(`Got 'em! ${allBookmarks.length} bookmarks ready.`, 'success');
              setTimeout(() => {
                  if (resultsContainerApp?.children.length === 0) { // Only reset if no results showing
                       showStatusApp(allBookmarks.length > 0 ? '<span class="text-2xl block mb-2">🐾</span>Ready when you are!' : '<span class="text-2xl block mb-2">🤔</span>No bookmarks found yet.', 'info', true);
                   } else { showStatusApp(''); }
               }, 2000);
         } else if (!statusWasShown && resultsContainerApp?.children.length === 0) {
            // Initial ready status handled by setupMainApp now
         }
     } catch (error) {
         console.error("Failed to load bookmarks:", error);
         showStatusApp(`Ruh roh! Couldn't load bookmarks: ${error.message}`, 'error');
         allBookmarks = [];
     }
}

/** Handles search submission */
async function handleSearchApp(query) {
    query = query.trim(); currentSearchTerm = query;
    if (!isReady) { console.warn("Search attempted before init."); return; }
    if (!query || query.length < 3) { resultsContainerApp.innerHTML = ''; showStatusApp(query ? 'Need a bit more to search for!' : '<span class="text-2xl block mb-2">🐾</span>What bookmarks can I fetch?', 'info', true); return; }
    if (isLoading) return;
    if (allBookmarks.length === 0) {
        showStatusApp("Checking bookmarks first...", 'info'); await loadBookmarksApp();
        if(allBookmarks.length === 0) { showStatusApp("No bookmarks found to search.", 'error'); return; }
    }

    setLoadingState('thinking');
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        // searchBookmarks uses the settings saved in storage (Groq)
        const { results, message } = await searchBookmarks(query, allBookmarks); // Uses query.js
        setLoadingState('idle');

        if (message && (message.toLowerCase().includes('error') || message.toLowerCase().includes('fail') || message.toLowerCase().includes('missing') || message.toLowerCase().includes('invalid'))) {
            renderResultsApp([]);
            showStatusApp(`Oops! Fetch failed: ${message}. Maybe check API key in settings?`, 'error');
        } else if (results.length === 0) {
            renderResultsApp([]);
            showStatusApp(`Hmm, couldn't sniff out any bookmarks for "${query}". Try asking differently?`, 'info');
        } else {
            showStatusApp('');
            renderResultsApp(results);
        }
    } catch (error) {
         console.error("Search error:", error);
         setLoadingState('idle');
         showStatusApp(`Something went wrong during search: ${error.message}`, 'error');
    }
}


// --- Settings Logic ---

/** Loads current Groq API key into the settings view input */
async function loadSettingsIntoView() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.GROQ_API_KEY);
        if (settingsGroqApiKeyInput) {
            settingsGroqApiKeyInput.value = result[STORAGE_KEYS.GROQ_API_KEY] || '';
            settingsGroqApiKeyInput.type = 'password'; // Ensure it starts hidden
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        // Optionally show an error message within settings view
    }
}

/** Toggles visibility of the API key in settings */
function toggleKeyVisibility() {
    if (!settingsGroqApiKeyInput) return;
    const currentType = settingsGroqApiKeyInput.type;
    settingsGroqApiKeyInput.type = currentType === 'password' ? 'text' : 'password';
    // Optional: Change eye icon based on visibility state
}

/** Clears the bookmark cache */
async function clearBookmarkCache() {
    try {
        await chrome.storage.local.remove([BOOKMARKS_STORAGE_KEY, BOOKMARKS_TIMESTAMP_KEY]);
        allBookmarks = []; // Clear in-memory cache too
        console.log("Bookmark cache cleared.");
        showToast("Bookmark cache cleared!");
        // Optionally trigger a background refresh immediately
        // loadBookmarksApp(true);
    } catch (error) {
        console.error("Error clearing cache:", error);
        showToast("Failed to clear cache.", true);
    }
}

/** Saves settings (currently just API key) */
async function saveSettings() {
    if (!settingsGroqApiKeyInput) return;
    const apiKey = settingsGroqApiKeyInput.value.trim();

    // Basic validation
    if (!apiKey || !apiKey.startsWith('gsk_')) {
        showToast("Invalid Groq API key format.", true);
        settingsGroqApiKeyInput.focus();
        return;
    }

    saveSettingsBtn.textContent = 'Saving...';
    saveSettingsBtn.disabled = true;

    try {
        await chrome.storage.local.set({ [STORAGE_KEYS.GROQ_API_KEY]: apiKey });
        console.log('API Key updated via settings.');
        saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveSettingsBtn.textContent = 'Save Settings';
            saveSettingsBtn.disabled = false;
             // Optionally close settings after save: showView('main');
        }, 1500);
        showToast("Settings saved successfully!");

    } catch (error) {
        console.error("Error saving settings:", error);
        showToast("Failed to save settings.", true);
        saveSettingsBtn.textContent = 'Save Settings';
        saveSettingsBtn.disabled = false;
    }
}

/** Shows a temporary toast notification */
function showToast(message, isError = false) {
    clearTimeout(toastTimeout); // Clear any existing toast timeout

    let toast = document.getElementById('toastNotification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotification';
        toast.className = 'toast-notification fixed bottom-5 left-1/2 transform -translate-x-1/2 p-3 rounded-md shadow-lg text-sm z-50';
        document.body.appendChild(toast); // Append to body
    }

    toast.textContent = message;
    // Apply base and type-specific styles
    toast.className = 'toast-notification fixed bottom-5 left-1/2 transform -translate-x-1/2 p-3 rounded-md shadow-lg text-sm z-50';
    if (isError) {
        toast.classList.add('bg-red-600', 'text-white');
    } else {
        toast.classList.add('bg-green-600', 'text-white'); // Or use CSS variables
    }

    // Animate in
    toast.classList.remove('hide');
    toast.classList.add('show');


    // Set timeout to animate out
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
         // Optional: remove element after animation if creating dynamically
         // setTimeout(() => toast.remove(), 300);
    }, 3000); // Show for 3 seconds
}


// --- Settings Event Listeners ---
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => showView('settings'));
}
if (backFromSettingsBtn) {
    backFromSettingsBtn.addEventListener('click', () => showView('main'));
}
if (toggleKeyVisibilityBtn) {
    toggleKeyVisibilityBtn.addEventListener('click', toggleKeyVisibility);
}
if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', clearBookmarkCache);
}
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
}