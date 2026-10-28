# Shared R8 rules of the data / serialization layers (release variants, see AndroidAppPlugin).
#
# MER-079 (r8-analyzer): the package-wide `-keep class … { *; }` rules on io.ktor, core.data, core.network,
# core.domain, feature DTOs and domain models kept ~18 % of all kept items whole (scores 83 % -> 98.5 %). Nothing in
# the app reads those classes reflectively: JSON goes through the generated `$$serializer`s, whose keep rules ship
# with kotlinx-serialization (META-INF/com.android.tools/r8), Ktor ships its own rules (engines loaded through
# ServiceLoader, AtomicFU volatile fields), and navigation routes use serial names, not class names. Proved by the
# release smoke test (sign-in, Home, booking accept, calendar, salon hub, uploads) on the emulator.
#
# Do not add a package-wide keep rule here: keep the one class that is read reflectively, and say why.
