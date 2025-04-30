# 🚀 **FetchMark: AI-Powered Smart Bookmark Retrieval**

---

## 🌟 Product Vision

**FetchMark** is a minimalist, lightning-fast **Chrome extension** that intelligently resurfaces your forgotten bookmarks using **natural language queries and LLM-powered context matching**.  
Instead of manually searching folders or typing exact URLs, just ask:

> “Where did I save that article about GraphQL vs REST?”  
> → FetchMark finds it instantly.

**Think of it as:**  
📁 Bookmarks × 🧠 Brain × 🤖 AI

---

## 🧠 Core Value Proposition

- 📌 **Zero-effort Bookmark Recall** — Stop remembering where you saved something.
- 🗂️ **Semantic Search** — Search based on *meaning*, not exact titles or folders.
- ⚡ **Instant Access** — Resurface relevant links in milliseconds.
- 🛡️ **Private by Default** — All processing is local or user-authorized.
- 🧩 **Fits Your Flow** — Seamlessly sits in Chrome, right where your browsing happens.

---

## 🎯 Target Users

- Power users drowning in bookmarks.
- Researchers, developers, students, or readers who save 100s of articles but rarely find them again.
- Privacy-conscious users who don’t want cloud bookmark managers.

---

## 🔧 Tech Stack Overview

| Layer | Tech |
|--|--|
| **Frontend** | HTML/CSS (Tailwind for fast styling), Vanilla JS or React (if desired) |
| **Extension APIs** | `chrome.bookmarks`, `chrome.storage`, `chrome.runtime` |
| **LLM Interaction** | Option 1: API-based (e.g., Groq, OpenRouter)<br>Option 2: Local model (e.g., Ollama with MiniLM or Mistral) |
| **Embedding & Matching** | SentenceTransformer (server-side) or local JS vector search (e.g. cosine sim) |
| **Storage** | Local JSON cache or `chrome.storage.local` for bookmark contexts |
| **Optional Future** | Supabase or Firebase for cross-device sync (phase 2) |

---

## 🧪 MVP (Minimum Viable Product)

### ✅ Features

- [x] Import bookmarks via `chrome.bookmarks` API
- [x] Build a context object for each bookmark:
  - Title
  - URL
  - Folder path
  - Description (optional)
- [x] UI popup with a search bar
- [x] On query, send data to LLM / embedding search
- [x] Return top 3–5 results (ranked by relevance)
- [x] Click to open in a new tab

### 🟨 Stretch Goals

- [ ] Allow user to re-index bookmarks manually
- [ ] Add simple tagging system
- [ ] Star/favorite frequent bookmarks
- [ ] Work offline using local embedding model

---

## 🧱 Folder & File Structure

```
fetchmark/
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
├── background.js
├── bookmarks.js (handles ingestion)
├── query.js (handles matching/LLM)
├── assets/
│   └── logo.png
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
```

---

## 🎨 UI/UX & Visual Branding

### 🖌️ Visual Style
- **Dark/light mode toggle**
- Rounded, elegant UI with glassmorphism or soft shadows
- **TailwindCSS** for fast design
- Minimalist, AI-enhanced, clean font (e.g., Inter, JetBrains Mono)

### 📦 Popup Design (Rough Sketch)

```plaintext
+--------------------------------------+
| 🐾 FetchMark                         |
| "Find your saved link..." [ Search ]|
+--------------------------------------+
| Results:                            |
| 🔗 GraphQL vs REST – dev.to         |
| Folder: Dev Articles > APIs         |
| [Open]                              |
|                                      |
| 🔗 Flask REST API – realpython.com   |
| Folder: Web Dev > Python            |
| [Open]                              |
+--------------------------------------+
```

---

## 🪜 How to Get Started

### 1. **Set up Extension Manifest**
Create a `manifest.json` with permissions for bookmarks, storage, and popup.

### 2. **Build Bookmark Parser**
Use `chrome.bookmarks.getTree()` to extract and flatten the tree into searchable entries.

### 3. **Contextual Representation**
Generate structured data per bookmark:
```js
{
  id: "344",
  title: "GraphQL vs REST",
  url: "https://dev.to/graphql-vs-rest",
  path: "Dev Articles > APIs"
}
```

Store in `chrome.storage.local`.

### 4. **Add UI**
Simple popup with:
- Search bar
- Result list
- Loading animation

### 5. **Add LLM Integration**
- Option 1: Use Groq or OpenRouter API to send user query + contexts and get a ranked list
- Option 2: Use `all-MiniLM-L6-v2` or similar embedding model + cosine similarity search (local or server)

### 6. **Display Matching Bookmarks**
Display sorted results with quick links. Support multiple tabs.

---

## 🧱 Branding Assets (Concept)

- **Name**: FetchMark
- **Tagline**: “Just ask — your bookmarks remember.”
- **Logo idea**: 🐾 A cute pawprint + a bookmark icon
- **Color palette**:
  - Midnight blue background
  - Neon cyan accents
  - Soft white cards
  - Rounded corners everywhere

Would you like me to generate a **logo and UI preview** image in this style?

---

## 🌐 Future Roadmap

| Feature | Goal |
|--|--|
| 🔄 Sync Across Devices | Optional login to sync bookmarks + queries |
| 🧠 On-device Embeddings | Reduce dependency on external APIs |
| 🗣️ Voice Input | Speak your query (using Web Speech API) |
| ⏱️ Query History | Resurface common searches |
| 📊 Analytics | Show which bookmarks you use the most |

---