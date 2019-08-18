const doRequest = (url, method, data) => (
  $.ajax({ url, method, data })
);

const getVideoList = () => doRequest("videos.json");

const addVideoAnnotation = (videoPath, annotations, annotatedBy) => {
  console.log("Should do a POST with data: ");
  console.log("videoPath", videoPath);
  console.log("annotations", annotations);
  console.log("annotatedBy", annotatedBy);
  // return doRequest(videoPath, "POST", { annotations, annotatedBy });
};