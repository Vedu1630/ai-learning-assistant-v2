const API = "https://ai-learning-3-0i1g.onrender.com/";
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
function scrollToBottom() {
    const chatBox = document.getElementById("chatBox");
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ==========================
// Save Chat
// ==========================
function saveChat() {
    localStorage.setItem(
        "chatHistory",
        document.getElementById("chatBox").innerHTML
    );
}

// ==========================
// User Message
// ==========================
function addUserMessage(text) {
    const chatBox = document.getElementById("chatBox");
    
    chatBox.innerHTML += `
        <div class="user-message">
            ${text}
        </div>
    `;
    
    scrollToBottom();
    saveChat();
}

// ==========================
// Bot Message
// ==========================
function addBotMessage(text) {
    const chatBox = document.getElementById("chatBox");
    
    chatBox.innerHTML += `
        <div class="bot-message">
            ${text}
        </div>
    `;
    
    scrollToBottom();
    saveChat();
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
    scrollToBottom();
}

function removeThinking() {
    const bubble = document.getElementById("thinkingBubble");
    if(bubble) {
        bubble.remove();
    }
}

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
        
        document.getElementById("chatBox").innerHTML = "";
        
        addBotMessage("✅ Knowledge Base Initialized Successfully!\n\nAsk me anything about your content.");
        
    } catch(error) {
        console.error(error);
        showStatus("❌ Failed to initialize knowledge base.");
    }
}

// ==========================
// Chat
// ==========================
async function sendMessage() {
    if(!kbReady) {
        showStatus("⚠ Please initialize the knowledge base first.");
        return;
    }
    
    const input = document.getElementById("questionInput");
    const query = input.value.trim();
    
    if(!query) return;
    
    addUserMessage(query);
    input.value = "";
    showThinking();
    
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
        
        const data = await response.json();
        removeThinking();
        
        addBotMessage(
            data.answer || 
            data.error || 
            "No response received."
        );
        
    } catch(error) {
        removeThinking();
        addBotMessage("❌ Error connecting to backend.");
    }
}

// ==========================
// Notes
// ==========================
async function generateNotes() {
    if(!kbReady) {
        showStatus("⚠ Initialize knowledge base first.");
        return;
    }
    
    showThinking();
    
    try {
        const response = await fetch(`${API}/notes`, { method: "POST" });
        const data = await response.json();
        
        removeThinking();
        addBotMessage(data.notes || data.error);
    } catch {
        removeThinking();
        addBotMessage("❌ Failed to generate notes.");
    }
}

// ==========================
// Summary
// ==========================
async function generateSummary() {
    if(!kbReady) {
        showStatus("⚠ Initialize knowledge base first.");
        return;
    }
    
    showThinking();
    
    try {
        const response = await fetch(`${API}/summary`, { method: "POST" });
        const data = await response.json();
        
        removeThinking();
        addBotMessage(data.summary || data.error);
    } catch {
        removeThinking();
        addBotMessage("❌ Failed to generate summary.");
    }
}

// ==========================
// Quiz
// ==========================
async function generateQuiz() {
    if(!kbReady) {
        showStatus("⚠ Initialize knowledge base first.");
        return;
    }
    
    showThinking();
    
    try {
        const response = await fetch(`${API}/quiz`, { method: "POST" });
        const data = await response.json();
        
        removeThinking();
        addBotMessage(data.quiz || data.error);
    } catch {
        removeThinking();
        addBotMessage("❌ Failed to generate quiz.");
    }
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
            <h2>Chat Cleared</h2>
            <p>Start a new conversation.</p>
        </div>
    `;
    localStorage.removeItem("chatHistory");
}

// ==========================
// Page Load
// ==========================
document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("questionInput");
    
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
    
    // Restore Chat
    const savedChat = localStorage.getItem("chatHistory");
    if(savedChat) {
        document.getElementById("chatBox").innerHTML = savedChat;
        scrollToBottom();
    }
});

async function deletePDF() {

    try {

        const response = await fetch(
            `${API}/delete`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        document.getElementById(
            "pdfFile"
        ).value = "";

        kbReady = false;

        showStatus(
            "🗑 PDF deleted successfully."
        );

        addBotMessage(
            "PDF removed from knowledge base."
        );

    }

    catch(error){

        console.error(error);

        showStatus(
            "❌ Failed to delete PDF."
        );
    }
}
