"""Authenticated capture flows of capture_remote_fixtures.py (MER-054): reads, bookings, permission probes.

Runs only against a local stack (the caller checks it). Throwaway records are undone before the end; what cannot be
undone (a closed throwaway branch, an inactive throwaway service, a deactivated throwaway member, a pending
application of a throwaway phone) is named `CONFIG["captureLabel"]`.
"""
from __future__ import annotations

from datetime import date, timedelta

from capture_edits import capture_account, capture_application, capture_branch, capture_salon_edits, capture_team
from capture_remote_fixtures import CONFIG, CUSTOMER, Recorder, installation, phone, proof, throwaway_number

CAPTURE_CUSTOMER_NAME = "Capture"
PAGE = {"page": 1, "pageSize": CONFIG["pageSize"]}
FORBIDDEN = 403
OK = 200


def login(rec: Recorder, base: str, number: str, save: bool = False, label: str | None = None) -> dict:
    token = proof(rec, base, number, "LOGIN", save=save)
    data = rec.call(base, "POST", "/auth/login", save=save, label=label or ("PostAuthLogin" if save else f"login({number[-4:]})"),
                    body={"phone": phone(number), "otpToken": token, "installation": installation(number)})
    return data or {}


def capture_authenticated(rec: Recorder, base: str, ctx: dict, owner: str, manager: str, employee: str, gender: str,
                          checks_only: bool = False) -> None:
    """Everything, or with [checks_only] the reads plus the permission / conflict probes (no settings written)."""
    rec.call(base, "POST", "/auth/check-phone", body={"phone": phone(owner)})
    session = login(rec, base, owner, save=True)
    token = session.get("accessToken")
    renewed = rec.call(base, "POST", "/auth/refresh", body={"refreshToken": session.get("refreshToken")}) or {}
    token = renewed.get("accessToken", token)
    refresh = renewed.get("refreshToken", session.get("refreshToken"))
    salon = capture_reads(rec, base, token)
    customer = Customer(rec, base, ctx, gender)
    if not checks_only:
        capture_bookings(rec, base, token, salon, customer)
        capture_salon_edits(rec, base, token, salon)
        capture_branch(rec, base, token, salon, ctx)
        capture_team(rec, base, token, salon)
    capture_permissions(rec, base, token, salon, manager, employee, customer)
    capture_conflicts(rec, base, token, salon, customer)
    if not checks_only:
        capture_application(rec, base, ctx, gender)
        capture_account(rec, base, token, owner)
    customer.close()
    rec.call(base, "POST", "/auth/logout", body={"refreshToken": refresh}, token=token)


