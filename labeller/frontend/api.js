const doRequest = (url, method, data) => (
  $.ajax({ url, method, data })
);

const getVideoList = () => doRequest("videos.json");

const addVideoAnnotation = (videoPath, annotationInfo) => {
  console.log("Should do a POST with data: ");
  console.log("videoPath", videoPath);
  console.log("annotationInfo", annotationInfo);
  // return doRequest(videoPath, "POST", annotationInfo);
};