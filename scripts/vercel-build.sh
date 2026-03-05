#!/bin/sh
set -eu

# Debug: print env info
echo "==> Shell: $SHELL"
echo "==> PATH: $PATH"
echo "==> PWD: $PWD"
which curl  && echo "curl: OK"  || echo "curl: MISSING"
which tar   && echo "tar: OK"   || echo "tar: MISSING"
which unzip && echo "unzip: OK" || echo "unzip: MISSING"
which git   && echo "git: OK"   || echo "git: MISSING"

FLUTTER_VERSION="3.27.4"

echo "==> Downloading Flutter ${FLUTTER_VERSION}..."
curl -fSL \
  "https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz" \
  -o /tmp/flutter.tar.xz

echo "==> Extracting to /tmp..."
tar xf /tmp/flutter.tar.xz -C /tmp
rm /tmp/flutter.tar.xz

export PATH="/tmp/flutter/bin:$PATH"

echo "==> Configuring Flutter..."
flutter config --enable-web --no-analytics

echo "==> Getting dependencies..."
flutter pub get

echo "==> Writing dart-defines..."
cat > /tmp/dart_defines.json << DEFS
{
  "ENABLE_BACKEND": "${ENABLE_BACKEND:-false}",
  "FIREBASE_API_KEY": "${FIREBASE_API_KEY:-}",
  "FIREBASE_APP_ID": "${FIREBASE_APP_ID:-}",
  "FIREBASE_MESSAGING_SENDER_ID": "${FIREBASE_MESSAGING_SENDER_ID:-}",
  "FIREBASE_PROJECT_ID": "${FIREBASE_PROJECT_ID:-}",
  "FIREBASE_AUTH_DOMAIN": "${FIREBASE_AUTH_DOMAIN:-}",
  "FIREBASE_STORAGE_BUCKET": "${FIREBASE_STORAGE_BUCKET:-}",
  "FIREBASE_MEASUREMENT_ID": "${FIREBASE_MEASUREMENT_ID:-}",
  "GOOGLE_MAPS_API_KEY": "${GOOGLE_MAPS_API_KEY:-}"
}
DEFS

echo "==> Building web..."
flutter build web --release --dart-define-from-file=/tmp/dart_defines.json

echo "==> Done."
