import os

from groq import Groq
from dotenv import load_dotenv

# Try loading from current working directory
load_dotenv()

# Fallback search paths for the .env file
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))
if not os.getenv("GROQ_API_KEY"):
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", "backend", ".env"))

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


def ask_llm(context, question):

    # Limit context size
    context = context[:8000]

    prompt = f"""
You are an expert educational assistant.

Use ONLY the provided context.

Instructions:
- Give detailed answers.
- Use bullet points.
- Explain clearly.
- If information is missing, say so.

Context:
{context}

Question:
{question}

Answer:
"""

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3,
        max_tokens=1500
    )

    return response.choices[0].message.content

def ask_general_llm(question):

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[
            {
                "role": "user",
                "content": question
            }
        ],
        temperature=0.5,
        max_tokens=1000
    )

    return response.choices[0].message.content