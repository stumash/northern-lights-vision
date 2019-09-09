const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");

const _ = require("lodash");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const {asyncHandler, validateAnnotations, s3utils} = require("./utils");

const app = express();
const router = express.Router();

const bucketUrl = "data.northernlights.vision";
const vidPrefix = "unlabelled/";
const annotPrefix = "annotations/";

router.use(cors());
router.use(bodyParser.json());
router.use(awsServerlessExpressMiddleware.eventContext());

/**
 * List the s3 object urls of all unlabelled video files. If the video file has a corresponding annotation
 * file, list the s3 object url of that file too. Sort the list by videoUrl.
 */
router.get("/list", asyncHandler(async (req, res, next) => {
  let [videoUrls, annotationUrls] = await Promise.all([
    s3utils.getAllBucketKeys(bucketUrl, vidPrefix),
    s3utils.getAllBucketKeys(bucketUrl, annotPrefix)
  ]);

  const annotationAuthors = await Promise.all(_.map(annotationUrls, async (annotationUrl) => {
    return s3utils.getAnnotationAuthor(bucketUrl, annotationUrl);
  }));
  const annsWithAuths = _.zipWith(annotationUrls, annotationAuthors, (annotationUrl, annotationAuthor) => (
    {annotationUrl, annotationAuthor}
  ));

  // gets the "name" of a file from its s3 object url. (filename w/o extension)
  const filenameNoExtRegex = /[a-zA-Z0-9_-]+(?=\.[a-zA-Z0-9]+$)/g;

  const annsWithAuthsByName = _.keyBy(annsWithAuths, aa => aa.annotationUrl.match(filenameNoExtRegex)[0]);

  res.json(_.map(_.shuffle(videoUrls), videoUrl => {
    const videoName = videoUrl.match(filenameNoExtRegex)[0];
    const annotationInfo = annsWithAuthsByName[videoName];

    return annotationInfo ?
      { videoUrl, annotationInfo } :
      { videoUrl };
  }));
}));

router.post("/annotate", asyncHandler(async (req, res, next) => {
  const {videoPath, annotations, annotatedBy} = req.body;
  const annotationPath = videoPath
    .replace(vidPrefix, annotPrefix)
    .replace(".mp4", ".json");

  validateAnnotations(annotations);

  await s3utils.putObject( bucketUrl, annotationPath, JSON.stringify(annotations), annotatedBy );

  res.json({annotationUrl: annotationPath});
}));

router.post("/deleteAnnotation", asyncHandler(async (req, res, next) => {
  const {annotationPath} = req.body;
  await s3utils.deleteObject(bucketUrl, annotationPath);
  res.json({});
}));

app.use("/", router);

module.exports = app;
