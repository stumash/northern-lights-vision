import re
import json
from subprocess import getoutput
from pathlib import Path

DATA_FOLDER        = "../data.northernlights.vision"
IMAGES_FOLDER      = f"{DATA_FOLDER}/images"
ANNOTATIONS_FOLDER = f"{DATA_FOLDER}/annotations"
OUTPUT_PATH        = f"{DATA_FOLDER}/labelledVideoFrames.csv"

FRAME_NUMBER_REGEX = re.compile(r"frame-(\d{5})")

def getFileAsString(filePath):
  with open(filePath, "r") as f:
    return f.read()

def getFrameTime(fileName, frameRate):
  frameNumberMatch = FRAME_NUMBER_REGEX.search(fileName)
  if not frameNumberMatch:
    raise Exception("Error deleting file: not enough free space")
  return int(frameNumberMatch.groups()[0]) / frameRate

def getArchiveInfo(archivePath):
  [frames, seconds] = map(int, getoutput(f"7z e -so {archivePath} '*/fps.txt'").split("/"))
  imageFileNames = getoutput(f"bash -c \"7z l -ba {archivePath} | head -n -2 | grep .jpg | awk '{{print $5}}'\"")
  frameRate = frames / seconds
  frameTimes = (getFrameTime(fileName, frameRate) for fileName in imageFileNames.split("\n"))
  return (archivePath.stem, frameTimes)

def getAnnotationInfo(fileName):
  return json.loads(getFileAsString(Path(ANNOTATIONS_FOLDER) / Path(fileName)))

def isInAnyInterval(annotation, frameTime):
  return next((True for ann in annotation if frameTime > ann["from"] and frameTime < ann["to"]), False)

annotationInfoMap = {annPath.stem: getAnnotationInfo(annPath.name) for annPath in Path(ANNOTATIONS_FOLDER).iterdir() if annPath.is_file()}
archivePaths = [archivePath for archivePath in Path(IMAGES_FOLDER).iterdir() if archivePath.is_file() and archivePath.stem in annotationInfoMap]
archiveInfos = (getArchiveInfo(archivePath) for archivePath in archivePaths)

def csvRowGenerator():
  for fileName, frameTimes in archiveInfos:
    for frameTime in frameTimes:
      yield (f"{fileName},{frameTime},{isInAnyInterval(annotationInfoMap[fileName], frameTime)}")

with open(OUTPUT_PATH, "w") as f:
  f.write("File Name,Frame Time,Is Aurora\n" + "\n".join(list(csvRowGenerator())))