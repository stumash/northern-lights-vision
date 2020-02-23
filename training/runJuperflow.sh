#!/usr/bin/env bash

docker run -it \
  -p 8888:8888 \
  -v $(pwd)/notebooks:/tf \
  -v $(pwd)/../data.northernlights.vision:/tf/data \
  $(docker build -f juperflow.Dockerfile -q .)
