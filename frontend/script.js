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
    if (window.marked && window.marked.parse) {
        container.innerHTML = window.marked.parse(text);
    } else {
        container.textContent = text;
    }
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
function toggleChatSidebar() {
    const sidebar = document.getElementById("chatSidebar");
    const floatBtn = document.getElementById("floatingChatBtn");
    
    if (sidebar.classList.contains("collapsed")) {
        sidebar.classList.remove("collapsed");
        floatBtn.style.display = "none";
    } else {
        sidebar.classList.add("collapsed");
        floatBtn.style.display = "flex";
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
});

// ==========================
// Initialize Knowledge Base
// ==========================
async function initializeKB() {
    try {
        showStatus("⏳ Processing Content...");
        
        const file = document.getElementById("pdfFile").files[0];
        const youtubeUrl = document.getElementById("youtubeUrl").value;
        const formData = new FormData();
        
        if(file) {
            formData.append("file", file);
        }
        
        const response = await fetch(
            `${API}/process?youtube_url=${encodeURIComponent(youtubeUrl)}`,
            {
                method: "POST",
                body: formData
            }
        );
        
        const data = await response.json();
        
        if(data.error) {
            showStatus("❌ " + data.error);
            return;
        }
        
        kbReady = true;
        
        showStatus(`
            ✅ Knowledge Base Ready
            <br><br>
            Start chatting with your content.
        `);
        
        addBotMessage("✅ Knowledge Base Initialized Successfully!\n\nAsk me anything about your content.");
        
    } catch(error) {
        console.error(error);
        showStatus("❌ Failed to initialize knowledge base.");
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
        
        await readResponseStream(response, messageContainer, (displayText) => {
            if (window.marked && window.marked.parse) {
                messageContainer.innerHTML = window.marked.parse(displayText);
            } else {
                messageContainer.textContent = displayText;
            }
            scrollToBottom("chatBox");
        });
        
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
    
    try {
        const response = await fetch(`${API}/${endpoint}`, { method: "POST" });
        
        // Remove loading state
        canvas.innerHTML = `<div class="canvas-text"></div>`;
        const textContainer = canvas.querySelector(".canvas-text");
        
        await readResponseStream(response, textContainer, (currentText) => {
            if (window.marked && window.marked.parse) {
                textContainer.innerHTML = window.marked.parse(currentText);
            } else {
                textContainer.textContent = currentText;
            }
            scrollToBottom("readerCanvas");
        });
        
        saveCanvas();
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
async function deletePDF() {
    try {
        const response = await fetch(
            `${API}/delete`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        document.getElementById("pdfFile").value = "";
        document.getElementById("fileInfo").style.display = "none";
        kbReady = false;

        showStatus("🗑 PDF deleted successfully.");
        addBotMessage("PDF removed from knowledge base.");
    } catch(error) {
        console.error(error);
        showStatus("❌ Failed to delete PDF.");
    }
}
