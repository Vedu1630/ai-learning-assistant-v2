const API = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://127.0.0.1:8000"
    : "https://ai-learning-3-0.onrender.com";
let kbReady = false;

// ==========================
// Status Message
// ==========================
function showStatus(message) {
    document.getElementById("statusBox").innerHTML = message;
}

// ==========================
// Auto Scroll
// ==========================
function scrollToBottom(containerId) {
    const el = document.getElementById(containerId);
    if(el) {
        el.scrollTop = el.scrollHeight;
    }
}

// ==========================
// Save Chat & Canvas
// ==========================
function saveChat() {
    localStorage.setItem(
        "chatHistory",
        document.getElementById("chatBox").innerHTML
    );
}

function saveCanvas() {
    localStorage.setItem(
        "canvasHistory",
        document.getElementById("readerCanvas").innerHTML
    );
}

// ==========================
// Add Messages
// ==========================
function addUserMessage(text) {
    const chatBox = document.getElementById("chatBox");
    
    // Remove empty state
    const emptyState = chatBox.querySelector(".empty-state");
    if(emptyState) {
        chatBox.innerHTML = "";
    }
    
    chatBox.innerHTML += `
        <div class="user-message">
            ${text}
        </div>
    `;
    
    scrollToBottom("chatBox");
    saveChat();
}

function createBotMessageContainer() {
    const chatBox = document.getElementById("chatBox");
    
    // Remove empty state
    const emptyState = chatBox.querySelector(".empty-state");
    if(emptyState) {
        chatBox.innerHTML = "";
    }
    
    const div = document.createElement("div");
    div.className = "bot-message";
    chatBox.appendChild(div);
    return div;
}

function addBotMessage(text) {
    const container = createBotMessageContainer();
    const { htmlContent } = processBotResponse(text);
    container.innerHTML = htmlContent;
    scrollToBottom("chatBox");
    saveChat();
}

function unescapeJsonString(str) {
    return str
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\')
        .replace(/\\r/g, '\r')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f');
}

function extractContent(text) {
    let trimmed = text.trim();
    if (trimmed.startsWith("{")) {
        try {
            const parsed = JSON.parse(trimmed);
            const content = parsed.answer || parsed.notes || parsed.summary || parsed.quiz;
            if (content !== undefined) {
                return content;
            }
        } catch (e) {
            const match = trimmed.match(/^\{\s*"(answer|notes|summary|quiz)"\s*:\s*"(.*)/s);
            if (match) {
                let inner = match[2];
                if (inner.endsWith('"}') || inner.endsWith('"} ')) {
                    inner = inner.substring(0, inner.lastIndexOf('"}'));
                } else if (inner.endsWith('"')) {
                    inner = inner.substring(0, inner.length - 1);
                }
                return unescapeJsonString(inner);
            }
        }
    }
    return text;
}

function extractVideoId(url) {
    if (url.includes("watch?v=")) {
        return url.split("watch?v=")[1].split("&")[0];
    } else if (url.includes("youtu.be/")) {
        return url.split("youtu.be/")[1].split("?")[0];
    }
    return url;
}

function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }
    return parts[0] || 0;
}

function formatCitations(text) {
    const docs = window.documentsRegistry || [];
    return text.replace(/\[Source:\s*(.+?),\s*(Page|Time):\s*(.+?)\]/g, (match, sourceName, type, val) => {
        const doc = docs.find(d => d.name === sourceName);
        if (doc && doc.type === 'youtube' && doc.url) {
            const secs = parseTimeToSeconds(val);
            const videoId = extractVideoId(doc.url);
            const finalUrl = `https://youtu.be/${videoId}?t=${secs}`;
            return `<a href="${finalUrl}" target="_blank" class="citation-badge youtube-citation" title="Open YouTube at ${val}">🎬 ${sourceName} (${val})</a>`;
        } else {
            const displayVal = type === 'Page' ? `p. ${val}` : val;
            return `<span class="citation-badge pdf-citation" title="Source: ${sourceName}">📄 ${sourceName} (${displayVal})</span>`;
        }
    });
}

