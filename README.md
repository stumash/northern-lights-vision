# northern-lights-vision

Find out if the Aurora Borealis is currently visible!

* notification service (email or text or mobile app)
* live web page updated in real time

## Data Pipeline

1. `download_all_ylknf_480p_mp4.sh` : get all the raw night sky video from ucalgary, put it in `/data.northernlights.vision/unlabelled`. Then we flattened the folder structure to only contain the 480p mp4 files
2. put raw night sky videos in s3, run `/labeller` project as s3 static site, GUI to label timeranges of raw video as 'containing northern lights'. This gave us `/data.northernlights.vision/annotations` json files that represent the time ranges in each raw video where the aurora is visible
3. `/videoToImages` contains the code of an aws lambda that (in massive parallel for $2.50) uses FFMPEG to extract all the individual frames of every video. These folders full of individual frame `.jpg`s are zipped at `.7z` compressed folders in `/data.northernlights.vision/images`
4. `/makeLabelledVideoFramesCsv/main.py` generates `/data.northernlights.vision/labelledVideoFrames.csv` which is a `.csv` file of the form `File Name,Frame Time,Is Aurora` which labels every zipped frame as `True` or `False`


## TODO

- [x] Assess image quality across resolutions
- - [x] Download same-day video in three formats (480p ~50MB, 720p ~100MB, 1080p ~250MB)
- - [x] Convert mp4 to list of png
- - [x] Assess quality of pngs of different formats
- - [x] Convert different png resolution to each other (up/down sample) and assess quality
- - [x] **FINDING: 480p is more than enough resolution**

- [x] Download all 2014-2018 aurora cam streams (480p)
- [x] Flatten S3 folder structure

- [ ] Build the data-labelling pipeline
- - [x] mp4 to png list (script)
- - [ ] label png list using timestamps for mp4 (script)
- - [x] build ui for easy timestamping of mp4
  - - [ ] **URGENT**: label enough data

- [ ] Build and Train a computer vision machine learning model
- - [ ] Define the model (probably AlexNet variant)
- - [ ] Train the model (checkpoints w/ accuracies)

- [ ] Service that watches live aurora cam, feeds it to model
- - [ ] log model predictions w/ persistence service

- [ ] Build web page and notification system
- - [ ] ?
