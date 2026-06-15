<div align="center">

<br/>

```
╔═══════════════════════════════════════════╗
║                                           ║
║        🧠  AI LEARNING ASSISTANT         ║
║                                           ║
╚═══════════════════════════════════════════╝
```

### Turn any PDF or YouTube video into an interactive learning experience

*Powered by RAG · LangGraph · Groq LLaMA 3.1*

<br/>

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)](https://streamlit.io)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agentic_Workflow-6C63FF?style=for-the-badge)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/Groq-LLaMA_3.1-F55036?style=for-the-badge)](https://groq.com)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-4A90D9?style=for-the-badge)](https://www.trychroma.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

<br/>

</div>

---

## What It Does

Upload a **PDF** or paste a **YouTube URL** and unlock a full agentic learning workflow — semantic Q&A, structured notes, executive summaries, and auto-generated quizzes — all grounded in your document's actual content via RAG.

<br/>

<div align="center">

| &nbsp;&nbsp;💬&nbsp;&nbsp; | **Semantic Chat** | Ask anything — get context-grounded answers |
|:---:|:---|:---|
| &nbsp;&nbsp;📝&nbsp;&nbsp; | **Smart Notes** | Auto-generate structured bullet-point notes |
| &nbsp;&nbsp;📖&nbsp;&nbsp; | **Executive Summary** | Crisp, high-level summary of the full document |
| &nbsp;&nbsp;❓&nbsp;&nbsp; | **Knowledge Check** | Auto-generated quiz to test your understanding |

</div>

<br/>

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                         👤  USER INPUT                              │
│                                                                     │
│              ┌──────────────┬──────────────────┐                   │
│              │   📄 PDF     │  🎬 YouTube URL  │                   │
│              └──────┬───────┴────────┬─────────┘                   │
│                     │                │                              │
│            PyPDFLoader        YouTubeTranscriptApi                  │
│                     │                │                              │
│                     └────────┬───────┘                              │
│                              ▼                                      │
│                        Raw Text Corpus                              │
│                              │                                      │
│                              ▼                                      │
│              ┌───────────────────────────────┐                      │
│              │   RecursiveCharacterSplitter  │                      │
│              │   chunk_size=1000 · overlap=200│                     │
│              └───────────────┬───────────────┘                      │
│                              │                                      │
│                              ▼                                      │
│              ┌───────────────────────────────┐                      │
│              │  HuggingFace Embeddings       │                      │
│              │  all-MiniLM-L6-v2             │                      │
│              └───────────────┬───────────────┘                      │
│                              │                                      │
│                              ▼                                      │
│              ┌───────────────────────────────┐                      │
│              │   💾  ChromaDB Vector Store   │  ← persisted locally │
│              └───────────────┬───────────────┘                      │
│                              │                                      │
│                    ✅ Knowledge Base Ready                           │
│                              │                                      │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                    User submits a query
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                    🧭  LangGraph Router                             │
│                      learning_graph.py                              │
│                                                                     │
│         ┌────────────┬────────────┬────────────┬──────────┐        │
│         ▼            ▼            ▼            ▼          │        │
│    📝 Notes    📖 Summary   ❓  Quiz     💬  Q&A          │        │
│     Agent       Agent        Agent        Agent           │        │
│         │            │            │            │          │        │
│         └────────────┴────────────┴────────────┘          │        │
│                              │                             │        │
│                              ▼                                      │
│              ┌───────────────────────────────┐                      │
│              │  Semantic Retrieval           │                      │
│              │  ChromaDB → Top-K Chunks      │                      │
│              └───────────────┬───────────────┘                      │
│                              │                                      │
│                              ▼                                      │
│              ┌───────────────────────────────┐                      │
│              │   🔴  Groq API                │                      │
│              │   LLaMA 3.1 8B Instant        │                      │
│              └───────────────┬───────────────┘                      │
│                              │                                      │
│                              ▼                                      │
│                    💡 Response → Streamlit UI                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## How It Works

### Phase 1 — Ingestion

```
PDF / YouTube URL
       │
       ├─ PyPDFLoader ──────────────────┐
       │                                ▼
       └─ YouTubeTranscriptApi ──→  Raw Text
                                        │
                                        ▼
                             Text Splitter (1000 / 200)
                                        │
                                        ▼
                             HuggingFace Embeddings
                                        │
                                        ▼
                               ChromaDB Vector Store
                                        │
                                        ▼
                              ✅ Knowledge Base Ready
```

**Step by step:**

1. User uploads a PDF or pastes a YouTube URL
2. Content is extracted as raw text via `PyPDFLoader` or `YouTubeTranscriptApi`
3. Text is split into overlapping chunks — **1,000 tokens, 200 overlap**
4. Each chunk is embedded via HuggingFace `all-MiniLM-L6-v2`
5. Embeddings are stored in a local **ChromaDB** vector store

---

### Phase 2 — Query Routing (LangGraph)

```
  User Query
      │
      ▼
┌─────────────────────────────────┐
│       LangGraph Router          │
│                                 │
│  "notes"   → 📝 Notes Agent    │
│  "summary" → 📖 Summary Agent  │
│  "quiz"    → ❓  Quiz Agent     │
│  (other)   → 💬 QA Agent       │
└──────────────┬──────────────────┘
               │
               ▼
    Semantic Retrieval from ChromaDB
               │
               ▼
     Groq LLaMA 3.1 8B Instant
               │
               ▼
       Response streamed to UI
```

**Step by step:**

1. User submits a message or clicks a feature button
2. The **LangGraph Router** classifies intent: `notes` / `summary` / `quiz` / `general`
3. The active agent performs **semantic retrieval** from ChromaDB
4. Retrieved context + query are sent to **Groq's LLaMA 3.1 8B Instant**
5. The response is streamed back to the Streamlit UI

---

## Project Structure

```
ai-learning-assistant/
│
├── app.py                      ← Streamlit UI — main entry point
│
├── graph/
│   ├── learning_graph.py       ← LangGraph StateGraph: router + agent wiring
│   └── state.py                ← LearningState TypedDict definition
│
├── agents/
│   ├── qa_agent.py             ← General Q&A
│   ├── notes_agent.py          ← Structured notes generation
│   ├── summary_agent.py        ← Executive summaries
│   └── quiz_agent.py           ← Knowledge-check quizzes
│
├── rag/
│   ├── pdf_loader.py           ← PDF → raw text  (PyPDFLoader)
│   ├── youtube_loader.py       ← YouTube URL → transcript
│   └── vector_store.py         ← ChromaDB create / load helpers
│
├── llm/
│   └── groq_client.py          ← Groq API wrapper (LLaMA 3.1 8B Instant)
│
├── chroma_db/                  ← Persisted vector store (auto-generated)
├── data/                       ← Temp storage for processed docs
├── .env                        ← API keys (not committed)
└── requirements.txt
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- A free [Groq API key](https://console.groq.com)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ai-learning-assistant.git
cd ai-learning-assistant

# 2. Create and activate a virtual environment
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Add your API key
echo "GROQ_API_KEY=your_groq_api_key_here" > .env

# 5. Run the app
streamlit run app.py
```

Open your browser at **`http://localhost:8501`** 🎉

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────┐
│  Layer               Technology                         │
├─────────────────────────────────────────────────────────┤
│  UI                  Streamlit                          │
│  Agentic Workflow    LangGraph                          │
│  LLM                 Groq · LLaMA 3.1 8B Instant       │
│  Embeddings          HuggingFace · all-MiniLM-L6-v2    │
│  Vector Store        ChromaDB                           │
│  PDF Parsing         LangChain · PyPDFLoader            │
│  YouTube             youtube-transcript-api             │
│  Text Splitting      RecursiveCharacterTextSplitter     │
└─────────────────────────────────────────────────────────┘
```

---

## Environment Variables

| Variable | Description | Required |
|---|---|:---:|
| `GROQ_API_KEY` | Your Groq Cloud API key | ✅ |

---

## Notes

- The vector store is **persisted locally** in `chroma_db/` — each session creates a new collection so previous sessions don't interfere
- YouTube support requires the video to have **auto-generated or manual captions** enabled
- LLM context is capped at **8,000 characters** per query to stay within token limits

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

```
Built with ❤️ using LangGraph · Groq · Streamlit
```

</div>
