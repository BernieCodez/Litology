import asyncio
import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from fastapi import HTTPException

from app.api import projects
from app.main import app


async def asgi_request(method, path, payload=None):
    body = json.dumps(payload).encode() if payload is not None else b""
    request_sent = False
    response_messages = []
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "root_path": "",
        "headers": [(b"content-type", b"application/json")],
        "client": ("test", 50000),
        "server": ("test", 80),
    }

    async def receive():
        nonlocal request_sent

        if not request_sent:
            request_sent = True
            return {"type": "http.request", "body": body, "more_body": False}

        return {"type": "http.disconnect"}

    async def send(message):
        response_messages.append(message)

    await app(scope, receive, send)
    status = next(message["status"] for message in response_messages if message["type"] == "http.response.start")
    response_body = b"".join(
        message.get("body", b"")
        for message in response_messages
        if message["type"] == "http.response.body"
    )
    return status, json.loads(response_body) if response_body else None


class AutosaveApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.original_database_path = projects.DATABASE_PATH
        projects.DATABASE_PATH = Path(self.temporary_directory.name) / "autosave.db"

    def tearDown(self):
        projects.DATABASE_PATH = self.original_database_path
        self.temporary_directory.cleanup()

    def test_saves_and_loads_a_named_project_chapter(self):
        saved = projects.save_chapter(
            "Story (2)",
            1,
            projects.ChapterSave(
                content={"type": "doc", "content": [{"type": "paragraph"}]},
                client_updated_at=100,
            ),
        )
        loaded = projects.get_chapter("Story (2)", 1)

        self.assertEqual(saved.project_name, "Story (2)")
        self.assertEqual(loaded.content, saved.content)
        self.assertEqual(loaded.client_updated_at, 100)

    def test_an_older_request_cannot_overwrite_a_newer_autosave(self):
        projects.save_chapter(
            "Story",
            1,
            projects.ChapterSave(content={"version": "new"}, client_updated_at=200),
        )
        projects.save_chapter(
            "Story",
            1,
            projects.ChapterSave(content={"version": "old"}, client_updated_at=100),
        )

        loaded = projects.get_chapter("Story", 1)
        self.assertEqual(loaded.content, {"version": "new"})
        self.assertEqual(loaded.client_updated_at, 200)

    def test_chapter_customization_settings_round_trip_with_content(self):
        settings = {
            "styles": {
                "title": {
                    "fontFamily": "Georgia",
                    "fontSize": 52,
                    "color": "#536b45",
                }
            },
            "sceneSeparator": {"preset": "fleuron", "custom": "◆"},
            "opening": {"mode": "word", "layout": "raised"},
        }
        saved = projects.save_chapter(
            "Styled Book",
            1,
            projects.ChapterSave(
                content={"type": "doc", "content": [{"type": "paragraph"}]},
                settings=settings,
                client_updated_at=250,
            ),
        )
        loaded = projects.get_chapter("Styled Book", 1)

        self.assertEqual(saved.settings, settings)
        self.assertEqual(loaded.settings, settings)

    def test_existing_database_schema_is_migrated_with_default_settings(self):
        connection = sqlite3.connect(projects.DATABASE_PATH)
        try:
            connection.execute(
                """
                CREATE TABLE chapters (
                    project_name TEXT NOT NULL COLLATE NOCASE,
                    chapter_number INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    client_updated_at INTEGER NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (project_name, chapter_number)
                )
                """
            )
            connection.execute(
                "INSERT INTO chapters VALUES (?, ?, ?, ?, ?)",
                ("Legacy", 1, json.dumps({"legacy": True}), 1, "2026-01-01T00:00:00Z"),
            )
            connection.commit()
        finally:
            connection.close()

        loaded = projects.get_chapter("Legacy", 1)

        self.assertEqual(loaded.settings, {})

    def test_missing_chapter_returns_not_found(self):
        with self.assertRaises(HTTPException) as error:
            projects.get_chapter("Missing", 1)

        self.assertEqual(error.exception.status_code, 404)

    def test_registered_http_routes_round_trip_autosaved_content(self):
        payload = {
            "content": {"type": "doc", "content": [{"type": "paragraph"}]},
            "client_updated_at": 300,
        }
        put_status, put_body = asyncio.run(
            asgi_request("PUT", "/api/projects/Story (2)/chapters/1", payload)
        )
        get_status, get_body = asyncio.run(
            asgi_request("GET", "/api/projects/Story (2)/chapters/1")
        )

        self.assertEqual(put_status, 200)
        self.assertEqual(get_status, 200)
        self.assertEqual(put_body["content"], payload["content"])
        self.assertEqual(get_body["content"], payload["content"])

    def test_chapters_are_listed_and_inserted_as_separate_documents(self):
        projects.save_chapter(
            "Book",
            1,
            projects.ChapterSave(content={"chapter": "one"}, client_updated_at=100),
        )
        projects.save_chapter(
            "Book",
            2,
            projects.ChapterSave(content={"chapter": "two"}, client_updated_at=101),
        )

        inserted = projects.create_chapter(
            "Book",
            projects.ChapterCreate(after_chapter=1, client_updated_at=102),
        )
        chapters = projects.list_chapters("Book")

        self.assertEqual(inserted.chapter_number, 2)
        self.assertEqual([chapter.chapter_number for chapter in chapters], [1, 2, 3])
        self.assertEqual(chapters[0].content, {"chapter": "one"})
        self.assertEqual(chapters[2].content, {"chapter": "two"})
        self.assertEqual(chapters[1].content["content"][0]["content"][0]["text"], "Chapter Name")

    def test_registered_collection_routes_list_and_create_chapters(self):
        create_status, created = asyncio.run(
            asgi_request(
                "POST",
                "/api/projects/Book/chapters",
                {"after_chapter": 0, "client_updated_at": 400},
            )
        )
        list_status, chapters = asyncio.run(
            asgi_request("GET", "/api/projects/Book/chapters")
        )

        self.assertEqual(create_status, 201)
        self.assertEqual(created["chapter_number"], 1)
        self.assertEqual(list_status, 200)
        self.assertEqual([chapter["chapter_number"] for chapter in chapters], [1])

    def test_deleting_a_chapter_closes_the_numbering_gap(self):
        for chapter_number in range(1, 4):
            projects.save_chapter(
                "Book",
                chapter_number,
                projects.ChapterSave(
                    content={"original_chapter": chapter_number},
                    client_updated_at=chapter_number,
                ),
            )

        deleted = projects.delete_chapter("Book", 2)
        chapters = projects.list_chapters("Book")

        self.assertEqual(deleted.deleted_chapter, 2)
        self.assertEqual(deleted.remaining_chapters, 2)
        self.assertEqual([chapter.chapter_number for chapter in chapters], [1, 2])
        self.assertEqual(chapters[1].content, {"original_chapter": 3})

    def test_registered_delete_route_removes_a_chapter(self):
        projects.save_chapter(
            "Book",
            1,
            projects.ChapterSave(content={"chapter": 1}, client_updated_at=500),
        )
        delete_status, deleted = asyncio.run(
            asgi_request("DELETE", "/api/projects/Book/chapters/1")
        )
        list_status, chapters = asyncio.run(
            asgi_request("GET", "/api/projects/Book/chapters")
        )

        self.assertEqual(delete_status, 200)
        self.assertEqual(deleted["remaining_chapters"], 0)
        self.assertEqual(list_status, 200)
        self.assertEqual(chapters, [])


if __name__ == "__main__":
    unittest.main()
