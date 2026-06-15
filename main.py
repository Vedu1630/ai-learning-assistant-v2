from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os
import json

def load_registry():
    registry_path = "data/registry.json"
    if not os.path.exists(registry_path):
        return []
    try:
        with open(registry_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

def save_registry(registry):
    registry_path = "data/registry.json"
    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(registry, f, indent=4, ensure_ascii=False)

from rag.pdf_loader import load_pdf
from rag.youtube_loader import load_youtube
from rag.vector_store import create_vector_store

from graph.learning_graph import learning_graph

from agents.qa_agent import qa_agent_stream
from agents.notes_agent import notes_agent_stream
from agents.summary_agent import summary_agent_stream
from agents.quiz_agent import quiz_agent_stream


# =====================================
# FastAPI App
# =====================================

app = FastAPI(
    title="AI Learning Assistant API"
)

# =====================================
# CORS
# =====================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================
# Create folders
# =====================================

os.makedirs("data", exist_ok=True)

# =====================================
# Request Models
# =====================================

class ChatRequest(BaseModel):
    query: str


# =====================================
# Home Route
# =====================================

@app.get("/")
def home():

    return {
        "message": "AI Learning Assistant API Running 🚀"
    }


# =====================================
# Process PDF / YouTube
# =====================================

@app.post("/process")
async def process_content(
    youtube_url: str = "",
    file: UploadFile = None
):

    try:
        documents = []
        doc_id = ""
        doc_name = ""
        doc_type = ""
        char_count = 0

        # -------------------------
        # PDF
        # -------------------------

        if file:
            doc_name = file.filename
            doc_type = "pdf"
            doc_id = f"pdf_{doc_name.replace(' ', '_')}"

            registry = load_registry()
            if any(d["id"] == doc_id for d in registry):
                return {"error": f"Document '{doc_name}' is already initialized in the Knowledge Base."}

            pdf_path = f"data/{file.filename}"

            with open(pdf_path, "wb") as f:
                f.write(await file.read())

            pdf_docs = load_pdf(pdf_path)
            documents.extend(pdf_docs)
            char_count = sum(len(doc.page_content) for doc in pdf_docs)

        # -------------------------
        # YouTube
        # -------------------------

        if youtube_url:
            from rag.youtube_loader import extract_video_id
            video_id = extract_video_id(youtube_url)
            doc_name = f"YouTube Video ({video_id})"
            doc_type = "youtube"
            doc_id = f"youtube_{video_id}"

            registry = load_registry()
            if any(d["id"] == doc_id for d in registry):
                return {"error": "This YouTube video is already initialized in the Knowledge Base."}

            youtube_docs = load_youtube(youtube_url, doc_name)
            documents.extend(youtube_docs)
            char_count = sum(len(doc.page_content) for doc in youtube_docs)

        # -------------------------
        # Validation
        # -------------------------

        if not documents:
            return {
                "error":
                "Please upload a PDF or provide a YouTube URL."
            }

        # -------------------------
        # Add to Vector Store
        # -------------------------

        create_vector_store(documents)

        # Update registry
        registry = load_registry()
        registry.append({
            "id": doc_id,
            "name": doc_name,
            "type": doc_type,
            "char_count": char_count,
            "url": youtube_url if youtube_url else ""
        })
        save_registry(registry)

        # Re-build cumulative document.txt
        all_docs_text = []
        for item in registry:
            if item["type"] == "pdf":
                p_path = f"data/{item['name']}"
                if os.path.exists(p_path):
                    for doc in load_pdf(p_path):
                        all_docs_text.append(doc.page_content)
            elif item["type"] == "youtube":
                from rag.youtube_loader import load_youtube
                for doc in load_youtube(item["url"], item["name"]):
                    all_docs_text.append(doc.page_content)

        cumulative_text = "\n\n".join(all_docs_text)[:25000]

        with open(
            "data/document.txt",
            "w",
            encoding="utf-8"
        ) as f:
            f.write(cumulative_text)

        return {
            "message": f"'{doc_name}' added to Knowledge Base successfully.",
            "characters": char_count
        }

    except Exception as e:
        return {
            "error": str(e)
        }


def get_task_type(query: str) -> str:
    query_lower = query.lower()
    if "quiz" in query_lower:
        return "quiz"
    elif "notes" in query_lower:
        return "notes"
    elif "summary" in query_lower:
        return "summary"
    return "qa"


# =====================================
# Chat Endpoint
# =====================================

@app.post("/chat")
async def chat(
    data: ChatRequest
):

    try:

        task = get_task_type(data.query)

        if task == "quiz":
            generator = quiz_agent_stream()
        elif task == "notes":
            generator = notes_agent_stream()
        elif task == "summary":
            generator = summary_agent_stream()
        else:
            generator = qa_agent_stream(data.query)

        return StreamingResponse(generator, media_type="text/plain")

    except Exception as e:

        return {
            "error": str(e)
        }


# =====================================
# Notes Endpoint
# =====================================

@app.post("/notes")
async def notes():

    try:

        generator = notes_agent_stream()

        return StreamingResponse(generator, media_type="text/plain")

    except Exception as e:

        return {
            "error": str(e)
        }


# =====================================
# Summary Endpoint
# =====================================

@app.post("/summary")
async def summary():

    try:

        generator = summary_agent_stream()

        return StreamingResponse(generator, media_type="text/plain")

    except Exception as e:

        return {
            "error": str(e)
        }


# =====================================
# Quiz Endpoint
# =====================================

@app.post("/quiz")
async def quiz():

    try:

        generator = quiz_agent_stream()

        return StreamingResponse(generator, media_type="text/plain")

    except Exception as e:

        return {
            "error": str(e)
        }
    
@app.get("/documents")
def list_documents():
    return load_registry()


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    try:
        registry = load_registry()
        doc_to_delete = None
        for item in registry:
            if item["id"] == doc_id:
                doc_to_delete = item
                break

        if not doc_to_delete:
            return {"error": "Document not found in registry."}

        # Delete from vector store
        from rag.vector_store import delete_from_vector_store
        delete_from_vector_store(doc_to_delete["name"])

        # Delete local file if PDF
        if doc_to_delete["type"] == "pdf":
            p_path = f"data/{doc_to_delete['name']}"
            if os.path.exists(p_path):
                os.remove(p_path)

        # Remove from registry
        new_registry = [item for item in registry if item["id"] != doc_id]
        save_registry(new_registry)

        # Re-build cumulative document.txt
        all_docs_text = []
        for item in new_registry:
            if item["type"] == "pdf":
                p_path = f"data/{item['name']}"
                if os.path.exists(p_path):
                    for doc in load_pdf(p_path):
                        all_docs_text.append(doc.page_content)
            elif item["type"] == "youtube":
                from rag.youtube_loader import load_youtube
                for doc in load_youtube(item["url"], item["name"]):
                    all_docs_text.append(doc.page_content)

        cumulative_text = "\n\n".join(all_docs_text)[:25000]

        if cumulative_text:
            with open("data/document.txt", "w", encoding="utf-8") as f:
                f.write(cumulative_text)
        else:
            if os.path.exists("data/document.txt"):
                os.remove("data/document.txt")

        return {"message": f"Document '{doc_to_delete['name']}' deleted successfully."}
    except Exception as e:
        return {"error": str(e)}


@app.delete("/delete")
async def delete_all():
    try:
        registry = load_registry()
        for item in registry:
            if item["type"] == "pdf":
                p_path = f"data/{item['name']}"
                if os.path.exists(p_path):
                    os.remove(p_path)

        # Purge vector store collection
        from rag.vector_store import get_embeddings
        from langchain_community.vectorstores import Chroma
        embeddings = get_embeddings()
        db = Chroma(
            persist_directory="chroma_db",
            embedding_function=embeddings,
            collection_name="learning_assistant_db"
        )
        db.delete_collection()

        save_registry([])
        if os.path.exists("data/document.txt"):
            os.remove("data/document.txt")

        return {"message": "Knowledge Base fully cleared."}
    except Exception as e:
        return {"error": str(e)}