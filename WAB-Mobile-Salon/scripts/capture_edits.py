"""Mutating capture flows of capture_remote_fixtures.py (MER-054): salon settings, a throwaway branch, team member,
salon application and the member account. Every setting is written back with the value it had; throwaway records are
deleted, closed or deactivated again (see capture_flows.py)."""
from __future__ import annotations

import base64
from datetime import date, timedelta

from capture_remote_fixtures import CONFIG, Recorder, installation, phone, proof, throwaway_number

IMAGE = base64.b64decode(CONFIG["uploadImage"]["base64"])
DOCUMENT = CONFIG["uploadDocument"]["text"].encode()
POLICY_FIELDS = ("cancellationWindowHours", "paymentOptions", "depositPercentage", "depositRefundableOnCustomerCancel",
                 "fullPaymentRefundOnCustomerCancel", "noShowDeposit", "noShowFullPayment", "notes")


def day(offset: int) -> str:
    return (date.today() + timedelta(days=offset)).isoformat()


def weekly_body(hours: dict) -> dict:
    days = [{k: d[k] for k in ("day", "isOff", "open", "close") if k in d} for d in hours.get("weeklySchedule") or []]
    return {"days": days}


def upload_image(rec: Recorder, base: str, token: str, purpose: str) -> str | None:
    presigned = rec.call(base, "POST", "/uploads/presign", token=token,
                         body={"purpose": purpose, "contentType": CONFIG["uploadImage"]["contentType"], "size": len(IMAGE)})
    if not rec.upload(presigned, IMAGE):
        return None
    confirmed = rec.call(base, "POST", "/uploads/confirm", body={"key": presigned["key"]}, token=token)
    return (confirmed or {}).get("key")


def capture_salon_edits(rec: Recorder, base: str, token: str, salon: dict) -> None:
    profile = salon["salon"]
    rec.call(base, "PATCH", "/salon/profile", token=token, body={"description": profile.get("description")})
    key = upload_image(rec, base, token, "GALLERY_IMAGE")
    if key:
        item = rec.call(base, "POST", "/salon/gallery", body={"type": "IMAGE", "key": key}, token=token) or {}
        gallery = rec.call(base, "GET", "/salon/gallery", token=token, save=False, label="GetSalonGallery(after add)") or []
        rec.call(base, "PUT", "/salon/gallery/order", body={"ids": [g["id"] for g in gallery]}, token=token)
        if item.get("id"):
            rec.call(base, "DELETE", "/salon/gallery/{id}", params={"id": item["id"]}, token=token)
    weekly = weekly_body(salon["hours"])
    rec.call(base, "POST", "/salon/hours/weekly/preview", body=weekly, token=token)
    rec.call(base, "PUT", "/salon/hours/weekly", body=weekly, token=token)
    closure_range = {"from": day(CONFIG["closureDaysAhead"]), "to": day(CONFIG["closureDaysAhead"])}
    rec.call(base, "POST", "/salon/hours/closures/preview", body=closure_range, token=token)
    closure = rec.call(base, "POST", "/salon/hours/closures", body={**closure_range, "reason": CONFIG["captureLabel"]}, token=token)
    if closure:
        rec.call(base, "PATCH", "/salon/hours/closures/{id}", params={"id": closure["id"]}, body={"reason": CONFIG["captureLabel"]}, token=token)
        rec.call(base, "DELETE", "/salon/hours/closures/{id}", params={"id": closure["id"]}, token=token)
    policy = rec.call(base, "GET", "/salon/policy", token=token, save=False, label="GetSalonPolicy(before put)")
    if policy:
        rec.call(base, "PUT", "/salon/policy", token=token, body={k: policy[k] for k in POLICY_FIELDS if policy.get(k) is not None})
    offered = {s.get("catalogServiceId") for s in salon["services"]}
    catalog = rec.call(base, "GET", "/catalog/services", query={"page": 1, "pageSize": 100, "gender": profile.get("gender")},
                       token=token, save=False, label="GetCatalogServices(all)") or []
    spare = next((c for c in catalog if c["id"] not in offered), None)
    if spare:
        created = rec.call(base, "POST", "/salon/services", token=token, body={
            "catalogServiceId": spare["id"], "price": "10.000", "durationMinutes": 30, "active": False,
            "extraDescription": CONFIG["captureLabel"]})
        if created:
            rec.call(base, "PATCH", "/salon/services/{id}", params={"id": created["id"]}, body={"active": False}, token=token)
    rec.call(base, "POST", "/catalog/requests", token=token,
             body={"name": CONFIG["captureLabel"], "description": CONFIG["captureLabel"]})


