const { handler } = require("./worker");

(async () => {
  const output = await handler({
    bucketName: "data.northernlights.vision",
    inputVideoKey: "unlabelled/auroramaxHD_20181021_480p.mp4"
  });
  console.log("output", output);
})();