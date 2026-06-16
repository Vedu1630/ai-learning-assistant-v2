from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_community.vectorstores import Chroma


_embeddings = None


def get_embeddings():

    global _embeddings

    if _embeddings is None:

        _embeddings = FastEmbedEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
            threads=1
        )

    return _embeddings


def create_vector_store(documents):

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    docs = splitter.split_documents(documents)

    embeddings = get_embeddings()

    collection_name = "learning_assistant_db"

    db = Chroma(
        persist_directory="chroma_db",
        embedding_function=embeddings,
        collection_name=collection_name
    )

    if docs:
        db.add_documents(docs)

    with open(
        "data/current_collection.txt",
        "w",
        encoding="utf-8"
    ) as f:
        f.write(collection_name)

    return db


def load_vector_store():

    embeddings = get_embeddings()

    collection_name = "learning_assistant_db"

    return Chroma(
        persist_directory="chroma_db",
        embedding_function=embeddings,
        collection_name=collection_name
    )


def delete_from_vector_store(source_name):

    try:
        db = load_vector_store()
        db._collection.delete(where={"source_name": source_name})
        print(f"Successfully deleted all chunks for {source_name} from vector store.")
    except Exception as e:
        print(f"Error deleting {source_name} from vector store: {str(e)}")