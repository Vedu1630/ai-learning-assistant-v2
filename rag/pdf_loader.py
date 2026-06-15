import os
from langchain_community.document_loaders import PyPDFLoader


def load_pdf(pdf_path):

    loader = PyPDFLoader(pdf_path)

    docs = loader.load()

    filename = os.path.basename(pdf_path)

    for i, doc in enumerate(docs):
        doc.metadata = {
            "source_name": filename,
            "source_type": "pdf",
            "page": i + 1
        }

    return docs