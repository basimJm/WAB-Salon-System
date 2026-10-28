"""KMP_TEMPLATE generator: builds a new Kotlin Multiplatform app from the WAB customer app.

Kept as-is (renamed): build-logic convention plugins, every core module, the SDK / third-party setup
(Firebase, Ktor, Koin, Coil, Haze, Socket.IO, DataStore …), Android + iOS hosts, CI scripts and the sample feature.
Replaced: the composeApp shell (from ./shell), Firebase config files (the user's files or placeholders),
names, package, bundle ids and environment URLs. Removed: every WAB business feature and WAB docs/design.
"""
from __future__ import annotations

import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


SOURCE_PACKAGE = "com.fab.wab.customer"
SOURCE_PROJECT = "WABCustomer"
KEEP_FEATURES = ("sample",)
TOOL_DIR = Path(__file__).resolve().parent
SHELL_DIR = TOOL_DIR / "shell"
FILES_DIR = TOOL_DIR / "files"
PLACEHOLDER_HOST = "example.com"

# Never copied: build output, IDE state, per-developer files, WAB docs/design/session, WAB Firebase keys.
EXCLUDED_NAMES = {
    "build", ".gradle", ".kotlin", ".idea", "xcuserdata", "DerivedData", ".DS_Store", "captures", ".cxx",
    "node_modules", ".hotswan", "local.properties", "google-services.json", "GoogleService-Info.plist", "Local.xcconfig",
}
# Only at the project root: WAB documents, design exports, session files and the monorepo's GitHub folder.
# `baselineprofile`: the customer app's Baseline Profile journey (WAB screens); the generated app builds without it.
EXCLUDED_ROOT_NAMES = {"design", "docs", ".claude", ".github", "AGENTS.md", "baselineprofile"}
EXCLUDED_SUFFIXES = (".log", ".iml")
BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico", ".jar", ".ttf", ".otf", ".zip", ".keystore", ".jks",
    ".pdf", ".mp4", ".car", ".a", ".so", ".dylib", ".class",
}
# composeApp files that only exist for the WAB features (launch gate, onboarding, tabs, analytics catalog, ...).
SHELL_REMOVALS = (
    # The customer app's generated Baseline + Startup Profiles list WAB classes; a new app generates its own.
    "androidApp/src/main/generated/baselineProfiles",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/analytics/ActionAnalytics.kt",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/analytics/AnalyticsCatalog.kt",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/analytics/AuthDiscoveryActionEvents.kt",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/analytics/BookingAccountActionEvents.kt",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/auth",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/deeplink/DeepLinkEffect.kt",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/navigation/RootNavigation.kt",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/navigation/RootTab.kt",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/ui/SplashScreen.kt",
    "composeApp/src/commonMain/kotlin/com/fab/wab/customer/app/ui/system",
    "composeApp/src/commonTest/kotlin/com/fab/wab/customer/app/analytics/AnalyticsCatalogTest.kt",
    "composeApp/src/commonTest/kotlin/com/fab/wab/customer/app/auth",
    "composeApp/src/commonTest/kotlin/com/fab/wab/customer/app/navigation/RootTabTest.kt",
)
PACKAGE_RE = re.compile(r"^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$")
KOTLIN_KEYWORDS = {"as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if", "in", "interface",
                   "is", "null", "object", "package", "return", "super", "this", "throw", "true", "try", "typealias",
                   "val", "var", "when", "while"}


@dataclass
class Options:
    target: Path
    app_name: str
    package: str
    project_name: str
    app_name_ar: str = ""
    dev_suffix: str = ".dev"
    dev_api_url: str = f"https://api-dev.{PLACEHOLDER_HOST}"
    prod_api_url: str = f"https://api.{PLACEHOLDER_HOST}"
    dev_web_url: str = f"https://dev.{PLACEHOLDER_HOST}"
    prod_web_url: str = f"https://{PLACEHOLDER_HOST}"
    team_id: str = ""
    api_prefix: str = "/api/v1"
    realtime_namespace: str = "/app"
    dev_data_source: str = "mock"
    merge_into_existing: bool = False
    firebase: Dict[str, Optional[Path]] = field(default_factory=dict)  # android_dev, android_prod, ios_dev, ios_prod


# ---------- validation and naming ----------

def validate_package(package: str) -> Optional[str]:
    """Returns an error message, or None when the package can be used as Kotlin package, applicationId and bundle id."""
    if not PACKAGE_RE.match(package):
        return "use lowercase segments of letters/digits separated by dots, at least two (e.g. com.acme.shop)"
    if any(part in KOTLIN_KEYWORDS for part in package.split(".")):
        return "a segment is a Kotlin keyword"
    return None


def project_name_from(app_name: str) -> str:
    """'Acme Shop' -> 'AcmeShop' (Gradle root project, iOS product name, Swift class prefixes)."""
    words = re.findall(r"[A-Za-z0-9]+", app_name)
    name = "".join(word[:1].upper() + word[1:] for word in words)
    return name if name and name[0].isalpha() else f"App{name}"


