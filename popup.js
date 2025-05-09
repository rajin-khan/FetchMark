// popup.js - Enhanced for better UI/UX, onboarding, settings, and dark mode

// --- Constants ---
const STORAGE_KEYS = {
    ONBOARDING_COMPLETE: 'fetchmark_onboarding_complete_v1',
    SEARCH_PROVIDER: 'searchProvider',
    GROQ_API_KEY: 'groqApiKey',
    HF_API_KEY: 'hfApiKey',
    OLLAMA_MODEL: 'ollamaModel',
    LAST_SEARCH_QUERY: 'fetchmark_last_search_query',
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
const searchProviderSelect = document.getElementById('searchProviderSelect');

const groqSettingsDiv = document.getElementById('groqSettingsDiv');
const settingsGroqApiKeyInput = document.getElementById('settingsGroqApiKey'); 
const toggleGroqKeyVisibilityBtn = document.getElementById('toggleGroqKeyVisibilityBtn');

const hfSettingsDiv = document.getElementById('hfSettingsDiv');
const settingsHfApiKeyInput = document.getElementById('settingsHfApiKey');
const toggleHfKeyVisibilityBtn = document.getElementById('toggleHfKeyVisibilityBtn');

const ollamaSettingsDiv = document.getElementById('ollamaSettingsDiv');
const settingsOllamaModelInput = document.getElementById('settingsOllamaModel');
const testOllamaBtn = document.getElementById('testOllamaBtn');
const ollamaTestResultMsg = document.getElementById('ollamaTestResultMsg');

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
            STORAGE_KEYS.GROQ_API_KEY,
            STORAGE_KEYS.SEARCH_PROVIDER
        ]);

        const onboardingComplete = result[STORAGE_KEYS.ONBOARDING_COMPLETE] === true;
        const groqApiKey = result[STORAGE_KEYS.GROQ_API_KEY];
        const searchProvider = result[STORAGE_KEYS.SEARCH_PROVIDER];

        if (onboardingComplete && groqApiKey && searchProvider) { // Check for provider too
            console.log('Onboarding complete, API key and provider found. Showing main app.');
            showView('main'); // Show main app
            await setupMainApp(); // Load bookmarks etc.
        } else if (onboardingComplete && !groqApiKey && searchProvider !== 'ollama' && searchProvider !== 'hf'){
            // Onboarding done, but Groq key might have been removed, and provider is Groq or not set
            console.log('Onboarding complete but Groq API key missing. Redirecting to settings.');
            showView('settings');
        } else if (onboardingComplete && searchProvider) {
             console.log('Onboarding complete, provider set. Showing main app (might need specific setup for HF/Ollama if keys are missing).');
             showView('main');
             await setupMainApp();
        } else {
            console.log('Needs onboarding or essential settings.');
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
            if (onboardingStep1 && onboardingStep2) { // Ensure elements exist
                onboardingStep1.classList.toggle('visible-step', onboardingStep === 1);
                onboardingStep1.classList.toggle('hidden-step', onboardingStep !== 1);
                onboardingStep2.classList.toggle('visible-step', onboardingStep === 2);
                onboardingStep2.classList.toggle('hidden-step', onboardingStep !== 2);
                
                if (onboardingStep === 2) {
                    // Delay focus slightly to allow transition to complete
                    setTimeout(() => onboardingGroqApiKeyInput?.focus(), 300); 
                }
            }
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
        if (onboardingStep1 && onboardingStep2) {
            onboardingStep1.classList.replace('visible-step', 'hidden-step');
            onboardingStep2.classList.replace('hidden-step', 'visible-step');
            setTimeout(() => onboardingGroqApiKeyInput?.focus(), 300); // Focus after transition
        }
    });
}

if (backStep2Btn) {
    backStep2Btn.addEventListener('click', () => {
        if (onboardingStep1 && onboardingStep2) {
            apiKeyErrorMsg.classList.add('hidden'); // Hide error when going back
            onboardingStep2.classList.replace('visible-step', 'hidden-step');
            onboardingStep1.classList.replace('hidden-step', 'visible-step');
        }
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
                [STORAGE_KEYS.SEARCH_PROVIDER]: 'groq' // Default provider
            });

            console.log('API Key saved, onboarding complete, provider set to Groq.');
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
     
     // Load last search query
    try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_SEARCH_QUERY);
        if (result[STORAGE_KEYS.LAST_SEARCH_QUERY] && searchInputApp) {
            searchInputApp.value = result[STORAGE_KEYS.LAST_SEARCH_QUERY];
            currentSearchTerm = result[STORAGE_KEYS.LAST_SEARCH_QUERY]; // Also update state if needed
        }
    } catch (error) {
        console.warn("Could not load last search query:", error);
    }

     await loadBookmarksApp();
     // Determine initial status message after bookmarks (and possibly last query) are loaded
    if (resultsContainerApp && resultsContainerApp.children.length === 0) { // Only set default if no results shown
        showStatusApp(
            allBookmarks.length > 0 ? '<span class="text-2xl block mb-2">🐾</span>What bookmarks can I fetch for you today?' : '<span class="text-2xl block mb-2">🤔</span>Looks like you have no bookmarks yet! Add some first.',
            'info',
            true // Allow HTML
        );
    }

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

     if (forceRefresh && refreshBtnApp) {
        refreshBtnApp.classList.add('refreshing');
        refreshBtnApp.disabled = true;
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
     } finally {
        if (forceRefresh && refreshBtnApp) {
            refreshBtnApp.classList.remove('refreshing');
            refreshBtnApp.disabled = false;
        }
     }
}