function stripSuggestionsFromStream(text) {
    const index = text.indexOf('[Suggestions:');
    if (index !== -1) {
        const cleanText = text.substring(0, index);
        const suggestionsPart = text.substring(index);
        const match = suggestionsPart.match(/\[Suggestions:\s*(.+?)\]/);
        let suggestions = [];
        if (match) {
            suggestions = match[1].split('|').map(s => s.trim());
        }
        return { cleanText, suggestions, hasSuggestions: true };
    }
    return { cleanText: text, suggestions: [], hasSuggestions: false };
}

function processBotResponse(rawText) {
    const { cleanText, suggestions, hasSuggestions } = stripSuggestionsFromStream(rawText);
    let htmlContent = "";
    if (window.marked && window.marked.parse) {
        htmlContent = window.marked.parse(cleanText);
    } else {
        htmlContent = cleanText.replace(/\n/g, '<br>');
    }
    htmlContent = formatCitations(htmlContent);
    return { htmlContent, suggestions, hasSuggestions };
}

function renderSuggestions(suggestions) {
    const oldContainer = document.getElementById("suggestionsContainer");
    if (oldContainer) oldContainer.remove();
    
    if (!suggestions || suggestions.length === 0) return;
    
    const chatBox = document.getElementById("chatBox");
    const container = document.createElement("div");
    container.id = "suggestionsContainer";
    container.className = "suggestions-container";
    
    suggestions.forEach(question => {
        const pill = document.createElement("button");
        pill.className = "suggestion-pill";
        pill.textContent = question;
        pill.onclick = () => {
            document.getElementById("questionInput").value = question;
            sendMessage();
        };
        container.appendChild(pill);
    });
    
    chatBox.appendChild(container);
    scrollToBottom("chatBox");
}

// ==========================
// Thinking Animation
// ==========================
function showThinking() {
    const chatBox = document.getElementById("chatBox");
    const div = document.createElement("div");
    
    div.className = "loading";
    div.id = "thinkingBubble";
    
    div.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    
    chatBox.appendChild(div);
    scrollToBottom("chatBox");
}

function removeThinking() {
    const bubble = document.getElementById("thinkingBubble");
    if(bubble) {
        bubble.remove();
    }
}

// ==========================
// Sidebar Collapse Toggle
// ==========================
function toggleSidebarDrawer() {
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.toggle("open");
    toggleBackdrop(sidebar.classList.contains("open"));
}

function toggleBackdrop(show) {
    let backdrop = document.getElementById("drawerBackdrop");
    if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.id = "drawerBackdrop";
        backdrop.className = "drawer-backdrop";
        backdrop.onclick = () => {
            document.querySelector(".sidebar").classList.remove("open");
            document.getElementById("chatSidebar").classList.add("collapsed");
            const floatBtn = document.getElementById("floatingChatBtn");
            if (floatBtn) {
                floatBtn.style.display = "flex";
            }
            toggleBackdrop(false);
        };
        document.body.appendChild(backdrop);
    }
    if (show) {
        backdrop.classList.add("active");
    } else {
        backdrop.classList.remove("active");
    }
}

function toggleChatSidebar() {
    const sidebar = document.getElementById("chatSidebar");
    const floatBtn = document.getElementById("floatingChatBtn");
    
    if (sidebar.classList.contains("collapsed")) {
        sidebar.classList.remove("collapsed");
        floatBtn.style.display = "none";
        if (window.innerWidth <= 768) {
            toggleBackdrop(true);
        }
    } else {
        sidebar.classList.add("collapsed");
        floatBtn.style.display = "flex";
        toggleBackdrop(false);
    }
}

