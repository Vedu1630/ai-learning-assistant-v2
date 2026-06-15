from rag.vector_store import load_vector_store
from llm.groq_client import (
    ask_llm,
    ask_llm_stream
)

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


def quiz_agent_stream():

    db = load_vector_store()

    docs = db.similarity_search(
        "main topics important concepts",
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
Generate a study quiz.

Include:

1. 5 Multiple Choice Questions
   - 4 options each
   - provide correct answer

2. 3 True/False Questions
   - provide correct answer

3. 2 Short Answer Questions

Format clearly.

Answer:
"""
    return ask_llm_stream(prompt)