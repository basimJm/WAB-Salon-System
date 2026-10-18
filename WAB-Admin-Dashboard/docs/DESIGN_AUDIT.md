# Design audit (ADM-011)

Sources: `design/WAB Admin 01…09 *.dc.html` (screens), `Blocks` / `Overlay` / `Sidebar` / `Topbar` (shared parts), `wab-admin-kit.js` (helpers and tokens), `docs/WAB_Admin_Design_Script.md`. The PRD wins over the design on behaviour. Tick the boxes in the owning task, not here.

## 1. Design frames to PRD pages

| Frame | Pages it shows | Built | Owning tasks |
| --- | --- | --- | --- |
| 01 Login | A00 | yes (T-031) | ADM-030 (real auth flow) |
| 02 Live Overview | A01 | no | ADM-063 |
| 03 Analytics | A02–A11 (traffic, events, funnels, search, retention, events table, money, merchants, journey) | no | ADM-064, ADM-074…077 |
| 04 Customers | A12 | no | ADM-044…046, ADM-072 |
| 05 Salons | A13 salons, A14 applications | no | ADM-040…043, ADM-070, ADM-073 |
| 06 Bookings | A15 | no | ADM-047…049, ADM-071 |
| 07 Finance | A16 transactions, A17 refunds, A18 payouts, A19 subscriptions, A20 recommended, A21 reconciliation | no | ADM-052…058 |
| 08 Content | A22 reviews, A23 catalog, A24 content and banners, A25 push | no | ADM-035…039, ADM-050, ADM-051, ADM-059, ADM-060 |
| 09 System | A26 reports, A27 alerts, A28 settings, A29 audit log | no | ADM-031…034, ADM-061, ADM-065…067 |
| Sidebar, Topbar | shell, counters, global search, admin menu | partly (T-024) | ADM-022, ADM-062, ADM-069 |
| Overlay | modals, drawers, toasts, reason dialogs | partly | ADM-017 |
| Blocks | shared building blocks (section 3) | partly | ADM-012…021 |

## 2. Kit helpers (`W.*`) to our components

| Design helper | What it is | Our component | Status / task |
| --- | --- | --- | --- |
| `bdg`, `tone` | status badge, six tones | `Badge` | tones exist; status registry ADM-014 |
| `btn` | buttons | `Button`, `IconButton` | exists |
| `head` | page header | `PageHeader` | exists; actions slot ADM-018 |
| `dt` | data table (sort, columns, rows per page, search, JSON toggle) | `DataTable`, `Pagination` | v2 ADM-015 |
| `modal` | dialogs, reason dialog | `Modal`, `ReasonDialog` | exists; `ConfirmDialog` ADM-017 |
| `drawer` | side drawers (RTL aware) | none | ADM-017 |
| `toast` | toasts | `Toast` | exists; queue ADM-017 |
| `spark` | sparkline | none | ADM-019 |
| `jod`, `n`, `nice`, `short` | money and number formats | `formatJodAmount`, `formatNumber` | done (ADM-008) |
| `tm`, `dt` formats | times in Amman, 12-hour | `formatInstant` | done (ADM-008) |
| `ini` | initials for avatars | none | `Avatar` ADM-012 |
| `go`, `navTo`, `href` | in-app navigation | React Router | exists |
| `retry` | error retry | `ErrorState` | exists |
| `prefs`, `setPrefs` | language/theme | `PreferenceSwitches`, providers | exists |

## 3. Block vocabulary (Blocks frame) to tasks

| Block | Our component | Task |
| --- | --- | --- |
| KPI card with delta and sparkline | `KpiCard` (+ `Sparkline`) | exists / ADM-019 |
| Filter bar, active-filter chips, saved link | `FilterBar`, `Chip` | ADM-016, ADM-012 |
| Date presets (Today, Yesterday, 7d, 30d, this/last month, this year, custom) + compare toggle | `DateRangePicker` | ADM-016 |
| Tabs | `Tabs` | exists |
| Table with sticky header, column picker, bulk select, row actions | `DataTable` v2 | ADM-015 |
| Line, stacked bar, donut, funnel, cohort heatmap | chart kit | ADM-019 |
| "View data" and export per chart | chart kit + `ExportMenu` | ADM-019, ADM-016 |
| Key-value grid | `KeyValue` | ADM-012 |
| Timeline (status history) | `Timeline` | ADM-018 |
| JSON viewer ("show parameters") | `JsonViewer` | ADM-018 |
| Steps / progress | `Steps` (inside `Timeline` template) | ADM-018 |
| Skeleton, empty, error, loading states (the `state` prop of every frame) | `Skeleton`, `EmptyState`, `ErrorState`, `AsyncView` | exists |
| Reason dialog with audit note, min length | `ReasonDialog` | exists (neutral/destructive ADM-017) |
| Drag to reorder | sortable list | ADM-058 (ADR first) |
| Image slot (ar/en), phone preview | `ImageUploader`, `PhonePreview` | ADM-020 |
| Rich text ar/en | `RichTextEditor` | ADM-021 |
| Save bar with "last updated by/at" | `FormActions` | ADM-013 |
| Live pill and row flash on realtime update | `LiveBadge`, row highlight | ADM-018, ADM-027 |

## 4. Token deltas

Compared `wab-admin-kit.js` (`TONES`, theme variables, chart palette) with `src/design/tokens/colors.ts`: the six badge tones (light and dark), the status colors, the accent and the six chart colors are identical. No token change is needed. Fonts (Playfair Display for headings, Poppins for Latin text, IBM Plex Sans Arabic for Arabic) and radii are already cloned (T-024). Two items to add when their components arrive: the `livePulse` / `rowFlash` animations (ADM-018, with reduced-motion support) and chart series colors by name (ADM-019).

## 5. Gaps list (what is missing, in build order)

1. ADM-012: `Text`, `Heading`, `Link`, `Divider`, `Avatar`, `Chip`, `Tooltip`, `KeyValue`.
2. ADM-013: form controller, `Field`, `NumberField`/JOD input, `SearchField`, `MultiSelect`, `DateField`, `FormActions`.
3. ADM-014: status registry for every enum of BUSINESS_DOMAIN §2.
4. ADM-015: `DataTable` v2.
5. ADM-016: `FilterBar`, `DateRangePicker`, `ExportMenu`.
6. ADM-017: `Drawer`, `ConfirmDialog`, `Menu`/`Popover`, toast queue.
7. ADM-018: `ListPage`, `DetailPage`, `Timeline`, `JsonViewer`.
8. ADM-019: charts. 9. ADM-020: media. 10. ADM-021: rich text, schedule picker. 11. ADM-022: shell completion. 12. ADM-023: gallery coverage.

Rules for every component: states (default, hover, focus-visible, disabled, loading, error, empty), AR and EN, RTL and LTR, light and dark, keyboard, an axe test, and a gallery entry.
