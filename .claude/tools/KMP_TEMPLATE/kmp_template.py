#!/usr/bin/env python3
"""KMP_TEMPLATE: create a new Kotlin Multiplatform app (Android + iOS) identical in setup to the WAB customer app.

Interactive: run it and answer the questions (Enter keeps the default, an empty optional answer skips it).
Non-interactive: pass the values as flags and --yes. See README.md next to this file.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Callable, List, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent))

from configure import (FIREBASE_SLOTS, configure_environment, configure_names, install_firebase,  # noqa: E402
                       prune_policy_baseline, write_docs)
from firebase_files import looks_like  # noqa: E402
from generator import (SOURCE_PACKAGE, SOURCE_PROJECT, Options, apply_shell, copy_project,  # noqa: E402
                       project_name_from, rename_everything, retarget_tooling, strip_features, validate_package)

DEFAULT_SOURCE = Path(__file__).resolve().parents[3] / "WAB-Mobile-Customer"
FIREBASE_QUESTIONS = {
    "android_dev": "Firebase Android DEV google-services.json path",
    "android_prod": "Firebase Android PROD google-services.json path",
    "ios_dev": "Firebase iOS DEV GoogleService-Info.plist path",
    "ios_prod": "Firebase iOS PROD GoogleService-Info.plist path",
}


def ask(question: str, default: str = "", check: Optional[Callable[[str], Optional[str]]] = None,
        reader: Callable[[str], str] = input) -> str:
    while True:
        suffix = f" [{default}]" if default else ""
        answer = reader(f"{question}{suffix}: ").strip() or default
        error = check(answer) if check else None
        if not error:
            return answer
        print(f"  ✗ {error}")


def firebase_check(slot: str) -> Callable[[str], Optional[str]]:
    def check(answer: str) -> Optional[str]:
        if not answer:
            return None
        path = Path(answer).expanduser()
        if not path.is_file():
            return f"file not found: {path}"
        if not looks_like(path, slot):
            return "this does not look like the right Firebase file for this slot"
        return None
    return check


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="template source (the WAB customer app)")
    parser.add_argument("--target", type=Path, help="folder to create (must not exist)")
    parser.add_argument("--app-name")
    parser.add_argument("--app-name-ar", default=None, help="Arabic app name (default: the app name)")
    parser.add_argument("--package", help="package / applicationId / bundle id, e.g. com.acme.shop")
    parser.add_argument("--project-name", help="Gradle root project and iOS product name (default from the app name)")
    parser.add_argument("--dev-suffix", default=None)
    parser.add_argument("--dev-api-url")
    parser.add_argument("--prod-api-url")
    parser.add_argument("--dev-web-url")
    parser.add_argument("--prod-web-url")
    parser.add_argument("--team-id", help="Apple Team ID (default: keep the template's)")
    for slot in FIREBASE_SLOTS:
        parser.add_argument(f"--firebase-{slot.replace('_', '-')}", type=Path, dest=f"firebase_{slot}")
    parser.add_argument("--no-git", action="store_true", help="do not run 'git init' in the new project")
    parser.add_argument("--yes", action="store_true", help="never prompt: use flags and defaults")
    return parser.parse_args(argv)


def collect(args: argparse.Namespace) -> Options:
    interactive = not args.yes

    def value(current: Optional[str], question: str, default: str = "", check=None) -> str:
        if current is not None:
            error = check(current) if check else None
            if error:
                sys.exit(f"{question}: {error}")
            return current
        return ask(question, default, check) if interactive else default

    app_name = value(args.app_name, "App name (shown under the icon)", check=lambda a: None if a else "required")
    project = project_name_from(app_name)
    package = value(args.package, "Package name (applicationId and iOS bundle id)", f"com.example.{project.lower()}",
                    check=lambda p: validate_package(p) or (None if p != SOURCE_PACKAGE else "pick a new package"))
    project_name = value(args.project_name, "Project name (Gradle / iOS product)", project,
                         check=lambda p: None if p.isidentifier() else "letters and digits only, starting with a letter")
    app_name_ar = value(args.app_name_ar, "Arabic app name (Enter = same as the app name)", app_name)
    target = Path(value(str(args.target) if args.target else None, "Create the project in folder",
                        str(Path.cwd() / project_name),
                        check=lambda t: f"{t} already exists" if Path(t).expanduser().exists() else None)).expanduser()
    opts = Options(target=target.resolve(), app_name=app_name, package=package, project_name=project_name,
                   app_name_ar=app_name_ar)
    opts.dev_suffix = value(args.dev_suffix, "Dev build id suffix (dev and prod install side by side)", opts.dev_suffix)
    opts.dev_api_url = value(args.dev_api_url, "Dev API base URL", opts.dev_api_url)
    opts.prod_api_url = value(args.prod_api_url, "Prod API base URL", opts.prod_api_url)
    opts.dev_web_url = value(args.dev_web_url, "Dev web URL (deep links)", opts.dev_web_url)
    opts.prod_web_url = value(args.prod_web_url, "Prod web URL (deep links)", opts.prod_web_url)
    opts.team_id = value(args.team_id, "Apple Team ID (Enter = keep the template's)", "")
    for slot, question in FIREBASE_QUESTIONS.items():
        given = getattr(args, f"firebase_{slot}")
        answer = value(str(given) if given else None, f"{question} (Enter = skip, placeholder)", "",
                       check=firebase_check(slot))
        opts.firebase[slot] = Path(answer).expanduser() if answer else None
    return opts


def generate(opts: Options, source: Path, git: bool) -> List[str]:
    copy_project(source, opts.target)
    strip_features(opts.target)
    apply_shell(opts.target)
    retarget_tooling(opts.target, source)
    rename_everything(opts.target, opts)
    configure_environment(opts.target, opts)
    configure_names(opts.target, opts)
    notes = install_firebase(opts.target, opts)
    prune_policy_baseline(opts.target)
    write_docs(opts.target, opts, notes)
    if git:
        subprocess.run(["git", "init", "-q"], cwd=opts.target, check=False)
    return notes


def leftovers(target: Path) -> List[str]:
    """Files that still mention the template's identity (should be empty)."""
    markers = (SOURCE_PACKAGE, SOURCE_PROJECT, SOURCE_PACKAGE.replace(".", "/"))
    found = []
    for path in target.rglob("*"):
        if path.is_file() and ".git" not in path.parts:
            try:
                text = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            if any(marker in text for marker in markers):
                found.append(str(path.relative_to(target)))
    return found


def main(argv: List[str]) -> int:
    args = parse_args(argv)
    source = args.source.resolve()
    if not (source / "settings.gradle.kts").exists():
        print(f"Template source not found: {source} (use --source)")
        return 1
    print(f"KMP_TEMPLATE — new KMP app from {source.name}\n")
    opts = collect(args)
    if opts.target == source or source in opts.target.parents:
        print(f"The target {opts.target} is inside the template source; pick a folder outside {source}.")
        return 1
    print(f"\nCreating {opts.project_name} ({opts.package}) in {opts.target}")
    if not args.yes and ask("Continue? (y/n)", "y").lower() not in ("y", "yes"):
        print("Cancelled.")
        return 1
    notes = generate(opts, source, git=not args.no_git)
    print("\nDone. Firebase:")
    for note in notes:
        print(f"  - {note}")
    rest = leftovers(opts.target)
    if rest:
        print("\nStill mentioning the template identity (review):\n  " + "\n  ".join(rest))
    print(f"\nNext: cd {opts.target} && cat README.md")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
