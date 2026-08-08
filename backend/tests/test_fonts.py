import io
import json
import os
import unittest
from unittest.mock import patch

from app.api import fonts


class GoogleFontApiTests(unittest.TestCase):
    def setUp(self):
        fonts._catalog_cache = None

    def tearDown(self):
        fonts._catalog_cache = None

    def test_metadata_catalog_is_reduced_to_safe_search_fields(self):
        payload = {
            "familyMetadataList": [
                {
                    "family": "Literata",
                    "category": "Serif",
                    "popularity": 12,
                    "subsets": ["menu", "latin", "latin-ext"],
                    "fonts": {"400": {"thickness": 4}},
                }
            ]
        }

        with patch.object(fonts, "urlopen", return_value=io.BytesIO(json.dumps(payload).encode())):
            catalog = fonts.fetch_google_font_catalog()

        self.assertEqual(len(catalog), 1)
        self.assertEqual(catalog[0].family, "Literata")
        self.assertEqual(catalog[0].category, "Serif")
        self.assertEqual(catalog[0].subsets, ["latin", "latin-ext"])

    def test_configured_api_key_uses_the_official_developer_endpoint(self):
        payload = {
            "items": [
                {
                    "family": "Roboto",
                    "category": "sans-serif",
                    "subsets": ["latin"],
                }
            ]
        }
        requested_urls = []

        def fake_open(request, timeout):
            requested_urls.append(request.full_url)
            return io.BytesIO(json.dumps(payload).encode())

        with (
            patch.dict(os.environ, {"GOOGLE_FONTS_API_KEY": "test-key"}),
            patch.object(fonts, "urlopen", side_effect=fake_open),
        ):
            catalog = fonts.fetch_google_font_catalog()

        self.assertEqual(catalog[0].family, "Roboto")
        self.assertIn("www.googleapis.com/webfonts/v1/webfonts", requested_urls[0])
        self.assertIn("key=test-key", requested_urls[0])


if __name__ == "__main__":
    unittest.main()
