const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');

const _ = require('lodash')
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const {asyncHandler, validateAnnotations, s3utils} = require('./utils');

const app = express();
const router = express.Router();

const bucketUrl = 'data.northernlights.vision';
const vidPrefix = 'unlabelled/';
const annotPrefix = 'annotations/';

router.use(cors())
router.use(bodyParser.json());
router.use(awsServerlessExpressMiddleware.eventContext());

/**
 * List the s3 object urls of all unlabelled video files. If the video file has a corresponding annotation
 * file, list the s3 object url of that file too. Sort the list by videoUrl.
 */
router.get('/list', asyncHandler(async (req, res, next) => {
    let [videoUrls, annotationUrls] = await Promise.all([
        s3utils.getAllBucketKeys(bucketUrl, vidPrefix),
        s3utils.getAllBucketKeys(bucketUrl, annotPrefix)
    ]);

    // gets the 'name' of a file from its s3 object url. (filename w/o extension)
    const filenameNoExtRegex = /[a-zA-Z0-9_-]+(?=\.[a-zA-Z0-9]+$)/g;

    annotationUrlsByName = _.keyBy(annotationUrls, url => url.match(filenameNoExtRegex)[0]);

    res.json(_.map(_.sortBy(videoUrls), videoUrl => {
        const videoName = videoUrl.match(filenameNoExtRegex)[0];
        const annotationUrl = annotationUrlsByName[videoName];

        return { videoUrl, annotationUrl };
    }));
}));

router.post('/annotate', asyncHandler(async (req, res, next) => {
    const {videoPath, annotations, annotatedBy} = req.body;
    const annotationPath = videoPath
        .replace(vidPrefix, annotPrefix)
        .replace('.mp4', '.json');

    validateAnnotations(annotations);

    await s3utils.putObject( bucketUrl, annotationPath, JSON.stringify(annotations) ).promise();

    // TODO: use author (annotatedBy) somehow
}));

app.use('/', router);

module.exports = app;
