#!/usr/bin/env bash
# Copies the showcase backgrounds into the booted simulator's copy of the development build.
set -euo pipefail

PHOTOS="$(cd "$(dirname "$0")/../photos" && pwd)"

BUNDLE_ID="${1:-com.ncoulon.sunory.dev}"
CONTAINER="$(xcrun simctl get_app_container booted "$BUNDLE_ID" data)"
TARGET="$CONTAINER/Documents/showcase"
mkdir -p "$TARGET"
for PHOTO in coast mountain apartment village; do
  cp "$PHOTOS/$PHOTO.png" "$TARGET/$PHOTO.png"
done
echo "Photos copied to $TARGET"
