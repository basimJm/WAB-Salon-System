#!/usr/bin/env python3
"""Capture real merchant-API responses as contract fixtures (MER-054).

Usage:
  python3 scripts/capture_remote_fixtures.py --public-base <dev API origin> [--auth-base <local API origin>
      --owner <owner number> --manager <branch manager number> --employee <branch employee number>]
      [--out core/data/fixtures/remote]

* Public, read-only GET operations are captured from --public-base (the hosted dev API). Nothing authenticated, no
  phone number and no credential is ever sent there.
* Everything else comes from --auth-base, which must be a local stack (localhost / 127.0.0.1) running the fake OTP
  provider: the phone proof is `fake-otp:valid:<E164>` (WAB-Server src/providers/otp/fake.ts). The seeded salon of
  --owner is read; mutations run on throwaway records (a team member, a branch, a closure, a leave, a gallery photo,
  bookings of a throwaway customer, a salon application of a throwaway phone) that the script removes, closes,
  deactivates or cancels again (capture_flows.py). Settings are written back with the values they had.
* --manager / --employee are branch members of the same salon: their answers are not saved, they prove the permission
  and branch filtering (report `permissions` section).
* Each success envelope is written to `<out>/<OperationId>.json` (tokens redacted, signed URLs replaced, local media
  rewritten to the dev CDN); `api_sync.py` embeds them in `MockFixtures` and the Kotlin contract tests decode them with
  the app's DTOs. Every call (also failures) is listed in `build/remote-capture-report.json` (not committed) for the
  gap list (docs/REMOTE_DEV_GAPS.md).
"""
from __future__ import annotations

import argparse
import json
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = PROJECT_ROOT / "core/data/fixtures/remote"
REPORT = PROJECT_ROOT / "build/remote-capture-report.json"
CONFIG = json.loads((PROJECT_ROOT / "config/remote-capture.json").read_text(encoding="utf-8"))
MERCHANT = "merchant"
CUSTOMER = "customer"
VERSION_SEGMENT = "v1"
LOCAL_HOSTS = tuple(CONFIG["localHosts"])
REDACTED = "<redacted>"
SECRET_KEYS = ("accessToken", "refreshToken", "idToken")
RATE_LIMITED = 429


def prefix(namespace: str) -> str:
    return f"/{namespace}/{VERSION_SEGMENT}"


def operation_id(method: str, path: str) -> str:
    """Same naming as api_sync.py (`GET /merchant/v1/team/members/{id}` → `GetTeamMembersById`)."""
    parts = []
    for segment in path.strip("/").split("/"):
        if segment.startswith("{"):
            name = segment[1:-1]
            parts.append("By" + name[:1].upper() + name[1:])
        elif segment:
            parts.append("".join(p[:1].upper() + p[1:] for p in segment.replace("_", "-").split("-")))
    return method.capitalize() + "".join(parts)


def redact(value):
    """Replaces tokens and pre-signed URLs (they carry storage credentials) anywhere in a JSON tree."""
    rewrite = CONFIG["localMediaRewrite"]
    if isinstance(value, dict):
        return {k: (REDACTED if k in SECRET_KEYS and isinstance(v, str) else redact(v)) for k, v in value.items()}
    if isinstance(value, str) and CONFIG["signedUrlMarker"] in value:
        return CONFIG["signedUrlPlaceholder"]
    if isinstance(value, str) and value.startswith(rewrite["from"]):
        return rewrite["to"] + value[len(rewrite["from"]):]
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


def is_local(base: str) -> bool:
    return urllib.parse.urlparse(base).hostname in LOCAL_HOSTS


def retry_delay(headers, attempt: int) -> float:
    """Seconds to wait after a 429: the server's `Retry-After` / `RateLimit-Reset`, else a growing default."""
    for name in ("Retry-After", "RateLimit-Reset"):
        value = headers.get(name) if headers else None
        if value and value.strip().isdigit():
            return float(value.strip()) + 1
    return float(CONFIG["rateLimitWaitSeconds"] * (attempt + 1))


def send(request: urllib.request.Request) -> tuple[int, bytes]:
    """One request; a 429 (shared local stack, per-IP limiter) waits and retries instead of failing the capture."""
    for attempt in range(CONFIG["rateLimitRetries"] + 1):
        try:
            with urllib.request.urlopen(request, timeout=CONFIG["timeoutSeconds"]) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            body = error.read()
            if error.code != RATE_LIMITED or attempt == CONFIG["rateLimitRetries"]:
                return error.code, body
            time.sleep(retry_delay(error.headers, attempt))
    return RATE_LIMITED, b""


def throwaway_number() -> str:
    return CONFIG["throwawayPrefix"] + "".join(random.choice("0123456789") for _ in range(CONFIG["throwawayDigits"]))


def proof(number: str) -> str:
    return CONFIG["fakeProofFormat"].format(CONFIG["dialCode"] + number)


def phone(number: str) -> dict:
    return {"countryCode": CONFIG["countryCode"], "number": number}


def installation(suffix: str) -> dict:
    return {"installationId": CONFIG["installationPrefix"] + suffix, "platform": CONFIG["platform"], "appVersion": CONFIG["appVersion"]}


