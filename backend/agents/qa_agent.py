from rag.vector_store import load_vector_store
from llm.groq_client import (
    ask_llm,
    ask_general_llm,
    ask_llm_stream
)


def qa_agent(state):

    try:
        db = load_vector_store()

        results = db.similarity_search_with_score(
            state["query"],
            k=3
        )

        best_score = results[0][1]

        print("\nBEST SCORE:", best_score)
    except Exception as e:
        print("Vector store not ready or failed to load. Falling back to general LLM. Error:", str(e))
        best_score = 999.0

    # If similarity is poor → use general LLM
    if best_score > 1.2:

        print("Using General LLM")

        answer = ask_general_llm(
            state["query"]
        )

    else:

        print("Using RAG")

        docs = [
            doc
            for doc, score in results
        ]

        context = "\n".join(
            [
                doc.page_content
                for doc in docs
            ]
        )

        answer = ask_llm(
            context,
            state["query"]
        )

    state["result"] = answer

    return state


def qa_agent_stream(query):

    try:
        db = load_vector_store()

        results = db.similarity_search_with_score(
            query,
            k=3
        )

        best_score = results[0][1]

        print("\nBEST SCORE:", best_score)
    except Exception as e:
        print("Vector store not ready or failed to load. Falling back to general LLM. Error:", str(e))
        best_score = 999.0

    # If similarity is poor → use general LLM
    if best_score > 1.2:

        print("Using General LLM")

        return ask_llm_stream(query, temperature=0.5, max_tokens=1000)

    else:

        print("Using RAG")

        docs = [
            doc
            for doc, score in results
        ]

        context = "\n".join(
            [
                doc.page_content
                for doc in docs
            ]
        )

        prompt = f"""
You are an expert educational assistant.

Instructions:
- Use the provided context to answer the question clearly and in detail.
- If the provided context does not contain enough information to answer, use your general knowledge to give a complete and accurate answer.
- Give detailed answers.
- Use bullet points.
- Explain clearly.

Context:
{context}

Question:
{query}

Answer:
"""

        return ask_llm_stream(prompt)