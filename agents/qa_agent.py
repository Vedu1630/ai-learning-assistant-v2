from rag.vector_store import load_vector_store
from llm.groq_client import (
    ask_llm,
    ask_general_llm
)


def qa_agent(state):

    db = load_vector_store()

    results = db.similarity_search_with_score(
        state["query"],
        k=3
    )

    best_score = results[0][1]

    print("\nBEST SCORE:", best_score)

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