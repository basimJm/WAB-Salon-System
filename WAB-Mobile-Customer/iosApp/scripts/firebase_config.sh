#!/bin/sh
# Copies the Firebase config of the current environment (APP_ENV = dev | prod) into the app bundle and
# registers the URL scheme Firebase Phone Auth needs for its reCAPTCHA fallback (the "encoded app id").
set -e
SRC="$SRCROOT/Firebase/$APP_ENV/GoogleService-Info.plist"
if [ ! -f "$SRC" ]; then
  echo "error: missing $SRC (see docs/FIREBASE_SETUP.md)"
  exit 1
fi
APP_DIR="$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
cp "$SRC" "$APP_DIR/GoogleService-Info.plist"

PB=/usr/libexec/PlistBuddy
GOOGLE_APP_ID=$($PB -c "Print GOOGLE_APP_ID" "$SRC")
ENCODED_APP_ID="app-$(echo "$GOOGLE_APP_ID" | tr ':' '-')"
INFO="$TARGET_BUILD_DIR/$INFOPLIST_PATH"
$PB -c "Delete :CFBundleURLTypes" "$INFO" 2>/dev/null || true
$PB -c "Add :CFBundleURLTypes array" "$INFO"
$PB -c "Add :CFBundleURLTypes:0 dict" "$INFO"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLName string firebase-phone-auth" "$INFO"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$INFO"
$PB -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string $ENCODED_APP_ID" "$INFO"
REVERSED=$($PB -c "Print REVERSED_CLIENT_ID" "$SRC" 2>/dev/null || true)
if [ -n "$REVERSED" ]; then
  $PB -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:1 string $REVERSED" "$INFO"
fi
