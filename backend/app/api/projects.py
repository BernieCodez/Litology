import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(
    prefix="/api/projects",
    tags=["Projects"],
)

DATABASE_PATH = Path(__file__).resolve().parents[2] / "data" / "litology.db"


class ChapterSave(BaseModel):
    content: dict[str, Any]
    settings: dict[str, Any] = Field(default_factory=dict)
    client_updated_at: int = Field(ge=0)


class ChapterDocument(ChapterSave):
    project_name: str
    chapter_number: int
    updated_at: str


class ChapterCreate(BaseModel):
    after_chapter: int = Field(ge=0)
    client_updated_at: int = Field(ge=0)


class ChapterDeleteResult(BaseModel):
    deleted_chapter: int
    remaining_chapters: int


def _connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS chapters (
            project_name TEXT NOT NULL COLLATE NOCASE,
            chapter_number INTEGER NOT NULL,
            content TEXT NOT NULL,
            settings TEXT NOT NULL DEFAULT '{}',
            client_updated_at INTEGER NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (project_name, chapter_number)
        )
        """
    )
    columns = {
        row["name"]
        for row in connection.execute("PRAGMA table_info(chapters)").fetchall()
    }
    if "settings" not in columns:
        connection.execute(
            "ALTER TABLE chapters ADD COLUMN settings TEXT NOT NULL DEFAULT '{}'"
        )
    return connection


@contextmanager
def _database():
    connection = _connect()

    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def _clean_project_name(project_name: str) -> str:
    cleaned_name = " ".join(project_name.split())

    if not cleaned_name:
        raise HTTPException(status_code=422, detail="Project name cannot be empty")
    if len(cleaned_name) > 80:
        raise HTTPException(status_code=422, detail="Project name cannot exceed 80 characters")

    return cleaned_name


def _row_to_document(row: sqlite3.Row) -> ChapterDocument:
    return ChapterDocument(
        project_name=row["project_name"],
        chapter_number=row["chapter_number"],
        content=json.loads(row["content"]),
        settings=json.loads(row["settings"] or "{}"),
        client_updated_at=row["client_updated_at"],
        updated_at=row["updated_at"],
    )


def _blank_chapter_content(chapter_number: int) -> dict[str, Any]:
    return {
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 1},
                "content": [{"type": "text", "text": "Chapter Name"}],
            },
            {"type": "paragraph"},
        ],
    }


@router.get("/{project_name:path}/chapters", response_model=list[ChapterDocument])
def list_chapters(project_name: str):
    cleaned_name = _clean_project_name(project_name)

    with _database() as connection:
        rows = connection.execute(
            """
            SELECT project_name, chapter_number, content, settings, client_updated_at, updated_at
            FROM chapters
            WHERE project_name = ?
            ORDER BY chapter_number
            """,
            (cleaned_name,),
        ).fetchall()

    return [_row_to_document(row) for row in rows]


@router.post("/{project_name:path}/chapters", response_model=ChapterDocument, status_code=201)
def create_chapter(project_name: str, chapter: ChapterCreate):
    cleaned_name = _clean_project_name(project_name)
    saved_at = datetime.now(timezone.utc).isoformat()

    with _database() as connection:
        connection.execute("BEGIN IMMEDIATE")
        highest_chapter = connection.execute(
            "SELECT COALESCE(MAX(chapter_number), 0) FROM chapters WHERE project_name = ?",
            (cleaned_name,),
        ).fetchone()[0]
        after_chapter = min(chapter.after_chapter, highest_chapter)
        new_chapter_number = after_chapter + 1

        connection.execute(
            """
            UPDATE chapters
            SET chapter_number = -chapter_number
            WHERE project_name = ? AND chapter_number > ?
            """,
            (cleaned_name, after_chapter),
        )
        connection.execute(
            """
            UPDATE chapters
            SET chapter_number = -chapter_number + 1
            WHERE project_name = ? AND chapter_number < 0
            """,
            (cleaned_name,),
        )
        connection.execute(
            """
            INSERT INTO chapters (
                project_name, chapter_number, content, settings, client_updated_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                cleaned_name,
                new_chapter_number,
                json.dumps(_blank_chapter_content(new_chapter_number)),
                "{}",
                chapter.client_updated_at,
                saved_at,
            ),
        )
        row = connection.execute(
            """
            SELECT project_name, chapter_number, content, settings, client_updated_at, updated_at
            FROM chapters
            WHERE project_name = ? AND chapter_number = ?
            """,
            (cleaned_name, new_chapter_number),
        ).fetchone()

    return _row_to_document(row)


@router.get("/{project_name:path}/chapters/{chapter_number}", response_model=ChapterDocument)
def get_chapter(project_name: str, chapter_number: int):
    cleaned_name = _clean_project_name(project_name)

    with _database() as connection:
        row = connection.execute(
            """
            SELECT project_name, chapter_number, content, settings, client_updated_at, updated_at
            FROM chapters
            WHERE project_name = ? AND chapter_number = ?
            """,
            (cleaned_name, chapter_number),
        ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Chapter not found")

    return _row_to_document(row)


@router.delete("/{project_name:path}/chapters/{chapter_number}", response_model=ChapterDeleteResult)
def delete_chapter(project_name: str, chapter_number: int):
    cleaned_name = _clean_project_name(project_name)

    with _database() as connection:
        connection.execute("BEGIN IMMEDIATE")
        deleted = connection.execute(
            "DELETE FROM chapters WHERE project_name = ? AND chapter_number = ?",
            (cleaned_name, chapter_number),
        )

        if deleted.rowcount == 0:
            raise HTTPException(status_code=404, detail="Chapter not found")

        connection.execute(
            """
            UPDATE chapters
            SET chapter_number = -chapter_number
            WHERE project_name = ? AND chapter_number > ?
            """,
            (cleaned_name, chapter_number),
        )
        connection.execute(
            """
            UPDATE chapters
            SET chapter_number = -chapter_number - 1
            WHERE project_name = ? AND chapter_number < 0
            """,
            (cleaned_name,),
        )
        remaining_chapters = connection.execute(
            "SELECT COUNT(*) FROM chapters WHERE project_name = ?",
            (cleaned_name,),
        ).fetchone()[0]

    return ChapterDeleteResult(
        deleted_chapter=chapter_number,
        remaining_chapters=remaining_chapters,
    )


@router.put("/{project_name:path}/chapters/{chapter_number}", response_model=ChapterDocument)
def save_chapter(project_name: str, chapter_number: int, chapter: ChapterSave):
    cleaned_name = _clean_project_name(project_name)
    saved_at = datetime.now(timezone.utc).isoformat()

    with _database() as connection:
        connection.execute(
            """
            INSERT INTO chapters (
                project_name, chapter_number, content, settings, client_updated_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(project_name, chapter_number) DO UPDATE SET
                project_name = excluded.project_name,
                content = excluded.content,
                settings = excluded.settings,
                client_updated_at = excluded.client_updated_at,
                updated_at = excluded.updated_at
            WHERE excluded.client_updated_at >= chapters.client_updated_at
            """,
            (
                cleaned_name,
                chapter_number,
                json.dumps(chapter.content),
                json.dumps(chapter.settings),
                chapter.client_updated_at,
                saved_at,
            ),
        )
        row = connection.execute(
            """
            SELECT project_name, chapter_number, content, settings, client_updated_at, updated_at
            FROM chapters
            WHERE project_name = ? AND chapter_number = ?
            """,
            (cleaned_name, chapter_number),
        ).fetchone()

    return _row_to_document(row)
