function getPromptForTask(task, text) {
  switch (task) {
      case 'rephrase':
          return `Rephrase the following text to be more professional, formal, and clear. Also correct any grammar or spelling mistakes. Provide only the rephrased text as the output.\n\nOriginal text: "${text}"`;
      case 'prompt':
          return `Analyze and improve the following AI prompt to be clearer, more detailed, and more effective for a large language model. Add specific details where needed and structure it for the best possible response. Provide only the improved prompt as the output.\n\nOriginal prompt: "${text}"`;
      case 'correct':
      default:
          return `Correct the following text for grammar and spelling errors. Provide only the corrected text as the output.\n\nOriginal text: "${text}"`;
  }
}

// --- UPDATED FUNCTION ---
function cleanOllamaResponse(responseText) {
  // This regex now includes "Corrected text:" and is more robust.
  const cleaned = responseText
      .replace(/^(Corrected text:|Rephrased text:|Improved prompt:)\s*/gim, '')
      .trim();
  
  // Remove surrounding quotes if they exist ("text" or “text”)
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith('“') && cleaned.endsWith('”'))) {
      return cleaned.substring(1, cleaned.length - 1);
  }
  
  return cleaned;
}

async function callOllama(fullPrompt) {
  const OLLAMA_API_URL = "http://localhost:11434/api/generate";
  try {
      const response = await fetch(OLLAMA_API_URL, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: "gnokit/improve-grammar:latest", prompt: fullPrompt, stream: false }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (data && data.response) {
          // The cleaning function is applied here, so every response is filtered.
          return cleanOllamaResponse(data.response);
      }
      throw new Error("Invalid API response format");
  } catch (error) {
      console.error("Error calling Ollama API:", error);
      throw error;
  }
}

// Listeners for popup messages and status checks
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkStatus") {
      fetch("http://localhost:11434/").then(() => sendResponse({ status: 'online' })).catch(() => sendResponse({ status: 'offline' }));
      return true;
  }
  if (request.action === "processText") {
      const fullPrompt = getPromptForTask(request.task, request.text);
      callOllama(fullPrompt)
          .then(processedText => sendResponse({ success: true, processedText: processedText }))
          .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
  }
});

// Listeners for the right-click context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: "correct-text-ollama", title: "Correct Selection with Ollama", contexts: ["selection"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "correct-text-ollama" && info.selectionText) {
      const fullPrompt = getPromptForTask('correct', info.selectionText);
      callOllama(fullPrompt).then(correctedText => {
          chrome.tabs.sendMessage(tab.id, { action: "replaceSelection", text: correctedText });
      }).catch(error => console.error("Context menu correction failed:", error));
  }
});