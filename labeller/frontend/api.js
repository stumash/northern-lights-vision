const getVideoList = async () => {
  return await doRequest("GET", "https://api.labeller.northernlights.vision/list");
};

const getAnnotationObject = async (annotationUrl) => {
  const fullUrl = `https://data.northernlights.vision/${annotationUrl}`;
  const annotationString = await doRequest("GET", fullUrl);
  if (annotationString) {
    return JSON.parse(annotationString);
  }
}

const addVideoAnnotation = async (videoPath, annotations, annotatedBy) => {
  const data = {videoPath, annotations, annotatedBy};
  const res = await doRequest("POST", "https://api.labeller.northernlights.vision/annotate", data);
};

const doRequest = async (method, url, json) => {
  return await $.ajax({
    method:      method,
    url:         url,
    data:        JSON.stringify(json), /* must stringify request body else is URL-encoded */
    contentType: "application/json",   /* request data for POST is json */
    dataType:    "json"                /* response data is json*/
  });
};

