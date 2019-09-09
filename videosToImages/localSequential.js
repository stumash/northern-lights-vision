const path = require("path");
const util = require("util");
const childProcess = require("child_process");
const rimraf = require("rimraf");
const fs = require("fs");
const cliProgress = require("cli-progress");
const exec = util.promisify(childProcess.exec);
const writeFile = util.promisify(fs.writeFile);
const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);
const rmdir = util.promisify(rimraf);

const UNLABELLED_FOLDER = "../data.northernlights.vision/unlabelled";
const IMAGES_FOLDER = "../data.northernlights.vision/images";
const FFMPEG_JPEG_QUALITY = 5;

// main
(async () => {
  let fileNames = await readdir(UNLABELLED_FOLDER);
  // fileNames = fileNames.slice(0,2);
  for(let fileName of fileNames) {
    await videoToImageZip(fileName);
  }
})();

const videoToImageZip = async (videoFileName) => {
  const videoFilePath = path.join(UNLABELLED_FOLDER, videoFileName);
  const imageFolderPath = path.join(IMAGES_FOLDER, videoFileName.replace(/\.[^/.]+$/, ""));
  const zipFilePath = path.join(imageFolderPath, `../${path.basename(imageFolderPath)}.7z`);
  console.log("Processing video:", videoFileName);
  // check if we've already done this video
  try { 
    await stat(zipFilePath);
    console.log(`File ${zipFilePath} already exists. Skipping`);
    console.log("\n");
    return;
  } catch(err) {
    if(err.code !== "ENOENT") {
      throw err;
    }
  }
  // create folder with same name as video, remove file extension
  await mkdir(imageFolderPath);
  // use ffmpeg to add fps value to folder
  const fps = await getVideoFps(videoFilePath);
  await writeFile(path.join(imageFolderPath, "fps.txt"), fps);
  console.log("Got fps value:", fps);
  // use ffmpeg to add images into the 
  await convertVideoToImages(videoFilePath, imageFolderPath);
  // use 7zip to compress the folder
  await compressImageFolder(imageFolderPath, zipFilePath);
  // delete the folder
  await rmdir(imageFolderPath);
  console.log("\n");
};

const getVideoFps = async videoFilePath => {
  const command = `ffprobe -v 0 -of csv=p=0 -select_streams v:0 -show_entries stream=r_frame_rate ${videoFilePath}`
  const { stdout: fps } = await exec(command);
  return fps.trim();
};

const convertVideoToImages = (videoFilePath, imageFolderPath) => {
  const startTime = Date.now();
  let videoDuration;
  const process = childProcess.spawn(
    "ffmpeg", [ "-i", videoFilePath, "-q:v", FFMPEG_JPEG_QUALITY, path.join(imageFolderPath, "frame-%05d.jpg") ]
  );
  const progressBar = new cliProgress.SingleBar({
    format: 'mp4 -> jpeg | {bar} | {currentTimeString}/{totalTimeString} | ETA: {eta} seconds'
  }, cliProgress.Presets.shades_classic);
  process.stderr.on("data", data => {
    const durationMatch = data.toString().match(/Duration: (\d{2}:\d{2}:\d{2}.\d{2})/);
    const progressMatch = data.toString().match(/frame=.*time=(\d{2}:\d{2}:\d{2}.\d{2})/);
    if(durationMatch) {
      videoDuration = videoTimeStringToMillis(durationMatch[1]);
      progressBar.start(videoDuration, 0, { 
        currentTimeString: "00:00:00.00",
        totalTimeString: durationMatch[1]
      });
    } else if (progressMatch) {
      const currentProgress = videoTimeStringToMillis(progressMatch[1]);
      progressBar.update(currentProgress, { currentTimeString: progressMatch[1] });
    }
  });
  return new Promise((resolve, reject) => {
    process.on("close", () => {
      progressBar.stop();
      console.log(`Converted video in ${(Date.now() - startTime) / 1000} seconds`);
      resolve();
    });
  });
};

const compressImageFolder = (imageFolderPath, zipFilePath) => {
  const startTime = Date.now();
  const process = childProcess.spawn("7z", [ "-bsp1", "a", zipFilePath, imageFolderPath ]);
  const progressBar = new cliProgress.SingleBar({
    format: 'jpeg -> 7z | {bar} | {value} % | ETA: {eta} seconds'
  }, cliProgress.Presets.shades_classic);
  progressBar.start(100, 0);
  process.stdout.on("data", data => {
    const progressMatch = data.toString().match(/(\d{2})%/);
    if(progressMatch) {
      progressBar.update(parseInt(progressMatch[1]));
    }
  });
  return new Promise((resolve, reject) => {
    process.on("close", () => {
      progressBar.update(100);
      progressBar.stop();
      console.log(`Compressed images in ${(Date.now() - startTime) / 1000} seconds`);
      resolve();
    });
  });
};

const videoTimeStringToMillis = timeString => {
  const [ hours, minutes, seconds ] = timeString.split(":");
  return (
    parseInt(hours) * 3600000 + 
    parseInt(minutes) * 60000 + 
    Math.round(parseFloat(seconds) * 1000)
  );
};


