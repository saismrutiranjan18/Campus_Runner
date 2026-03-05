#!/bin/sh
set -eu

FLUTTER_VERSION="3.27.4"
FLUTTER_URL="https://storage.googleapis.com/flutter_infra_release/releases/stable/linux/flutter_linux_${FLUTTER_VERSION}-stable.tar.xz"

echo "==> Downloading Flutter ${FLUTTER_VERSION}..."
curl -L "$FLUTTER_URL" -o flutter.tar.xz

echo "==> Extracting Flutter..."
tar xf flutter.tar.xz
rm flutter.tar.xz

export PATH="$PWD/flutter/bin:$PATH"

echo "==> Configuring Flutter..."
flutter config --enable-web --no-analytics

echo "==> Getting dependencies..."
flutter pub get

echo "==> Writing dart-defines..."
cat > dart_defines.json << EOF
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
EOF

echo "==> Building web..."
flutter build web --release --dart-define-from-file=dart_defines.json

echo "==> Done."
