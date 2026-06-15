from langgraph.graph import (
    StateGraph,
    START,
    END
)

from graph.state import LearningState

from agents.qa_agent import qa_agent
from agents.notes_agent import notes_agent
from agents.quiz_agent import quiz_agent
from agents.summary_agent import summary_agent


def router(state: LearningState):

    query = state["query"].lower()

    if "quiz" in query:
        state["task"] = "quiz"

    elif "notes" in query:
        state["task"] = "notes"

    elif "summary" in query:
        state["task"] = "summary"

    else:
        state["task"] = "qa"

    return state


def route_task(state: LearningState):

    return state["task"]


builder = StateGraph(
    LearningState
)

builder.add_node(
    "router",
    router
)

builder.add_node(
    "qa",
    qa_agent
)

builder.add_node(
    "notes",
    notes_agent
)

builder.add_node(
    "quiz",
    quiz_agent
)

builder.add_node(
    "summary",
    summary_agent
)

builder.add_edge(
    START,
    "router"
)

builder.add_conditional_edges(
    "router",
    route_task,
    {
        "qa": "qa",
        "notes": "notes",
        "quiz": "quiz",
        "summary": "summary"
    }
)

builder.add_edge(
    "qa",
    END
)

builder.add_edge(
    "notes",
    END
)

builder.add_edge(
    "quiz",
    END
)

builder.add_edge(
    "summary",
    END
)

learning_graph = builder.compile()