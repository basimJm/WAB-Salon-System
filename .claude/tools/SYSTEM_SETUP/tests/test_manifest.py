"""TEMPLATE.json parsing and validation."""
from __future__ import annotations

import json

from _support import FIXTURE_TEMPLATES, TempDirTest

from manifest import DEFAULT_DEST, KINDS, ManifestError, available_kinds, load_manifest, parse_manifest

VALID = {"kind": "server", "description": "x", "placeholders": ["__SYSTEM_NAME__", "__APP_DIR_<n>__"],
         "sentinels": {"WAB": "__SYSTEM_PREFIX__"}, "rename_paths": {"WAB": "__SYSTEM_PREFIX__"},
         "skip": ["node_modules/**"], "post_generate": ["npm install"], "binary_globs": ["*.png"]}


class ManifestTest(TempDirTest):
    def test_parses_every_key_and_defaults_the_destination_by_kind(self):
        manifest = parse_manifest(VALID, self.root)
        self.assertEqual("server", manifest.kind)
        self.assertEqual(["__SYSTEM_NAME__", "__APP_DIR_<n>__", "__SYSTEM_PREFIX__"], manifest.tokens)
        self.assertEqual({"WAB": "__SYSTEM_PREFIX__"}, manifest.sentinels)
        self.assertEqual(["npm install"], manifest.post_generate)
        self.assertEqual(DEFAULT_DEST["server"], manifest.dest)
        self.assertEqual(".", parse_manifest(dict(VALID, kind="workspace"), self.root).dest)
        self.assertEqual("packages/x", parse_manifest(dict(VALID, dest="packages/x"), self.root).dest)

    def test_optional_keys_may_be_absent(self):
        manifest = parse_manifest({"kind": "admin", "description": "d", "placeholders": []}, self.root)
        self.assertEqual(({}, {}, [], [], []), (manifest.sentinels, manifest.rename_paths, manifest.skip,
                                                manifest.post_generate, manifest.binary_globs))

    def test_rejects_contract_violations(self):
        bad_cases = {
            "missing description": {"kind": "server", "placeholders": []},
            "unknown kind": dict(VALID, kind="backend"),
            "placeholder not a token": dict(VALID, placeholders=["SYSTEM_NAME"]),
            "sentinel target not a token": dict(VALID, sentinels={"@wab": "__NPM_SCOPE__/x"}),
            "empty sentinel literal": dict(VALID, sentinels={"": "__NPM_SCOPE__"}),
            "skip not a list": dict(VALID, skip="node_modules"),
            "dest escapes": dict(VALID, dest="../elsewhere"),
            "dest absolute": dict(VALID, dest="/tmp"),
        }
        for label, data in bad_cases.items():
            with self.assertRaises(ManifestError, msg=label):
                parse_manifest(data, self.root)

    def test_load_checks_folder_name_json_and_presence(self):
        (self.root / "server").mkdir()
        with self.assertRaises(ManifestError):
            load_manifest(self.root / "server")  # no TEMPLATE.json
        self.write("server/TEMPLATE.json", "{not json")
        with self.assertRaises(ManifestError):
            load_manifest(self.root / "server")
        self.write("server/TEMPLATE.json", json.dumps(dict(VALID, kind="admin")))
        with self.assertRaises(ManifestError):
            load_manifest(self.root / "server")  # kind != folder
        self.write("server/TEMPLATE.json", json.dumps(VALID))
        self.assertEqual("server", load_manifest(self.root / "server").kind)

    def test_fixture_templates_cover_every_kind(self):
        self.assertEqual(sorted(KINDS), available_kinds(FIXTURE_TEMPLATES))
        self.assertEqual([], available_kinds(self.root / "nowhere"))
        for kind in KINDS:
            load_manifest(FIXTURE_TEMPLATES / kind)
