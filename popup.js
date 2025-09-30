// Check Ollama status
async function checkStatus() {
  const statusDot = document.getElementById("statusDot");
  const statusText = document.getElementById("statusText");

  try {
    const response = await fetch("http://localhost:11434/api/tags");
    if (response.ok) {
      statusDot.classList.add("active");
      statusText.textContent = "Ollama is running";
    } else {
      statusDot.classList.remove("active");
      statusText.textContent = "Ollama not responding";
    }
  } catch (error) {
    statusDot.classList.remove("active");
    statusText.textContent = "Ollama not running";
  }
}

// Load settings
chrome.storage.sync.get(["enabled"], (result) => {
  document.getElementById("enableToggle").checked = result.enabled !== false;
});

// Save settings
document.getElementById("enableToggle").addEventListener("change", (e) => {
  chrome.storage.sync.set({ enabled: e.target.checked });
});

// Check status on load
checkStatus();

// Refresh status every 5 seconds
setInterval(checkStatus, 5000);
