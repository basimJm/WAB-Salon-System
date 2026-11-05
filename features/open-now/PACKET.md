# Feature: open-now

## Decisions
- `openNow=true` on the search list matches a business when **any** bookable branch is open now in Asia/Amman (BUSINESS_DOMAIN §5.17, with `isOpenNow` from §5.3). No parameter or `false`: no filter, results as today. Nothing else changes.
- The customer's "Open now" chip sends this filter and reloads from the first page. It stops filtering the pages already on the device.

## Contract
`GET /customer/v1/salons` gets an optional boolean query parameter `openNow` (customer namespace). Client task: CUS-110.

## Design
none

## Docs
- `WAB-Mobile-Customer/docs/WAB_Customer_App_PRD.md` S04: delete the line starting "Not built yet: Open now filters the pages"; the chip toggles the server filter like the others.
- `WAB-Server/docs/WAB_Backend_BRD.md` BE-21: add open now to the listed filters.

## Module: server
Tasks: SRV-189
Read: BUSINESS_DOMAIN §5.3, §5.17; `src/domain/search/search.service.ts`, `src/domain/salons/hours.ts`, `src/modules/customer/search/`
- [ ] `openNow=true` returns a business with at least one bookable branch open now in Asia/Amman and leaves out a business whose bookable branches are all closed (outside hours, day off or closure)
- [ ] A branch that is open but not bookable does not make its business match
- [ ] `openNow=false` or no parameter returns what it returned before
- [ ] The filter applies before paging, so page contents and totals count only matching businesses, and it combines with the other filters
- [ ] A non-boolean `openNow` gets the usual validation error
- [ ] OpenAPI and contract version regenerated and bumped for the customer namespace, naming CUS-110
- [ ] Unit tests cover each case above

## Module: customer
Tasks: CUS-110
Read: BUSINESS_DOMAIN §5.17; `docs/WAB_Customer_App_PRD.md` S04 (grep `^### S04`, read that range)
- [ ] Generated DTOs and the API client carry `openNow` from `scripts/api_sync.py`; generated files are not edited by hand
- [ ] Turning the chip on sends `openNow=true` and reloads from page 1; turning it off drops the parameter and reloads
- [ ] No filtering of loaded pages by open state remains in the search flow
- [ ] The active-filter chip with its × still removes the filter, and the filter combines with the others
- [ ] The dev mock data source honours `openNow`, so dev debug behaves like the server
- [ ] Unit tests cover the request built for on and off, and that results are not filtered on the device
