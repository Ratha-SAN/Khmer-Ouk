#!/bin/sh
# Cloudflare Pages build: copy only the files the game needs into dist/ (so firebase.json, firestore.rules,
# the GitHub workflows and the README are not published). Pages settings: build command "sh build-cloudflare.sh",
# output directory "dist".
set -e
rm -rf dist
mkdir dist
cp index.html sw.js manifest.webmanifest icon.svg apple-touch-icon.png icon-192.png icon-512.png _headers dist/
cp -r data dist/data
cp -r help dist/help
# version.json: the game compares it with its own APP_VERSION to offer an update to a copy left open (see checkForUpdate)
ver=$(grep -o "const APP_VERSION = '[0-9.]*'" index.html | head -1 | grep -o "[0-9][0-9.]*")
printf '{"version":"%s"}\n' "$ver" > dist/version.json
cat dist/version.json
echo "dist/ ready:"
ls -la dist dist/data
