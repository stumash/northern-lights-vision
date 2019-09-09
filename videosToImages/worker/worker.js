const path = require("path");
const util = require("util");
const childProcess = require("child_process");
const rimraf = require("rimraf");
const fs = require("fs");
const exec = util.promisify(childProcess.exec);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const readdir = util.promisify(fs.readdir);
const mkdir = util.promisify(fs.mkdir);
const stat = util.promisify(fs.stat);
const unlink = util.promisify(fs.unlink);
const rmdir = util.promisify(rimraf);
const AWS = require("aws-sdk");

const TEMP_STORAGE = "/tmp";

AWS.config.region = "us-east-1";
const s3 = new AWS.S3();

exports.handler = async ({ bucketName, inputVideoKey }) => {
  const videoFilePath = path.join(TEMP_STORAGE, path.basename(inputVideoKey));
  // remove the file extension via regex
  const imageFolderPath = path.join(TEMP_STORAGE, path.basename(inputVideoKey).replace(/\.[^/.]+$/, ""));
  const archiveFilePath = path.join(TEMP_STORAGE, `${path.basename(imageFolderPath)}.7z`);
  const archiveFileKey = path.join("images", path.basename(archiveFilePath));
  
  console.log("bucketName", bucketName);
  console.log("inputVideoKey", inputVideoKey);
  console.log("archiveFileKey", archiveFileKey);
  console.log("videoFilePath", videoFilePath);
  console.log("imageFolderPath", imageFolderPath);
  console.log("archiveFilePath", archiveFilePath);

  // download from s3
  const videoBytes = await downloadVideoFromS3(bucketName, inputVideoKey);
  await writeFile(videoFilePath, videoBytes);
  
  // mp4 -> jpeg
  await mkdir(imageFolderPath);
  const fps = await getVideoFps(videoFilePath);
  await writeFile(path.join(imageFolderPath, "fps.txt"), fps);
  await convertVideoToImages(videoFilePath, imageFolderPath);
  const deleteVideoFilePromise = unlink(videoFilePath);

  // compress jpegs
  await compressImageFolder(imageFolderPath, archiveFilePath);
  
  // upload to S3
  const archiveFileBytes = await readFile(archiveFilePath);
  await uploadArchiveToS3(bucketName, archiveFileKey, archiveFileBytes);

  // clean up (might be unnecessary since the lambda should discard the /tmp storage anyways)
  await rmdir(imageFolderPath);
  await Promise.all([ 
    rmdir(imageFolderPath),
    unlink(archiveFilePath),
    deleteVideoFilePromise 
  ]);
};

const downloadVideoFromS3 = async (bucketName, videoFileKey) => {
  const startTime = Date.now();
  const { Body: videoBytes } = await s3.getObject({
    Bucket: bucketName,
    Key: videoFileKey
  }).promise();
  console.log(`Downloaded video file (~${(videoBytes.byteLength/1000000).toFixed(2)}MB) in ${(Date.now() - startTime) / 1000} seconds`);
  return videoBytes;
};

const getVideoFps = async videoFilePath => {
  const startTime = Date.now();
  const command = `ffprobe -v 0 -of csv=p=0 -select_streams v:0 -show_entries stream=r_frame_rate ${videoFilePath}`
  const { stdout: fps } = await exec(command);
  console.log(`Probed fps (${fps.trim()}) in ${(Date.now() - startTime) / 1000} seconds`);
  return fps.trim();
};

const convertVideoToImages = async (videoFilePath, imageFolderPath) => {
  const startTime = Date.now();
  await exec(`ffmpeg -i ${videoFilePath} -q:v 5 ${path.join(imageFolderPath, "frame-%05d.jpg")}`);
  console.log(`Converted video in ${(Date.now() - startTime) / 1000} seconds`);
};

const compressImageFolder = async (imageFolderPath, archiveFilePath) => {
  const startTime = Date.now();
  await exec(`7za a ${archiveFilePath} ${imageFolderPath}`);
  console.log(`Compressed images in ${(Date.now() - startTime) / 1000} seconds`);
};

const uploadArchiveToS3 = async (bucketName, archiveFileKey, archiveFileBytes) => {
  const startTime = Date.now();
  await s3.putObject({
    Bucket: bucketName,
    Key: archiveFileKey,
    Body: archiveFileBytes
  }).promise();
  console.log(`Uploaded archive file (~${(archiveFileBytes.byteLength/1000000).toFixed(2)}MB) in ${(Date.now() - startTime) / 1000} seconds`);
};