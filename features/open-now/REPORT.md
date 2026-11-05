# open-now: line report

**Merged: https://github.com/basimJm/WAB-Salon-System/pull/660, https://github.com/basimJm/WAB-Salon-System/pull/661**

| Module | Tasks | State | QA | PO | Requests | Start context | Cache read | Cost |
|---|---|---|---|---|---|---|---|---|
| server | SRV-189 | MERGED | green | PASS | 110 | 10803 | 3596903 | $1.61+? |
| customer | CUS-110 | MERGED | green | PASS | 88 | 12418 | 3732238 | $0.62+? |

## Failed
- nothing

## You decide
- nothing

## Across modules
- PASS contract: customer

## Not covered by any check here
- Screens in a browser, emulator or simulator: no script opens them. Rules 3.11 and 3.13 keep them for the batch check.
- iOS builds (`WAB_SKIP_IOS=1` in the app gates).
- A cross-API smoke run: `line.smoke` lists no command yet.