def capture_reads(rec: Recorder, base: str, token: str) -> dict:
    """Every GET of the signed-in owner; returns the salon context (ids) for the next flows."""
    today = date.today()
    me = rec.call(base, "GET", "/me", token=token) or {}
    salon = rec.call(base, "GET", "/salon", token=token) or {}
    rec.call(base, "GET", "/dashboard", token=token)
    branches = rec.call(base, "GET", "/branches", token=token) or []
    main = next((b for b in branches if b.get("isMain")), branches[0] if branches else {})
    other = next((b for b in branches if not b.get("isMain") and b.get("status") == "ACTIVE"), None)
    rec.call(base, "GET", "/branches/{branchId}", params={"branchId": main.get("id")}, token=token)
    rec.call(base, "GET", "/branches/{branchId}/hours", params={"branchId": main.get("id")}, token=token)
    rec.call(base, "GET", "/branches/{branchId}/services", params={"branchId": main.get("id")}, query=PAGE, token=token)
    other_services = rec.call(base, "GET", "/branches/{branchId}/services", params={"branchId": (other or main).get("id")},
                              query=PAGE, token=token, save=False, label="GetBranchesByBranchIdServices(other)") or []
    members = rec.call(base, "GET", "/team/members", query={"page": 1, "pageSize": 50}, token=token) or []
    if other:
        rec.call(base, "GET", "/team/members", query={**PAGE, "branchId": other["id"]}, token=token, save=False,
                 label="GetTeamMembers(branchId)")
    staff = next((m for m in members if m.get("providesServices") and m.get("role") != "OWNER"), members[0] if members else {})
    rec.call(base, "GET", "/team/members/{id}", params={"id": staff.get("id")}, token=token)
    rec.call(base, "GET", "/team/members/{id}/staff", params={"id": staff.get("id")}, token=token)
    rec.call(base, "GET", "/team/members/{id}/leaves", params={"id": staff.get("id")}, token=token)
    rec.call(base, "GET", "/salon/gallery", token=token)
    hours = rec.call(base, "GET", "/salon/hours", token=token) or {}
    services = rec.call(base, "GET", "/salon/services", query={"page": 1, "pageSize": 50}, token=token) or []
    rec.call(base, "GET", "/salon/policy", token=token)
    rec.call(base, "GET", "/salon/payout-details", token=token)
    rec.call(base, "GET", "/catalog/requests", query=PAGE, token=token)
    rec.call(base, "GET", "/salon/application", token=token)
    finance_from = (today - timedelta(days=CONFIG["financeDays"])).isoformat()
    period = {**PAGE, "from": finance_from, "to": today.isoformat()}
    rec.call(base, "GET", "/finance/balance", token=token)
    for kind in ("transactions", "refunds", "payouts"):
        rec.call(base, "GET", f"/finance/{kind}", query=period, token=token)
    rec.call(base, "GET", "/finance/transactions", query={**period, "branchId": main.get("id")}, token=token, save=False,
             label="GetFinanceTransactions(branchId)")
    rec.call(base, "GET", "/subscription", token=token)
    rec.call(base, "GET", "/reviews", query={**PAGE, "target": "SALON"}, token=token)
    rec.call(base, "GET", "/reviews", query={**PAGE, "target": "STAFF", "memberId": staff.get("id")}, token=token,
             save=False, label="GetReviews(STAFF)")
    stats_from = (today - timedelta(days=CONFIG["statisticsDays"] - 1)).isoformat()
    rec.call(base, "GET", "/statistics", query={"from": stats_from, "to": today.isoformat()}, token=token)
    rec.call(base, "GET", "/statistics", query={"from": stats_from, "to": today.isoformat(), "branchId": main.get("id")},
             token=token, save=False, label="GetStatistics(branchId)")
    capture_booking_reads(rec, base, token, staff, main)
    inbox = rec.call(base, "GET", "/notifications", query=PAGE, token=token) or []
    rec.call(base, "GET", "/notifications/unread-count", token=token)
    if inbox:
        rec.call(base, "POST", "/notifications/read", body={"ids": [inbox[0]["id"]]}, token=token)
    return {"me": me, "salon": salon, "branches": branches, "main": main, "other": other, "members": members,
            "staff": staff, "hours": hours, "services": services, "otherServices": other_services}


def capture_booking_reads(rec: Recorder, base: str, token: str, staff: dict, main: dict) -> None:
    rec.call(base, "GET", "/bookings", query={**PAGE, "tab": "UPCOMING"}, token=token)
    first = None
    for tab in ("PENDING", "TODAY", "PAST"):
        rows = rec.call(base, "GET", "/bookings", query={**PAGE, "tab": tab}, token=token, save=False, label=f"GetBookings({tab})")
        first = first or (rows or [None])[0]
    rec.call(base, "GET", "/bookings", query={**PAGE, "tab": "PAST", "status": ["COMPLETED", "NO_SHOW"], "staffId": [staff.get("id")],
                                              "branchId": main.get("id"), "brideOnly": "true"},
             token=token, save=False, label="GetBookings(filters repeated)")
    rec.call(base, "GET", "/bookings", query={**PAGE, "tab": "UPCOMING", "q": "WAB"}, token=token, save=False, label="GetBookings(q)")
    if first:
        rec.call(base, "GET", "/bookings/{id}", params={"id": first["id"]}, token=token)
    today = date.today()
    week = {"from": today.isoformat(), "to": (today + timedelta(days=6)).isoformat()}
    rec.call(base, "GET", "/bookings/calendar", query=week, token=token)
    rec.call(base, "GET", "/bookings/calendar", query={**week, "staffId": [staff.get("id")]}, token=token, save=False,
             label="GetBookingsCalendar(staffId)")


