const awsServerlessExpressMiddleware = require("aws-serverless-express/middleware");

const _ = require("lodash");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const createError = require("http-errors");
const morganBody = require("morgan-body");
const geoip = require("geoip-lite");
const Stream = require('stream');

const {asyncHandler, validateAnnotations, s3utils} = require("./utils");

const app = express();
const router = express.Router();

const bucketUrl = "data.northernlights.vision";
const vidPrefix = "unlabelled/";
const annotPrefix = "annotations/";

router.use(cors());
router.use(bodyParser.json());
router.use(awsServerlessExpressMiddleware.eventContext());

/*
 * For some reason, if logs are written directly to process.stdout, 
 * then AWS Lambda doesn't add the log timestamp + request ID 
 * 
 * So we override the default behavor of morgan-body to use console.log instead
 */
const morganBodyOutput = new Stream.Duplex();
morganBodyOutput._write = (chunk, enc, next) => { 
  console.log(chunk.toString());
  next();
};
morganBody(app, { logReqDateTime: false, noColors: true, stream: morganBodyOutput });

/** 
 * Log incoming IP addresses
 */
router.use(asyncHandler(async (req, res, next) => {
  const sourceIp = req.apiGateway ? req.apiGateway.event.requestContext.identity.sourceIp : 
                                    "localhost";
  const sourceIpLocation = geoip.lookup(sourceIp);                                     
  console.log(`Incoming request from ip address: ${sourceIp} ${sourceIpLocation ? `(${sourceIpLocation.country})` : ""}`);
  next();
}));

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

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res, next) => {
  console.log(err);
  res.locals.message = err.message;
  res.status(err.status || 500);
  res.json({ message: res.locals.message });
});

module.exports = app;
