// Service worker for the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("Local LLM Spell Checker installed");

  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    model: "tinyllama",
    debounceTime: 1000,
  });
});

// Check if Ollama is running
async function checkOllamaStatus() {
  try {
    const response = await fetch("http://localhost:11434/api/tags");
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Periodic health check
setInterval(async () => {
  const isRunning = await checkOllamaStatus();
  chrome.storage.local.set({ ollamaRunning: isRunning });
}, 30000); // Check every 30 seconds