// ==========================
// Drag and Drop Uploader
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    const uploadZone = document.getElementById("uploadZone");
    const fileInput = document.getElementById("pdfFile");
    const fileName = document.getElementById("fileName");
    const fileInfo = document.getElementById("fileInfo");
    const input = document.getElementById("questionInput");
    
    if (uploadZone && fileInput) {
        uploadZone.addEventListener("click", () => fileInput.click());
        
        uploadZone.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadZone.classList.add("dragover");
        });
        
        uploadZone.addEventListener("dragleave", () => {
            uploadZone.classList.remove("dragover");
        });
        
        uploadZone.addEventListener("drop", (e) => {
            e.preventDefault();
            uploadZone.classList.remove("dragover");
            if(e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                updateFileDetails();
            }
        });
        
        fileInput.addEventListener("change", updateFileDetails);
    }
    
    function updateFileDetails() {
        if(fileInput.files && fileInput.files[0]) {
            fileName.textContent = fileInput.files[0].name;
            fileInfo.style.display = "flex";
        }
    }

    input.addEventListener("keypress", function(e) {
        if(e.key === "Enter") {
            sendMessage();
        }
    });
    
    // Restore Theme
    if(localStorage.getItem("darkMode") === "true") {
        document.body.classList.add("dark-mode");
        document.getElementById("themeToggle").innerHTML = "☀️ Light Mode";
    }
    
    // Restore Chat & Canvas
    const savedChat = localStorage.getItem("chatHistory");
    if(savedChat) {
        document.getElementById("chatBox").innerHTML = savedChat;
        scrollToBottom("chatBox");
    }
    
    const savedCanvas = localStorage.getItem("canvasHistory");
    if(savedCanvas) {
        document.getElementById("readerCanvas").innerHTML = savedCanvas;
    }

    // Load active documents registry on load
    loadDocuments();
});

// ==========================
// Initialize Knowledge Base
// ==========================
// ==========================
// Multi-Document Registry
// ==========================
let documentsRegistry = [];

async function loadDocuments() {
    try {
        const response = await fetch(`${API}/documents`);
        const data = await response.json();
        
        if (Array.isArray(data)) {
            documentsRegistry = data;
            window.documentsRegistry = data;
            
            kbReady = data.length > 0;
            renderDocumentsList();
        }
    } catch (err) {
        console.error("Failed to load documents registry:", err);
    }
}

function renderDocumentsList() {
    const listEl = document.getElementById("documentsList");
    if (!listEl) return;
    
    if (documentsRegistry.length === 0) {
        listEl.innerHTML = `<div class="empty-docs-state">No active documents.</div>`;
        return;
    }
    
    listEl.innerHTML = documentsRegistry.map(doc => {
        const icon = doc.type === 'pdf' ? '📄' : '🎬';
        const typeLabel = doc.type.toUpperCase();
        const sizeLabel = doc.type === 'pdf' ? ` (${(doc.char_count / 1024).toFixed(1)} KB)` : '';
        
        return `
            <div class="document-item" id="doc-${doc.id}">
                <div class="doc-icon">${icon}</div>
                <div class="doc-details">
                    <span class="doc-name" title="${doc.name}">${doc.name}</span>
                    <span class="doc-meta">${typeLabel}${sizeLabel}</span>
                </div>
                <button class="doc-delete-btn" onclick="deleteDocument('${doc.id}')" title="Delete document">🗑</button>
            </div>
        `;
    }).join('');
}

async function addToKB() {
    try {
        const file = document.getElementById("pdfFile").files[0];
        const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
        
        if (!file && !youtubeUrl) {
            showStatus("❌ Please upload a PDF or enter a YouTube URL.");
            return;
        }
        
        showStatus("⏳ Adding to Knowledge Base...");
        
        const formData = new FormData();
        if (file) {
            formData.append("file", file);
        }
        
        let url = `${API}/process`;
        if (youtubeUrl) {
            url += `?youtube_url=${encodeURIComponent(youtubeUrl)}`;
        }
        
        const response = await fetch(url, {
            method: "POST",
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            showStatus("❌ " + data.error);
            return;
        }
        
        document.getElementById("pdfFile").value = "";
        document.getElementById("fileInfo").style.display = "none";
        document.getElementById("youtubeUrl").value = "";
        
        showStatus(`✅ Successfully added content.`);
        await loadDocuments();
        
        addBotMessage(`✅ Added content successfully:\n\n**${data.message || 'New source loaded.'}**\n\nAsk me anything about your active documents.`);
        
    } catch (err) {
        console.error(err);
        showStatus("❌ Failed to add document.");
    }
}

async function deleteDocument(docId) {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
        showStatus("⏳ Deleting document...");
        const response = await fetch(`${API}/documents/${docId}`, {
            method: "DELETE"
        });
        const data = await response.json();
        
        if (data.error) {
            showStatus("❌ " + data.error);
            return;
        }
        
        showStatus("🗑 Document deleted successfully.");
        await loadDocuments();
        addBotMessage("🗑 Document removed from Knowledge Base.");
    } catch (err) {
        console.error(err);
        showStatus("❌ Failed to delete document.");
    }
}

