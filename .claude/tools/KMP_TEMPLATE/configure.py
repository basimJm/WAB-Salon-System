"""KMP_TEMPLATE configuration step: app names, environment URLs, signing team, Firebase files, policy baseline, docs."""
from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import List
from xml.sax.saxutils import escape

from firebase_files import android_placeholder, ios_placeholder, read_android_packages, read_ios_bundle_id
from generator import FILES_DIR, Options, edit, host_of, set_properties, xcconfig_url

FIREBASE_SLOTS = {
    "android_dev": ("androidApp/src/dev/google-services.json", "dev"),
    "android_prod": ("androidApp/src/prod/google-services.json", "prod"),
    "ios_dev": ("iosApp/Firebase/dev/GoogleService-Info.plist", "dev"),
    "ios_prod": ("iosApp/Firebase/prod/GoogleService-Info.plist", "prod"),
}


def application_id(opts: Options, env: str) -> str:
    return opts.package + (opts.dev_suffix if env == "dev" else "")


def configure_environment(target: Path, opts: Options) -> None:
    props = target / "gradle.properties"
    props.write_text(set_properties(props.read_text(encoding="utf-8"), {
        "DEV_API_BASE_URL": opts.dev_api_url,
        "DEV_WEB_BASE_URL": opts.dev_web_url,
        "PROD_API_BASE_URL": opts.prod_api_url,
        "PROD_WEB_BASE_URL": opts.prod_web_url,
        "DEV_APPLICATION_ID_SUFFIX": opts.dev_suffix,
        "DEV_DATA_SOURCE": opts.dev_data_source,
        "PROD_DATA_SOURCE": "remote",
    }), encoding="utf-8")
    for env, display, api, web in (("Dev", f"{opts.app_name} Dev", opts.dev_api_url, opts.dev_web_url),
                                   ("Prod", opts.app_name, opts.prod_api_url, opts.prod_web_url)):
        xc = target / f"iosApp/Configuration/{env}.xcconfig"
        xc.write_text(set_properties(xc.read_text(encoding="utf-8"), {
            "APP_DISPLAY_NAME": display,
            "API_BASE_URL": xcconfig_url(api),
            "WEB_BASE_URL": xcconfig_url(web),
            "DEEP_LINK_HOST": host_of(web),
            "BUNDLE_ID_SUFFIX": opts.dev_suffix if env == "Dev" else "",
            "DATA_SOURCE": opts.dev_data_source if env == "Dev" else "remote",
        }), encoding="utf-8")
    if opts.team_id:
        config = target / "iosApp/Configuration/Config.xcconfig"
        config.write_text(set_properties(config.read_text(encoding="utf-8"), {"TEAM_ID": opts.team_id}), encoding="utf-8")


def configure_names(target: Path, opts: Options) -> None:
    arabic = opts.app_name_ar or opts.app_name
    names = {
        "androidApp/src/main/res/values/strings.xml": opts.app_name,
        "androidApp/src/main/res/values-ar/strings.xml": arabic,
        "androidApp/src/dev/res/values/strings.xml": f"{opts.app_name} Dev",
        "androidApp/src/dev/res/values-ar/strings.xml": f"{arabic} تجريبي",
    }
    for rel, value in names.items():
        path = target / rel
        text = path.read_text(encoding="utf-8")
        start = text.index('<string name="app_name">') + len('<string name="app_name">')
        end = text.index("</string>", start)
        path.write_text(text[:start] + escape(value) + text[end:], encoding="utf-8")
    edit(next(target.glob("core/design-system/src/commonMain/composeResources/values/strings.xml")),
         [('<string name="brand_name" translatable="false">WAB</string>',
           f'<string name="brand_name" translatable="false">{escape(opts.app_name)}</string>')])
    for locale, old, name in (("values", "version of WAB", opts.app_name), ("values-ar", "من WAB", arabic)):
        shell_strings = target / f"composeApp/src/commonMain/composeResources/{locale}/strings.xml"
        text = shell_strings.read_text(encoding="utf-8").replace(old, old.replace("WAB", escape(name)))
        shell_strings.write_text(text, encoding="utf-8")


def install_firebase(target: Path, opts: Options) -> List[str]:
    """Copies the user's Firebase files (checked against the expected ids) or writes placeholders. Returns notes."""
    notes = []
    for slot, (rel, env) in FIREBASE_SLOTS.items():
        dest = target / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        expected = application_id(opts, env)
        provided = opts.firebase.get(slot)
        if provided:
            shutil.copyfile(provided, dest)
            found = read_android_packages(dest) if slot.startswith("android") else [read_ios_bundle_id(dest)]
            if expected not in found:
                notes.append(f"WARNING {rel}: expects '{expected}', the file has {found}")
            else:
                notes.append(f"{rel}: your Firebase file ({expected})")
        else:
            content = android_placeholder(expected, env) if slot.startswith("android") else ios_placeholder(expected, env)
            dest.write_text(content, encoding="utf-8")
            notes.append(f"{rel}: PLACEHOLDER for {expected} (app runs without Firebase until you add the real file)")
    return notes


def prune_policy_baseline(target: Path) -> None:
    """The baseline may only shrink and fails on stale entries: drop entries whose file did not survive the copy."""
    baseline = target / "config/policy-baseline.json"
    data = json.loads(baseline.read_text(encoding="utf-8"))
    kept = {rel: rules for rel, rules in data.items() if (target / rel).exists()}
    baseline.write_text(json.dumps(kept, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def write_docs(target: Path, opts: Options, notes: List[str]) -> None:
    values = {
        "__APP_NAME__": opts.app_name,
        "__PROJECT_NAME__": opts.project_name,
        "__PACKAGE__": opts.package,
        "__DEV_ID__": application_id(opts, "dev"),
        "__DEV_API__": opts.dev_api_url,
        "__PROD_API__": opts.prod_api_url,
        "__FIREBASE_NOTES__": "\n".join(f"- {note}" for note in notes),
        "__API_PREFIX__": opts.api_prefix,
        "__DEV_DATA_SOURCE__": opts.dev_data_source,
    }
    (target / ".claude").mkdir(exist_ok=True)
    for source, name in (("README.md", "README.md"), ("CLAUDE.md", "CLAUDE.md"), ("gitignore", ".gitignore"),
                         ("rules.md", ".claude/rules.md"), ("roles.md", ".claude/roles.md"),
                         ("session.md", ".claude/session.md"), ("memory.md", ".claude/memory.md")):
        text = (FILES_DIR / source).read_text(encoding="utf-8")
        for key, value in values.items():
            text = text.replace(key, value)
        (target / name).write_text(text, encoding="utf-8")