def capture_branch(rec: Recorder, base: str, token: str, salon: dict, ctx: dict) -> None:
    """A throwaway branch: create, read, edit, hours, closure, service, offline → online, close."""
    main = salon["main"]
    body = {"name": {"ar": "فرع تجريبي", "en": CONFIG["captureLabel"]}, "location": main.get("location"),
            "locationText": CONFIG["captureLabel"], "cityId": main.get("cityId") or ctx["cities"][0]["id"],
            "areaId": main.get("areaId") or ctx["areas"][0]["id"], "phone": main.get("phone")}
    branch = rec.call(base, "POST", "/branches", body=body, token=token)
    if not branch:
        return
    ids = {"branchId": branch["id"]}
    rec.call(base, "PATCH", "/branches/{branchId}", params=ids, body={"whatsapp": None}, token=token)
    hours = rec.call(base, "GET", "/branches/{branchId}/hours", params=ids, token=token, save=False, label="GetBranchesByBranchIdHours(new)") or {}
    weekly = weekly_body(hours)
    rec.call(base, "POST", "/branches/{branchId}/hours/weekly/preview", params=ids, body=weekly, token=token)
    rec.call(base, "PUT", "/branches/{branchId}/hours/weekly", params=ids, body=weekly, token=token)
    closure_range = {"from": day(CONFIG["closureDaysAhead"]), "to": day(CONFIG["closureDaysAhead"])}
    rec.call(base, "POST", "/branches/{branchId}/hours/closures/preview", params=ids, body=closure_range, token=token)
    closure = rec.call(base, "POST", "/branches/{branchId}/hours/closures", params=ids, token=token,
                       body={**closure_range, "reason": CONFIG["captureLabel"]})
    if closure:
        both = {**ids, "id": closure["id"]}
        rec.call(base, "PATCH", "/branches/{branchId}/hours/closures/{id}", params=both, body={"reason": CONFIG["captureLabel"]}, token=token)
        rec.call(base, "DELETE", "/branches/{branchId}/hours/closures/{id}", params=both, token=token)
    catalog_id = next((s.get("catalogServiceId") for s in salon["services"]), None)
    if catalog_id:
        service = rec.call(base, "POST", "/branches/{branchId}/services", params=ids, token=token,
                           body={"catalogServiceId": catalog_id, "price": "10.000", "durationMinutes": 30})
        if service:
            rec.call(base, "PATCH", "/branches/{branchId}/services/{id}", params={**ids, "id": service["id"]},
                     body={"active": False}, token=token)
    rec.call(base, "POST", "/branches/{branchId}/offline", params=ids, body={"reason": CONFIG["captureLabel"]}, token=token)
    rec.call(base, "POST", "/branches/{branchId}/online", params=ids, token=token)
    rec.expect("closing the main branch is refused", base, "POST", "/branches/{branchId}/close", 422, "INVALID_TRANSITION",
               params={"branchId": main.get("id")}, token=token)
    rec.call(base, "POST", "/branches/{branchId}/close", params=ids, token=token)


