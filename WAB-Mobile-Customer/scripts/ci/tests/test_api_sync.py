"""Unit tests for scripts/api_sync.py (the Kotlin contract generator)."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import api_sync  # noqa: E402

SPEC = {
    "paths": {
        "/customer/v1/salons/{salonId}": {
            "get": {
                "tags": ["Salon details"],
                "parameters": [{"name": "salonId", "in": "path", "required": True, "schema": {"type": "string"}}],
                "responses": {"200": {"content": {"application/json": {"schema": {"type": "object", "properties": {
                    "success": {"type": "boolean"},
                    "data": {"type": "object", "required": ["id", "staff"], "properties": {
                        "id": {"type": "string"},
                        "rating": {"type": ["number", "null"]},
                        "gender": {"type": "string", "enum": ["MALE", "FEMALE"]},
                        "staff": {"type": "array", "items": {"type": "object", "required": ["name"], "properties": {"name": {"type": "string"}}}},
                        "object": {"type": "boolean"},
                    }},
                }}}}}},
            },
        },
        "/customer/v1/favorites/{salonId}": {
            "put": {"tags": ["Favorites"], "requestBody": {"content": {"application/json": {"schema": {"type": "object", "properties": {"note": {"type": "string"}}}}}},
                    "responses": {"200": {"content": {"application/json": {"schema": {"type": "object", "properties": {"data": {"type": "null"}}}}}}}},
        },
    },
    "components": {"schemas": {"CustomerProfile": {"type": "object", "required": ["id"], "properties": {"id": {"type": "string"}, "email": {"type": ["string", "null"]}}}}},
}


class ApiSyncTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.spec = Path(self.tmp.name) / "openapi.customer.json"
        self.spec.write_text(json.dumps(SPEC), encoding="utf-8")
        self.out = Path(self.tmp.name) / "generated"
        self.files, self.sha = api_sync.generate(self.spec)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_operation_ids_follow_method_and_path(self) -> None:
        self.assertEqual("GetSalonsBySalonId", api_sync.operation_id("get", "/customer/v1/salons/{salonId}"))
        self.assertEqual("PostBookingsDraftsByIdVerifyOtp", api_sync.operation_id("post", "/customer/v1/bookings/drafts/{id}/verify-otp"))

    def test_data_classes_nullability_enums_and_nested_items(self) -> None:
        kotlin = self.files["SalonDetailsDtos.kt"]
        self.assertIn("data class GetSalonsBySalonIdData(", kotlin)
        self.assertIn("    val id: String,", kotlin)
        self.assertIn("    val rating: Double? = null,", kotlin)
        self.assertIn("/** One of: MALE, FEMALE. */\n    val gender: String? = null,", kotlin)
        self.assertIn("val staff: List<GetSalonsBySalonIdDataStaffItem>,", kotlin)
        self.assertIn("data class GetSalonsBySalonIdDataStaffItem(", kotlin)
        self.assertIn('@SerialName("object")\n    val `object`: Boolean? = null,', kotlin)
        self.assertIn("data class CustomerProfile(", self.files["Components.kt"])
        self.assertIn("val email: String? = null,", self.files["Components.kt"])

    def test_operations_registry_lists_every_operation(self) -> None:
        ops = self.files["Operations.kt"]
        self.assertIn('val getSalonsBySalonId = Operation(', ops)
        self.assertIn('pathParams = listOf("salonId"),', ops)
        self.assertIn('dataType = "GetSalonsBySalonIdData",', ops)
        self.assertIn('val putFavoritesBySalonId = Operation(', ops)
        self.assertIn('bodyType = "PutFavoritesBySalonIdBody",', ops)
        self.assertIn("        getSalonsBySalonId,\n        putFavoritesBySalonId,\n", ops)
        self.assertIn(self.sha, ops)

    def test_fixtures_follow_the_response_schema(self) -> None:
        fixtures = self.files["MockFixtures.kt"]
        self.assertIn('"GetSalonsBySalonId" to "', fixtures)
        decoded = api_sync.sample_value(SPEC["paths"]["/customer/v1/salons/{salonId}"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["properties"]["data"], "data", {})
        self.assertEqual("id-1", decoded["id"])
        self.assertEqual(["id-1", "id-2", "id-3"], [item["id"] for item in api_sync.sample_value({"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string"}}}}, "items", {})])
        self.assertEqual("MALE", decoded["gender"])
        self.assertEqual(3, len(decoded["staff"]))
        self.assertEqual(api_sync.TEXT_MARKER, decoded["staff"][0]["name"])
        self.assertEqual(1.5, decoded["rating"])
        self.assertIn('"PutFavoritesBySalonId" to "', fixtures)
        country = api_sync.sample_value({"type": "object", "properties": {"code": {"type": "string"}, "dialCode": {"type": "string"}, "phoneRegex": {"type": "string"}}}, "c", {})
        self.assertEqual({"code": "JO", "dialCode": "+962", "phoneRegex": "^7[789][0-9]{7}$"}, country)

    def test_check_mode_detects_stale_and_extra_files(self) -> None:
        self.assertEqual(1, api_sync.main(["--check", "--spec", str(self.spec), "--out", str(self.out)]))
        self.assertEqual(0, api_sync.main(["--spec", str(self.spec), "--out", str(self.out)]))
        self.assertEqual(0, api_sync.main(["--check", "--spec", str(self.spec), "--out", str(self.out)]))
        (self.out / "Old.kt").write_text("x", encoding="utf-8")
        self.assertEqual(1, api_sync.main(["--check", "--spec", str(self.spec), "--out", str(self.out)]))
        self.assertEqual(0, api_sync.main(["--spec", str(self.spec), "--out", str(self.out)]))
        self.assertFalse((self.out / "Old.kt").exists())


if __name__ == "__main__":
    unittest.main()
