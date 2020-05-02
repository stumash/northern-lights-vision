#!/usr/bin/env bash

if [ -n "${1}" ]; then
    aws_profile_flag="${1}" # e.g. --profile=john
else
    aws_profile_flag="--profile=default"
fi

THIS_DIR="$(dirname "$(readlink -f "${0}")")"
cd "${THIS_DIR}"

aws "${aws_profile_flag}" \
    s3 rm 's3://labeller.northernlights.vision/' \
    --recursive

aws "${aws_profile_flag}" \
    s3 sync . s3://labeller.northernlights.vision \
    --delete \
    --cache-control no-cache
