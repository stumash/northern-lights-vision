const dataUrl = "http://data.northernlights.vision";
const apiUrl = "https://api.labeller.northernlights.vision";

const getVideoList = async () => {
  return await doRequest("GET", `${apiUrl}/list`);
};

const getAnnotationObject = async (annotationPath) => {
  return await doRequest("GET", `${dataUrl}/${annotationPath}`);
}

const addVideoAnnotation = async (videoPath, annotations, annotatedBy) => {
  const data = {videoPath, annotations, annotatedBy};
  return await doRequest("POST", `${apiUrl}/annotate`, data);
};

const deleteVideoAnnotation = async (annotationPath) => {
  await doRequest("POST", `${apiUrl}/deleteAnnotation`, {annotationPath})
}

const doRequest = async (method, url, json) => {
  return await $.ajax({
    method:      method,
    url:         url,
    data:        JSON.stringify(json), /* must stringify request body else is URL-encoded */
    contentType: "application/json",   /* request data for POST is json */
    dataType:    "json"                /* response data is json*/
  });
};

