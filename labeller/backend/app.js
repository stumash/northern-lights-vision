const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware');
const aws = require('aws-sdk');
const s3 = new aws.S3();

const _ = require('lodash')
const express = require('express');
const bodyParser = require('body-parser');

const {asyncHandler} = require('./utils');

const app = express();
const router = express.Router();

router.use(bodyParser.json());
router.use(awsServerlessExpressMiddleware.eventContext());

/**
 * List the s3 object urls of all unlabelled video files. If the video file has a corresponding annotation
 * file, list the s3 object url of that file too. Sort the list by videoUrl.
 */
router.get('/list', asyncHandler(async (req, res, next) => {
    let [videoUrls, annotationUrls] = await Promise.all([
        getAllBucketKeys('data.northernlights.vision', 'unlabelled/'),
        getAllBucketKeys('data.northernlights.vision', 'annotations/')
    ]);

    // gets the 'name' of a file from its s3 object url. (filename w/o extension)
    const filenameNoExtRegex = /[a-zA-Z0-9_-]+(?=\.[a-zA-Z0-9]+$)/g;

    videoUrls = _.sortBy(videoUrls);
    annotationUrlsByName = _.keyBy(annotationUrls, url => url.match(filenameNoExtRegex)[0]);

    res.json(_.map(videoUrls, videoUrl => {
        const videoName = videoUrl.match(filenameNoExtRegex)[0];

        const o = {'videoUrl': videoUrl};
        if (annotationUrlsByName[videoName]) { // video and annotation 'names' match?
            o['annotationUrl'] = annotationUrlsByName[videoName];
        }
        return o;
    }));
}));

router.post('/annotate', asyncHandler(async (req, res, next) => {
    res.send('/annotate served successfully')
}));

app.use('/', router);

module.exports = app;

const getAllBucketKeys = async (bucketName, prefix) => {
    const allKeys = [];
    let NextContinuationToken, IsTruncated, Contents;

    do {
        const params = {
            Bucket: bucketName,
            Prefix: prefix
        };
        if (NextContinuationToken) {
            params.ContinuationToken = NextContinuationToken;
        }

        ({NextContinuationToken, IsTruncated, Contents} = await s3.listObjectsV2(params).promise());

        allKeys.push(...Contents.map(o => o.Key));
    } while (IsTruncated);

    return allKeys;
}
