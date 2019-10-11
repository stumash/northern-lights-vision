/*
  To install Tesseract on Ubuntu 18: sudo apt install tesseract-ocr
*/
const path = require("path");
const util = require("util");
const childProcess = require("child_process");
const rimraf = require("rimraf");
const fs = require("fs");
const exec = util.promisify(childProcess.exec);
const readdir = util.promisify(fs.readdir);
const rmdir = util.promisify(rimraf);

// small timestamp image format
const SINGLE_ZIP_FILE_NAME = "/home/david/Programming/northern-lights-vision/data.northernlights.vision/images/auroramaxHD_20120214_480p.7z";

// large timestamp image format
// const SINGLE_ZIP_FILE_NAME = "/home/david/Programming/northern-lights-vision/data.northernlights.vision/images/auroramaxHD_20180105_480p.7z";

const extractTimestamps = async (imageArchiveFilePath) => {
  const extractedImagesFolderPath = await extractImageArchive(imageArchiveFilePath);

  console.time("ocr");
  await extractTimestampsFromFolder(extractedImagesFolderPath);
  console.timeEnd("ocr");

  await rmdir(extractedImagesFolderPath);
};

const extractImageArchive = async imageArchiveFilePath => {
  console.log("extracting archive:", path.basename(imageArchiveFilePath));
  const command = `7z x -y -o${path.dirname(imageArchiveFilePath)} ${imageArchiveFilePath}`
  await exec(command);
  console.log("done extracing archive");
  return path.resolve(path.dirname(imageArchiveFilePath), path.basename(imageArchiveFilePath, path.extname(imageArchiveFilePath)));
};

const extractTimestampsFromFolder = async extractedImagesFolderPath => {
  let imageFileNames = await readdir(extractedImagesFolderPath);
  let ffmpegFormat;
  for(let fileName of imageFileNames) {
    if(fileName === "fps.txt") {
      continue;
    }

    const filePath = path.join(extractedImagesFolderPath, fileName);

    if(!ffmpegFormat) {
      console.log("Probing file format of", filePath);
      const ffmpegFormatCommand = `ffprobe ${filePath} -show_entries format=format_name -v quiet | grep -oP 'format_name=\\K\\w+'`;
      const { stdout } = await exec(ffmpegFormatCommand);
      ffmpegFormat = stdout;
      console.log("Probed file format:", ffmpegFormat.trim());
    }

    const textExtractionCommand = `ffmpeg -i ${filePath} -vf "crop=300:30:554:in_h-30, negate" -f ${ffmpegFormat.trim()} pipe: | tesseract stdin stdout --psm 7`;
    const { stdout: rawExtractedText } = await exec(textExtractionCommand);
    console.log(fileName, ":");
    console.log(`  ${rawExtractedText.trim()}`);
    const dateTextMatch = rawExtractedText.match(/(\d{4}\/\d{2}\/\d{2})\s*(\d{2}:\d{2}(:\d{2})?).*(?!HNR)([a-zA-Z]{3})/);
    if(dateTextMatch) {
      const [ ,date, time,, timeZone ] = dateTextMatch;
      const parsedEpoch = Date.parse(`${date} ${time} ${timeZone}`);
      if(!isNaN(parsedEpoch)) {
        console.log(`  ${new Date(parsedEpoch).toISOString()}`);
      } else {
        console.log(`  Extracted unparseable text: ${date} ${time} ${timeZone}`);
        console.log("  Bad command:", textExtractionCommand);
      }
    } else {
      console.log(`  Extracted unregexable text:`);
      console.log(" ", textExtractionCommand);
    }
    console.log("------------------------");
  }
};

// main
(async () => {
  await extractTimestamps(SINGLE_ZIP_FILE_NAME);
})();
