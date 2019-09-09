const PromisePool = require("es6-promise-pool");
const cliProgress = require("cli-progress");
const AWS = require("aws-sdk");

AWS.config.region = "us-east-1";
const lambda = new AWS.Lambda({ 
  httpOptions: {
    /* If the lambda takes a long time to finish, then the 
    http connection held by the sdk may timeout, causing the
    sdk to retry the lambda call which we dont want.
    see https://github.com/aws/aws-sdk-js/blob/a203c0e23010e256c88092a0be1e66a7a392eedf/lib/util.js#L875
    */
    timeout: 900000
  }
});
const s3 = new AWS.S3();
const WORKER_LAMBDA_NAME = "nlv-batch-transcode-worker";
const DATA_BUCKET_NAME = "data.northernlights.vision";
const CONCURRENCY_LIMIT = 900;

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

const executionTimeToDollars = executionTimeMillis => (
  (0.000004897 * executionTimeMillis / 100)
);

(async () => {

  const startTime = Date.now();
  let totalEstimatedExecutionTime = 0;

  let videoKeys = await getAllBucketKeys(DATA_BUCKET_NAME, "unlabelled/");
  // videoKeys = videoKeys.slice(0, 4);

  const invokeLambda = async videoKey => {
    const lambdaStartTime = Date.now();
    return await lambda.invoke({ 
      FunctionName: WORKER_LAMBDA_NAME,
      Payload: JSON.stringify({ bucketName: DATA_BUCKET_NAME, inputVideoKey: videoKey })
    }).promise().then(() => {
      totalEstimatedExecutionTime += Date.now() - lambdaStartTime;
      return videoKey;
    })
  };

  const promiseGenerator = function*() {
    for(let videoKey of videoKeys) {
      yield invokeLambda(videoKey);
    }
  }
  const promisePool = new PromisePool(promiseGenerator(), CONCURRENCY_LIMIT);

  let counter = 0;
  const progressBar = new cliProgress.SingleBar({
    format: 'Progress | {bar} | {value}/{total} | latest: {latestVideo}'
  }, cliProgress.Presets.shades_classic);
  progressBar.start(videoKeys.length, 0, { latestVideo: "-" });

  promisePool.addEventListener("fulfilled", event => {
    progressBar.update(++counter, { latestVideo: event.data.result });
  });

  await promisePool.start();
  progressBar.stop();

  console.log(`Conversion done in ${(Date.now() - startTime) / 1000} seconds`);
  // In the end, this value was off by about 10x. The lambda should give it's execution time as an output, I suppose
  console.log(`Total estimated lambda execution time: ${totalEstimatedExecutionTime / 1000} seconds ($${executionTimeToDollars(totalEstimatedExecutionTime)})`);
})();