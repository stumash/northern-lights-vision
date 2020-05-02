#!/usr/bin/env bash

wget \
    -r \
    -np \
    -nc \
    -erobots=off \
    -A '*480p.mp4' \
    -v \
    'http://data.phys.ucalgary.ca/sort_by_project/AuroraMAX/rt-movies/mp4/'
