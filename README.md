# FetchMark 🐾 (DEVELOPMENT IN PROGRESS)

**Tagline:** "Just ask — your bookmarks remember."

FetchMark is a free, AI-powered Chrome Extension that helps you search and retrieve your saved bookmarks using natural language queries. Instead of remembering exact titles or folder structures, simply ask FetchMark what you're looking for, and it uses AI (like Llama 3 via Groq or local models via Ollama) to find the most relevant bookmarks semantically.

**Features:**

*   🧠 **Semantic Search:** Find bookmarks based on *meaning*, not just keywords.
*   🗣️ **Natural Language:** Use everyday language for your queries.
*   ⚡ **Fast & Free AI:** Powered by free tiers of Groq (Llama 3, Mixtral) and optional Hugging Face embeddings.
*   🏡 **Local & Private:** Supports offline search using local models via Ollama.
*   🔒 **Privacy First:** Your bookmarks and API keys are stored locally. No data is sent without your explicit action (performing a search).
*   🔄 **Easy Refresh:** Quickly update the bookmark cache with a single click.
*   ✨ **Minimalist UI:** Clean, simple interface using Tailwind CSS.

---

## 🚀 Installation & Setup

### 1. Local Development

1.  **Download:** Download the `fetchmark` folder containing all the files (`manifest.json`, `popup.html`, etc.).
2.  **Open Chrome Extensions:** Navigate to `chrome://extensions` in your Chrome browser.
3.  **Enable Developer Mode:** Toggle the "Developer mode" switch, usually found in the top-right corner.
4.  **Load Unpacked:** Click the "Load unpacked" button.
5.  **Select Folder:** Select the `fetchmark` folder you downloaded.
6.  **Pin Extension:** Find FetchMark in your extensions list and click the pin icon to add it to your toolbar for easy access.

### 2. Configuration (API Keys & Provider)

FetchMark needs an AI backend to perform semantic search. You can choose between Groq (recommended, cloud-based, free), Hugging Face (cloud-based, free), or Ollama (local/offline).

