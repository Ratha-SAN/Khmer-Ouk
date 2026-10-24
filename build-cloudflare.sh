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
echo "dist/ ready:"
ls -la dist dist/data