class Customer:
    """A throwaway customer (customer namespace) that books the salon; deleted by `close()`."""

    def __init__(self, rec: Recorder, base: str, ctx: dict, gender: str):
        self.rec, self.base = rec, base
        number = throwaway_number()
        self.number = number
        otp_token = proof(rec, base, number, "REGISTER", namespace=CUSTOMER)
        data = rec.call(base, "POST", "/auth/register", namespace=CUSTOMER, body={
            "firstName": "Capture", "lastName": "Customer", "email": f"mer054.{number}@wab.example", "gender": gender,
            "cityId": ctx["cities"][0]["id"], "areaId": ctx["areas"][0]["id"], "phone": phone(number),
            "otpToken": otp_token, "installation": installation("customer-" + number)}) or {}
        self.token = data.get("accessToken")

    def book(self, salon_id: str, branch_id: str, service_ids: list[str], days_from: int = 0) -> str | None:
        """Availability → draft → verify → booking on [branch_id]; returns the booking id (PENDING)."""
        person = {"serviceIds": service_ids[:1]}
        start = CONFIG["bookingDaysAhead"][0] + days_from
        for days in range(start, CONFIG["bookingDaysAhead"][1] + days_from):
            day = (date.today() + timedelta(days=days)).isoformat()
            slots = self.call("POST", "/salons/{salonId}/availability", {"salonId": salon_id},
                              {"date": day, "person": person, "branchId": branch_id})
            slot = next((s for s in (slots or {}).get("slots", []) if s.get("available")), None)
            if slot:
                break
        else:
            return None
        draft = self.call("POST", "/bookings/drafts", None, {
            "salonId": salon_id, "branchId": branch_id, "paymentMethod": "PAY_ON_ARRIVAL",
            "persons": [{"name": "Capture", "serviceIds": person["serviceIds"], "start": slot["start"]}]})
        if not draft:
            return None
        otp_token = proof(self.rec, self.base, self.number, "BOOKING_CONFIRMATION", namespace=CUSTOMER)
        self.call("POST", "/bookings/drafts/{id}/verify-otp", {"id": draft["id"]}, {"otpToken": otp_token})
        booking = self.call("POST", "/bookings", None, {"draftId": draft["id"]})
        return (booking or {}).get("id")

    def call(self, method, template, params, body):
        return self.rec.call(self.base, method, template, params=params, body=body, token=self.token, namespace=CUSTOMER)

    def close(self) -> None:
        self.rec.call(self.base, "DELETE", "/profile", token=self.token, namespace=CUSTOMER)


def capture_bookings(rec: Recorder, base: str, token: str, salon: dict, customer: Customer) -> None:
    """Booking actions on throwaway bookings: approve → eligible staff → reassign → cancel, reject, cancel-affected."""
    salon_id, main = salon["salon"].get("id"), salon["main"].get("id")
    service_ids = [s["id"] for s in salon["services"] if s.get("active", True)]
    ids = [customer.book(salon_id, main, service_ids, days_from=offset) for offset in range(3)]
    salon["bookings"] = ids
    first, second, third = ids
    if first:
        rec.call(base, "POST", "/bookings/{id}/approve", params={"id": first}, token=token)
        eligible = rec.call(base, "GET", "/bookings/{id}/eligible-staff", params={"id": first}, query={"personIndex": 0}, token=token) or []
        detail = rec.call(base, "GET", "/bookings/{id}", params={"id": first}, token=token, save=False, label="GetBookingsById(new)") or {}
        current = ((detail.get("persons") or [{}])[0].get("staff") or {}).get("id")
        target = next((e.get("staffId") for e in eligible if e.get("staffId") != current), None)
        if target:
            rec.call(base, "POST", "/bookings/{id}/reassign", params={"id": first}, body={"personIndex": 0, "staffId": target}, token=token)
        rec.call(base, "POST", "/bookings/{id}/cancel", params={"id": first}, token=token,
                 body={"reasonCode": "OTHER", "reasonText": CONFIG["captureLabel"]})
    if second:
        rec.call(base, "POST", "/bookings/{id}/reject", params={"id": second}, token=token,
                 body={"reasonCode": "OTHER", "reasonText": CONFIG["captureLabel"]})
    if third:
        rec.call(base, "POST", "/bookings/cancel-affected", token=token,
                 body={"reasonCode": "OTHER", "reasonText": CONFIG["captureLabel"], "bookingIds": [third]})


