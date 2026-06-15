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

Use ONLY the provided context to generate a study quiz.

Context:
{context}

Instructions:
- You MUST generate exactly:
  1. 5 Multiple Choice Questions (each must have exactly 4 options)
  2. 3 True/False Questions
  3. 2 Short Answer Questions
- You MUST output the quiz strictly as a JSON array of objects inside a markdown code block starting with ```json and ending with ```.
- Do NOT output any other text or explanation before or after the JSON block.

JSON Structure:
```json
[
  {{
    "id": 1,
    "type": "multiple_choice",
    "question": "Question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "Option A",
    "explanation": "Brief explanation why Option A is correct."
  }},
  {{
    "id": 6,
    "type": "true_false",
    "question": "Statement text?",
    "options": ["True", "False"],
    "answer": "True",
    "explanation": "Brief explanation."
  }},
  {{
    "id": 9,
    "type": "short_answer",
    "question": "Question text?",
    "answer": "Expected key answer points / sample answer.",
    "explanation": "Grading criteria or context for the answer."
  }}
]
```
Ensure all JSON syntax is valid, strings are properly escaped, and the response is wrapped inside the ```json block.

Answer:
"""
    return ask_llm_stream(prompt)