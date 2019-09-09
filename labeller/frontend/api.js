const dataUrl = 'http://data.northernlights.vision';
const apiUrl = 'https://api.labeller.northernlights.vision';

const getVideoList = async () => {
  return await doRequest('GET', `${apiUrl}/list`);
};

const getAnnotationObject = async (annotationUrl) => {
  return await doRequest('GET', `${dataUrl}/${annotationUrl}`);
}

const addVideoAnnotation = async (videoPath, annotations, annotatedBy) => {
  const data = {videoPath, annotations, annotatedBy};
  await doRequest('POST', `${apiUrl}/annotate`, data);
};

const doRequest = async (method, url, json) => {
  return await $.ajax({
    method:      method,
    url:         url,
    data:        JSON.stringify(json), /* must stringify request body else is URL-encoded */
    contentType: 'application/json',   /* request data for POST is json */
    dataType:    'json'                /* response data is json*/
  });
};