1.  **Click the FetchMark icon** in your toolbar.
2.  **Click the Settings icon** (⚙️) in the popup.
3.  **Choose a Search Provider:**
    *   **Groq (Recommended):**
        *   Select "Groq" from the dropdown.
        *   **Get API Key:** Go to [https://console.groq.com/keys](https://console.groq.com/keys), sign up for a free account, and create a new API key.
        *   **Enter Key:** Paste the Groq API key (starts with `gsk_`) into the "Groq API Key" field.
    *   **Hugging Face:**
        *   Select "Hugging Face" from the dropdown.
        *   The extension uses the public inference endpoint by default.
        *   **Optional API Key:** For potentially higher rate limits, get a free API token from [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (create a "Read" token) and paste it into the "Hugging Face API Key" field.
    *   **Ollama (Local/Offline):**
        *   Select "Ollama" from the dropdown.
        *   **Install Ollama:** Follow the instructions at [https://ollama.ai/](https://ollama.ai/) to install Ollama on your computer.
        *   **Download a Model:** Open your terminal/command prompt and run `ollama pull mistral` or `ollama pull minilm` (or another embedding model supported by Ollama). Ensure the model name matches the one in the FetchMark settings (default is `mistral`).
        *   **Ensure Ollama is Running:** The Ollama application or background service must be running for FetchMark to connect.
        *   **Test Connection:** Click the "Test Connection" button in FetchMark settings to verify it can reach your local Ollama instance and find the model.
4.  **Save Settings:** Click "Save Settings".

---

## 🛠️ Usage

1.  **Click the FetchMark icon** in your toolbar.
2.  **Type your query** into the search box (e.g., "articles about vector databases", "recipe for sourdough bread", "that cool web design tool I saved").
3.  **Wait for results:** FetchMark will process your query using the configured AI provider and display the top 3-5 most relevant bookmarks.
4.  **Click a result:** Click on the bookmark title or the result card to open the link in a new tab.
5.  **Refresh Bookmarks:** If you've added/removed many bookmarks, click the Refresh icon (🔄) to update FetchMark's cache.

---

## 🛡️ Privacy & Security

*   **Local Storage:** Your bookmarks are processed and cached entirely within your browser's local storage (`chrome.storage.local`). They are *not* sent to any third-party server *except* when you perform a search.
*   **API Keys:** Your API keys (Groq, Hugging Face) are stored securely in `chrome.storage.local`. They are only sent directly to the respective API provider (Groq or Hugging Face) when you initiate a search using that provider.
*   **Search Queries & Context:** When using Groq or Hugging Face, your search query and the *context* (title, URL, path) of a limited subset of your bookmarks are sent to the API to find relevant matches. When using Ollama, this data is sent only to your local Ollama instance.
*   **No Tracking:** FetchMark does not collect telemetry, analytics, or any personal user data.
*   **Limited Permissions:** The extension only requests necessary permissions:
    *   `bookmarks`: To read your bookmarks.
    *   `storage`: To save settings, API keys, and the bookmark cache locally.
    *   `activeTab`: Used minimally, primarily part of standard extension boilerplate but could be used for context-aware features in the future (not currently implemented).
    *   `host_permissions`: Required to allow the extension to make requests to the specified API endpoints (Groq, HF, Ollama on localhost).

---

## 🧪 Testing & Debugging

*   **Check Console Logs:** Right-click the FetchMark popup, select "Inspect", and open the "Console" tab to see logs, status messages, and potential errors.
*   **Verify API Keys:** Double-check that API keys are correctly pasted and saved. Test keys directly on the provider's website if needed.
*   **Test Ollama:** Use the "Test Connection" button in settings. Ensure Ollama is running (`ollama list` in terminal) and the correct model is downloaded and specified. Check for firewall issues blocking `localhost:11434`.
*   **Clear Storage:** Go to `chrome://extensions`, find FetchMark, click "Details", then "Service worker", then navigate to the "Application" tab -> Storage -> Local Storage, right-click and clear if you suspect corrupted data (this will remove saved keys and cache).

---

## 🚀 Chrome Web Store Deployment (Optional - For Developers)

FetchMark is designed to be free. If you wish to publish your own version or contribute:

1.  **Developer Account:** Sign up for a Chrome Web Store developer account at [chromewebstore.google.com/dev](https://chromewebstore.google.com/dev). There's a one-time $5 registration fee.
2.  **Create Icons:** Ensure you have the required icon sizes (`16x16`, `48x48`, `128x128`) in the `assets` folder. The provided `logo.svg` is a placeholder.
3.  **Prepare Zip:** Create a zip file containing *only* the contents of the `fetchmark` folder (manifest.json, popup.html, etc., assets folder), not the `fetchmark` folder itself.
4.  **Upload:** In the developer dashboard, click "Add new item", upload your zip file.
5.  **Fill Listing Details:**
    *   **Name:** FetchMark (or your fork's name)
    *   **Description:** Provide a clear description. You can use: "FetchMark helps you find bookmarks using AI-powered semantic search. Query your bookmarks with natural language using free models like Llama 3 (via Groq) or local models (via Ollama). Privacy-focused and free."
    *   **Icons:** Upload your 128x128 icon.
    *   **Screenshots:** Create clear screenshots (at least 1, ideally 1280x800 or 640x400) showcasing the popup UI, search, results, and settings.
    *   **Category:** Productivity
    *   **Privacy Practices:** Be transparent. State that user data (bookmarks, API keys) is stored locally. Explain that search queries and bookmark contexts are sent to the selected AI provider (Groq, HF, or local Ollama) *only* during search operations. Explicitly state you do not collect or share user data otherwise. Link to a simple privacy policy if possible (e.g., a GitHub Gist).
6.  **Submit for Review:** Submit the extension for review by Google. This usually takes a few days.

---

Enjoy using FetchMark!