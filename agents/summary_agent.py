from llm.groq_client import client


def summary_agent(state):

    with open(
        "data/document.txt",
        "r",
        encoding="utf-8"
    ) as f:

        document = f.read()[:12000]

    prompt = f"""
You are an expert educator.

Create a detailed summary
of the document.

Include:

- Main Topic
- Key Ideas
- Important Events
- Important Concepts
- Final Conclusion

Document:

{document}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.3
    )

    state["result"] = (
        response.choices[0]
        .message.content
    )

    return state