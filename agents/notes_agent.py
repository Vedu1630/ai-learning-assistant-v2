from rag.vector_store import load_vector_store
from llm.groq_client import ask_llm

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