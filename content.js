// Debounce function to limit API calls
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

// Simple spell check cache to avoid repeated API calls
const spellCheckCache = new Map();

// Check if text likely contains spelling errors (basic heuristic)
function likelyHasErrors(text) {
  // Skip if too short or too long
  if (text.length < 3 || text.length > 100) return false;

  // Skip URLs, emails, code
  if (text.match(/^https?:\/\/|@|[{}[\]()]/)) return false;

  // Check for common error patterns (doubled letters, unusual patterns)
  return text.match(/(.)\1{2,}|[^aeiou]{5,}/i) !== null;
}

// Call local LLM for spell correction
async function correctSpelling(text) {
  // Check cache first
  if (spellCheckCache.has(text)) {
    return spellCheckCache.get(text);
  }

  try {
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tinyllama",
        prompt: `Fix spelling only. Return ONLY the corrected word, nothing else.\nInput: ${text}\nCorrected:`,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 20,
          top_k: 10,
          top_p: 0.3,
        },
      }),
    });

    if (!response.ok) {
      throw new Error("LLM API error");
    }

    const data = await response.json();
    const corrected = data.response.trim().split(/\s+/)[0]; // Take only first word

    // Cache the result
    spellCheckCache.set(text, corrected);

    // Limit cache size
    if (spellCheckCache.size > 100) {
      const firstKey = spellCheckCache.keys().next().value;
      spellCheckCache.delete(firstKey);
    }

    return corrected;
  } catch (error) {
    console.error("Spell check error:", error);
    return text; // Return original on error
  }
}

// Create and show suggestion popup
function showSuggestion(element, originalText, correctedText, rect) {
  // Remove existing popup
  const existing = document.getElementById("llm-spell-popup");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.id = "llm-spell-popup";
  popup.className = "llm-spell-popup";
  popup.innerHTML = `
    <div class="llm-spell-suggestion">
      <span class="original-text">${originalText}</span>
      <span class="arrow">→</span>
      <span class="corrected-text">${correctedText}</span>
    </div>
    <div class="llm-spell-actions">
      <button class="apply-btn">Apply</button>
      <button class="ignore-btn">Ignore</button>
    </div>
  `;

  // Position popup near the text
  popup.style.position = "absolute";
  popup.style.left = `${rect.left + window.scrollX}px`;
  popup.style.top = `${rect.bottom + window.scrollY + 5}px`;
  popup.style.zIndex = "10000";

  document.body.appendChild(popup);

  // Handle apply button
  popup.querySelector(".apply-btn").addEventListener("click", () => {
    element.value = element.value.replace(originalText, correctedText);
    popup.remove();
  });

  // Handle ignore button
  popup.querySelector(".ignore-btn").addEventListener("click", () => {
    popup.remove();
  });

  // Remove popup when clicking outside
  setTimeout(() => {
    document.addEventListener("click", function closePopup(e) {
      if (!popup.contains(e.target)) {
        popup.remove();
        document.removeEventListener("click", closePopup);
      }
    });
  }, 100);
}

// Handle text input
const handleInput = debounce(async (event) => {
  const element = event.target;
  const text = element.value.trim();

  // Get the last word typed
  const words = text.split(/\s+/);
  const lastWord = words[words.length - 1];

  if (lastWord && likelyHasErrors(lastWord)) {
    const corrected = await correctSpelling(lastWord);

    if (corrected && corrected.toLowerCase() !== lastWord.toLowerCase()) {
      const rect = element.getBoundingClientRect();
      showSuggestion(element, lastWord, corrected, rect);
    }
  }
}, 1000); // Wait 1 second after typing stops

// Attach to all text inputs and textareas
function attachSpellChecker() {
  const inputs = document.querySelectorAll(
    'input[type="text"], textarea, [contenteditable="true"]'
  );

  inputs.forEach((input) => {
    if (!input.dataset.spellCheckerAttached) {
      input.addEventListener("input", handleInput);
      input.dataset.spellCheckerAttached = "true";
    }
  });
}

// Initialize
attachSpellChecker();

// Watch for new inputs added dynamically
const observer = new MutationObserver(() => {
  attachSpellChecker();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

console.log("Local LLM Spell Checker loaded!");