/** Handles search submission */
async function handleSearchApp(query) {
    query = query.trim(); 
    if (!isReady) { console.warn("Search attempted before init."); return; }
    
    currentSearchTerm = query; // Update current search term
    // Save the current search term
    try {
        if (query) { // Only save non-empty queries
            await chrome.storage.local.set({ [STORAGE_KEYS.LAST_SEARCH_QUERY]: query });
        }
    } catch (error) {
        console.warn("Could not save last search query:", error);
    }

    if (!query || query.length < 3) { 
        resultsContainerApp.innerHTML = ''; 
        showStatusApp(query ? 'Need a bit more to search for!' : '<span class="text-2xl block mb-2">🐾</span>What bookmarks can I fetch?', 'info', true); 
        return; 
    }
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
            const noResultsHTML = `
                <div class="text-center py-8">
                    <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-slate-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                    </svg>
                    <p class="text-lg font-semibold text-slate-300 mb-1">No barks for "<span class="italic text-cyan-400">${currentSearchTerm}</span>"!</p>
                    <p class="text-sm text-slate-400 mb-4">Try a different scent (rephrase your query) or check if your bookmarks need a refresh.</p>
                    <button id="quickRefreshBtn" class="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors duration-150">Re-sniff Bookmarks</button>
                </div>
            `;
            showStatusApp(noResultsHTML, 'info', true);
            // Add event listener for the new button if it exists
            const quickRefresh = document.getElementById('quickRefreshBtn');
            if (quickRefresh) {
                quickRefresh.addEventListener('click', () => {
                    if (isReady) loadBookmarksApp(true); // Force refresh
                });
            }
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
        const result = await chrome.storage.local.get([
            STORAGE_KEYS.SEARCH_PROVIDER,
            STORAGE_KEYS.GROQ_API_KEY,
            STORAGE_KEYS.HF_API_KEY,
            STORAGE_KEYS.OLLAMA_MODEL
        ]);

        const provider = result[STORAGE_KEYS.SEARCH_PROVIDER] || 'groq'; // Default to groq
        if (searchProviderSelect) {
            searchProviderSelect.value = provider;
            searchProviderSelect.classList.add('provider-active'); // Emphasize the loaded provider
        }
        if (settingsGroqApiKeyInput) {
            settingsGroqApiKeyInput.value = result[STORAGE_KEYS.GROQ_API_KEY] || '';
            settingsGroqApiKeyInput.type = 'password'; 
        }
        if (settingsHfApiKeyInput) {
            settingsHfApiKeyInput.value = result[STORAGE_KEYS.HF_API_KEY] || '';
            settingsHfApiKeyInput.type = 'password';
        }
        if (settingsOllamaModelInput) settingsOllamaModelInput.value = result[STORAGE_KEYS.OLLAMA_MODEL] || 'mistral';

        updateVisibleSettings(provider); // Show/hide based on loaded provider

    } catch (error) {
        console.error("Error loading settings:", error);
        showToast("Error loading settings.", true);
    }
}

/** Updates which provider-specific settings are visible */
function updateVisibleSettings(provider) {
    if (!groqSettingsDiv || !hfSettingsDiv || !ollamaSettingsDiv) return;

    groqSettingsDiv.classList.add('hidden');
    hfSettingsDiv.classList.add('hidden');
    ollamaSettingsDiv.classList.add('hidden');

    if (provider === 'groq') {
        groqSettingsDiv.classList.remove('hidden');
    } else if (provider === 'hf') {
        hfSettingsDiv.classList.remove('hidden');
    } else if (provider === 'ollama') {
        ollamaSettingsDiv.classList.remove('hidden');
    }
}

/** Toggles visibility of an API key input field */
function toggleGenericKeyVisibility(inputElement) {
    if (!inputElement) return;
    const currentType = inputElement.type;
    inputElement.type = currentType === 'password' ? 'text' : 'password';
    // TODO: Consider changing SVG icon for eye slash/open if desired
}

/** Clears the bookmark cache */
async function clearBookmarkCache() {
    try {
        await chrome.storage.local.remove([BOOKMARKS_STORAGE_KEY, BOOKMARKS_TIMESTAMP_KEY]);
        allBookmarks = []; // Clear in-memory cache too
        console.log("Bookmark cache cleared.");
        showToast("Bookmark cache cleared!");
    } catch (error) {
        console.error("Error clearing cache:", error);
        showToast("Failed to clear cache.", true);
    }
}

