// Shannon entropy calculation for detecting high-entropy strings (potential secrets)

/**
 * Calculate Shannon entropy of a string
 * @param {string} str - The string to analyze
 * @returns {number} - Entropy value (higher = more random/suspicious)
 */
function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;

  const freq = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in freq) {
    const p = freq[char] / str.length;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Check if a string has suspiciously high entropy
 * @param {string} str - The string to check
 * @param {number} threshold - Entropy threshold (default: 4.5)
 * @returns {boolean} - True if entropy exceeds threshold
 */
function isHighEntropy(str, threshold = 4.5) {
  if (!str || str.length < 16) return false;
  
  const entropy = calculateEntropy(str);
  return entropy > threshold;
}

/**
 * Find high-entropy strings in text
 * @param {string} text - The text to scan
 * @param {number} threshold - Entropy threshold
 * @returns {Array} - Array of high-entropy strings found
 */
function findHighEntropyStrings(text, threshold = 4.5) {
  const results = [];
  const words = text.match(/[a-zA-Z0-9_-]{16,}/g) || [];
  
  for (const word of words) {
    if (isHighEntropy(word, threshold)) {
      results.push({
        string: word,
        entropy: calculateEntropy(word),
        length: word.length
      });
    }
  }
  
  return results;
}

module.exports = {
  calculateEntropy,
  isHighEntropy,
  findHighEntropyStrings
};
