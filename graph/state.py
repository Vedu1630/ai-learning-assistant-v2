from typing import TypedDict


class LearningState(TypedDict):

    query: str

    task: str

    context: str

    result: str