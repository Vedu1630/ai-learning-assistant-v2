from fastapi import FastAPI, UploadFile, File
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os

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

        combined_text = ""

        # -------------------------
        # PDF
        # -------------------------

        if file:

            pdf_path = f"data/{file.filename}"

            with open(pdf_path, "wb") as f:
                f.write(await file.read())

            pdf_text = load_pdf(pdf_path)

            combined_text += pdf_text

        # -------------------------
        # YouTube
        # -------------------------

        if youtube_url:

            youtube_text = load_youtube(
                youtube_url
            )

            combined_text += "\n\n"
            combined_text += youtube_text

        # -------------------------
        # Validation
        # -------------------------

        if not combined_text.strip():

            return {
                "error":
                "Please upload a PDF or provide a YouTube URL."
            }

        # -------------------------
        # Create Vector Store
        # -------------------------

        create_vector_store(
            combined_text
        )

        # Save source text

        with open(
            "data/document.txt",
            "w",
            encoding="utf-8"
        ) as f:

            f.write(
                combined_text
            )

        return {
            "message":
            "Knowledge Base Created Successfully",
            "characters":
            len(combined_text)
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
    
@app.delete("/delete")
async def delete_pdf():

    try:

        for file in os.listdir("data"):

            if file.endswith(".pdf"):

                os.remove(
                    os.path.join(
                        "data",
                        file
                    )
                )

        return {
            "message": "PDF deleted successfully"
        }

    except Exception as e:

        return {
            "error": str(e)
        }