/** Tests Ollama Connection */
async function testOllamaConnectionUI() {
    if (!settingsOllamaModelInput || !ollamaTestResultMsg || !testOllamaBtn) return;
    const modelName = settingsOllamaModelInput.value.trim();
    if (!modelName) {
        ollamaTestResultMsg.textContent = "Please enter a model name.";
        ollamaTestResultMsg.className = 'text-xs text-yellow-400 mt-1 text-center';
        return;
    }

    testOllamaBtn.disabled = true;
    testOllamaBtn.textContent = 'Testing...';
    ollamaTestResultMsg.textContent = "Pinging local Ollama...";
    ollamaTestResultMsg.className = 'text-xs text-slate-400 mt-1 text-center';

    try {
        // Ensure query.js's testOllamaConnection is available
        if (typeof testOllamaConnection !== 'function') {
            throw new Error("testOllamaConnection function not found. Is query.js loaded?");
        }
        const { success, message } = await testOllamaConnection(modelName);
        if (success) {
            ollamaTestResultMsg.textContent = message || "Connection successful!";
            ollamaTestResultMsg.className = 'text-xs text-green-400 mt-1 text-center';
        } else {
            ollamaTestResultMsg.textContent = message || "Connection failed. See console.";
            ollamaTestResultMsg.className = 'text-xs text-red-400 mt-1 text-center';
        }
    } catch (error) {
        console.error("Ollama test UI error:", error);
        ollamaTestResultMsg.textContent = `Error: ${error.message}`;
        ollamaTestResultMsg.className = 'text-xs text-red-400 mt-1 text-center';
    } finally {
        testOllamaBtn.disabled = false;
        testOllamaBtn.textContent = 'Test Ollama Connection';
    }
}

/** Saves all settings */
async function saveSettings() {
    if (!searchProviderSelect || !settingsGroqApiKeyInput || !settingsHfApiKeyInput || !settingsOllamaModelInput || !saveSettingsBtn) return;

    const selectedProvider = searchProviderSelect.value;
    const groqKey = settingsGroqApiKeyInput.value.trim();
    const hfKey = settingsHfApiKeyInput.value.trim();
    const ollamaModel = settingsOllamaModelInput.value.trim();

    // Validation
    if (selectedProvider === 'groq' && (!groqKey || !groqKey.startsWith('gsk_'))) {
        showToast("Invalid Groq API key format (must start with gsk_).", true);
        settingsGroqApiKeyInput.focus();
        return;
    }
    if (selectedProvider === 'hf' && hfKey && !hfKey.startsWith('hf_')) {
        showToast("Invalid Hugging Face API key format (should start with hf_).", true);
        settingsHfApiKeyInput.focus();
        return;
    }
    if (selectedProvider === 'ollama' && !ollamaModel) {
        showToast("Ollama model name cannot be empty.", true);
        settingsOllamaModelInput.focus();
        return;
    }

    saveSettingsBtn.textContent = 'Saving...';
    saveSettingsBtn.disabled = true;

    try {
        await chrome.storage.local.set({
            [STORAGE_KEYS.SEARCH_PROVIDER]: selectedProvider,
            [STORAGE_KEYS.GROQ_API_KEY]: groqKey,
            [STORAGE_KEYS.HF_API_KEY]: hfKey,
            [STORAGE_KEYS.OLLAMA_MODEL]: ollamaModel
        });
        console.log('Settings saved:', { provider: selectedProvider, groqKey: groqKey ? 'set' : 'not set', hfKey: hfKey ? 'set' : 'not set', ollamaModel });
        
        if(searchProviderSelect) searchProviderSelect.classList.add('provider-active'); // Re-apply emphasis after save

        saveSettingsBtn.textContent = 'Saved!';
        setTimeout(() => {
            saveSettingsBtn.textContent = 'Save Settings';
            saveSettingsBtn.disabled = false;
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
    toast.className = 'toast-notification'; // Base class is in CSS
    if (isError) {
        toast.classList.add('toast-error');
    } else {
        toast.classList.add('toast-success');
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

// Settings specific listeners
if (searchProviderSelect) {
    searchProviderSelect.addEventListener('change', (event) => {
        updateVisibleSettings(event.target.value);
    });
}
if (toggleGroqKeyVisibilityBtn && settingsGroqApiKeyInput) {
    toggleGroqKeyVisibilityBtn.addEventListener('click', () => toggleGenericKeyVisibility(settingsGroqApiKeyInput));
}
if (toggleHfKeyVisibilityBtn && settingsHfApiKeyInput) {
    toggleHfKeyVisibilityBtn.addEventListener('click', () => toggleGenericKeyVisibility(settingsHfApiKeyInput));
}
if (testOllamaBtn) {
    testOllamaBtn.addEventListener('click', testOllamaConnectionUI);
}

if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', clearBookmarkCache);
}
if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveSettings);
}