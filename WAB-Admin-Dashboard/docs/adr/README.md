# Architecture decision records

One file per decision: `NNNN-short-title.md` with Status, Context, Decision, Consequences. Decisions that are still open are listed in `docs/WAB_Admin_Tasks.md`, Appendix C; write the ADR in the task that needs the decision, before the code.

| ADR | Decision |
| --- | --- |
| [0001](0001-contract-source.md) | The server's OpenAPI is the API contract; zod DTOs are generated from it |
| [0002](0002-local-gate-no-ci.md) | No GitHub CI for the admin panel; a local gate protects `admin` |
| [0003](0003-money-and-time.md) | Money as JOD strings / integer fils, time as UTC instants shown in Asia/Amman |
