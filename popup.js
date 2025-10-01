document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const buttonContainer = document.getElementById('button-container');

    const checkConnection = () => {
        statusDiv.textContent = 'Connecting...';
        statusDiv.className = 'status-checking';
        
        chrome.runtime.sendMessage({ action: "checkStatus" }, (response) => {
            if (chrome.runtime.lastError) {
                statusDiv.textContent = 'Error connecting';
                statusDiv.className = 'status-offline';
                buttonContainer.style.display = 'none';
                return;
            }
            if (response && response.status === 'online') {
                statusDiv.textContent = 'Ollama is Online';
                statusDiv.className = 'status-online';
                buttonContainer.style.display = 'block';
            } else {
                statusDiv.textContent = 'Ollama is Offline';
                statusDiv.className = 'status-offline';
                buttonContainer.style.display = 'none';
            }
        });
    };
    checkConnection();

    document.querySelectorAll('#button-container button').forEach(button => {
        button.addEventListener('click', (event) => {
            handleButtonClick(event.target.id);
        });
    });

    async function handleButtonClick(buttonId) {
        document.querySelectorAll('button').forEach(btn => btn.disabled = true);
        statusDiv.textContent = 'Working...';

        let task = '';
        if (buttonId === 'correctBtn') task = 'correct';
        if (buttonId === 'rephraseBtn') task = 'rephrase';
        if (buttonId === 'promptBtn') task = 'prompt';

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { action: "getText" }, (response) => {
            if (chrome.runtime.lastError || !response || !response.text) {
                statusDiv.textContent = 'No text field focused.';
                document.querySelectorAll('button').forEach(btn => btn.disabled = false);
                return;
            }
            
            chrome.runtime.sendMessage({ action: "processText", text: response.text, task: task }, 
            (correctionResponse) => {
                if (correctionResponse && correctionResponse.success) {
                    chrome.tabs.sendMessage(tab.id, { action: "setText", text: correctionResponse.processedText });
                    statusDiv.textContent = 'Done!';
                    setTimeout(() => window.close(), 1200);
                } else {
                    statusDiv.textContent = `Error: ${correctionResponse ? correctionResponse.error : 'Unknown'}`;
                    document.querySelectorAll('button').forEach(btn => btn.disabled = false);
                }
            });
        });
    }
});