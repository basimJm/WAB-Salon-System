"""Unit tests for the WhatsApp-OTP proof of the capture scripts (MER-070, BUSINESS_DOMAIN §3.1a).

The capture flows used a stateless `fake-otp:` proof; the server now issues a single-use `otpToken` after
`POST /auth/otp/verify`, so every proof is request → verify with the local stack's fixed code.
"""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import capture_remote_fixtures as capture  # noqa: E402

BASE = "http://127.0.0.1:4000"
NUMBER = "791234567"
TOKEN = "otp-token-1"


class ScriptedRecorder(capture.Recorder):
    """Answers like the local stack and records every call instead of sending it."""

    def __init__(self, out: Path):
        super().__init__(out)
        self.calls: list[dict] = []

    def call(self, base, method, template, params=None, query=None, body=None, token=None, save=True, label=None,
             namespace=capture.MERCHANT):
        self.calls.append({"path": template, "body": body, "save": save, "label": label, "namespace": namespace})
        wrong = template.endswith("/verify") and body.get("code") != capture.CONFIG["otpFixedCode"]
        self.report.append({"status": capture.UNAUTHORIZED if wrong else 200,
                            "error": {"code": "OTP_INVALID"} if wrong else None})
        if template.endswith("/verify") and not wrong:
            return {"otpToken": TOKEN, "expiresInSeconds": 600}
        return {"allowed": True, "otpLength": 6, "resendAfterSeconds": 60, "expiresInSeconds": 300}


class CaptureOtpTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.rec = ScriptedRecorder(Path(self.tmp.name))

    def tearDown(self):
        self.tmp.cleanup()

    def test_proof_requests_then_verifies_the_fixed_code_and_returns_the_token(self):
        token = capture.proof(self.rec, BASE, NUMBER, "LOGIN")
        self.assertEqual(TOKEN, token)
        self.assertEqual(["/auth/otp/request", "/auth/otp/verify"], [c["path"] for c in self.rec.calls])
        expected = {"phone": capture.CONFIG["dialCode"] + NUMBER, "purpose": "LOGIN"}
        self.assertEqual(expected, self.rec.calls[0]["body"])
        self.assertEqual({**expected, "code": capture.CONFIG["otpFixedCode"]}, self.rec.calls[1]["body"])
        self.assertFalse(any(c["save"] for c in self.rec.calls), "only the owner sign-in saves fixtures")

    def test_saved_proof_keeps_the_operation_ids_and_the_namespace(self):
        capture.proof(self.rec, BASE, NUMBER, "BOOKING_CONFIRMATION", save=True, namespace=capture.CUSTOMER)
        self.assertTrue(all(c["save"] and c["label"] is None for c in self.rec.calls))
        self.assertTrue(all(c["namespace"] == capture.CUSTOMER for c in self.rec.calls))

    def test_wrong_first_probes_one_wrong_code_as_otp_invalid(self):
        token = capture.proof(self.rec, BASE, NUMBER, "CHANGE_PHONE", wrong_first=True)
        self.assertEqual(TOKEN, token)
        codes = [c["body"].get("code") for c in self.rec.calls if c["path"].endswith("/verify")]
        self.assertEqual([capture.CONFIG["otpWrongCode"], capture.CONFIG["otpFixedCode"]], codes)
        self.assertEqual([True], [check["ok"] for check in self.rec.checks])

    def test_config_codes_differ_and_tokens_are_redacted(self):
        self.assertNotEqual(capture.CONFIG["otpFixedCode"], capture.CONFIG["otpWrongCode"])
        redacted = capture.redact({"data": {"otpToken": TOKEN, "expiresInSeconds": 600}})
        self.assertEqual(capture.REDACTED, redacted["data"]["otpToken"])
        self.assertNotIn("fakeProofFormat", capture.CONFIG)


if __name__ == "__main__":
    unittest.main()
