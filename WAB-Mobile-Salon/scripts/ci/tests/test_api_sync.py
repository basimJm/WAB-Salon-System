"""Unit tests for scripts/api_sync.py (the Kotlin contract generator)."""
from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import api_sync  # noqa: E402

SPEC = {
    "paths": {
        "/merchant/v1/salons/{salonId}": {
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
                        "audience": {"$ref": "#/components/schemas/Audience"},
                    }},
                }}}}}},
            },
        },
        "/merchant/v1/favorites/{salonId}": {
            "put": {"tags": ["Favorites"], "requestBody": {"content": {"application/json": {"schema": {"type": "object", "properties": {"note": {"type": "string"}}}}}},
                    "responses": {"200": {"content": {"application/json": {"schema": {"type": "object", "properties": {"data": {"type": "null"}}}}}}}},
        },
    },
    "components": {"schemas": {"Audience": {"type": "string", "enum": ["MALE", "FEMALE", "BOTH"]}, "CustomerProfile": {"type": "object", "required": ["id"], "properties": {"id": {"type": "string"}, "email": {"type": ["string", "null"]}}}}},
}


class ApiSyncTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.spec = Path(self.tmp.name) / "openapi.customer.json"
        self.spec.write_text(json.dumps(SPEC), encoding="utf-8")
        self.out = Path(self.tmp.name) / "generated"
        self.test_out = Path(self.tmp.name) / "generated-test"
        self.captured = Path(self.tmp.name) / "captured"
        self.files, self.sha, self.test_files = api_sync.generate(self.spec)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_operation_ids_follow_method_and_path(self) -> None:
        self.assertEqual("GetSalonsBySalonId", api_sync.operation_id("get", "/merchant/v1/salons/{salonId}"))
        self.assertEqual("PostBookingsDraftsByIdVerifyOtp", api_sync.operation_id("post", "/merchant/v1/bookings/drafts/{id}/verify-otp"))

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

    def test_scalar_component_refs_inline_their_type_and_enum(self) -> None:
        kotlin = self.files["SalonDetailsDtos.kt"]
        self.assertIn("/** One of: MALE, FEMALE, BOTH. */\n    val audience: String? = null,", kotlin)
        self.assertNotIn("class Audience", self.files["Components.kt"])

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
        decoded = api_sync.sample_value(SPEC["paths"]["/merchant/v1/salons/{salonId}"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["properties"]["data"], "data", {})
        self.assertEqual("id-1", decoded["id"])
        self.assertEqual(["id-1", "id-2", "id-3"], [item["id"] for item in api_sync.sample_value({"type": "array", "items": {"type": "object", "properties": {"id": {"type": "string"}}}}, "items", {})])
        self.assertEqual("MALE", decoded["gender"])
        self.assertEqual(3, len(decoded["staff"]))
        self.assertEqual(api_sync.TEXT_MARKER, decoded["staff"][0]["name"])
        self.assertEqual(1.5, decoded["rating"])
        self.assertIn('"PutFavoritesBySalonId" to "', fixtures)
        country = api_sync.sample_value({"type": "object", "properties": {"code": {"type": "string"}, "dialCode": {"type": "string"}, "phoneRegex": {"type": "string"}}}, "c", {})
        self.assertEqual({"code": "JO", "dialCode": "+962", "phoneRegex": "^7[789][0-9]{7}$"}, country)
        otp = api_sync.sample_value({"type": "object", "properties": {"allowed": {"type": "boolean"}, "otpLength": {"type": "integer"}, "enabled": {"type": "boolean"}}}, "o", {})
        self.assertEqual({"allowed": True, "otpLength": 6, "enabled": False}, otp)

    def args(self, *extra: str) -> list[str]:
        return [*extra, "--spec", str(self.spec), "--out", str(self.out), "--test-out", str(self.test_out), "--captured", str(self.captured)]

    def test_check_mode_detects_stale_and_extra_files(self) -> None:
        self.assertEqual(1, api_sync.main(self.args("--check")))
        self.assertEqual(0, api_sync.main(self.args()))
        self.assertEqual(0, api_sync.main(self.args("--check")))
        (self.out / "Old.kt").write_text("x", encoding="utf-8")
        self.assertEqual(1, api_sync.main(self.args("--check")))
        self.assertEqual(0, api_sync.main(self.args()))
        self.assertFalse((self.out / "Old.kt").exists())
        self.assertTrue((self.test_out / api_sync.DECODERS_FILE).is_file())

    def test_captured_response_replaces_the_schema_fixture_with_data_last(self) -> None:
        self.captured.mkdir()
        real = {"success": True, "data": [{"id": "s1"}], "meta": {"page": 1, "pageSize": 10, "total": 1}, "message": "Done"}
        (self.captured / "GetSalonsBySalonId.json").write_text(json.dumps(real), encoding="utf-8")
        files, _, _ = api_sync.generate(self.spec, self.captured)
        fixtures = files["MockFixtures.kt"]
        self.assertIn('\\"meta\\": {\\"page\\": 1, \\"pageSize\\": 10, \\"total\\": 1}, \\"data\\": [{\\"id\\": \\"s1\\"}]}', fixtures)
        self.assertIn('val captured: Set<String> = setOf(\n        "GetSalonsBySalonId",\n    )', fixtures)
        self.assertIn('val captured: Set<String> = setOf(\n    )', self.files["MockFixtures.kt"])

    def test_decoders_map_every_operation_to_its_data_serializer(self) -> None:
        decoders = self.test_files[api_sync.DECODERS_FILE]
        self.assertIn('"GetSalonsBySalonId" to serializer<GetSalonsBySalonIdData>(),', decoders)
        self.assertIn('"PutFavoritesBySalonId" to serializer<JsonElement>(),', decoders)
        self.assertIn(self.sha, decoders)

    def test_nullable_data_decodes_as_a_nullable_type(self) -> None:
        spec = {"paths": {"/merchant/v1/salon/policy": {"get": {"tags": ["Salon policy"], "responses": {"200": {"content": {"application/json": {
            "schema": {"type": "object", "properties": {"data": {"type": ["object", "null"], "properties": {"notes": {"type": "string"}}}}}}}}}}}}}
        renderer = api_sync.Renderer(spec)
        renderer.render("openapi.merchant.json", "sha")
        self.assertEqual("GetSalonPolicyData?", renderer.data_types["GetSalonPolicy"])


SNAPSHOT = api_sync.DEFAULT_OUT / "openapi.snapshot.json"
APPLICATIONS_PATH = api_sync.NAMESPACE_PREFIX + "/salon/applications"


def _patterns(node: object) -> list[str]:
    if isinstance(node, dict):
        found = [node["pattern"]] if isinstance(node.get("pattern"), str) else []
        return found + [p for value in node.values() for p in _patterns(value)]
    if isinstance(node, list):
        return [p for value in node for p in _patterns(value)]
    return []


class CommittedContractTest(unittest.TestCase):
    """MER-068: the committed snapshot is the 1.4.0 contract fixed by SRV-151 (REMOTE_DEV_GAPS #9 and #11)."""

    def setUp(self) -> None:
        self.snapshot = json.loads(SNAPSHOT.read_text(encoding="utf-8"))

    def test_id_patterns_are_plain_regexes_without_flags(self) -> None:
        patterns = _patterns(self.snapshot)
        self.assertTrue(patterns)
        for pattern in patterns:
            self.assertFalse(pattern.endswith("/i"), pattern)
            self.assertIsNotNone(re.compile(pattern))
            self.assertTrue(pattern.startswith("^") and pattern.endswith("$"), pattern)

    def test_application_member_is_the_shared_member_profile(self) -> None:
        schema = self.snapshot["paths"][APPLICATIONS_PATH]["post"]["responses"]["201"]["content"]["application/json"]["schema"]
        data = schema["properties"]["data"]
        self.assertEqual("#/components/schemas/MemberProfile", data["properties"]["member"]["$ref"])


if __name__ == "__main__":
    unittest.main()
