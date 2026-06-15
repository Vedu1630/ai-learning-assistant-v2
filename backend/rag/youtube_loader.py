from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url):

    if "watch?v=" in url:
        return url.split("watch?v=")[1].split("&")[0]

    return url


def load_youtube(url):

    video_id = extract_video_id(url)

    print("\nVIDEO ID:", video_id)

    api = YouTubeTranscriptApi()

    transcript = api.fetch(video_id)

    text = " ".join(
        [item.text for item in transcript]
    )

    print("\nTRANSCRIPT LENGTH:", len(text))

    return text