async function clearAllKB() {
    if (!confirm("Are you sure you want to clear the entire Knowledge Base? This deletes all files and clears the database.")) return;
    
    try {
        showStatus("⏳ Clearing Knowledge Base...");
        const response = await fetch(`${API}/delete`, {
            method: "DELETE"
        });
        const data = await response.json();
        
        if (data.error) {
            showStatus("❌ " + data.error);
            return;
        }
        
        kbReady = false;
        showStatus("🗑 Knowledge Base fully cleared.");
        await loadDocuments();
        addBotMessage("🗑 Knowledge Base fully cleared.");
    } catch (err) {
        console.error(err);
        showStatus("❌ Failed to clear Knowledge Base.");
    }
}

// ==========================
// Streaming Handler
// ==========================
async function readResponseStream(response, outputElement, onChunkReceived) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    
    while(true) {
        const { value, done } = await reader.read();
        if(done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        text += chunk;
        
        const displayText = extractContent(text);
        
        if(onChunkReceived) {
            onChunkReceived(displayText);
        } else {
            if (window.marked && window.marked.parse) {
                outputElement.innerHTML = window.marked.parse(displayText);
            } else {
                outputElement.textContent = displayText;
            }
        }
    }
}

// ==========================
// Q&A Send Message
// ==========================
async function sendMessage() {
    const input = document.getElementById("questionInput");
    const query = input.value.trim();
    
    if(!query) return;
    
    addUserMessage(query);
    input.value = "";
    showThinking();
    
    if(!kbReady) {
        showStatus("ℹ Using general knowledge (knowledge base not initialized).");
    }
    
    try {
        const response = await fetch(
            `${API}/chat`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ query: query })
            }
        );
        
        removeThinking();
        
        const messageContainer = createBotMessageContainer();
        window.currentSuggestions = [];
        
        await readResponseStream(response, messageContainer, (displayText) => {
            const { htmlContent, suggestions } = processBotResponse(displayText);
            messageContainer.innerHTML = htmlContent;
            window.currentSuggestions = suggestions;
            scrollToBottom("chatBox");
        });
        
        if (window.currentSuggestions && window.currentSuggestions.length > 0) {
            renderSuggestions(window.currentSuggestions);
        } else {
            const container = document.getElementById("suggestionsContainer");
            if (container) container.remove();
        }
        
        saveChat();
        
    } catch(error) {
        console.error(error);
        removeThinking();
        addBotMessage("❌ Error connecting to backend.");
    }
}

// ==========================
// Reading Canvas Builders
// ==========================
function prepareCanvas() {
    const canvas = document.getElementById("readerCanvas");
    canvas.innerHTML = `
        <div class="canvas-loading">
            <div class="loading-spinner"></div>
            <span>Generating content...</span>
        </div>
    `;
    return canvas;
}

async function generateStudyMaterial(endpoint, title) {
    if(!kbReady) {
        showStatus("⚠ Initialize knowledge base first.");
        return;
    }
    
    const canvas = prepareCanvas();
    window.lastGeneratedMarkdown = "";
    
    try {
        const response = await fetch(`${API}/${endpoint}`, { method: "POST" });
        
        // Remove loading state
        canvas.innerHTML = `<div class="canvas-text"></div>`;
        const textContainer = canvas.querySelector(".canvas-text");
        
        await readResponseStream(response, textContainer, (currentText) => {
            window.lastGeneratedMarkdown = currentText;
            const { htmlContent } = processBotResponse(currentText);
            textContainer.innerHTML = htmlContent;
            scrollToBottom("readerCanvas");
        });
        
        saveCanvas();
        
        if (endpoint === "quiz") {
            const quizData = parseQuizJSON(window.lastGeneratedMarkdown);
            if (quizData && quizData.length > 0) {
                renderInteractiveQuiz(quizData);
            }
        }
    } catch(error) {
        console.error(error);
        canvas.innerHTML = `
            <div class="canvas-error">
                <span>❌ Failed to generate ${title}.</span>
            </div>
        `;
    }
}

