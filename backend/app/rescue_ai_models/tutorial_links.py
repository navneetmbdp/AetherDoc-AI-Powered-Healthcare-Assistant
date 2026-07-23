from __future__ import annotations

from typing import Any

import requests


TUTORIAL_LIBRARY: dict[str, list[dict[str, str]]] = {
    "bleeding": [
        {"title": "How to stop severe bleeding", "url": "https://www.youtube.com/watch?v=NxO5LvgqZe0"},
        {"title": "First aid basics for wounds", "url": "https://www.youtube.com/watch?v=5OKD1aii4cY"},
    ],
    "burn": [
        {"title": "Burn first aid steps", "url": "https://www.youtube.com/watch?v=JwlA5jz4q8s"},
        {"title": "What not to do for burns", "url": "https://www.youtube.com/watch?v=x6m6A9A7Jz8"},
    ],
    "choking": [
        {"title": "How to help a choking adult", "url": "https://www.youtube.com/watch?v=PA9hpOnvtCk"},
        {"title": "Heimlich maneuver guide", "url": "https://www.youtube.com/watch?v=ljL9JcK6RnM"},
    ],
    "unconscious": [
        {"title": "Recovery position tutorial", "url": "https://www.youtube.com/watch?v=GmqXqwSV3bo"},
        {"title": "What to do if someone is unconscious", "url": "https://www.youtube.com/watch?v=pQx1fW5x4xM"},
    ],
    "cardiac": [
        {"title": "CPR in 2 minutes", "url": "https://www.youtube.com/watch?v=-NodDRTsV88"},
        {"title": "Hands-only CPR", "url": "https://www.youtube.com/watch?v=E5huVSebZpM"},
    ],
    "seizure": [
        {"title": "Seizure first aid", "url": "https://www.youtube.com/watch?v=rJ4tjAs4CYE"},
        {"title": "What to do during a seizure", "url": "https://www.youtube.com/watch?v=7M6Tgf5Nsik"},
    ],
    "fracture": [
        {"title": "Suspected fracture first aid", "url": "https://www.youtube.com/watch?v=Xn9wY8YfWfY"},
        {"title": "How to immobilize an injured limb", "url": "https://www.youtube.com/watch?v=4R4nM9a7w08"},
    ],
    "general": [
        {"title": "Emergency first aid basics", "url": "https://www.youtube.com/watch?v=Ovsw7tdneqE"},
        {"title": "Emergency response priorities", "url": "https://www.youtube.com/watch?v=Y5xqNf6OYbM"},
    ],
}


KEYWORD_TO_TOPIC: dict[str, str] = {
    "blood": "bleeding",
    "bleed": "bleeding",
    "wound": "bleeding",
    "burn": "burn",
    "hot": "burn",
    "choke": "choking",
    "can not breathe": "choking",
    "unconscious": "unconscious",
    "faint": "unconscious",
    "heart": "cardiac",
    "chest pain": "cardiac",
    "cpr": "cardiac",
    "seizure": "seizure",
    "fit": "seizure",
    "fracture": "fracture",
    "broken": "fracture",
}


def _fallback_tutorial_links(emergency_type: str, context_text: str = "", limit: int = 4) -> list[dict[str, Any]]:
    normalized_type = (emergency_type or "").strip().lower()
    selected = TUTORIAL_LIBRARY.get(normalized_type, []).copy()

    lower_context = context_text.lower()
    for keyword, mapped_topic in KEYWORD_TO_TOPIC.items():
        if keyword in lower_context:
            selected.extend(TUTORIAL_LIBRARY.get(mapped_topic, []))

    if not selected:
        selected = TUTORIAL_LIBRARY["general"].copy()

    unique: list[dict[str, str]] = []
    seen_urls: set[str] = set()
    for item in selected:
        url = item["url"]
        if url in seen_urls:
            continue
        unique.append(item)
        seen_urls.add(url)
        if len(unique) >= limit:
            break
    return unique


def _tutorial_query(emergency_type: str, context_text: str = "") -> str:
    normalized_type = (emergency_type or "").strip().lower()
    lower_context = context_text.lower()

    topic = normalized_type if normalized_type and normalized_type != "general" else ""
    for keyword, mapped_topic in KEYWORD_TO_TOPIC.items():
        if keyword in lower_context:
            topic = mapped_topic
            break

    if not topic:
        topic = "emergency first aid"

    return f"{topic} first aid tutorial short"


def _youtube_embed_url(video_id: str) -> str:
    return f"https://www.youtube.com/embed/{video_id}?autoplay=1&rel=0"


def get_tutorial_links(
    emergency_type: str,
    context_text: str = "",
    limit: int = 4,
    youtube_api_key: str = "",
) -> list[dict[str, Any]]:
    if not youtube_api_key:
        return _fallback_tutorial_links(emergency_type, context_text, limit)

    query = _tutorial_query(emergency_type, context_text)
    try:
        response = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={
                "part": "snippet",
                "q": query,
                "key": youtube_api_key,
                "type": "video",
                "videoDuration": "short",
                "safeSearch": "strict",
                "maxResults": max(1, min(limit, 8)),
                "relevanceLanguage": "en",
            },
            timeout=8,
        )
        response.raise_for_status()
        videos: list[dict[str, Any]] = []
        for item in response.json().get("items", []):
            video_id = (item.get("id") or {}).get("videoId")
            snippet = item.get("snippet") or {}
            if not video_id:
                continue
            thumbnails = snippet.get("thumbnails") or {}
            thumbnail = (
                thumbnails.get("medium")
                or thumbnails.get("high")
                or thumbnails.get("default")
                or {}
            ).get("url")
            videos.append(
                {
                    "title": snippet.get("title") or "Emergency first aid tutorial",
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "embed_url": _youtube_embed_url(video_id),
                    "video_id": video_id,
                    "thumbnail": thumbnail,
                    "channel": snippet.get("channelTitle") or "YouTube",
                    "source": "youtube",
                    "query": query,
                }
            )
            if len(videos) >= limit:
                break
        return videos or _fallback_tutorial_links(emergency_type, context_text, limit)
    except requests.RequestException:
        return _fallback_tutorial_links(emergency_type, context_text, limit)
