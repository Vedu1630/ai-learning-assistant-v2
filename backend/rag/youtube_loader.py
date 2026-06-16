import os
import requests
import yt_dlp
from langchain_core.documents import Document


def extract_video_id(url):

    if "watch?v=" in url:
        return url.split("watch?v=")[1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]

    return url


class TranscriptItem:
    def __init__(self, text, start):
        self.text = text
        self.start = start


def load_youtube(url, title=None, proxy=None):

    video_id = extract_video_id(url)

    print("\nVIDEO ID:", video_id)

    if not title:
        title = f"YouTube Video ({video_id})"

    if not proxy:
        proxy = os.getenv("YOUTUBE_PROXY")

    transcript = []
    
    # Tier 1: Native yt-dlp extraction
    try:
        print("Attempting native yt-dlp transcript extraction...")
        ydl_opts = {
            'skip_download': True,
            'writesubtitles': True,
            'writeautomaticsub': True,
        }
        if proxy:
            print(f"Using proxy for yt-dlp: {proxy}")
            ydl_opts['proxy'] = proxy

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            
            # Get subtitles dictionaries
            subtitles = info.get('subtitles', {})
            automatic_captions = info.get('automatic_captions', {})
            
            # Determine language track (English preferred)
            en_keys = [k for k in list(subtitles.keys()) + list(automatic_captions.keys()) if k.startswith('en')]
            en_keys = list(dict.fromkeys(en_keys))
            
            target_track = None
            is_manual = False
            
            # Try to find english manual track first
            for key in en_keys:
                if key in subtitles:
                    target_track = subtitles[key]
                    is_manual = True
                    print(f"Found manual English subtitles under key: {key}")
                    break
                    
            # If no manual, try automatic
            if not target_track:
                for key in en_keys:
                    if key in automatic_captions:
                        target_track = automatic_captions[key]
                        print(f"Found automatic English subtitles under key: {key}")
                        break
                        
            # If still no English, fall back to whatever is first available
            if not target_track:
                if subtitles:
                    first_key = list(subtitles.keys())[0]
                    target_track = subtitles[first_key]
                    is_manual = True
                    print(f"No English subtitles. Using manual subtitles key: {first_key}")
                elif automatic_captions:
                    first_key = list(automatic_captions.keys())[0]
                    target_track = automatic_captions[first_key]
                    print(f"No English subtitles. Using automatic subtitles key: {first_key}")
                    
            if not target_track:
                raise ValueError("No subtitles found for this video.")
                
            # Find json3 format URL
            json3_url = None
            for fmt in target_track:
                if fmt.get('ext') == 'json3':
                    json3_url = fmt.get('url')
                    break
                    
            if not json3_url:
                # Fallback to the first format URL if json3 is not present
                json3_url = target_track[0].get('url')
                print(f"Warning: json3 format not found. Falling back to format: {target_track[0].get('ext')}")
                
            print(f"Fetching subtitle content...")
            
            session = requests.Session()
            if proxy:
                session.proxies = {"http": proxy, "https": proxy}
                
            session.headers.update({
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
            })
            
            response = session.get(json3_url)
            if response.status_code != 200:
                raise Exception(f"Failed to fetch subtitle content, status code: {response.status_code}")
                
            data = response.json()
            
            events = data.get('events', [])
            for event in events:
                start_ms = event.get('tStartMs', 0)
                start_seconds = start_ms / 1000.0
                
                segs = event.get('segs', [])
                text_parts = [seg.get('utf8', '') for seg in segs if seg.get('utf8')]
                text = "".join(text_parts).replace("\xa0", " ").strip()
                
                if text:
                    transcript.append(TranscriptItem(text=text, start=start_seconds))
                    
    except Exception as e:
        print(f"Native extraction failed: {e}")
        print("Attempting Tier 2: Falling back to third-party transcript API...")
        
        # Tier 2: Third-party API fallback (youtube-transcript.ai)
        try:
            import re
            
            fallback_url = f"https://youtube-transcript.ai/transcript/{video_id}.txt"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
            }
            
            session = requests.Session()
            if proxy:
                session.proxies = {"http": proxy, "https": proxy}
                
            response = session.get(fallback_url, headers=headers)
            if response.status_code != 200:
                raise Exception(f"Third-party API returned status code {response.status_code}")
                
            text_content = response.text
            pattern = re.compile(r'\[(\d+(?::\d+){1,2})\]\s*(.*)')
            
            lines = text_content.split('\n')
            for line in lines:
                match = pattern.match(line.strip())
                if match:
                    time_str = match.group(1)
                    content = match.group(2)
                    
                    parts = list(map(int, time_str.split(':')))
                    if len(parts) == 2:
                        seconds = parts[0] * 60 + parts[1]
                    elif len(parts) == 3:
                        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
                    else:
                        seconds = 0
                        
                    content = content.replace("&nbsp;", " ").replace("\xa0", " ").strip()
                    if content:
                        transcript.append(TranscriptItem(text=content, start=seconds))
                        
            if not transcript:
                raise ValueError("Parsed third-party transcript is empty.")
            print("Successfully retrieved transcript using third-party fallback.")
            
        except Exception as fallback_err:
            print(f"Third-party fallback also failed: {fallback_err}")
            raise Exception(f"Could not retrieve transcript. Native: {e}. Fallback: {fallback_err}")


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