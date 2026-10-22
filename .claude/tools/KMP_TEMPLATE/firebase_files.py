"""Firebase config helpers: placeholders that build but never connect, and readers that check a provided file's ids."""
from __future__ import annotations

import json
import plistlib
from pathlib import Path
from typing import List

# Not a real key: iOS FirebaseSetup only configures Firebase for a 39-character key, Android calls fail and are caught.
PLACEHOLDER_KEY = "PLACEHOLDER-add-your-firebase-config-file"
PLACEHOLDER_NUMBER = "000000000000"


def _project_id(app_id: str, env: str) -> str:
    return f"{app_id.split('.')[-1]}-{env}-placeholder"


def android_placeholder(package_name: str, env: str) -> str:
    project = _project_id(package_name.replace(".dev", ""), env)
    data = {
        "project_info": {
            "project_number": PLACEHOLDER_NUMBER,
            "project_id": project,
            "storage_bucket": f"{project}.firebasestorage.app",
        },
        "client": [{
            "client_info": {
                "mobilesdk_app_id": f"1:{PLACEHOLDER_NUMBER}:android:0000000000000000",
                "android_client_info": {"package_name": package_name},
            },
            "oauth_client": [],
            "api_key": [{"current_key": PLACEHOLDER_KEY}],
            "services": {"appinvite_service": {"other_platform_oauth_client": []}},
        }],
        "configuration_version": "1",
    }
    return json.dumps(data, indent=2) + "\n"


def ios_placeholder(bundle_id: str, env: str) -> str:
    project = _project_id(bundle_id.replace(".dev", ""), env)
    data = {
        "API_KEY": PLACEHOLDER_KEY,
        "BUNDLE_ID": bundle_id,
        "GCM_SENDER_ID": PLACEHOLDER_NUMBER,
        "GOOGLE_APP_ID": f"1:{PLACEHOLDER_NUMBER}:ios:0000000000000000000000",
        "IS_ADS_ENABLED": False,
        "IS_ANALYTICS_ENABLED": False,
        "IS_APPINVITE_ENABLED": True,
        "IS_GCM_ENABLED": True,
        "IS_SIGNIN_ENABLED": True,
        "PLIST_VERSION": "1",
        "PROJECT_ID": project,
        "STORAGE_BUCKET": f"{project}.firebasestorage.app",
    }
    return plistlib.dumps(data).decode("utf-8")


def read_android_packages(path: Path) -> List[str]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []
    return [client.get("client_info", {}).get("android_client_info", {}).get("package_name", "")
            for client in data.get("client", [])]


def read_ios_bundle_id(path: Path) -> str:
    try:
        with path.open("rb") as handle:
            return str(plistlib.load(handle).get("BUNDLE_ID", ""))
    except (OSError, plistlib.InvalidFileException, ValueError):
        return ""


def looks_like(path: Path, slot: str) -> bool:
    """True when the file has the shape of the slot ('android_*' JSON with clients, 'ios_*' plist with a BUNDLE_ID)."""
    return bool(read_android_packages(path)) if slot.startswith("android") else bool(read_ios_bundle_id(path))
