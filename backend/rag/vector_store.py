from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_community.vectorstores import Chroma
import uuid


_embeddings = None


def get_embeddings():

    global _embeddings

    if _embeddings is None:

        _embeddings = FastEmbedEmbeddings()

    return _embeddings


def create_vector_store(text):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    docs = splitter.create_documents([text])

    embeddings = get_embeddings()

    collection_name = f"learning_{uuid.uuid4().hex}"

    db = Chroma.from_documents(
        documents=docs,
        embedding=embeddings,
        persist_directory="chroma_db",
        collection_name=collection_name
    )

    with open(
        "data/current_collection.txt",
        "w",
        encoding="utf-8"
    ) as f:
        f.write(collection_name)

    return db


def load_vector_store():

    embeddings = get_embeddings()

    with open(
        "data/current_collection.txt",
        "r",
        encoding="utf-8"
    ) as f:
        collection_name = f.read().strip()

    return Chroma(
        persist_directory="chroma_db",
        embedding_function=embeddings,
        collection_name=collection_name
    )