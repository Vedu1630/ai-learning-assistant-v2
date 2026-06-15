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

        prompt = f"""
You are an expert educational assistant.

Question: {query}

Instructions:
- Give detailed answers.
- Use bullet points.
- Explain clearly.
- Do NOT mention page numbers or files since you do not have any document context here.
- At the very end of your response, after a blank line, you MUST append exactly 3 relevant follow-up question suggestions that the user might want to ask next, enclosed in `[Suggestions: Question 1? | Question 2? | Question 3?]`.
"""

        return ask_llm_stream(prompt, temperature=0.5, max_tokens=1000)

    else:

        print("Using RAG")

        docs = [
            doc
            for doc, score in results
        ]

        context_parts = []
        for doc in docs:
            meta = doc.metadata
            source = meta.get("source_name", "Unknown Source")
            source_type = meta.get("source_type", "pdf")
            if source_type == "pdf":
                page_info = f" (Page: {meta.get('page', 1)})"
            elif source_type == "youtube":
                secs = meta.get("timestamp", 0)
                hrs = secs // 3600
                mins = (secs % 3600) // 60
                seconds = secs % 60
                if hrs > 0:
                    page_info = f" (Time: {hrs:02d}:{mins:02d}:{seconds:02d})"
                else:
                    page_info = f" (Time: {mins:02d}:{seconds:02d})"
            else:
                page_info = ""
            context_parts.append(f"Source: {source}{page_info}\nContent: {doc.page_content}")
        
        context = "\n\n---\n\n".join(context_parts)

        prompt = f"""
You are an expert educational assistant.

Instructions:
- Use the provided context to answer the question clearly and in detail.
- If the provided context does not contain enough information to answer, use your general knowledge to give a complete and accurate answer.
- Give detailed answers.
- Use bullet points.
- Explain clearly.
- For every factual claim or detail you explain from the context, you MUST cite the source immediately using the format `[Source: source_name, Page: X]` or `[Source: source_name, Time: HH:MM:SS]`. Do not modify this format.
- At the very end of your response, after a blank line, you MUST append exactly 3 relevant follow-up question suggestions that the user might want to ask next, enclosed in `[Suggestions: Question 1? | Question 2? | Question 3?]`.

Context:
{context}

Question:
{query}

Answer:
"""

        return ask_llm_stream(prompt)