function generateNotes() {
    generateStudyMaterial("notes", "study notes");
}

function generateSummary() {
    generateStudyMaterial("summary", "executive summary");
}

function generateQuiz() {
    generateStudyMaterial("quiz", "study quiz");
}

// ==========================
// Canvas Actions
// ==========================
function clearCanvas() {
    document.getElementById("readerCanvas").innerHTML = `
        <div class="empty-canvas-state">
            <div class="canvas-icon">📖</div>
            <h3>Study Canvas Empty</h3>
            <p>Select a tab above to generate study notes, summaries, or quizzes from your knowledge base.</p>
        </div>
    `;
    localStorage.removeItem("canvasHistory");
}

function downloadCanvasContent() {
    const text = document.getElementById("readerCanvas").innerText;
    const blob = new Blob([text], {type: "text/plain"});
    const a = document.createElement("a");
    
    a.href = URL.createObjectURL(blob);
    a.download = "study_material.txt";
    a.click();
}

// ==========================
// Dark Mode
// ==========================
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDark);
    
    document.getElementById("themeToggle").innerHTML = 
        isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
}

// ==========================
// Download Chat
// ==========================
function downloadChat() {
    const text = document.getElementById("chatBox").innerText;
    const blob = new Blob([text], {type: "text/plain"});
    const a = document.createElement("a");
    
    a.href = URL.createObjectURL(blob);
    a.download = "chat_history.txt";
    a.click();
}

