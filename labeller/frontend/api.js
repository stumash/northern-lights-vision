const doRequest = (url, method, data) => (
  $.ajax({ url, method, data })
);

const getVideoList = () => doRequest("https://api.labeller.northernlights.vision/list", "GET");

const getAnnotationObject = async (annotationUrl) => {
  const annotationAsString = await doRequest(`https://data.northernlights.vision/${annotationUrl}`);
  if (annotationAsString) {
    return JSON.parse(annotationAsString);
  }
}

const addVideoAnnotation = (videoPath, annotations, annotatedBy) => {
  console.log("Should do a POST with data: ");
  console.log("videoPath", videoPath);
  console.log("annotations", annotations);
  console.log("annotatedBy", annotatedBy);
  const data = {videoPath, annotations, annotatedBy};
  doRequest("https://api.labeller.northernlights.vision/annotate", "POST", data);
};
