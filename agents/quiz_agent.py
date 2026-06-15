from rag.vector_store import load_vector_store
from llm.groq_client import ask_llm


def quiz_agent(state):

    db = load_vector_store()

    docs = db.similarity_search(
        "main topics important concepts",
        k=5
    )

    context = "\n".join(
        [doc.page_content for doc in docs]
    )

    prompt = """
Generate a study quiz.

Include:

1. 5 Multiple Choice Questions
   - 4 options each
   - provide correct answer

2. 3 True/False Questions
   - provide correct answer

3. 2 Short Answer Questions

Format clearly.
"""

    answer = ask_llm(
        context,
        prompt
    )

    state["result"] = answer

    return state