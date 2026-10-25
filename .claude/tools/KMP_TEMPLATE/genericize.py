"""KMP_TEMPLATE generic step: removes the WAB customer business (salons, bookings, catalog, favorites, locations,
gender, merchant hand-off, WAB config gate, generated WAB contract, WAB error codes) from the copied core.

Runs on the copy before the package rename, so every path below is in the template's source package. Generic
replacements of whole files live in ./shell; small edits are listed in TRANSFORMS (strict: a missing anchor fails
the generation, so a change in the customer app is noticed by the tool tests instead of silently producing a broken app).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

PKG = "com/fab/wab/customer"
MAIN = f"src/commonMain/kotlin/{PKG}"
TEST = f"src/commonTest/kotlin/{PKG}"

REMOVALS = (
    f"core/domain/{MAIN}/core/domain/booking",
    f"core/domain/{MAIN}/core/domain/catalog",
    f"core/domain/{MAIN}/core/domain/favorites",
    f"core/domain/{MAIN}/core/domain/locations",
    f"core/domain/{MAIN}/core/domain/salon",
    f"core/domain/{MAIN}/core/domain/config",
    f"core/domain/{MAIN}/core/domain/session/Gender.kt",
    f"core/domain/{MAIN}/core/domain/session/LaunchDestination.kt",
    f"core/domain/{TEST}/core/domain/locations",
    f"core/domain/{TEST}/core/domain/config",
    f"core/domain/{TEST}/core/domain/session",
    f"core/data/{MAIN}/core/data/catalog",
    f"core/data/{MAIN}/core/data/favorites",
    f"core/data/{MAIN}/core/data/locations",
    f"core/data/{MAIN}/core/data/config",
    f"core/data/{MAIN}/core/data/contract",
    f"core/data/{TEST}/core/data/AppConfigMapperTest.kt",
    f"core/data/{TEST}/core/data/LocationsRepositoryTest.kt",
    f"core/data/{TEST}/core/data/contract",
    f"core/design-system/{MAIN}/designsystem/components/domain",
    f"core/design-system/{MAIN}/designsystem/preview/CardsGalleryPreviews.kt",
    f"core/design-system/{TEST}/designsystem/DomainCardsTest.kt",
    f"core/navigation/{MAIN}/core/navigation/route/SalonListFilter.kt",
    f"composeApp/{MAIN}/app/di/AppPlatformModule.kt",
)

# Error codes of any REST backend; the WAB business codes (salon, slot, payment, booking states, staff) are dropped.
GENERIC_ERROR_CODES = (
    "VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN", "PERMISSION_DENIED", "NOT_FOUND", "CONFLICT", "RATE_LIMITED",
    "INTERNAL", "OTP_BLOCKED", "OTP_INVALID", "OTP_EXPIRED", "PHONE_NOT_REGISTERED", "PHONE_ALREADY_REGISTERED",
    "ACCOUNT_BLOCKED", "UPLOAD_INVALID", "UPLOAD_TOO_LARGE", "MAINTENANCE", "UPDATE_REQUIRED",
    "CURRENT_PASSWORD_INVALID", "EMAIL_ALREADY_USED", "UNKNOWN",
)

ANDROID_APP_PLUGIN = f"build-logic/convention/src/main/kotlin/{PKG}/buildlogic/AndroidAppPlugin.kt"
IOS_ENV = f"composeApp/src/iosMain/kotlin/{PKG}/IosAppEnvironment.kt"
ANDROID_ENV = f"androidApp/src/main/kotlin/{PKG}/app/AppEnvironmentModule.kt"

# (file, [(old, new), ...]); anchors must exist.
TRANSFORMS: Dict[str, List[Tuple[str, str]]] = {
    ANDROID_APP_PLUGIN: [(
        '    // Merchant app hand-off (CUS-056): optional until the merchant app and its store listing exist.\n'
        '    buildConfigField("String", "MERCHANT_REGISTER_URL", quoted(property("${prefix}_MERCHANT_REGISTER_URL").orEmpty()))\n'
        '    buildConfigField("String", "MERCHANT_STORE_URL", quoted(property("${prefix}_MERCHANT_STORE_URL").orEmpty()))\n'
        '    buildConfigField("String", "MERCHANT_APP_ID", quoted(property("${prefix}_MERCHANT_APP_ID").orEmpty()))\n', "")],
    IOS_ENV: [
        ('    const val MERCHANT_REGISTER_URL = "MERCHANT_REGISTER_URL"\n'
         '    const val MERCHANT_STORE_URL = "MERCHANT_STORE_URL"\n'
         '    const val MERCHANT_APP_SCHEME = "MERCHANT_APP_SCHEME"\n', ""),
        ('    merchant = MerchantLinks(\n'
         '        registerUrl = bundle.infoString(InfoPlistKeys.MERCHANT_REGISTER_URL),\n'
         '        storeUrl = bundle.infoString(InfoPlistKeys.MERCHANT_STORE_URL),\n'
         '        appId = bundle.infoString(InfoPlistKeys.MERCHANT_APP_SCHEME),\n'
         '    ),\n', ""),
        ("\n/** Optional keys: an unset build setting arrives as an empty string. */\n"
         "private fun NSBundle.infoString(key: String): String = (objectForInfoDictionaryKey(key) as? String).orEmpty().trim()\n", ""),
    ],
    ANDROID_ENV: [
        ("            merchant = MerchantLinks(BuildConfig.MERCHANT_REGISTER_URL, BuildConfig.MERCHANT_STORE_URL, BuildConfig.MERCHANT_APP_ID),\n", ""),
    ],
    "iosApp/iosApp/Info.plist": [
        ("\t<key>MERCHANT_REGISTER_URL</key>\n\t<string>$(MERCHANT_REGISTER_URL)</string>\n"
         "\t<key>MERCHANT_STORE_URL</key>\n\t<string>$(MERCHANT_STORE_URL)</string>\n"
         "\t<key>MERCHANT_APP_SCHEME</key>\n\t<string>$(MERCHANT_APP_SCHEME)</string>\n"
         "\t<key>LSApplicationQueriesSchemes</key>\n\t<array>\n\t\t<string>$(MERCHANT_APP_SCHEME)</string>\n\t</array>\n", ""),
        ("We need your location to show salons near you.", "We use your location to show what is near you."),
    ],
    f"core/common/{TEST}/core/common/AppEnvironmentTest.kt": [
        ("\n    @Test\n    fun merchantLinksAreConfiguredOnlyWithBothUrls() {\n"
         "        assertFalse(environment().merchant.isConfigured)\n"
         "        assertFalse(MerchantLinks(registerUrl = TEST_URL).isConfigured)\n"
         "        assertTrue(MerchantLinks(registerUrl = TEST_URL, storeUrl = TEST_URL).isConfigured)\n    }\n", ""),
    ],
    f"core/analytics/{MAIN}/core/analytics/AnalyticsEvent.kt": [
        ('    const val GENDER_SCOPE = "gender_scope"\n', ""),
        ('    const val SALON_ID = "salon_id"\n    const val SERVICE_ID = "service_id"\n    const val STAFF_ID = "staff_id"\n'
         '    const val BOOKING_ID = "booking_id"\n', '    const val ITEM_ID = "item_id"\n'),
        ("`params { text(SALON_ID, id); number(COUNT, 3) }`", "`params { text(ITEM_ID, id); number(COUNT, 3) }`"),
    ],
    f"core/analytics/{MAIN}/core/analytics/AnalyticsScreenNames.kt": [
        ("Screen.SalonDetails/{salonId}` → `salon_details`", "Screen.ItemDetails/{itemId}` → `item_details`"),
    ],
    f"core/analytics/{TEST}/core/analytics/AnalyticsScreenNamesTest.kt": [
        ("Screen.SalonDetails/{salonId}", "Screen.ItemDetails/{itemId}"), ('"salon_details"', '"item_details"'),
    ],
    f"core/analytics/{TEST}/core/analytics/AnalyticsValidationTest.kt": [
        ('AnalyticsEvent("favorite_add", analyticsParams { text(AnalyticsKeys.SALON_ID, "s1") })',
         'AnalyticsEvent("item_open", analyticsParams { text(AnalyticsKeys.ITEM_ID, "i1") })'),
    ],
    f"core/analytics/{TEST}/core/analytics/DefaultAnalyticsTrackerTest.kt": [
        ('    genderScope = "women",\n', ""),
        ('AnalyticsScreen("salon_details", analyticsParams { text(AnalyticsKeys.SALON_ID, "s1") })',
         'AnalyticsScreen("item_details", analyticsParams { text(AnalyticsKeys.ITEM_ID, "i1") })'),
        ('AnalyticsValue.Text("salon_details")', 'AnalyticsValue.Text("item_details")'),
        ('assertEquals(AnalyticsValue.Text("s1"), backend.events.last().params[AnalyticsKeys.SALON_ID])',
         'assertEquals(AnalyticsValue.Text("i1"), backend.events.last().params[AnalyticsKeys.SALON_ID])'),
        ('assertEquals(AnalyticsValue.Text("s1"), event.params[AnalyticsKeys.SALON_ID])',
         'assertEquals(AnalyticsValue.Text("i1"), event.params[AnalyticsKeys.ITEM_ID])'),
        ('        assertEquals(AnalyticsValue.Text("women"), event.params[AnalyticsKeys.GENDER_SCOPE])\n', ""),
        ('AnalyticsAction("gender_tab_switch", analyticsParams { text(AnalyticsKeys.GENDER_SCOPE, "men") })',
         'AnalyticsAction("language_switch", analyticsParams { text(AnalyticsKeys.LANGUAGE, "en") })'),
        ('assertEquals(AnalyticsValue.Text("men"), backend.events.single().params[AnalyticsKeys.GENDER_SCOPE])',
         'assertEquals(AnalyticsValue.Text("en"), backend.events.single().params[AnalyticsKeys.LANGUAGE])'),
        ("    @Test\n    fun missingGenderScopeIsOmitted() = runTest(UnconfinedTestDispatcher()) {\n"
         '        tracker(this, CONTEXT.copy(genderScope = null)).trackAction(AnalyticsAction("onboarding_skip"))\n'
         "        assertNull(backend.events.single().params[AnalyticsKeys.GENDER_SCOPE])\n    }\n\n", ""),
    ],
    f"core/realtime/{MAIN}/core/realtime/RealtimeClient.kt": [
        ('    const val BOOKING_UPDATED = "booking.updated"\n    const val BOOKING_REQUESTED = "booking.requested"\n'
         '    const val BOOKING_ASSIGNED = "booking.assigned"\n',
         '    /** Example event: an entity changed on the server (payload `{id, status, updatedAt}`). */\n'
         '    const val ENTITY_UPDATED = "entity.updated"\n'),
    ],
    f"core/realtime/{TEST}/core/realtime/RealtimeRefreshTest.kt": [
        ("    fun entityIdReadsIdOrBookingIdAndIgnoresOtherPayloads() {", "    fun entityIdReadsIdAndIgnoresOtherPayloads() {"),
        ('        assertEquals(\n            "b2",\n            RealtimeEvent(RealtimeEvents.BOOKING_UPDATED, buildJsonObject '
         '{ put("bookingId", JsonPrimitive("b2")) }).entityId(),\n        )\n', ""),
        ('"all bookings: 1 duplicate dropped"', '"all entities: 1 duplicate dropped"'),
    ],
    f"core/design-system/src/commonMain/composeResources/values/strings.xml": [
        ("Enable location services to see salons near you", "Enable location services to see what is near you"),
    ],
    f"core/design-system/src/commonMain/composeResources/values-ar/strings.xml": [
        ("فعّل خدمات الموقع لعرض الصالونات القريبة منك", "فعّل خدمات الموقع لعرض ما هو قريب منك"),
    ],
    "iosApp/iosApp/en.lproj/InfoPlist.strings": [
        ("We need your location to show salons near you.", "We use your location to show what is near you."),
        ("We need the camera to take photos for your reviews.", "We use the camera to take photos in the app."),
    ],
    "iosApp/iosApp/ar.lproj/InfoPlist.strings": [
        ("نحتاج إلى موقعك لعرض الصالونات القريبة منك.", "نستخدم موقعك لعرض ما هو قريب منك."),
        ("نحتاج إلى الكاميرا لالتقاط صور لتقييماتك.", "نستخدم الكاميرا لالتقاط الصور داخل التطبيق."),
    ],
    "androidApp/src/main/AndroidManifest.xml": [
        ("<!-- PRD §4.4 App Links: https://<web host>/salon/{salonId}; the host comes from <ENV>_WEB_BASE_URL. -->",
         "<!-- App Links: https://<web host>/...; the host comes from <ENV>_WEB_BASE_URL (DeepLinks parses the path). -->"),
        ('android:pathPrefix="/salon/" />', 'android:pathPrefix="/" />'),
    ],
    f"core/design-system/{MAIN}/designsystem/components/shimmer/AppShimmerTemplates.kt": [
        ("/** How a salon card is laid out: full width in lists, fixed compact width in horizontal home sections. */",
         "/** How a card is laid out: full width in lists, fixed compact width in horizontal sections. */"),
        ("/** Placeholder of the Salon card (image, name, rating line, location line). */",
         "/** Placeholder of a media card (image, title, rating line, subtitle line). */"),
    ],
    f"core/design-system/{MAIN}/designsystem/icons/AppIcons.kt": [("    val Bride: ImageVector = DesignIcons.Bride\n", "")],
    f"core/design-system/{MAIN}/designsystem/preview/StatesGalleryPreviews.kt": [('"Shimmer: salon card"', '"Shimmer: card"')],
    f"core/design-system/{MAIN}/designsystem/preview/ShellGalleryPreviews.kt": [
        ("private const val BOOKINGS_BADGE = 3", "private const val ACTIVITY_BADGE = 3"),
        ('AppNavItem("favorites", "المفضلة", AppIcons.Favorite)', 'AppNavItem("saved", "المحفوظات", AppIcons.Favorite)'),
        ('AppNavItem("bookings", "الحجوزات", AppIcons.Bookings, badgeCount = BOOKINGS_BADGE)',
         'AppNavItem("activity", "النشاط", AppIcons.Bookings, badgeCount = ACTIVITY_BADGE)'),
    ],
    f"core/design-system/{MAIN}/designsystem/preview/OverlaysGalleryPreviews.kt": [
        ("BOOKING_STEPS", "FLOW_STEPS"),
        ('ActiveFilterChip("service:1", "قص شعر")', 'ActiveFilterChip("category:1", "الفئة الأولى")'),
        ('ActiveFilterChip("service:2", "مكياج عروس")', 'ActiveFilterChip("category:2", "الفئة الثانية")'),
    ],
    f"core/design-system/{TEST}/designsystem/ErrorTextTest.kt": [
        ("errorActionOf(ErrorCode.SLOT_TAKEN)", "errorActionOf(ErrorCode.RATE_LIMITED)"),
        ("errorActionOf(ErrorCode.GENDER_MISMATCH)", "errorActionOf(ErrorCode.VALIDATION_ERROR)"),
    ],
    f"composeApp/{TEST}/app/deeplink/DeepLinkStoreTest.kt": [
        ('"https://other.example/salon/s1"', '"https://other.example/items/i1"'),
        ('"https://web.example/salon/s1"', '"https://web.example/items/i1"'),
        ('DeepLink.Salon("s1")', 'DeepLink(listOf("items", "i1"))'),
        ('DeepLink.Salon("other")', 'DeepLink(listOf("other"))'),
    ],
    f"composeApp/{TEST}/app/push/PushRoutingTest.kt": [
        ("tapRoutesToTheSalonLinkThenNotificationsThenHome", "tapRoutesToTheLinkThenNotificationsThenHome"),
        ("/salon/s1", "/items/i1"),
    ],
    f"core/network/{TEST}/core/network/auth/AuthRefreshInterceptorTest.kt": [("/customer/v1/salons", "/customer/v1/items")],
    f"core/firebase/{TEST}/core/firebase/FirebaseFacadeTest.kt": [('"opened salon"', '"opened item"')],
    f"core/mvi/{TEST}/core/mvi/BaseViewModelTest.kt": [('listOf("salon")', 'listOf("item")')],
    f"core/ui/{TEST}/core/ui/external/ExternalLinksTest.kt": [("Glow%20Salon", "Glow%20Store"), ("Glow Salon", "Glow Store")],
    f"core/realtime/{MAIN}/core/realtime/RealtimeRefresh.kt": [
        ('    const val BOOKING_ID = "bookingId"\n', ""),
        ("(obj[RealtimePayloadKeys.ID] ?: obj[RealtimePayloadKeys.BOOKING_ID])", "obj[RealtimePayloadKeys.ID]"),
    ],
    f"core/notification/{MAIN}/core/notification/push/PushSignals.kt": [
        ('    const val BOOKING_ID = "bookingId"\n    const val SALON_ID = "salonId"\n', ""),
    ],
    f"composeApp/{TEST}/app/push/PushRoutingTest.kt": [
        ("mapOf(PushKeys.BOOKING_ID to \"b1\")", "mapOf(PushKeys.NOTIFICATION_ID to \"n1\")"),
        ('assertEquals("b1", shown?.data?.get(PushKeys.BOOKING_ID))', 'assertEquals("n1", shown?.data?.get(PushKeys.NOTIFICATION_ID))'),
    ],
}

# Applied to every Kotlin file left after the removals (session without gender / guest profile).
SESSION_REGEX: Tuple[Tuple[str, str], ...] = (
    (r"^import [\w.]+\.core\.domain\.session\.(Gender|GuestProfile)\n", ""),
    (r"^import [\w.]+\.core\.common\.MerchantLinks\n", ""),
    (r"SessionState\.Guest\(GuestProfile\([^()]*\)\)", "SessionState.Guest"),
    (r"SessionState\.Guest\(\)", "SessionState.Guest"),
    (r",\s*gender\s*=\s*Gender\.[A-Z]+\)", ")"),
    (r",\s*Gender\.[A-Z]+\)", ")"),
    (r"^.*(GENDER_SCOPE|genderScope).*\n", ""),
    (r"RealtimeEvents\.BOOKING_UPDATED", "RealtimeEvents.ENTITY_UPDATED"),
    (r"\bAppShimmerSalonCard\b", "AppShimmerCard"),
    (r"\b(AppIcons|DesignIcons)\.Bookings\b", r"\1.Calendar"),
    (r"^(\s*val )Bookings(: ImageVector)", r"\1Calendar\2"),
    (r'icon\("Bookings"', 'icon("Calendar"'),
    (r"\bBOOKINGS\b", "CALENDAR"),
    (r"\bAppIcons\.Booking\b", "AppIcons.EventAvailable"),
    (r"^(\s*val )Booking(: ImageVector = Icons\.Rounded\.EventAvailable)", r"\1EventAvailable\2"),
    (r'^\s*val Bride: ImageVector by lazy \{.*\n', ""),
    (r"^    val BRIDE = listOf\(\n(?:.*\n)*?    \)\n", ""),
    (r"booking\.updated", "entity.updated"),
)


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def remove_business(target: Path) -> None:
    from generator import remove_paths
    remove_paths(target, REMOVALS)


def apply_transforms(target: Path, transforms: Dict[str, List[Tuple[str, str]]] = TRANSFORMS) -> None:
    for rel, pairs in transforms.items():
        path = target / rel
        text = _read(path)
        for old, new in pairs:
            if old not in text:
                raise ValueError(f"{rel}: anchor not found: {old[:70]!r}")
            text = text.replace(old, new)
        path.write_text(text, encoding="utf-8")


def apply_session_regex(target: Path) -> None:
    for path in target.rglob("*.kt"):
        text = _read(path)
        updated = text
        for pattern, replacement in SESSION_REGEX:
            updated = re.sub(pattern, replacement, updated, flags=re.M)
        if updated != text:
            path.write_text(updated, encoding="utf-8")


def filter_error_codes(target: Path, keep: Iterable[str] = GENERIC_ERROR_CODES) -> List[str]:
    """Drops non-generic codes from `ErrorCode`, the handling table and the AR/EN `error_code_*` strings."""
    keep = set(keep)
    enum_file = next(target.glob(f"core/domain/{MAIN}/core/domain/ErrorCode.kt"))
    text = _read(enum_file)
    dropped = [code for code in re.findall(r"^\s*([A-Z_]+),\s*$", text, re.M) if code not in keep]
    for code in dropped:
        text = re.sub(rf"^\s*{code},\s*\n", "", text, flags=re.M)
    enum_file.write_text(text.replace("(BUSINESS_DOMAIN §11, `openapi.customer.json`)", "(BUSINESS_DOMAIN.md §11)"),
                         encoding="utf-8")
    error_text = next(target.glob(f"core/design-system/{MAIN}/designsystem/components/feedback/AppErrorText.kt"))
    text = _read(error_text)
    for code in dropped:
        text = re.sub(rf"^import [\w.]+\.resources\.error_code_{code.lower()}\n", "", text, flags=re.M)
        text = re.sub(rf"^\s*ErrorCode\.{code} to Res\.string\.error_code_{code.lower()},\s*\n", "", text, flags=re.M)
    error_text.write_text(text, encoding="utf-8")
    for test in list(target.glob(f"core/domain/{TEST}/core/domain/ErrorCodeTest.kt")) + \
            list(target.glob(f"core/design-system/{TEST}/designsystem/ErrorTextTest.kt")):
        text = _read(test)
        for code in dropped:
            text = re.sub(rf'"{code}",\s*', "", text)
            text = re.sub(rf"\b{code}\b", "CONFLICT", text).replace(f'"{code.lower()}"', '"conflict"')
        test.write_text(text, encoding="utf-8")
    handling = next(target.glob(f"core/design-system/{MAIN}/designsystem/components/feedback/ErrorHandling.kt"))
    text = _read(handling)
    for code in dropped:
        text = re.sub(rf"\s*ErrorCode\.{code},?(?=[\s)])", "", text)
    handling.write_text(rewrap_sets(text), encoding="utf-8")
    for strings in target.glob("core/design-system/src/commonMain/composeResources/values*/strings.xml"):
        text = _read(strings)
        for code in dropped:
            text = re.sub(rf'^\s*<string name="error_code_{code.lower()}"[^>]*>.*?</string>\s*\n', "", text, flags=re.M | re.S)
        strings.write_text(text, encoding="utf-8")
    return dropped


# Test data and comments: words of the salon marketplace become neutral ones (tests only compare their own strings).
TEST_WORDS: Tuple[Tuple[str, str], ...] = (
    (r"SALON_ID", "ITEM_ID"), (r"SalonDetails", "ItemDetails"), (r"salonId", "itemId"), (r"Salons", "Items"), (r"Salon", "Item"), (r"salons", "items"),
    (r"salon", "item"), (r"Bookings", "Orders"), (r"Booking", "Order"), (r"bookings", "orders"), (r"booking", "order"),
    (r"Favorites", "Bookmarks"), (r"favorites", "bookmarks"), (r"favorite", "bookmark"), (r"gender", "segment"),
    (r"women", "group_b"), (r"\bmen\b", "group_a"),
)
COMMENT_WORDS: Tuple[Tuple[str, str], ...] = (
    (r" ?\((?:PRD|CUS|BRD|INTEGRATION|BUSINESS_DOMAIN)[^()]*\)", ""), (r"PRD §[\d.]+(?: [A-Z]\d+)?:? ?", ""),
    (r"\bS\d{2}\b ?", ""), (r"CUS-\d+:? ?", ""), (r"\bWAB\b(?![-_]) ?", ""),
    (r"SALON", "ITEM"), (r"[Ss]alon cards?", "cards"), (r"[Ss]alons?", "items"), (r"[Bb]ooking[- ]flow", "multi-step flow"),
    (r"[Bb]ookings?", "orders"), (r"[Gg]ender", "segment"), (r"[Mm]erchant", "partner"), (r"\b[Bb]ride\b", "special"),
    (r"[Ss]taff", "team"), (r"[Ff]avorites?", "saved items"),
)


def _comment_lines(text: str, pairs: Tuple[Tuple[str, str], ...]) -> str:
    out = []
    for line in text.split("\n"):
        stripped = line.lstrip()
        if stripped.startswith(("/**", "* ", "*/", "//", "<!--", "#")) or stripped == "*":
            for pattern, replacement in pairs:
                line = re.sub(pattern, replacement, line)
        out.append(line)
    return "\n".join(out)


def neutralize_words(target: Path) -> None:
    for path in list(target.rglob("*.kt")) + list(target.rglob("*.xml")) + list(target.rglob("*.properties")) + \
            list(target.rglob("*.xcconfig")) + list(target.rglob("*.kts")):
        if "/feature/" in path.as_posix() or "/build/" in path.as_posix():
            continue
        text = _read(path)
        updated = _comment_lines(text, COMMENT_WORDS)
        if "/commonTest/" in path.as_posix():
            for pattern, replacement in TEST_WORDS:
                updated = re.sub(pattern, replacement, updated)
        if updated != text:
            path.write_text(updated, encoding="utf-8")


def rewrap_sets(text: str, per_line: int = 4) -> str:
    """Re-formats `setOf(ErrorCode.A, ...)` blocks after codes were dropped (detekt max line length)."""
    def block(match: "re.Match[str]") -> str:
        codes = re.findall(r"ErrorCode\.\w+", match.group(2))
        if not codes:
            return f"{match.group(1)}setOf()"
        lines = [", ".join(codes[i:i + per_line]) + "," for i in range(0, len(codes), per_line)]
        return f"{match.group(1)}setOf(\n" + "".join(f"    {line}\n" for line in lines) + ")"
    return re.sub(r"(= )setOf\((.*?)\n?\)", block, text, flags=re.S)


def prune_unused_strings(target: Path, module: str = "core/design-system") -> List[str]:
    """Removes design-system strings no Kotlin file references any more (the strings of the removed domain cards)."""
    sources = "\n".join(_read(p) for p in target.rglob("*.kt"))
    used = set(re.findall(r"Res\.string\.(\w+)", sources)) | set(re.findall(r"\bstring\.(\w+)", sources))
    removed: List[str] = []
    for strings in target.glob(f"{module}/src/commonMain/composeResources/values*/strings.xml"):
        text = _read(strings)
        for name in re.findall(r'<string name="(\w+)"', text):
            if name not in used and not name.startswith("error_code_"):
                text = re.sub(rf'^\s*<string name="{name}"[^>]*>.*?</string>\s*\n', "", text, flags=re.M | re.S)
                removed.append(name)
        strings.write_text(text, encoding="utf-8")
    return sorted(set(removed))


def drop_config_keys(target: Path) -> None:
    """Merchant hand-off keys are WAB-only: gone from gradle.properties and the iOS environment xcconfigs."""
    for rel in ("gradle.properties", "iosApp/Configuration/Dev.xcconfig", "iosApp/Configuration/Prod.xcconfig"):
        path = target / rel
        text = re.sub(r"^.*merchant.*\n", "", _read(path), flags=re.M | re.I)
        path.write_text(text, encoding="utf-8")


def genericize(target: Path) -> None:
    remove_business(target)
    apply_transforms(target)
    apply_session_regex(target)
    filter_error_codes(target)
    prune_unused_strings(target)
    prune_unused_strings(target, "composeApp")
    drop_config_keys(target)
    neutralize_words(target)