def xcconfig_url(url: str) -> str:
    """'//' starts a comment in an xcconfig: write 'https://x' as 'https:/$()/x'."""
    return url.replace("://", ":/$()/", 1)


def host_of(url: str) -> str:
    return re.sub(r"^[a-z]+://", "", url).split("/", 1)[0]


# ---------- file helpers ----------

def is_text(path: Path) -> bool:
    if path.suffix.lower() in BINARY_SUFFIXES:
        return False
    try:
        path.read_text(encoding="utf-8")
        return True
    except (UnicodeDecodeError, OSError):
        return False


def _excluded(path: Path, source: Path) -> bool:
    rel = path.relative_to(source)
    parts = rel.parts
    if path.name in EXCLUDED_NAMES or path.name.endswith(EXCLUDED_SUFFIXES):
        return True
    if len(parts) == 1 and path.name in EXCLUDED_ROOT_NAMES:
        return True
    return len(parts) >= 2 and parts[0] == "feature" and parts[1] not in KEEP_FEATURES


def copy_project(source: Path, target: Path) -> None:
    def ignore(directory: str, names: List[str]) -> List[str]:
        base = Path(directory)
        return [name for name in names if _excluded(base / name, source)]
    shutil.copytree(source, target, ignore=ignore, symlinks=False)


def remove_paths(root: Path, relatives) -> None:
    for rel in relatives:
        path = root / rel
        if path.is_dir():
            shutil.rmtree(path)
        elif path.exists():
            path.unlink()


def overlay(src_dir: Path, target: Path) -> None:
    for path in src_dir.rglob("*"):
        if path.is_file() and path.name != ".DS_Store":
            dest = target / path.relative_to(src_dir)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, dest)


def edit(path: Path, pairs) -> None:
    text = path.read_text(encoding="utf-8")
    for old, new in pairs:
        if old not in text:
            raise ValueError(f"{path}: expected text not found: {old[:60]!r}")
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")


def set_properties(text: str, values: Dict[str, str], separator: str = "=") -> str:
    """Replaces 'KEY<sep>value' lines (properties / xcconfig) keeping comments and order."""
    for key, value in values.items():
        pattern = re.compile(rf"^({re.escape(key)}[ \t]*{re.escape(separator)}[ \t]*).*$", re.M)
        if not pattern.search(text):
            raise ValueError(f"key {key} not found")
        text = pattern.sub(lambda m: m.group(1) + value, text)
    return text


# ---------- steps ----------

def strip_features(target: Path) -> None:
    settings = target / "settings.gradle.kts"
    lines = settings.read_text(encoding="utf-8").splitlines(keepends=True)
    kept = [line for line in lines
            if not re.match(r'\s*":feature:([a-z-]+):', line) or re.match(rf'\s*":feature:({"|".join(KEEP_FEATURES)}):', line)]
    kept = [line for line in kept if '":baselineprofile"' not in line]  # the module is not copied (EXCLUDED_ROOT_NAMES)
    settings.write_text("".join(kept), encoding="utf-8")
    plugin = next(target.glob("build-logic/convention/src/main/kotlin/**/ComposeAppPlugin.kt"))
    text = plugin.read_text(encoding="utf-8")
    text = re.sub(r'\n    ":feature:(?!' + "|".join(KEEP_FEATURES) + r':)[a-z-]+:[a-z]+",', "", text)
    plugin.write_text(text, encoding="utf-8")


def apply_shell(target: Path) -> None:
    remove_paths(target, SHELL_REMOVALS)
    overlay(SHELL_DIR, target)


def retarget_tooling(target: Path, source: Path) -> None:
    """Makes the CI tooling self-contained (the customer app reads the WAB monorepo around it)."""
    edit(target / "scripts/api_sync.py", [(
        'DEFAULT_SPEC = PROJECT_ROOT.parent / "WAB-Server" / "docs" / "api" / "openapi.customer.json"',
        'DEFAULT_SPEC = PROJECT_ROOT / "docs" / "api" / "openapi.json"',
    )])
    edit(target / "scripts/ci/run_local_checks.sh", [(
        "python3 scripts/api_sync.py --check\n",
        'if [ -f docs/api/openapi.json ]; then python3 scripts/api_sync.py --check; '
        'else echo "docs/api/openapi.json not found: contract check skipped"; fi\n',
    )])
    edit(target / "scripts/ci/policy/error_codes.py", [(
        'doc = read(f"../{_DOMAIN_DOC}") or read(_DOMAIN_DOC)',
        'doc = read(_DOMAIN_DOC) or read(f"../{_DOMAIN_DOC}")',
    )])
    edit(target / "scripts/ci/policy/variants.py", [(
        'text = _read(config, f"../{workflow}")',
        'text = _read(config, workflow) or _read(config, f"../{workflow}")',
    )])
    for path in [target / "config/policy.json", *(target / "scripts").rglob("*")]:
        if path.is_file() and is_text(path):
            text = path.read_text(encoding="utf-8")
            updated = text.replace("customer-ci.yml", "ci.yml").replace('REPO_ROOT / ".github"', 'PROJECT_ROOT / ".github"')
            if updated != text:
                path.write_text(updated, encoding="utf-8")
    workflow_src = source.parent / ".github/workflows/customer-ci.yml"
    if workflow_src.exists():
        text = workflow_src.read_text(encoding="utf-8")
        text = text.replace('"WAB-Mobile-Customer/**"', '"**"').replace("working-directory: WAB-Mobile-Customer",
                                                                         "working-directory: .")
        text = text.replace("WAB-Mobile-Customer/", "").replace(".github/workflows/customer-ci.yml",
                                                                ".github/workflows/ci.yml")
        dest = target / ".github/workflows/ci.yml"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text, encoding="utf-8")
    write_error_code_reference(target)


