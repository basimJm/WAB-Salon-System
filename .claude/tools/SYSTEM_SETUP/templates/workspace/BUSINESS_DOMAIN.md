# __SYSTEM_NAME__ — Business Domain Specification (single source for server schemas & business logic)

> Mandatory reading **by section** for server, contract and cross-project tasks (grep the heading, read the range). PRDs describe screens; this file describes the data and the rules every project must agree on. Precedence: PRD > BRD > this file for behaviour; this file wins for schemas, enums, error codes and settings keys. Created __DATE__.
>
> Conventions: money = integer minor units (never floats); timestamps stored in UTC, business dates/hours computed in the system time zone from settings; ids are opaque strings; every enum lives here once and is mirrored (never re-typed) in the generated contract and the clients' tests.

## 1. Actors & Identities
<!-- one row per actor: who they are, how they authenticate (namespace/scope), what identifies them (phone/email), what they own -->
| Actor | Namespace / scope | Identity | Owns |
|---|---|---|---|

## 2. Enums (shared by server, contracts and clients)
<!-- `EnumName`: VALUE_A, VALUE_B — meaning. Clients' tests compare their status/label tables against the contract's query enums. -->

## 3. Collections
<!-- one sub-section per aggregate: fields (type, required, default), indexes, soft-delete/`status` semantics, snapshot fields. Append-only collections marked as such. -->
### 3.1 Identity & sessions
### 3.2 Reference data
### 3.3 Core aggregates
### 3.4 Operations (audit log, notifications, jobs)

## 4. Relationships (summary)
<!-- who references whom; which deletes cascade, which are forbidden while children exist -->

## 5. Computed Rules
<!-- numbered, each testable; tasks cite "§5.N". Typical: time arithmetic, completeness → state, availability, pricing/rounding (half-up ties away from zero in minor units), atomic creation with locks, cancellation/refund policies, ratings, conflicts on schedule changes, subscriptions, deletion grace period. -->
### 5.1 Time
### 5.2 Completeness → visibility state
### 5.3 Availability
### 5.4 Pricing & amounts
### 5.5 Atomic creation (locks + re-validation)
### 5.6 State machine
```
<!-- states and allowed transitions with the actor allowed to make each; terminal states; who may force-complete -->
```
### 5.7 Cancellation & refunds
### 5.8 Account deletion

## 6. Permissions Matrix
<!-- grantable keys × endpoints/socket events/notifications; the owner role has all -->

## 7. Real-time Events
<!-- event name → room(s) → payload summary → which client query it invalidates -->

## 8. Notifications (events → recipients)
<!-- event → recipients (by role/permission) → channel (push/email/in-app) → template keys (AR/EN) -->

## 9. Scheduled Jobs
<!-- job → trigger/schedule → deterministic id → effect → idempotency note -->

## 10. Settings (keys & defaults; admin-editable)
<!-- `group.key` → type → default → who reads it. Limits, windows, percentages, time zone, lengths all live here, never in code. -->

## 11. Error Codes (API `code` field)
<!-- CODE → HTTP status → when → client behaviour. Every code has an AR+EN message in the server locales and in each client; tests enforce parity. -->

## 12. Open Points (assumptions in use — confirm or change)
<!-- numbered owner questions with the assumption currently implemented; when the owner answers, move the answer into the section it belongs to and record the date -->
