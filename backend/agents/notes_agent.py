from rag.vector_store import load_vector_store
from llm.groq_client import (
    ask_llm,
    ask_llm_stream
)

def notes_agent(state):

    db = load_vector_store()

    docs = db.similarity_search(
        "main topics and important concepts",
        k=5
    )

    context = "\n".join(
        [doc.page_content for doc in docs]
    )

    answer = ask_llm(
        context,
        """
Create detailed study notes.

Include:
- Main topics
- Key concepts
- Important points
- Exam tips
"""
    )

    state["result"] = answer

    return state


def notes_agent_stream():

    db = load_vector_store()

    docs = db.similarity_search(
        "main topics and important concepts",
        k=5
    )

    context = "\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = f"""
You are an expert educational assistant.

Use ONLY the provided context.

Instructions:
- Give detailed answers.
- Use bullet points.
- Explain clearly.

Context:
{context}

Question:
Create detailed study notes.

Include:
- Main topics
- Key concepts
- Important points
- Exam tips

Answer:
"""
    return ask_llm_stream(prompt)