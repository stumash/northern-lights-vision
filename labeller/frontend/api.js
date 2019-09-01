const doRequest = (url, method, data) => $.ajax({
  url, method,
  data: JSON.stringify(data), /* must stringify request body else gets URL-encoded */
  contentType: 'application/json', /* request body for POST is json */
  dataType: 'json' /* response is json*/
});

const getVideoList = () => doRequest("https://api.labeller.northernlights.vision/list", "GET");

const getAnnotationObject = async (annotationUrl) => {
  const annotationAsString = await doRequest(`https://data.northernlights.vision/${annotationUrl}`);
  if (annotationAsString) {
    return JSON.parse(annotationAsString);
  }
}

const addVideoAnnotation = async (videoPath, annotations, annotatedBy) => {
  console.log("Should do a POST with data: ");
  console.log("videoPath", videoPath);
  console.log("annotations", annotations);
  console.log("annotatedBy", annotatedBy);
  const data = {videoPath, annotations, annotatedBy};
  const res = await doRequest("https://api.labeller.northernlights.vision/annotate", "POST", data);
  console.log(res);
};
