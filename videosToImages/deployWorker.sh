#!/usr/bin/env bash

set -e

cd worker

npm install

rm -rf dist
mkdir dist
zip -rq dist/package.zip node_modules/ worker.js

aws lambda update-function-code \
  --function-name nlv-batch-transcode-worker \
  --zip-file fileb://dist/package.zip

cd ..