def write_error_code_reference(target: Path) -> None:
    """The error-code policy compares ErrorCode with a domain reference: start it from the current enum."""
    enum_file = next(target.glob("core/domain/src/commonMain/kotlin/**/core/domain/ErrorCode.kt"))
    body = enum_file.read_text(encoding="utf-8").split("enum class ErrorCode", 1)[-1].split(";", 1)[0]
    codes = [code for code in re.findall(r"^\s*([A-Z_]+),", body, re.M) if code != "UNKNOWN"]
    template = (FILES_DIR / "BUSINESS_DOMAIN.md").read_text(encoding="utf-8")
    (target / "BUSINESS_DOMAIN.md").write_text(template.replace("__ERROR_CODES__", "\n".join(codes)), encoding="utf-8")


def rename_everything(target: Path, opts: Options) -> None:
    """Package, plugin ids, project/product names and WAB identifiers in every text file, then the source folders."""
    new_path = opts.package.replace(".", "/")
    pairs = [
        (SOURCE_PACKAGE, opts.package),
        (SOURCE_PACKAGE.replace(".", "/"), new_path),
        (SOURCE_PACKAGE.replace(".", "-"), opts.package.replace(".", "-")),
        ("WABAppCheck", f"{opts.project_name}AppCheck"),
        ("WAB-PhoneAuth", f"{opts.project_name}-PhoneAuth"),
        (SOURCE_PROJECT, opts.project_name),
        ("WAB-Mobile-Customer", opts.project_name),
        ("WAB_ENTITLEMENTS", "APP_ENTITLEMENTS"),
        ("WAB_SKIP_IOS", "SKIP_IOS"),
    ]
    for path in target.rglob("*"):
        if path.is_file() and is_text(path):
            text = path.read_text(encoding="utf-8")
            updated = text
            for old, new in pairs:
                updated = updated.replace(old, new)
            if updated != text:
                path.write_text(updated, encoding="utf-8")
    old_parts = SOURCE_PACKAGE.split(".")
    for directory in sorted({p for p in target.rglob("*") if p.is_dir()}, key=lambda p: len(p.parts), reverse=True):
        if directory.name == old_parts[-1] and list(directory.parts[-len(old_parts):]) == old_parts:
            base = Path(*directory.parts[:-len(old_parts)])
            destination = base / new_path
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(directory), str(destination))
            prune_empty(base / old_parts[0])


def retarget_api(target: Path, opts: Options) -> None:
    """The customer API prefix (`/customer/v1`) and Socket.IO namespace (`/customer`) become the new app's."""
    for path in target.rglob("*"):
        if path.is_file() and is_text(path):
            text = path.read_text(encoding="utf-8")
            updated = text.replace("/customer/v1", opts.api_prefix)
            if "core/realtime" in path.as_posix():
                updated = updated.replace("CUSTOMER_NAMESPACE", "APP_NAMESPACE").replace("/customer", opts.realtime_namespace)
            if updated != text:
                path.write_text(updated, encoding="utf-8")


def validate_api_path(value: str) -> Optional[str]:
    return None if re.match(r"^/[a-z0-9][a-z0-9/_-]*$", value) and not value.endswith("/") else \
        "start with '/', lowercase letters, digits, '-', '_' or '/', no trailing '/' (e.g. /api/v1)"


def merge_into(staging: Path, target: Path) -> List[str]:
    """Moves the generated files into an existing folder; files the folder already has are kept (theirs win)."""
    kept = []
    for path in sorted(staging.rglob("*")):
        if not path.is_file():
            continue
        rel = path.relative_to(staging)
        dest = target / rel
        if dest.exists():
            kept.append(rel.as_posix())
            continue
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(path), str(dest))
    shutil.rmtree(staging)
    return kept


def prune_empty(directory: Path) -> None:
    if not directory.is_dir():
        return
    for child in sorted(directory.rglob("*"), key=lambda p: len(p.parts), reverse=True):
        if child.is_dir() and not any(child.iterdir()):
            child.rmdir()
    if not any(directory.iterdir()):
        directory.rmdir()
