#!/usr/bin/env bash

set -e

npm install

rm -rf dist
mkdir dist
zip -rq dist/package.zip node_modules/ *.js

aws lambda update-function-code \
  --function-name api_labeller \
  --zip-file fileb://dist/package.zip