def capture_permissions(rec: Recorder, base: str, token: str, salon: dict, manager: str, employee: str, customer: Customer) -> None:
    """Branch members: the server scopes and refuses what the app hides (BUSINESS_DOMAIN §6)."""
    main = salon["main"].get("id")
    m_session, e_session = login(rec, base, manager), login(rec, base, employee)
    m, e = m_session.get("accessToken"), e_session.get("accessToken")
    own = (m_session.get("member") or {}).get("branchId")
    rec.expect("manager: branches list is owner-only", base, "GET", "/branches", FORBIDDEN, "OWNER_REQUIRED", token=m)
    rec.expect("manager: finance is owner-scope", base, "GET", "/finance/balance", FORBIDDEN, "PERMISSION_DENIED", token=m)
    rec.expect("manager: subscription is owner-scope", base, "GET", "/subscription", FORBIDDEN, "PERMISSION_DENIED", token=m)
    rec.expect("manager: policy is owner-scope", base, "GET", "/salon/policy", FORBIDDEN, "PERMISSION_DENIED", token=m)
    rec.expect("manager: another branch's bookings = empty list", base, "GET", "/bookings", OK, empty=True,
               query={**PAGE, "branchId": main}, token=m)
    rec.expect("manager: another branch's hours", base, "GET", "/branches/{branchId}/hours", FORBIDDEN, "BRANCH_SCOPE_DENIED",
               params={"branchId": main}, token=m)
    rec.expect("manager: another branch's statistics", base, "GET", "/statistics", FORBIDDEN, "BRANCH_SCOPE_DENIED",
               query={"from": date.today().isoformat(), "to": date.today().isoformat(), "branchId": main}, token=m)
    rec.expect("manager: own bookings", base, "GET", "/bookings", OK, query={**PAGE, "tab": "UPCOMING"}, token=m)
    rec.expect("manager: own team", base, "GET", "/team/members", OK, query=PAGE, token=m)
    rec.expect("manager: own dashboard", base, "GET", "/dashboard", OK, token=m)
    rec.expect("manager: own branch hours (salon path)", base, "GET", "/salon/hours", OK, token=m)
    rec.expect("employee: team is STAFF_MANAGE", base, "GET", "/team/members", FORBIDDEN, "PERMISSION_DENIED", query=PAGE, token=e)
    rec.expect("employee: dashboard is DASHBOARD_VIEW", base, "GET", "/dashboard", FORBIDDEN, "PERMISSION_DENIED", token=e)
    rec.expect("employee: own bookings", base, "GET", "/bookings", OK, query={**PAGE, "tab": "UPCOMING"}, token=e)
    rec.expect("employee: services is SERVICES_MANAGE", base, "GET", "/salon/services", FORBIDDEN, "PERMISSION_DENIED", query=PAGE, token=e)
    rec.expect("employee: reviews", base, "GET", "/reviews", OK, query=PAGE, token=e)
    main_booking = customer.book(salon["salon"].get("id"), main, [s["id"] for s in salon["services"] if s.get("active", True)])
    if main_booking:
        rec.expect("manager: a main-branch booking is not found", base, "GET", "/bookings/{id}", 404, "NOT_FOUND",
                   params={"id": main_booking}, token=m)
        rec.expect("manager: cannot approve a main-branch request", base, "POST", "/bookings/{id}/approve", FORBIDDEN,
                   "BRANCH_SCOPE_DENIED", params={"id": main_booking}, token=m)
        rec.expect("owner: approve", base, "POST", "/bookings/{id}/approve", OK, params={"id": main_booking}, token=token)
        rec.expect("owner: approve twice = ALREADY_HANDLED", base, "POST", "/bookings/{id}/approve", 422, "ALREADY_HANDLED",
                   params={"id": main_booking}, token=token)
        rec.expect("owner: cancel", base, "POST", "/bookings/{id}/cancel", OK, params={"id": main_booking}, token=token,
                   body={"reasonCode": "OTHER", "reasonText": CONFIG["captureLabel"]})
    services = rec.call(base, "GET", "/branches/{branchId}/services", params={"branchId": own}, query=PAGE, token=token,
                        save=False, label="GetBranchesByBranchIdServices(manager branch)") or []
    branch_booking = customer.book(salon["salon"].get("id"), own, [s["id"] for s in services if s.get("active", True)]) if own else None
    salon["branchBooking"] = branch_booking
    if branch_booking:
        rec.expect("employee: cannot approve (no BOOKINGS_RESPOND)", base, "POST", "/bookings/{id}/approve", FORBIDDEN,
                   "PERMISSION_DENIED", params={"id": branch_booking}, token=e)
        rec.expect("manager: approves own branch request", base, "POST", "/bookings/{id}/approve", OK,
                   params={"id": branch_booking}, token=m)
        rec.expect("manager: cancels own branch booking", base, "POST", "/bookings/{id}/cancel", OK,
                   params={"id": branch_booking}, token=m, body={"reasonCode": "OTHER", "reasonText": CONFIG["captureLabel"]})
    cancel_leftovers(rec, base, token)


