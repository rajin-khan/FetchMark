// bookmarks.js - Handles fetching, parsing, and storing bookmark data.

const BOOKMARKS_STORAGE_KEY = 'fetchmark_bookmarks_cache';
const BOOKMARKS_TIMESTAMP_KEY = 'fetchmark_bookmarks_timestamp';
const CACHE_DURATION_MS = 15 * 60 * 1000; // Cache bookmarks for 15 minutes

/**
 * Fetches all bookmarks from the Chrome API.
 * @returns {Promise<Array>} A promise that resolves with the bookmark tree nodes.
 */
async function fetchAllBookmarksFromAPI() {
    try {
        // getTree() returns an array, usually with one root node (ID '0')
        const bookmarkTreeNodes = await chrome.bookmarks.getTree();
        console.log("Raw Bookmark Tree:", JSON.stringify(bookmarkTreeNodes)); // Log raw structure
        return bookmarkTreeNodes;
    } catch (error) {
        console.error("Error fetching bookmarks:", error);
        throw new Error("Could not fetch bookmarks from Chrome.");
    }
}

/**
 * Recursively parses the bookmark tree nodes to flatten into a list.
 * This version focuses on capturing everything first.
 * @param {Array} nodes - The bookmark tree nodes to process.
 * @param {Array<string>} pathSegments - Array of folder names leading to the current nodes.
 * @returns {Array<Object>} A flat list of bookmark objects.
 */
function parseBookmarkNodesRecursive(nodes, pathSegments = []) {
    let bookmarks = [];
    if (!nodes || nodes.length === 0) {
        return bookmarks;
    }

    for (const node of nodes) {
        // Check if it's a folder (has children array) vs a bookmark (has url, usually no children)
        const isFolder = node.children && Array.isArray(node.children);
        const hasUrl = node.url;
        const nodeTitle = node.title || 'Untitled';

        // 1. Handle Bookmarks (has URL, is not explicitly a folder with children)
        if (hasUrl && !isFolder) {
             // Basic URL validation
             if (node.url.startsWith('http:') || node.url.startsWith('https:') || node.url.startsWith('ftp:')) {
                 // Create the display path - join segments collected so far
                 // Optionally exclude common top-level names from the *display* path later if needed, but keep full path for context.
                 const displayPath = pathSegments.join(' / ') || 'Root';
                 // Context uses the full path for better AI understanding
                 const contextPath = pathSegments.join(' / ') || 'Root';

                 bookmarks.push({
                    id: node.id,
                    title: nodeTitle,
                    url: node.url,
                    folderPath: displayPath, // Path shown in UI
                    dateAdded: node.dateAdded ? new Date(node.dateAdded).toISOString() : null,
                    // Create context string for searching (using full path)
                    context: `Title: ${nodeTitle} | URL: ${node.url} | Path: ${contextPath}`
                 });
             }
             // Silently ignore javascript:, data:, etc. bookmarks
        }
        // 2. Handle Folders (has children array) - Recurse
        else if (isFolder) {
            // Add the current folder's name to the path for the next level down
            const nextPathSegments = [...pathSegments, nodeTitle];
            // Recursively process children
            bookmarks = bookmarks.concat(parseBookmarkNodesRecursive(node.children, nextPathSegments));
        }
        // 3. Ignore nodes that are neither valid bookmarks nor folders with children
    }
    return bookmarks;
}

/**
 * Stores the parsed bookmarks list and timestamp in local storage.
 * @param {Array<Object>} bookmarks - The flat list of bookmark objects.
 */
async function storeBookmarks(bookmarks) {
    try {
        const dataToStore = {
            [BOOKMARKS_STORAGE_KEY]: bookmarks,
            [BOOKMARKS_TIMESTAMP_KEY]: Date.now()
        };
        await chrome.storage.local.set(dataToStore);
        console.log(`Stored ${bookmarks.length} bookmarks locally.`);
    } catch (error) {
        console.error("Error storing bookmarks:", error);
        if (error.message.includes('QUOTA_BYTES')) {
             throw new Error("Storage quota exceeded. Too many bookmarks? Try removing some.");
        }
         throw new Error("Could not save bookmarks to local storage.");
    }
}

/**
 * Retrieves cached bookmarks from local storage if they are not too old.
 * @returns {Promise<Array<Object>|null>} The cached bookmarks list or null if cache is invalid/expired.
 */
async function getCachedBookmarks() {
    // ... (function remains the same as before) ...
    try {
        const result = await chrome.storage.local.get([BOOKMARKS_STORAGE_KEY, BOOKMARKS_TIMESTAMP_KEY]);
        const cachedBookmarks = result[BOOKMARKS_STORAGE_KEY];
        const cacheTimestamp = result[BOOKMARKS_TIMESTAMP_KEY];

        if (cachedBookmarks && cacheTimestamp) {
            const isCacheValid = (Date.now() - cacheTimestamp) < CACHE_DURATION_MS;
            if (isCacheValid) {
                console.log("Using cached bookmarks.");
                return cachedBookmarks;
            } else {
                console.log("Bookmark cache expired.");
            }
        }
    } catch (error) {
        console.error("Error retrieving cached bookmarks:", error);
    }
    return null;
}


/**
 * Main function to get bookmarks, either from cache or by fetching and parsing.
 * Optionally forces a refresh.
 * @param {boolean} forceRefresh - If true, bypasses cache and fetches fresh data.
 * @returns {Promise<Array<Object>>} The list of bookmark objects.
 */
async function getBookmarks(forceRefresh = false) {
    if (!forceRefresh) {
        const cachedBookmarks = await getCachedBookmarks();
        if (cachedBookmarks) {
            return cachedBookmarks;
        }
    }

    console.log("Fetching fresh bookmarks...");
    const bookmarkTree = await fetchAllBookmarksFromAPI(); // Gets [{ id: '0', children: [...] }]

    // Start parsing from the children of the absolute root node (ID '0')
    // Handle cases where the tree might be empty or malformed
    const rootNodeChildren = bookmarkTree?.[0]?.children;
    if (!rootNodeChildren) {
         console.warn("Bookmark tree root or children not found. Returning empty array.");
         return [];
    }

    const parsedBookmarks = parseBookmarkNodesRecursive(rootNodeChildren); // Start recursion
    console.log("Parsed Bookmarks Sample:", parsedBookmarks.slice(0, 10)); // Log a sample

    await storeBookmarks(parsedBookmarks);
    return parsedBookmarks;
}