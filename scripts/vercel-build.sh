#!/bin/sh
set -eu

echo "==> Cloning Flutter..."
git clone https://github.com/flutter/flutter.git -b stable --depth 1

echo "==> Setting PATH..."
export PATH="$PWD/flutter/bin:$PATH"
chmod +x ./flutter/bin/flutter ./flutter/bin/dart

echo "==> Enabling web..."
flutter config --enable-web

echo "==> Getting dependencies..."
flutter pub get

echo "==> Building web..."
flutter build web --release \
  --dart-define=ENABLE_BACKEND="${ENABLE_BACKEND:-false}" \
  --dart-define=FIREBASE_API_KEY="${FIREBASE_API_KEY:-}" \
  --dart-define=FIREBASE_APP_ID="${FIREBASE_APP_ID:-}" \
  --dart-define=FIREBASE_MESSAGING_SENDER_ID="${FIREBASE_MESSAGING_SENDER_ID:-}" \
  --dart-define=FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-}" \
  --dart-define=FIREBASE_AUTH_DOMAIN="${FIREBASE_AUTH_DOMAIN:-}" \
  --dart-define=FIREBASE_STORAGE_BUCKET="${FIREBASE_STORAGE_BUCKET:-}" \
  --dart-define=FIREBASE_MEASUREMENT_ID="${FIREBASE_MEASUREMENT_ID:-}" \
  --dart-define=GOOGLE_MAPS_API_KEY="${GOOGLE_MAPS_API_KEY:-}"

echo "==> Done."
