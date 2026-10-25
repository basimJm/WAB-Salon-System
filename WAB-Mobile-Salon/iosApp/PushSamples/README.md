# Booking-request push samples (MER-030)

Simulate the server's booking-request push on the iOS simulator — no Firebase or APNs needed:

```bash
xcrun simctl push booted com.fab.wab.merchant.dev iosApp/PushSamples/booking_request.apns
```

(or drag the `.apns` file onto the simulator window). Lock the simulator (⌘L) or leave the app to see the
time-sensitive alert; long-press it for **Accept** (answered in the background, the alert is replaced by the outcome)
and **Reject** (opens the booking with the reason picker). The payload is the contract the server must send:
`aps.category = BOOKING_REQUEST`, `aps.interruption-level = time-sensitive`, data keys `event = booking.requested`
and `bookingId`. In mock builds the booking is answered from the fixtures.
