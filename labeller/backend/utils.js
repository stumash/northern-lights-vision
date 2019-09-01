const aws = require('aws-sdk');
const s3 = new aws.S3();

const asyncHandler = fn => (req, res, next) =>
  Promise
    .resolve( fn(req, res, next) )
    .catch(next)

const validateAnnotations = (annotations) => {
  if (!(annotations.length)) {
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
    if (!['from', 'to'].inludes(prop)) {
      throw `annotation ${i} has property ${prop} which is not in ['from', 'to']`
    }
  }
}

const getAllBucketKeys = async (bucketName, prefix) => {
  const allKeys = [];
  let Contents, IsTruncated, NextContinuationToken;

  do {
    const params = {
      Bucket: bucketName,
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

const putObject = async (bucket, path, data) => {
  const s3PutObjectParams = {
    Bucket: bucket,
    Key: path,
    Body: data
  };

  await s3.putObject(s3PutObjectParams).promise();
}

const s3utils = {
  getAllBucketKeys, putObject
};

module.exports = {asyncHandler, validateAnnotations, s3utils};
