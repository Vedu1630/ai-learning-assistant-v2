from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os

from rag.pdf_loader import load_pdf
from rag.youtube_loader import load_youtube
from rag.vector_store import create_vector_store

from graph.learning_graph import learning_graph


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


# =====================================
# Chat Endpoint
# =====================================

@app.post("/chat")
async def chat(
    data: ChatRequest
):

    try:

        if not os.path.exists(
            "data/document.txt"
        ):

            return {
                "error":
                "Please process content first."
            }

        state = {
            "query": data.query,
            "task": "",
            "result": ""
        }

        result = learning_graph.invoke(
            state
        )

        return {
            "answer":
            result["result"]
        }

    except Exception as e:

        return {
            "error":
            str(e)
        }


# =====================================
# Notes Endpoint
# =====================================

@app.post("/notes")
async def notes():

    try:

        state = {
            "query": "create notes",
            "task": "",
            "result": ""
        }

        result = learning_graph.invoke(
            state
        )

        return {
            "notes":
            result["result"]
        }

    except Exception as e:

        return {
            "error":
            str(e)
        }


# =====================================
# Summary Endpoint
# =====================================

@app.post("/summary")
async def summary():

    try:

        state = {
            "query": "create summary",
            "task": "",
            "result": ""
        }

        result = learning_graph.invoke(
            state
        )

        return {
            "summary":
            result["result"]
        }

    except Exception as e:

        return {
            "error":
            str(e)
        }


# =====================================
# Quiz Endpoint
# =====================================

@app.post("/quiz")
async def quiz():

    try:

        state = {
            "query": "generate quiz",
            "task": "",
            "result": ""
        }

        result = learning_graph.invoke(
            state
        )

        return {
            "quiz":
            result["result"]
        }

    except Exception as e:

        return {
            "error":
            str(e)
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