class Recorder:
    def __init__(self, out: Path):
        self.out = out
        self.report: list[dict] = []
        self.checks: list[dict] = []

    def call(self, base, method, template, params=None, query=None, body=None, token=None, save=True, label=None,
             namespace=MERCHANT):
        path = template
        for key, val in (params or {}).items():
            path = path.replace("{" + key + "}", urllib.parse.quote(str(val), safe=""))
        url = base.rstrip("/") + prefix(namespace) + path
        if query:
            url += "?" + urllib.parse.urlencode(query, doseq=True)
        headers = {"Accept": "application/json", "Accept-Language": CONFIG["language"], "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        data = json.dumps(body).encode() if body is not None else None
        status, raw = send(urllib.request.Request(url, data=data, method=method, headers=headers))
        try:
            payload = json.loads(raw.decode()) if raw else None
        except ValueError:
            payload = {"raw": raw.decode(errors="replace")[:200]}
        op = operation_id(method, template) if namespace == MERCHANT else f"{namespace}:{operation_id(method, template)}"
        entry = {"operation": label or op, "method": method, "path": template, "query": query, "status": status}
        if not (200 <= status < 300):
            entry["error"] = payload.get("error") if isinstance(payload, dict) else payload
        self.report.append(entry)
        if save and namespace == MERCHANT and 200 <= status < 300 and isinstance(payload, dict):
            (self.out / f"{op}.json").write_text(json.dumps(redact(payload), indent=2, ensure_ascii=False) + "\n")
        print(f"{status} {method} {namespace} {template} {query or ''} -> {label or op}")
        return payload.get("data") if isinstance(payload, dict) else None

    def expect(self, name: str, base, method, template, status: int, code: str | None = None, empty: bool = False, **kwargs):
        """A permission / scope probe: records whether the answer had the expected status and error code ([empty]: an
        empty list as `data`)."""
        data = self.call(base, method, template, save=False, label=f"check:{name}", **kwargs)
        last = self.report[-1]
        got_code = (last.get("error") or {}).get("code") if isinstance(last.get("error"), dict) else None
        ok = last["status"] == status and (code is None or got_code == code) and (not empty or data == [])
        self.checks.append({"check": name, "expected": [status, code], "got": [last["status"], got_code], "ok": ok})
        return ok

    def upload(self, presigned: dict | None, content: bytes) -> bool:
        """PUTs bytes to a pre-signed local-storage target (MinIO of the local stack only)."""
        target = (presigned or {}).get("upload") or {}
        if not target.get("url") or not is_local(target["url"]):
            return False
        request = urllib.request.Request(target["url"], data=content, method=target.get("method", "PUT"),
                                         headers=target.get("headers") or {})
        status, _ = send(request)
        self.report.append({"operation": "storage:PUT", "status": status})
        return 200 <= status < 300


def capture_public(rec: Recorder, base: str, gender: str, save_config: bool = True) -> dict:
    """Read-only operations without a token; returns ids for the next steps. The hosted dev API may be in maintenance
    (a dev setting), so its config is only reported: the fixture comes from the local stack."""
    rec.call(base, "GET", "/config", query={"platform": CONFIG["platform"], "version": CONFIG["appVersion"]},
             save=save_config, label=None if save_config else "GetConfig(dev)")
    rec.call(base, "GET", "/locations/countries")
    cities = rec.call(base, "GET", "/locations/cities", query={"countryCode": CONFIG["countryCode"]}) or []
    areas = rec.call(base, "GET", "/locations/areas", query={"cityId": cities[0]["id"]}) if cities else []
    for index, slug in enumerate(CONFIG["contentSlugs"]):
        rec.call(base, "GET", "/content/pages/{slug}", params={"slug": slug}, save=index == 0, label=f"GetContentPagesBySlug({slug})")
    rec.call(base, "GET", "/content/faqs")
    rec.call(base, "GET", "/catalog/services", query={"page": 1, "pageSize": CONFIG["pageSize"], "gender": gender})
    return {"cities": cities, "areas": areas or []}


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--public-base", required=True)
    parser.add_argument("--auth-base")
    parser.add_argument("--owner", help="seeded salon owner national number (local stack only)")
    parser.add_argument("--manager", help="seeded branch manager of the same salon")
    parser.add_argument("--employee", help="seeded branch employee of the same salon")
    parser.add_argument("--checks-only", action="store_true", help="reads + permission / conflict probes, no edits")
    parser.add_argument("--gender", default="FEMALE", choices=("MALE", "FEMALE"))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    args = parser.parse_args(argv)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rec = Recorder(out)
    if args.auth_base:
        if not (args.owner and args.manager and args.employee):
            parser.error("--auth-base needs --owner, --manager and --employee")
        if not is_local(args.auth_base):
            raise SystemExit("capture: --auth-base must be a local stack (fake OTP provider); refusing to send proofs elsewhere")
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        from capture_flows import capture_authenticated  # noqa: E402

        ctx = capture_public(rec, args.auth_base, args.gender)
        capture_authenticated(rec, args.auth_base, ctx, args.owner, args.manager, args.employee, args.gender,
                              checks_only=args.checks_only)
        for entry in rec.report:
            entry["source"] = "local"
    public_from = len(rec.report)
    capture_public(rec, args.public_base, args.gender, save_config=not args.auth_base)
    for entry in rec.report[public_from:]:
        entry["source"] = "dev"
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps({"calls": rec.report, "permissions": rec.checks}, indent=2, ensure_ascii=False) + "\n")
    failed = [c for c in rec.checks if not c["ok"]]
    print(f"capture: {len(rec.report)} calls, {len(rec.checks)} permission checks, {len(failed)} unexpected")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
