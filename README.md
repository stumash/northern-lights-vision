# northern-lights-vision

Find out if the Aurora Borealis is currently visible!

* notification service (email or text or mobile app)
* live web page updated in real time

## TODO

- [x] Assess image quality across resolutions
- - [x] Download same-day video in three formats (480p ~50MB, 720p ~100MB, 1080p ~250MB)
- - [x] Convert mp4 to list of png
- - [x] Assess quality of pngs of different formats
- - [x] Convert different png resolution to each other (up/down sample) and assess quality
- - [x] **FINDING: 480p is more than enough resolution**

- [ ] Download all 2014-2018 aurora cam streams (720p probably) (download time ~16hrs)

- [ ] Build the data-labelling pipeline
- - [ ] mp4 to png list (script)
- - [ ] label png list using timestamps for mp4 (script)
- - [ ] build ui for easy timestamping of mp4

- [ ] Build and Train a computer vision machine learning model
- - [ ] Define the model (probably AlexNet variant)
- - [ ] Train the model (checkpoints w/ accuracies)

- [ ] Service that watches live aurora cam, feeds it to model
- - [ ] log model predictions w/ persistence service

- [ ] Build web page and notification system
- - [ ] ?
