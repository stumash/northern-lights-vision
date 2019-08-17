const VJS_MARKERS_OPTIONS = {
  markerStyle: {
    width: "2px",
    "background-color": "#558b2f",
    "border-radius": "0"
  },
  markerTip: {
    display: false
  },
  markers: []
};

// globals
let videoPlayer, currentMarker;

$(document).ready(() => {
  videoPlayer = videojs("videoPlayer", {}); 
  videoPlayer.markers(VJS_MARKERS_OPTIONS);
  videoPlayer.on("timeupdate", handleTimeUpdate);
  $(document).keyup(handleKeyUp);
  $("#videoList").on("change", handleVideoSelected);
  $("#saveButton").click(handleSaveButtonClicked);
  loadVideoList();
});

const handleTimeUpdate = () => {
  if(currentMarker) {
    const markerWasUpdated = syncCurrentMarkerWithProgress();
    if(markerWasUpdated) { 
      videoPlayer.markers.updateTime();
      updateMarkersInfoPanel();
    }
  }
};

const syncCurrentMarkerWithProgress = () => {
  let currentTime = videoPlayer.currentTime();
  if(currentTime > currentMarker.time) {
    currentMarker.duration = currentTime - currentMarker.time;
    return true;
  } else if (currentMarker.duration) {
    currentMarker.duration = undefined;
    return true;
  }
};

const handleKeyUp = ({ keyCode }) => {
  // "m" key
  if(keyCode === 77) {
    addOrUpdateMarker();
    updateMarkersInfoPanel();
  }
};

const addOrUpdateMarker = () => {
  let currentTime = videoPlayer.currentTime();

  if(!currentMarker) {
    videoPlayer.markers.add([{
      time: currentTime
    }]);
    currentMarker = videoPlayer.markers.getMarkers()
                      .find(({ time }) => time===currentTime);
  } else {
    if(currentTime > currentMarker.time) {
      currentMarker.duration = currentTime - currentMarker.time;
      currentMarker = undefined;
    } else {
      currentMarker.time = currentTime;
    }
    videoPlayer.markers.updateTime();
  } 
};

const updateMarkersInfoPanel = () => {
  const markers = videoPlayer.markers.getMarkers();
  let currentKey = currentMarker && currentMarker.key;
  $("#markersInfoPanel").html(`
    ${markers.map(({ time, duration, key }) => `
      <div class="${key === currentKey ? "bold" : ""}">
        Time: ${time}, Duration: ${duration}
      </div>
    `).join("")}
  `);
};

const handleVideoSelected = () => {
  const selectedVideo = $("#videoList").val();
  videoPlayer.src({
    src: selectedVideo,
    type: "video/mp4"
  });
};

const loadVideoList = async () => {
  const videoList = await getVideoList();
  $("#videoList").html(`
    <option selected disabled hidden>Select a video</option>
    ${videoList.map(({ path, annotated }) => `
      <option value="${path}">${path}</option>
    `).join("")}
  `);
};

const handleSaveButtonClicked = () => {
  const videoPath = $("#videoList").val();
  const annotationInfo = videoPlayer.markers.getMarkers()
                           .map(({ time, duration }) => ({ time, duration }));
  addVideoAnnotation(videoPath, annotationInfo);
};

// warn user to not leave the page
window.addEventListener("beforeunload", e => {
  if(videoPlayer && videoPlayer.markers.getMarkers().length > 0) {
    e.preventDefault();
    e.returnValue = "";
    return "";
  }
});