def cancel_leftovers(rec: Recorder, base: str, token: str) -> None:
    """Cancels pending / approved bookings an earlier capture run left (customer named "Capture …")."""
    for tab in ("PENDING", "UPCOMING"):
        rows = rec.call(base, "GET", "/bookings", query={"page": 1, "pageSize": 50, "tab": tab}, token=token, save=False,
                        label=f"GetBookings({tab} leftovers)") or []
        for row in rows:
            if (row.get("customer") or {}).get("name", "").startswith(CAPTURE_CUSTOMER_NAME):
                action = "reject" if row.get("status") == "PENDING" else "cancel"
                rec.call(base, "POST", f"/bookings/{{id}}/{action}", params={"id": row["id"]}, token=token, save=False,
                         label=f"cleanup:{action}", body={"reasonCode": "OTHER", "reasonText": CONFIG["captureLabel"]})


def capture_conflicts(rec: Recorder, base: str, token: str, salon: dict, customer: Customer) -> None:
    """A closure over a held slot answers 409 SCHEDULE_CONFLICT with the booking ids in `details[].field`."""
    booking = customer.book(salon["salon"].get("id"), salon["main"].get("id"),
                            [s["id"] for s in salon["services"] if s.get("active", True)])
    if not booking:
        return
    detail = rec.call(base, "GET", "/bookings/{id}", params={"id": booking}, token=token, save=False, label="GetBookingsById(conflict)") or {}
    day = (detail.get("appointmentStart") or "")[:10]
    preview = rec.call(base, "POST", "/salon/hours/closures/preview", body={"from": day, "to": day}, token=token, save=False,
                       label="PostSalonHoursClosuresPreview(conflict)") or []
    rec.checks.append({"check": "closure preview lists the held booking", "expected": [booking], "got": [p.get("bookingId") for p in preview],
                       "ok": booking in [p.get("bookingId") for p in preview]})
    created = rec.call(base, "POST", "/salon/hours/closures", body={"from": day, "to": day, "reason": CONFIG["captureLabel"]},
                       token=token, save=False, label="check:closure over a booking")
    last = rec.report[-1]
    fields = [d.get("field") for d in ((last.get("error") or {}).get("details") or [])]
    rec.checks.append({"check": "closure over a booking = 409 SCHEDULE_CONFLICT, ids in details[].field",
                       "expected": [409, "SCHEDULE_CONFLICT", booking], "got": [last["status"], (last.get("error") or {}).get("code"), fields],
                       "ok": last["status"] == 409 and booking in fields})
    if created:
        rec.call(base, "DELETE", "/salon/hours/closures/{id}", params={"id": created["id"]}, token=token, save=False, label="cleanup:closure")
    rec.call(base, "POST", "/bookings/{id}/reject", params={"id": booking}, token=token, save=False, label="cleanup:reject",
             body={"reasonCode": "OTHER", "reasonText": CONFIG["captureLabel"]})
