#!/bin/sh
# Cloudflare Pages build: copy only the files the game needs into dist/ (so firebase.json, firestore.rules,
# the GitHub workflows and the README are not published). Pages settings: build command "sh build-cloudflare.sh",
# output directory "dist".
set -e
rm -rf dist
mkdir dist
cp index.html sw.js manifest.webmanifest icon.svg _headers dist/
cp -r data dist/data
echo "dist/ ready:"
ls -la dist dist/data
