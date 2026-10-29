#!/usr/bin/env python3
"""Capture real customer-API responses as contract fixtures (CUS-060).

Usage:
  python3 scripts/capture_remote_fixtures.py --public-base <dev API origin> [--auth-base <local API origin>]
      [--phone <seeded customer number>] [--out core/data/fixtures/remote]

* Public, read-only operations come from --public-base (the hosted dev API); no credential is ever sent there.
* Authenticated operations are captured from --auth-base, which must be a local stack (localhost / 127.0.0.1) running
  `OTP_PROVIDER=fake OTP_FIXED_CODE=<code>`: every phone proof is `otp/request` + `otp/verify` with that code
  (`--otp-code`, default `fakeOtpCode` in the config) → the single-use `otpToken` (BUSINESS_DOMAIN §3.1a). The script
  registers a throwaway customer, walks the booking flow on it, then deletes that account; the seeded customer
  (--phone) is only read.
* Each success envelope is written to `<out>/<OperationId>.json` (tokens redacted); `api_sync.py` embeds them in
  `MockFixtures` and the Kotlin contract tests decode them with the app's DTOs. Every call (also failures) is listed in
  `build/remote-capture-report.json` (not committed) for the gap list (docs/REMOTE_DEV_GAPS.md).
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
from datetime import date, timedelta
from pathlib import Path

from capture_otp import otp_token

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = PROJECT_ROOT / "core/data/fixtures/remote"
REPORT = PROJECT_ROOT / "build/remote-capture-report.json"
CONFIG = json.loads((PROJECT_ROOT / "config/remote-capture.json").read_text(encoding="utf-8"))
PREFIX = "/app/v1"
LOCAL_HOSTS = tuple(CONFIG["localHosts"])
OTP_CODE = CONFIG["fakeOtpCode"]
REDACTED = "<redacted>"
SECRET_KEYS = ("accessToken", "refreshToken", "otpToken")
LANGUAGE = CONFIG["language"]
TIMEOUT_S = CONFIG["timeoutSeconds"]
DIAL = CONFIG["dialCode"]
COUNTRY = CONFIG["countryCode"]
PLATFORM = CONFIG["platform"]
APP_VERSION = CONFIG["appVersion"]
PAGE = {"page": 1, "pageSize": CONFIG["pageSize"]}
BOOKING_DAYS_AHEAD = range(*CONFIG["bookingDaysAhead"])
THROWAWAY_PREFIX = CONFIG["throwawayPrefix"]
NEAREST = CONFIG["nearestProbe"]
SLUGS = CONFIG["contentSlugs"]
SIGNED_URL_MARKER = CONFIG["signedUrlMarker"]
SIGNED_URL_PLACEHOLDER = CONFIG["signedUrlPlaceholder"]
# Local-stack media (MinIO) → the dev CDN, so mock mode shows the same demo images and no local origin lands in git.
MEDIA_REWRITE = CONFIG["localMediaRewrite"]
RATE_LIMITED = 429
RATE_LIMIT_RETRIES = CONFIG["rateLimitRetries"]
RATE_LIMIT_WAIT_S = CONFIG["rateLimitWaitSeconds"]


def operation_id(method: str, path: str) -> str:
    """Same naming as api_sync.py (`GET /app/v1/salons/{salonId}` → `GetSalonsBySalonId`)."""
    parts = []
    for segment in path[len(PREFIX):].strip("/").split("/"):
        if segment.startswith("{"):
            parts.append("By" + segment[1:-1][:1].upper() + segment[1:-1][1:])
        elif segment:
            parts.append("".join(p[:1].upper() + p[1:] for p in segment.replace("_", "-").split("-")))
    return method.capitalize() + "".join(parts)


def redact(value):
    """Replaces tokens and pre-signed URLs (they carry storage credentials) anywhere in a JSON tree."""
    if isinstance(value, dict):
        return {k: (REDACTED if k in SECRET_KEYS and isinstance(v, str) else redact(v)) for k, v in value.items()}
    if isinstance(value, str) and SIGNED_URL_MARKER in value:
        return SIGNED_URL_PLACEHOLDER
    if isinstance(value, str) and value.startswith(MEDIA_REWRITE["from"]):
        return MEDIA_REWRITE["to"] + value[len(MEDIA_REWRITE["from"]):]
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
    return float(RATE_LIMIT_WAIT_S * (attempt + 1))


def send(request: urllib.request.Request) -> tuple[int, str]:
    """One request; a 429 (shared local stack, per-IP limiter) waits and retries instead of failing the capture."""
    for attempt in range(RATE_LIMIT_RETRIES + 1):
        try:
            with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
                return response.status, response.read().decode()
        except urllib.error.HTTPError as error:
            text = error.read().decode()
            if error.code != RATE_LIMITED or attempt == RATE_LIMIT_RETRIES:
                return error.code, text
            time.sleep(retry_delay(error.headers, attempt))
    return RATE_LIMITED, ""


class Recorder:
    def __init__(self, out: Path):
        self.out = out
        self.report: list[dict] = []

    def call(self, base, method, template, params=None, query=None, body=None, token=None, save=True, label=None):
        path = template
        for key, val in (params or {}).items():
            path = path.replace("{" + key + "}", urllib.parse.quote(str(val), safe=""))
        url = base.rstrip("/") + PREFIX + path
        if query:
            url += "?" + urllib.parse.urlencode(query, doseq=True)
        headers = {"Accept": "application/json", "Accept-Language": LANGUAGE, "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        data = json.dumps(body).encode() if body is not None else None
        status, text = send(urllib.request.Request(url, data=data, method=method, headers=headers))
        try:
            payload = json.loads(text) if text else None
        except ValueError:
            payload = {"raw": text[:200]}
        op = operation_id(method, PREFIX + template)
        entry = {"operation": label or op, "method": method, "path": template, "query": query, "status": status}
        if not (200 <= status < 300):
            entry["error"] = payload.get("error") if isinstance(payload, dict) else payload
        self.report.append(entry)
        if save and 200 <= status < 300 and isinstance(payload, dict):
            (self.out / f"{op}.json").write_text(json.dumps(redact(payload), indent=2, ensure_ascii=False) + "\n")
        print(f"{status} {method} {template} {query or ''} -> {label or op}")
        return payload.get("data") if isinstance(payload, dict) else None


def capture_public(rec: Recorder, base: str, gender: str) -> dict:
    """Read-only operations without a token; returns ids for the next steps."""
    rec.call(base, "GET", "/config", query={"platform": PLATFORM, "version": APP_VERSION})
    countries = rec.call(base, "GET", "/locations/countries") or []
    cities = rec.call(base, "GET", "/locations/cities", query={"countryCode": COUNTRY}) or []
    areas = rec.call(base, "GET", "/locations/areas", query={"cityId": cities[0]["id"]}) if cities else []
    for index, slug in enumerate(SLUGS):
        rec.call(base, "GET", "/content/pages/{slug}", params={"slug": slug}, save=index == 0, label=f"GetContentPagesBySlug({slug})")
    rec.call(base, "GET", "/content/faqs")
    services = rec.call(base, "GET", "/catalog/services", query={**PAGE, "gender": gender}) or []
    rec.call(base, "GET", "/home", query={"gender": gender, **NEAREST})
    rec.call(base, "GET", "/home", query={"gender": gender}, save=False, label="GetHome(no location)")
    salons = rec.call(base, "GET", "/salons", query={**PAGE, "gender": gender}) or []
    service_ids = [s["id"] for s in services[:1]]
    rec.call(base, "GET", "/salons", query={**PAGE, "gender": gender, "q": "a"}, save=False, label="GetSalons(q)")
    rec.call(base, "GET", "/salons", query={**PAGE, "gender": gender, "serviceIds": service_ids}, save=False, label="GetSalons(serviceIds repeated)")
    rec.call(base, "GET", "/salons", query={**PAGE, "gender": gender, "sort": "NEAREST", **NEAREST}, save=False, label="GetSalons(nearest)")
    rec.call(base, "GET", "/salons", query={**PAGE, "gender": gender, "general": "RECOMMENDED", "minRating": 1}, save=False, label="GetSalons(recommended)")
    rec.call(base, "GET", "/salons/filters", query={"gender": gender, "serviceIds": service_ids})
    salon = rec.call(base, "GET", "/salons/{salonId}", params={"salonId": salons[0]["id"]}) if salons else None
    staff = (salon or {}).get("staff") or []
    if staff:
        ids = {"salonId": salon["id"], "memberId": staff[0]["id"]}
        rec.call(base, "GET", "/salons/{salonId}/staff/{memberId}", params=ids)
        rec.call(base, "GET", "/salons/{salonId}/staff/{memberId}/reviews", params=ids, query=PAGE)
    if salon:
        rec.call(base, "GET", "/salons/{salonId}/reviews", params={"salonId": salon["id"]}, query=PAGE)
    return {"countries": countries, "cities": cities, "areas": areas or [], "salons": salons}


def installation(suffix: str) -> dict:
    return {"installationId": f"cus060-capture-{suffix}", "platform": PLATFORM, "appVersion": APP_VERSION}


def capture_authenticated(rec: Recorder, base: str, seeded_number: str, gender: str) -> None:
    if not is_local(base):
        raise SystemExit("capture: --auth-base must be a local stack (fake OTP provider); refusing to send proofs elsewhere")
    ctx = capture_public(rec, base, gender)
    seeded = {"countryCode": COUNTRY, "number": seeded_number}
    rec.call(base, "POST", "/auth/check-phone", body={"phone": seeded, "purpose": "LOGIN"})
    login = rec.call(base, "POST", "/auth/login", body={"phone": seeded, "otpToken": otp_token(rec, base, DIAL + seeded_number, "LOGIN", OTP_CODE, RATE_LIMIT_WAIT_S), "installation": installation(seeded_number)})
    token = (login or {}).get("accessToken")
    upcoming = rec.call(base, "GET", "/bookings", query={**PAGE, "tab": "UPCOMING"}, token=token)
    past = rec.call(base, "GET", "/bookings", query={**PAGE, "tab": "PAST"}, token=token, save=False, label="GetBookings(PAST)")
    first = (upcoming or past or [None])[0]
    if first:
        rec.call(base, "GET", "/bookings/{id}", params={"id": first["id"]}, token=token)
    rec.call(base, "GET", "/notifications", query=PAGE, token=token)
    rec.call(base, "GET", "/notifications/unread-count", token=token)
    throwaway(rec, base, ctx, gender)


def throwaway(rec: Recorder, base: str, ctx: dict, gender: str) -> None:
    """Registers a disposable customer, exercises every mutating operation on it, then deletes it."""
    number = THROWAWAY_PREFIX + "".join(random.choice("0123456789") for _ in range(5))
    e164 = DIAL + number
    phone = {"countryCode": COUNTRY, "number": number}
    rec.call(base, "POST", "/auth/check-phone", body={"phone": phone, "purpose": "REGISTER"}, save=False, label="PostAuthCheckPhone(REGISTER)")
    register_token = otp_token(rec, base, e164, "REGISTER", OTP_CODE, RATE_LIMIT_WAIT_S, save=True)
    city, area = ctx["cities"][0]["id"], ctx["areas"][0]["id"]
    reg = rec.call(base, "POST", "/auth/register", body={
        "firstName": "Capture", "lastName": "Fixture", "email": f"capture.{number}@wab.example", "gender": gender,
        "cityId": city, "areaId": area, "phone": phone, "otpToken": register_token, "installation": installation(number)})
    token, refresh = (reg or {}).get("accessToken"), (reg or {}).get("refreshToken")
    rec.call(base, "PUT", "/installations", body={**installation(number), "language": LANGUAGE}, token=token)
    rec.call(base, "PATCH", "/installations/push-enabled", body={"pushEnabled": True}, token=token)
    rec.call(base, "GET", "/profile", token=token)
    rec.call(base, "PATCH", "/profile", body={"firstName": "Capture", "language": LANGUAGE}, token=token)
    rec.call(base, "POST", "/uploads/presign", body={"purpose": "CUSTOMER_AVATAR", "contentType": "image/jpeg", "size": 1024}, token=token)
    rec.call(base, "DELETE", "/profile/avatar", token=token)
    salon_id = ctx["salons"][0]["id"] if ctx["salons"] else None
    if salon_id:
        rec.call(base, "PUT", "/favorites/{salonId}", params={"salonId": salon_id}, token=token)
        rec.call(base, "GET", "/favorites", query=PAGE, token=token)
        rec.call(base, "DELETE", "/favorites/{salonId}", params={"salonId": salon_id}, token=token)
        book(rec, base, salon_id, e164, token)
    inbox = rec.call(base, "GET", "/notifications", query=PAGE, token=token, save=False, label="GetNotifications(throwaway)") or []
    if inbox:
        rec.call(base, "POST", "/notifications/read", body={"ids": [inbox[0]["id"]]}, token=token)
    new_number = THROWAWAY_PREFIX + "".join(random.choice("0123456789") for _ in range(5))
    rec.call(base, "POST", "/auth/change-phone", body={"phone": {"countryCode": COUNTRY, "number": new_number}, "otpToken": otp_token(rec, base, DIAL + new_number, "CHANGE_PHONE", OTP_CODE, RATE_LIMIT_WAIT_S)}, token=token)
    renewed = rec.call(base, "POST", "/auth/refresh", body={"refreshToken": refresh}) or {}
    token, refresh = renewed.get("accessToken", token), renewed.get("refreshToken", refresh)
    rec.call(base, "DELETE", "/profile", token=token)
    rec.call(base, "POST", "/auth/logout", body={"refreshToken": refresh}, token=token)


def book(rec: Recorder, base: str, salon_id: str, e164: str, token: str) -> None:
    detail = rec.call(base, "GET", "/salons/{salonId}", params={"salonId": salon_id}, token=token, save=False, label="GetSalonsBySalonId(signed in)")
    branch = next((b["id"] for b in ((detail or {}).get("branches") or []) if b.get("isMain")), None)
    service = next((s for s in (detail or {}).get("services") or [] if s.get("branchId") in (None, branch) and not s.get("brideOnly")), None)  # main branch, non-VIP
    if service is None:
        return
    person = {"serviceIds": [service["id"]]}
    for days in BOOKING_DAYS_AHEAD:
        day = (date.today() + timedelta(days=days)).isoformat()
        body = {"date": day, "person": person, **({"branchId": branch} if branch else {})}
        availability = rec.call(base, "POST", "/salons/{salonId}/availability", params={"salonId": salon_id}, body=body, token=token)
        slot = next((s for s in (availability or {}).get("slots", []) if s.get("available")), None)
        if slot:
            break
    if not slot:
        return
    draft = rec.call(base, "POST", "/bookings/drafts", token=token, body={
        "salonId": salon_id, **({"branchId": branch} if branch else {}), "paymentMethod": "PAY_ON_ARRIVAL",
        "persons": [{"name": "Capture", "serviceIds": person["serviceIds"], "start": slot["start"]}]})
    if not draft:
        return
    rec.call(base, "GET", "/bookings/drafts/{id}", params={"id": draft["id"]}, token=token)
    rec.call(base, "POST", "/bookings/drafts/{id}/verify-otp", params={"id": draft["id"]}, body={"otpToken": otp_token(rec, base, e164, "BOOKING_CONFIRMATION", OTP_CODE, RATE_LIMIT_WAIT_S)}, token=token)
    booking = rec.call(base, "POST", "/bookings", body={"draftId": draft["id"]}, token=token)
    if booking:
        rec.call(base, "GET", "/bookings/{id}", params={"id": booking["id"]}, token=token, save=False, label="GetBookingsById(new)")
        rec.call(base, "POST", "/bookings/{id}/cancel", params={"id": booking["id"]}, body={"reasonText": "Fixture capture"}, token=token)
    spare = rec.call(base, "POST", "/bookings/drafts", token=token, save=False, label="PostBookingsDrafts(to delete)", body={
        "salonId": salon_id, **({"branchId": branch} if branch else {}), "paymentMethod": "PAY_ON_ARRIVAL",
        "persons": [{"name": "Capture", "serviceIds": person["serviceIds"], "start": slot["start"]}]})
    if spare:
        rec.call(base, "DELETE", "/bookings/drafts/{id}", params={"id": spare["id"]}, token=token)
    review = {"rating": 5, "comment": "Fixture capture"}
    rec.call(base, "POST", "/salons/{salonId}/reviews", params={"salonId": salon_id}, body=review, token=token)
    for member in (detail.get("staff") or [])[:1]:
        ids = {"salonId": salon_id, "memberId": member["id"]}
        rec.call(base, "POST", "/salons/{salonId}/staff/{memberId}/reviews", params=ids, body=review, token=token)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--public-base", required=True)
    parser.add_argument("--auth-base")
    parser.add_argument("--phone", help="seeded customer national number (local stack only)")
    parser.add_argument("--gender", default="FEMALE", choices=("MALE", "FEMALE"))
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--otp-code", default=OTP_CODE, help="OTP_FIXED_CODE of the local stack")
    args = parser.parse_args(argv)
    globals()["OTP_CODE"] = args.otp_code
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rec = Recorder(out)
    if args.auth_base:
        if not args.phone:
            parser.error("--auth-base needs --phone")
        capture_authenticated(rec, args.auth_base, args.phone, args.gender)
        for entry in rec.report:
            entry["source"] = "local"
    public_from = len(rec.report)
    capture_public(rec, args.public_base, args.gender)
    for entry in rec.report[public_from:]:
        entry["source"] = "dev"
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(rec.report, indent=2, ensure_ascii=False) + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