def capture_team(rec: Recorder, base: str, token: str, salon: dict) -> None:
    """A throwaway employee of the main branch: edit, staff profile, leave, deactivate / reactivate, own account calls,
    then leaves the salon by itself (`POST /me/leave`)."""
    number = throwaway_number()
    member = rec.call(base, "POST", "/team/members", token=token, body={
        "firstName": "Capture", "lastName": "Member", "phone": phone(number), "role": "EMPLOYEE",
        "permissions": ["BOOKINGS_VIEW_OWN"], "branchId": salon["main"].get("id")})
    if not member:
        return
    ids = {"id": member["id"]}
    rec.call(base, "PATCH", "/team/members/{id}", params=ids, body={"lastName": "Fixture"}, token=token)
    staff = rec.call(base, "GET", "/team/members/{id}/staff", params=ids, token=token, save=False, label="GetTeamMembersByIdStaff(new)") or {}
    profile = {"providesServices": True, "serviceIds": [s["id"] for s in salon["services"][:1]], "brideQualified": False,
               "workingDays": [{"day": d["day"]} for d in (salon["hours"].get("weeklySchedule") or []) if not d.get("isOff")][:1],
               "bio": CONFIG["captureLabel"], "yearsOfExperience": staff.get("yearsOfExperience") or 1}
    rec.call(base, "POST", "/team/members/{id}/staff/preview", params=ids, body=profile, token=token)
    rec.call(base, "PUT", "/team/members/{id}/staff", params=ids, body=profile, token=token)
    leave_range = {"from": day(CONFIG["leaveDaysAhead"]), "to": day(CONFIG["leaveDaysAhead"])}
    rec.call(base, "POST", "/team/members/{id}/leaves/preview", params=ids, body=leave_range, token=token)
    leave = rec.call(base, "POST", "/team/members/{id}/leaves", params=ids, body={**leave_range, "note": CONFIG["captureLabel"]}, token=token)
    if leave:
        both = {**ids, "leaveId": leave["id"]}
        rec.call(base, "PATCH", "/team/members/{id}/leaves/{leaveId}", params=both, body={"note": None}, token=token)
        rec.call(base, "DELETE", "/team/members/{id}/leaves/{leaveId}", params=both, token=token)
    rec.call(base, "POST", "/team/members/{id}/deactivate", params=ids, token=token)
    rec.call(base, "POST", "/team/members/{id}/reactivate", params=ids, token=token)
    session = rec.call(base, "POST", "/auth/login", save=False, label="login(member)", body={
        "phone": phone(number), "otpToken": proof(rec, base, number, "LOGIN"), "installation": installation(number)}) or {}
    own = session.get("accessToken")
    rec.call(base, "PUT", "/installations", body={**installation(number), "language": CONFIG["language"]}, token=own)
    rec.call(base, "PATCH", "/installations/push-enabled", body={"pushEnabled": True}, token=own)
    rec.call(base, "PATCH", "/me", body={"firstName": "Capture"}, token=own)
    moved = throwaway_number()
    moved_token = proof(rec, base, moved, "CHANGE_PHONE", wrong_first=True)
    rec.call(base, "POST", "/auth/change-phone", body={"phone": phone(moved), "otpToken": moved_token}, token=own)
    rec.call(base, "POST", "/me/leave", token=own)
    rec.call(base, "POST", "/me/leave", token=own, save=False, label="PostMeLeave(again)")


def capture_application(rec: Recorder, base: str, ctx: dict, gender: str) -> None:
    """A salon application of a throwaway phone (license upload → apply → status → deletion request)."""
    number = throwaway_number()
    rec.call(base, "POST", "/auth/check-phone", body={"phone": phone(number)}, save=False, label="PostAuthCheckPhone(new)")
    register_token = proof(rec, base, number, "REGISTER")
    presigned = rec.call(base, "POST", "/uploads/license/presign",
                         body={"contentType": CONFIG["uploadDocument"]["contentType"], "size": len(DOCUMENT)})
    if not rec.upload(presigned, DOCUMENT):
        return
    rec.call(base, "POST", "/uploads/license/confirm", body={"key": presigned["key"]})
    applied = rec.call(base, "POST", "/salon/applications", body={
        "phone": phone(number), "otpToken": register_token, "firstName": "Capture", "lastName": "Owner",
        "salon": {"name": CONFIG["captureLabel"], "gender": gender, "cityId": ctx["cities"][0]["id"], "areaId": ctx["areas"][0]["id"]},
        "documentKeys": [presigned["key"]], "installation": installation(number)}) or {}
    token = applied.get("accessToken")
    rec.call(base, "GET", "/salon/application", token=token, save=False, label="GetSalonApplication(pending)")
    rec.call(base, "PUT", "/salon/payout-details", token=token, body={
        "bankName": "Capture Bank", "accountHolderName": "Capture Owner", "iban": CONFIG["testIban"],
        "otpToken": proof(rec, base, number, "BANK_DETAILS")})
    rec.call(base, "POST", "/salon/deletion-request", body={"note": CONFIG["captureLabel"]}, token=token)
    rec.call(base, "POST", "/auth/logout", body={"refreshToken": applied.get("refreshToken")}, token=token,
             save=False, label="PostAuthLogout(applicant)")


def capture_account(rec: Recorder, base: str, token: str, owner: str) -> None:
    """The owner's own account settings, written back unchanged."""
    me = rec.call(base, "GET", "/me", token=token, save=False, label="GetMe(before patch)") or {}
    rec.call(base, "PATCH", "/me", body={"firstName": me.get("firstName")}, token=token, save=False, label="PatchMe(owner)")
    rec.call(base, "PATCH", "/installations/push-enabled", body={"pushEnabled": me.get("pushEnabled", True)}, token=token,
             save=False, label="PatchInstallationsPushEnabled(owner)")
    rec.call(base, "POST", "/auth/otp/request", body={"phone": CONFIG["dialCode"] + owner, "purpose": "BANK_DETAILS"},
             token=token, save=False, label="PostAuthOtpRequest(BANK_DETAILS)")
