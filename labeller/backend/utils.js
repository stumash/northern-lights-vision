const aws = require('aws-sdk');
const s3 = new aws.S3();

const asyncHandler = fn => (req, res, next) =>
  Promise
    .resolve( fn(req, res, next) )
    .catch(next)

const validateAnnotations = (annotations) => {
  if (!(annotations instanceof Array)) {
    throw 'annotations is not an array';
  } else if (annotations.length > 100) {
    throw 'annotations too long (>100)';
  }
  annotations.forEach(validateAnnotation);
}

const validateAnnotation = (annotation, i) => {
  const {from, to} = annotation;
  if (from >= to) {
    throw `annotation ${i}: from:${from} >= to:${to}`
  }
  for (let prop in annotation) {
    if (!['from', 'to'].includes(prop)) {
      throw `annotation ${i} has property ${prop} which is not in ['from', 'to']`
    }
  }
}

const getAllBucketKeys = async (bucket, prefix) => {
  const allKeys = [];
  let Contents, IsTruncated, NextContinuationToken;

  do {
    const params = {
      Bucket: bucket,
      Prefix: prefix
    };
    if (NextContinuationToken) {
      params.ContinuationToken = NextContinuationToken;
    }

    ({Contents, IsTruncated, NextContinuationToken} = await s3.listObjectsV2(params).promise());

    allKeys.push(...Contents.map(s3Object => s3Object.Key));
  } while (IsTruncated);

  return allKeys;
};

const putObject = async (bucket, path, data, author) => {
  const s3PutObjectParams = {
    Bucket: bucket,
    Key: path,
    Body: data,
    Metadata: { author },

    CacheControl: 'no-cache',
    ContentType: 'application/json'
  };

  await s3.putObject(s3PutObjectParams).promise();
}

const getAnnotationAuthor = async (bucket, annotationUrl) => {
  const {author} = (await s3.headObject({Bucket: bucket, Key: annotationUrl}).promise()).Metadata;
  return author;
}

const s3utils = {
  getAllBucketKeys, putObject, getAnnotationAuthor
};

module.exports = {asyncHandler, validateAnnotations, s3utils};
