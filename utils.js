// utils.js - Utility functions like cosine similarity.

/**
 * Calculates the dot product of two vectors.
 * @param {Array<number>} vecA - The first vector.
 * @param {Array<number>} vecB - The second vector.
 * @returns {number} The dot product.
 * @throws {Error} If vectors have different lengths or are empty.
 */
function dotProduct(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
        // console.error("Invalid vectors for dot product:", vecA, vecB);
        throw new Error("Vectors must be non-empty and have the same length for dot product.");
    }
    let product = 0;
    for (let i = 0; i < vecA.length; i++) {
        product += vecA[i] * vecB[i];
    }
    return product;
}

/**
 * Calculates the magnitude (Euclidean norm) of a vector.
 * @param {Array<number>} vec - The vector.
 * @returns {number} The magnitude.
 * @throws {Error} If vector is empty.
 */
function magnitude(vec) {
     if (!vec || vec.length === 0) {
         // console.error("Invalid vector for magnitude:", vec);
         throw new Error("Vector must be non-empty for magnitude calculation.");
     }
    let sumOfSquares = 0;
    for (let i = 0; i < vec.length; i++) {
        sumOfSquares += vec[i] * vec[i];
    }
    return Math.sqrt(sumOfSquares);
}

/**
 * Calculates the cosine similarity between two vectors.
 * Ranges from -1 (exactly opposite) to 1 (exactly the same).
 * @param {Array<number>} vecA - The first vector.
 * @param {Array<number>} vecB - The second vector.
 * @returns {number} The cosine similarity, or 0 if magnitude is zero or error occurs.
 */
function cosineSimilarity(vecA, vecB) {
    try {
        const magA = magnitude(vecA);
        const magB = magnitude(vecB);

        if (magA === 0 || magB === 0) {
            // console.warn("Cannot compute cosine similarity with zero vector(s).");
            return 0; // Handle zero vectors to avoid division by zero
        }

        const dot = dotProduct(vecA, vecB);
        return dot / (magA * magB);

    } catch (error) {
        console.error("Error calculating cosine similarity:", error.message);
        // Don't throw here, just return 0 or a low value
        return 0;
    }
}

/**
 * Debounces a function call.
 * @param {Function} func - The function to debounce.
 * @param {number} wait - The debounce delay in milliseconds.
 * @returns {Function} The debounced function.
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Example Usage:
// const vec1 = [1, 2, 3];
// const vec2 = [4, 5, 6];
// const similarity = cosineSimilarity(vec1, vec2);
// console.log("Cosine Similarity:", similarity); // Should be around 0.9746