// query.js - Handles interaction with AI APIs (Groq, HF, Ollama) for searching.

// --- Configuration ---
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama3-8b-8192'; // Or 'mixtral-8x7b-32768'
const MAX_BOOKMARKS_IN_PROMPT = 100; // Limit bookmarks sent to Groq to avoid exceeding context

const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/paraphrase-MiniLM-L6-v2';

const OLLAMA_API_URL = 'http://localhost:11434/api/embeddings';

// --- Helper Functions ---

/**
 * Retrieves settings (API keys, provider choice) from storage.
 * @returns {Promise<Object>} Object containing settings.
 */
async function getSettings() {
    const defaultSettings = {
        searchProvider: 'groq',
        groqApiKey: null,
        hfApiKey: null,
        ollamaModel: 'mistral', // Default local model
    };
    try {
        const result = await chrome.storage.local.get(Object.keys(defaultSettings));
        // Ensure all keys exist, even if not previously saved
        return { ...defaultSettings, ...result };
    } catch (error) {
        console.error("Error getting settings:", error);
        return defaultSettings;
    }
}

// --- Search Strategies ---

/**
 * Searches bookmarks using the Groq API (LLM-based ranking).
 * @param {string} query - The user's search query.
 * @param {Array<Object>} bookmarks - The list of bookmark objects.
 * @param {string} apiKey - The Groq API key.
 * @returns {Promise<Array<Object>>} A promise that resolves with ranked bookmark objects.
 */
