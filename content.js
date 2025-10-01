// This function expertly replaces only the selected text in any field
function replaceSelectedText(replacementText) {
  const activeElement = document.activeElement;
  if (!activeElement) return;

  // Handle <textarea> and <input>
  if (activeElement.value !== undefined) {
    const start = activeElement.selectionStart;
    const end = activeElement.selectionEnd;
    const originalValue = activeElement.value;
    activeElement.value = originalValue.substring(0, start) + replacementText + originalValue.substring(end);
    
    // Move cursor to the end of the replacement
    activeElement.selectionStart = activeElement.selectionEnd = start + replacementText.length;
  } 
  // Handle contentEditable elements
  else if (activeElement.isContentEditable) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(replacementText);
      range.insertNode(textNode);
      
      // Move cursor to the end of the replacement
      range.setStartAfter(textNode);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  // Dispatch an input event to notify frameworks of the change
  const event = new Event('input', { bubbles: true, cancelable: true });
  activeElement.dispatchEvent(event);
}


// --- Main Message Listener ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const activeElement = document.activeElement;

  if (request.action === "getText") {
    let text = null;
    if (activeElement) {
        // For inputs/textareas, use the selected text if there is any, otherwise use the whole value
        if (activeElement.value !== undefined && activeElement.selectionStart !== activeElement.selectionEnd) {
            text = activeElement.value.substring(activeElement.selectionStart, activeElement.selectionEnd);
        } else if (activeElement.value !== undefined) {
            text = activeElement.value;
        } else if (activeElement.isContentEditable) {
            text = window.getSelection().toString() || activeElement.innerText;
        }
    }
    sendResponse({ text: text });
  }

  if (request.action === "setText") {
    // This is from the popup, which replaces the whole text
    if (activeElement) {
      if (activeElement.value !== undefined) activeElement.value = request.text;
      else if (activeElement.isContentEditable) activeElement.innerText = request.text;
      const event = new Event('input', { bubbles: true, cancelable: true });
      activeElement.dispatchEvent(event);
    }
  }

  if (request.action === "replaceSelection") {
    // This is from the context menu
    replaceSelectedText(request.text);
  }
});