// ==========================
// Clear Chat
// ==========================
function clearChat() {
    document.getElementById("chatBox").innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">🤖</div>
            <h2>Study Chat</h2>
            <p>Ask anything about your content or general topics here.</p>
        </div>
    `;
    localStorage.removeItem("chatHistory");
}

// ==========================
// Delete PDF
// ==========================
// ==========================
// Parsing Quiz JSON
// ==========================
function parseQuizJSON(text) {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonText = match ? match[1] : text;
    
    try {
        return JSON.parse(jsonText.trim());
    } catch (e) {
        try {
            return JSON.parse(text.trim());
        } catch (err) {
            return null;
        }
    }
}

// ==========================
// Interactive Quiz UI
// ==========================
let activeQuizQuestions = [];
let currentQuestionIndex = 0;
let userQuizScore = 0;
let selectedOption = null;

function renderInteractiveQuiz(questions) {
    activeQuizQuestions = questions;
    currentQuestionIndex = 0;
    userQuizScore = 0;
    selectedOption = null;
    
    showQuizQuestion();
}

function showQuizQuestion() {
    const canvas = document.getElementById("readerCanvas");
    if (currentQuestionIndex >= activeQuizQuestions.length) {
        showQuizResults();
        return;
    }
    
    const q = activeQuizQuestions[currentQuestionIndex];
    const totalQ = activeQuizQuestions.length;
    
    let html = `
        <div class="interactive-quiz-card">
            <div class="quiz-header">
                <h2>🧠 Interactive Study Quiz</h2>
                <span class="quiz-progress-text">Question ${currentQuestionIndex + 1} of ${totalQ}</span>
            </div>
            
            <div class="quiz-progress-bar-container">
                <div class="quiz-progress-bar" style="width: ${((currentQuestionIndex) / totalQ) * 100}%"></div>
            </div>
            
            <div class="quiz-question-container">
                <span class="quiz-question-type">${q.type.replace('_', ' ').toUpperCase()}</span>
                <h3 class="quiz-question-text">${q.question}</h3>
            </div>
    `;
    
    if (q.type === 'multiple_choice' || q.type === 'true_false') {
        html += `<div class="quiz-options-grid">`;
        q.options.forEach((opt, idx) => {
            html += `
                <button class="quiz-option-btn" onclick="selectQuizOption('${opt}')">
                    <span class="option-marker">${String.fromCharCode(65 + idx)}</span>
                    <span class="option-text">${opt}</span>
                </button>
            `;
        });
        html += `</div>`;
        
        html += `
            <div class="quiz-actions">
                <button id="submitAnswerBtn" class="primary-btn submit-quiz-btn" onclick="submitQuizAnswer()" disabled>Check Answer</button>
                <button id="nextQuestionBtn" class="primary-btn next-quiz-btn" onclick="nextQuizQuestion()" style="display: none;">Next Question</button>
            </div>
        `;
    } else if (q.type === 'short_answer') {
        html += `
            <div class="quiz-short-answer-container">
                <textarea id="shortAnswerInput" placeholder="Type your answer here to compare it with the model answer..."></textarea>
            </div>
            
            <div class="quiz-actions">
                <button id="submitAnswerBtn" class="primary-btn submit-quiz-btn" onclick="revealShortAnswerModel()">Reveal Model Answer</button>
                
                <div id="selfEvaluationButtons" class="self-eval-container" style="display: none;">
                    <p class="eval-prompt">Did you get it right?</p>
                    <div class="eval-btn-group">
                        <button class="eval-btn correct-eval" onclick="evaluateShortAnswer(true)">Yes, Correct</button>
                        <button class="eval-btn incorrect-eval" onclick="evaluateShortAnswer(false)">No, Incorrect</button>
                    </div>
                </div>
                
                <button id="nextQuestionBtn" class="primary-btn next-quiz-btn" onclick="nextQuizQuestion()" style="display: none;">Next Question</button>
            </div>
        `;
    }
    
    html += `
            <div id="quizExplanationCard" class="quiz-explanation-card" style="display: none;">
                <h4 id="quizExplanationStatus">Correct!</h4>
                <div class="comparison-answers" id="shortAnswerComparison" style="display: none;">
                    <p><strong>Your Answer:</strong> <span id="yourAnswerText"></span></p>
                    <p><strong>Model Answer:</strong> <span id="modelAnswerText"></span></p>
                </div>
                <p id="quizExplanationText">${q.explanation || ''}</p>
            </div>
        </div>
    `;
    
    canvas.innerHTML = html;
}

function selectQuizOption(opt) {
    selectedOption = opt;
    
    const buttons = document.querySelectorAll(".quiz-option-btn");
    buttons.forEach(btn => {
        const text = btn.querySelector(".option-text").textContent;
        if (text === opt) {
            btn.classList.add("selected");
        } else {
            btn.classList.remove("selected");
        }
    });
    
    const submitBtn = document.getElementById("submitAnswerBtn");
    if (submitBtn) submitBtn.disabled = false;
}

function submitQuizAnswer() {
    const q = activeQuizQuestions[currentQuestionIndex];
    const submitBtn = document.getElementById("submitAnswerBtn");
    const nextBtn = document.getElementById("nextQuestionBtn");
    const explanationCard = document.getElementById("quizExplanationCard");
    const explanationStatus = document.getElementById("quizExplanationStatus");
    
    if (submitBtn) submitBtn.style.display = "none";
    if (nextBtn) nextBtn.style.display = "block";
    
    const buttons = document.querySelectorAll(".quiz-option-btn");
    buttons.forEach(btn => {
        btn.disabled = true;
        const text = btn.querySelector(".option-text").textContent;
        if (text === q.answer) {
            btn.classList.add("correct");
        } else if (text === selectedOption && selectedOption !== q.answer) {
            btn.classList.add("incorrect");
        }
    });
    
    if (selectedOption === q.answer) {
        userQuizScore++;
        explanationStatus.innerHTML = "✅ Correct!";
        explanationStatus.className = "explanation-status correct-text";
    } else {
        explanationStatus.innerHTML = `❌ Incorrect (Correct: ${q.answer})`;
        explanationStatus.className = "explanation-status incorrect-text";
    }
    
    if (explanationCard) explanationCard.style.display = "block";
}

function revealShortAnswerModel() {
    const q = activeQuizQuestions[currentQuestionIndex];
    const yourAnswer = document.getElementById("shortAnswerInput").value.trim();
    
    document.getElementById("submitAnswerBtn").style.display = "none";
    document.getElementById("selfEvaluationButtons").style.display = "block";
    
    const explanationCard = document.getElementById("quizExplanationCard");
    const explanationStatus = document.getElementById("quizExplanationStatus");
    const comparison = document.getElementById("shortAnswerComparison");
    
    explanationStatus.textContent = "📖 Model Answer Comparison";
    explanationStatus.className = "explanation-status info-text";
    
    document.getElementById("yourAnswerText").textContent = yourAnswer || "(No answer entered)";
    document.getElementById("modelAnswerText").textContent = q.answer;
    comparison.style.display = "block";
    
    if (explanationCard) explanationCard.style.display = "block";
}

function evaluateShortAnswer(isCorrect) {
    if (isCorrect) userQuizScore++;
    document.getElementById("selfEvaluationButtons").style.display = "none";
    document.getElementById("nextQuestionBtn").style.display = "block";
}

function nextQuizQuestion() {
    currentQuestionIndex++;
    selectedOption = null;
    showQuizQuestion();
}

function showQuizResults() {
    const canvas = document.getElementById("readerCanvas");
    const totalQ = activeQuizQuestions.length;
    const percentage = Math.round((userQuizScore / totalQ) * 100);
    
    canvas.innerHTML = `
        <div class="interactive-quiz-card quiz-results-card">
            <h2>🎉 Quiz Completed!</h2>
            
            <div class="results-visual-container">
                <div class="progress-ring-wrapper">
                    <svg class="progress-ring" width="120" height="120">
                        <circle class="progress-ring-bg" stroke="rgba(255,255,255,0.1)" stroke-width="8" fill="transparent" r="52" cx="60" cy="60"/>
                        <circle class="progress-ring-circle" stroke="var(--accent-color)" stroke-width="8" fill="transparent" r="52" cx="60" cy="60" 
                            stroke-dasharray="326.7" stroke-dashoffset="${326.7 - (326.7 * percentage / 100)}" style="transition: stroke-dashoffset 1s ease-out;"/>
                    </svg>
                    <div class="progress-ring-percentage">${percentage}%</div>
                </div>
            </div>
            
            <div class="results-score-breakdown">
                <p class="results-main-score">You scored <strong>${userQuizScore}</strong> out of <strong>${totalQ}</strong> questions.</p>
                <p class="results-feedback-msg">${percentage >= 70 ? 'Excellent job! You have understood this content well.' : 'Keep practicing! Review the notes or summary to boost your score.'}</p>
            </div>
            
            <div class="quiz-results-actions">
                <button class="primary-btn" onclick="renderInteractiveQuiz(activeQuizQuestions)">🔄 Retake Quiz</button>
                <button class="secondary-btn" onclick="exportCanvasToPDF()">📄 Export Results PDF</button>
            </div>
        </div>
    `;
}

// ==========================
// Export Operations
// ==========================
function exportCanvasToPDF() {
    const canvas = document.getElementById("readerCanvas");
    const content = canvas.querySelector(".canvas-text") || canvas;
    
    if (!content || content.innerText.trim().includes("Study Canvas Empty")) {
        showStatus("⚠ No study material generated yet to export.");
        return;
    }
    
    showStatus("⏳ Generating PDF document...");
    
    const opt = {
        margin: 0.6,
        filename: 'study_material.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    
    html2pdf().set(opt).from(canvas).save().then(() => {
        showStatus("✅ PDF exported successfully.");
    }).catch(err => {
        console.error(err);
        showStatus("❌ Failed to export PDF.");
    });
}

function exportCanvasToMD() {
    const md = window.lastGeneratedMarkdown || "";
    if (!md) {
        showStatus("⚠ No study material generated yet to export.");
        return;
    }
    const blob = new Blob([md], {type: "text/markdown"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "study_material.md";
    a.click();
    showStatus("✅ Markdown downloaded.");
}
