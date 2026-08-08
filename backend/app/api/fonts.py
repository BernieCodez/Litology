import json
import os
import time
from typing import Any
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


router = APIRouter(prefix="/api/fonts", tags=["Fonts"])

CATALOG_CACHE_SECONDS = 12 * 60 * 60
GOOGLE_FONTS_METADATA_URL = "https://fonts.google.com/metadata/fonts"
GOOGLE_FONTS_DEVELOPER_URL = "https://www.googleapis.com/webfonts/v1/webfonts"
_catalog_cache: tuple[float, list["GoogleFont"]] | None = None


class GoogleFont(BaseModel):
    family: str
    category: str
    popularity: int
    subsets: list[str]


def _font_entry(item: dict[str, Any], fallback_popularity: int) -> GoogleFont | None:
    family = str(item.get("family", "")).strip()

    if not family or len(family) > 80:
        return None

    popularity = item.get("popularity", fallback_popularity)
    try:
        popularity = int(popularity)
    except (TypeError, ValueError):
        popularity = fallback_popularity

    return GoogleFont(
        family=family,
        category=str(item.get("category", "Other")).strip() or "Other",
        popularity=max(1, popularity),
        subsets=[
            str(subset)
            for subset in item.get("subsets", [])
            if isinstance(subset, str) and subset != "menu"
        ],
    )


def _catalog_request() -> tuple[str, str]:
    api_key = os.getenv("GOOGLE_FONTS_API_KEY", "").strip()

    if api_key:
        query = urlencode({"key": api_key, "sort": "popularity"})
        return f"{GOOGLE_FONTS_DEVELOPER_URL}?{query}", "items"

    return GOOGLE_FONTS_METADATA_URL, "familyMetadataList"


def fetch_google_font_catalog() -> list[GoogleFont]:
    global _catalog_cache
    now = time.monotonic()

    if _catalog_cache and now - _catalog_cache[0] < CATALOG_CACHE_SECONDS:
        return _catalog_cache[1]

    url, collection_key = _catalog_request()
    request = Request(url, headers={"User-Agent": "Litology/0.1"})

    try:
        with urlopen(request, timeout=15) as response:
            payload = json.load(response)
    except (OSError, URLError, ValueError, json.JSONDecodeError) as error:
        raise HTTPException(
            status_code=502,
            detail="Google Fonts could not be reached. Try again in a moment.",
        ) from error

    entries = payload.get(collection_key, [])
    fonts = [
        font
        for index, item in enumerate(entries, start=1)
        if isinstance(item, dict)
        and (font := _font_entry(item, index)) is not None
    ]
    fonts.sort(key=lambda font: (font.popularity, font.family.casefold()))
    _catalog_cache = (now, fonts)
    return fonts


@router.get("/google", response_model=list[GoogleFont])
def list_google_fonts():
    return fetch_google_font_catalog()