async function searchWithGroq(query, bookmarks, apiKey) {
    if (!apiKey) {
        throw new Error("Groq API key is missing. Please configure it in settings.");
    }
    if (!bookmarks || bookmarks.length === 0) {
        return [];
    }

    // Prepare bookmarks context for the prompt, limiting the number
    const bookmarksForPrompt = bookmarks.slice(0, MAX_BOOKMARKS_IN_PROMPT);
    const bookmarkListString = bookmarksForPrompt
        .map((bm, index) => `${index}: ${bm.context}`) // Send index and context
        .join('\n');

    const systemPrompt = `You are an AI assistant helping a user find relevant bookmarks.
The user has provided a query and a list of their bookmarks with indices and context (Title, URL, Path).
Your task is to identify the indices of the bookmarks most relevant to the user's query.
Consider the semantic meaning of the query and the bookmark context.
Respond ONLY with a comma-separated list of the indices of the top 5 most relevant bookmarks, ordered from most relevant to least relevant.
Example response: '3, 1, 5, 0, 2'
If no bookmarks are relevant, respond with an empty string or 'NONE'.`;

    const userPrompt = `User Query: "${query}"

Bookmarks List:
${bookmarkListString}

Identify the top 5 relevant bookmark indices based on the query. Respond only with the comma-separated indices.`;

    try {
        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1, // Lower temperature for more deterministic ranking
                max_tokens: 50, // Enough for indices list
            })
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({})); // Try to get error details
             console.error("Groq API Error Response:", errorData);
             throw new Error(`Groq API request failed: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        const llmResponse = data.choices[0]?.message?.content?.trim();

        if (!llmResponse || llmResponse.toUpperCase() === 'NONE') {
            return []; // No relevant bookmarks found
        }

        // Parse the comma-separated indices
        const indices = llmResponse.split(',')
                                   .map(idx => parseInt(idx.trim(), 10))
                                   .filter(idx => !isNaN(idx) && idx >= 0 && idx < bookmarksForPrompt.length); // Validate indices

        // Retrieve the actual bookmark objects based on the ranked indices
        const rankedBookmarks = indices.map(index => bookmarksForPrompt[index]).filter(Boolean); // Filter out any potential nulls

        return rankedBookmarks;

    } catch (error) {
        console.error("Error searching with Groq:", error);
        throw new Error(`Failed to search with Groq: ${error.message}`);
    }
}


/**
 * Gets embeddings for a list of texts using Hugging Face Inference API.
 * @param {Array<string>} texts - Array of strings to embed.
 * @param {string|null} apiKey - Optional Hugging Face API key.
 * @returns {Promise<Array<Array<number>>>} A promise resolving to an array of embeddings.
 */
async function getHfEmbeddings(texts, apiKey = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
        const response = await fetch(HF_API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }) // wait_for_model helps with cold starts
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("HF API Error:", response.status, errorText);
            throw new Error(`Hugging Face API request failed: ${response.status}. ${errorText}`);
        }

        const embeddings = await response.json();
        if (!Array.isArray(embeddings) || (embeddings.length > 0 && !Array.isArray(embeddings[0]))) {
             console.error("Unexpected HF embedding format:", embeddings);
             throw new Error("Received unexpected embedding format from Hugging Face API.");
        }
        // Ensure returned structure matches expectations (sometimes it returns nested arrays)
        if (embeddings.length === texts.length && Array.isArray(embeddings[0]) && Array.isArray(embeddings[0][0])) {
            // Handle cases where it returns [[embedding1], [embedding2], ...]
            return embeddings.map(e => e[0]);
        }
        return embeddings;

    } catch (error) {
        console.error("Error getting HF embeddings:", error);
        throw new Error(`Failed to get Hugging Face embeddings: ${error.message}`);
    }
}


/**
 * Gets embeddings using a local Ollama instance.
 * @param {Array<string>} texts - Array of strings to embed.
 * @param {string} modelName - The name of the Ollama model to use.
 * @returns {Promise<Array<Array<number>>>} A promise resolving to an array of embeddings.
 */
async function getOllamaEmbeddings(texts, modelName) {
    if (!modelName) {
         throw new Error("Ollama model name is not configured.");
    }
    try {
        // Ollama processes one embedding at a time via API usually
        const embeddings = [];
        for (const text of texts) {
            const response = await fetch(OLLAMA_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: modelName, prompt: text })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Ollama API Error:", response.status, errorText);
                throw new Error(`Ollama API request failed for model ${modelName}: ${response.status}. ${errorText}`);
            }
            const data = await response.json();
            if (!data.embedding || !Array.isArray(data.embedding)) {
                 console.error("Unexpected Ollama embedding format:", data);
                 throw new Error("Received unexpected embedding format from Ollama.");
            }
            embeddings.push(data.embedding);
        }
        return embeddings;
    } catch (error) {
        console.error("Error getting Ollama embeddings:", error);
        // Provide helpful message if connection failed
        if (error instanceof TypeError && error.message.includes('fetch')) {
             throw new Error(`Failed to connect to Ollama at ${OLLAMA_API_URL}. Is Ollama running with model '${modelName}'?`);
        }
        throw new Error(`Failed to get Ollama embeddings: ${error.message}`);
    }
}

/**
 * Searches bookmarks using embedding similarity (HF or Ollama).
 * @param {string} query - The user's search query.
 * @param {Array<Object>} bookmarks - The list of bookmark objects.
 * @param {string} provider - 'hf' or 'ollama'.
 * @param {Object} settings - The extension settings object.
 * @returns {Promise<Array<Object>>} A promise that resolves with ranked bookmark objects.
 */
async function searchWithEmbeddings(query, bookmarks, provider, settings) {
    if (!bookmarks || bookmarks.length === 0) return [];

    const bookmarkContexts = bookmarks.map(bm => bm.context);
    const textsToEmbed = [query, ...bookmarkContexts]; // Embed query and contexts together

    let embeddings;
    try {
        if (provider === 'hf') {
            embeddings = await getHfEmbeddings(textsToEmbed, settings.hfApiKey);
        } else if (provider === 'ollama') {
            embeddings = await getOllamaEmbeddings(textsToEmbed, settings.ollamaModel);
        } else {
            throw new Error("Invalid embedding provider specified.");
        }

        if (!embeddings || embeddings.length !== textsToEmbed.length) {
             throw new Error("Mismatch between number of texts and embeddings received.");
        }

    } catch (error) {
         // Propagate specific errors (like connection refused for Ollama)
         throw error;
    }


    const queryEmbedding = embeddings[0];
    const bookmarkEmbeddings = embeddings.slice(1);

    // Calculate cosine similarity
    const similarities = bookmarkEmbeddings.map((bmEmbedding, index) => {
        if (!bmEmbedding) {
             console.warn(`Missing embedding for bookmark index ${index}`);
             return { index, score: -1 }; // Handle potential missing embeddings
        }
        return {
            index: index,
            score: cosineSimilarity(queryEmbedding, bmEmbedding)
        };
    });

    // Sort by similarity score (descending)
    similarities.sort((a, b) => b.score - a.score);

    // Get top 5 results
    const topResults = similarities.slice(0, 5)
                                  .filter(sim => sim.score > 0.3) // Optional: Add a similarity threshold
                                  .map(sim => bookmarks[sim.index]);

    return topResults;
}


// --- Main Search Function ---

/**
 * Performs the bookmark search based on the configured provider.
 * @param {string} query - The user's search query.
 * @param {Array<Object>} bookmarks - The list of bookmark objects.
 * @returns {Promise<Array<Object>>} A promise resolving with the search results.
 */
async function searchBookmarks(query, bookmarks) {
    if (!query || query.trim().length < 3) { // Basic query validation
        return { results: [], message: "Please enter a longer search query." };
    }

    const settings = await getSettings();
    const provider = settings.searchProvider;

    console.log(`Searching with provider: ${provider}`);

    try {
        let results = [];
        if (provider === 'groq') {
            results = await searchWithGroq(query, bookmarks, settings.groqApiKey);
        } else if (provider === 'hf' || provider === 'ollama') {
            results = await searchWithEmbeddings(query, bookmarks, provider, settings);
        } else {
            throw new Error("Invalid search provider configured.");
        }
         return { results, message: results.length === 0 ? "No relevant bookmarks found." : "" };
    } catch (error) {
        console.error(`Error during search with ${provider}:`, error);
        // Provide user-friendly error messages
        let userMessage = `Search failed: ${error.message}`;
        if (error.message.includes("API key is missing")) {
             userMessage = `API key for ${provider.toUpperCase()} is missing. Please configure it in settings.`;
        } else if (error.message.includes("Failed to connect to Ollama")) {
             userMessage = error.message; // Use the specific connection error
        } else if (error.message.includes("401") || error.message.includes("Unauthorized")) {
             userMessage = `Invalid API key for ${provider.toUpperCase()}. Please check your key in settings.`;
        } else if (error.message.includes("rate limit")) {
             userMessage = `API rate limit exceeded for ${provider.toUpperCase()}. Please try again later or check your plan.`;
        }
         return { results: [], message: userMessage };
    }
}

/**
 * Tests the connection to the Ollama API endpoint.
 * @param {string} modelName - The model to check for.
 * @returns {Promise<boolean>} True if connection and model are okay, false otherwise.
 */
async function testOllamaConnection(modelName) {
     if (!modelName) return { success: false, message: "Model name is empty." };
     try {
        // Use the /api/tags endpoint to check if the model exists locally
        const response = await fetch('http://localhost:11434/api/tags');
         if (!response.ok) {
             throw new Error(`Failed to reach Ollama server at http://localhost:11434. Status: ${response.status}`);
         }
         const data = await response.json();
         const modelExists = data.models?.some(m => m.name.startsWith(modelName + ':')); // Check if base model name exists

         if (!modelExists) {
             throw new Error(`Model '${modelName}' not found in Ollama. Run 'ollama pull ${modelName}' or 'ollama run ${modelName}'.`);
         }
         return { success: true, message: `Ollama connection successful. Model '${modelName}' found.` };
     } catch (error) {
         console.error("Ollama connection test failed:", error);
         return { success: false, message: `Ollama test failed: ${error.message}` };
     }
 }