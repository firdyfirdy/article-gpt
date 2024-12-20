const form = document.getElementById('articleForm');
const loadingOverlay = document.getElementById('loadingOverlay');
const outputContainer = document.getElementById('outputContainer');
const apiKeyInput = document.getElementById('apiKey');
const historyTableBody = document.querySelector("#historyTable tbody");

document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['apiKey'], (result) => {
        if (result.apiKey) {
            apiKeyInput.value = result.apiKey; // Pre-fill the API key input
        }
    });

    chrome.storage.local.get(['articleHistory'], (result) => {
        const history = result.articleHistory || [];
        history.forEach(({ keyword, article }) => {
          addHistoryRow(keyword, article);
        });
      });
});

document.getElementById('articleForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // save API key
    chrome.storage.sync.set({ apiKey: apiKeyInput.value });

    // Show loading bar and disable button
    loadingOverlay.style.display = 'flex';
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
  
    try{
        // Gather inputs
        const apiKey = document.getElementById('apiKey').value.trim();
        const keyword = document.getElementById('keyword').value.trim();
        const style = document.getElementById('style').value;
        const language = document.getElementById('language').value;
        const maxWords = parseInt(document.getElementById('maxWords').value, 10);
    
        // Validate inputs
        if (!apiKey || !keyword || !maxWords) {
            alert("All fields are required!");
            return;
        }
    
        const prompt = `You are a content writer for a popular blog within SEO expertise. You know how to write engaging articles that captivate your audience.
        You always start with a catchy header that related with the keyword, then provide valuable information in the body, and end with a strong conclusion.
        Create a ${style} article about this keyword: "${keyword}" in minimum ${maxWords} words and maximum ${maxWords} words in ${language} (HTML Tags not included in maximal words).
        The article format in HTML, so make sure to include the necessary tags.
        First, you need to provide title in h1, then write the article body, and finally, end with a conclusion.
        The body have numbering format for each paragraph and in h2 tags.`;
    
        // Call OpenAI API
        try {
            const response = await fetch("https://api.openai.com/v1/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                model: "gpt-3.5-turbo-instruct",
                prompt: prompt,
                max_tokens: maxWords * 4, // Approx. word to token ratio
                temperature: 0.7
                })
            });
        
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }
        
            const data = await response.json();
            const article = data.choices[0].text.trim();
            saveArticleToHistory(keyword, article);
        
            // Display article
            const outputContainer = document.getElementById('outputContainer');
            const articleOutput = document.getElementById('articleOutput');
        
            articleOutput.innerHTML = article;
        
            outputContainer.style.display = "block";
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    }catch (error) {
        alert(`Error: ${error.message}`);
    } finally {
        // Hide loading bar and re-enable button
        loadingOverlay.style.display = 'none';
        submitButton.disabled = false;
    }
  });
  
  // Copy to clipboard
document.getElementById('copyButton').addEventListener('click', () => {
    const articleHTML = document.getElementById('articleOutput').innerHTML;
    navigator.clipboard.writeText(articleHTML).then(() => {
    //   alert("Article copied to clipboard!");
    }).catch(() => {
        alert("Failed to copy!");
    });
});
  
function saveArticleToHistory(keyword, article) {
    // Get existing history from storage
    chrome.storage.local.get(['articleHistory'], (result) => {
        const history = result.articleHistory || [];

        // Add new article to history
        history.push({ keyword, article });

        // Save updated history to storage
        chrome.storage.local.set({ articleHistory: history }, () => {
        // Add new row to the table
        addHistoryRow(keyword, article);
        });
    });
}
  
function addHistoryRow(keyword, article) {
    const row = document.createElement("tr");

    // Keyword column
    const keywordCell = document.createElement("td");
    keywordCell.textContent = keyword;
    row.appendChild(keywordCell);

    // Actions column
    const actionsCell = document.createElement("td");
    const copyButton = document.createElement("button");
    copyButton.textContent = "Copy";
    copyButton.classList.add("history-action-btn", "copy");

    // Show Button
    const showButton = document.createElement("button");
    showButton.textContent = "Show";
    showButton.classList.add("history-action-btn", "show");
    showButton.style.marginLeft = "10px"; // Add some spacing between buttons
    showButton.addEventListener("click", () => {
        // Display article in the articleOutput container
        const outputContainer = document.getElementById('outputContainer');
        const articleOutput = document.getElementById('articleOutput');
    
        articleOutput.innerHTML = article;
        outputContainer.style.display = "block";
    });

    // Copy button functionality
    copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(article).then(() => {
        alert("Article copied to clipboard!");
        });
    });

    actionsCell.appendChild(copyButton);
    actionsCell.appendChild(showButton);
    row.appendChild(actionsCell);

    // Add row to table
    historyTableBody.appendChild(row);
}