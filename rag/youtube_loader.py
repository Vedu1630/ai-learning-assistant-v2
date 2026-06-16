import os
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_core.documents import Document


def extract_video_id(url):

    if "watch?v=" in url:
        return url.split("watch?v=")[1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]

    return url


def load_youtube(url, title=None, proxy=None):

    video_id = extract_video_id(url)

    print("\nVIDEO ID:", video_id)

    if not title:
        title = f"YouTube Video ({video_id})"

    if not proxy:
        proxy = os.getenv("YOUTUBE_PROXY")

    if proxy:
        print(f"Using proxy for YouTube transcript: {proxy}")
        session = requests.Session()
        session.proxies = {"http": proxy, "https": proxy}
        session.headers.update({
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
        })
        api = YouTubeTranscriptApi(http_client=session)
    else:
        api = YouTubeTranscriptApi()

    transcript = api.fetch(video_id)

    docs = []
    current_text = []
    current_word_count = 0
    start_time = 0

    for i, item in enumerate(transcript):
        if current_word_count == 0:
            start_time = int(item.start)

        text = item.text
        current_text.append(text)
        current_word_count += len(text.split())

        if current_word_count >= 150 or i == len(transcript) - 1:
            segment_text = " ".join(current_text)
            docs.append(Document(
                page_content=segment_text,
                metadata={
                    "source_name": title,
                    "source_type": "youtube",
                    "url": url,
                    "timestamp": start_time
                }
            ))
            current_text = []
            current_word_count = 0

    print("\nTRANSCRIPT CHUNKS CREATED:", len(docs))

    return docs