"use strict";

// hardcode video frame rate :'(
const VIDEO_FRAME_RATE = 25;

const VJS_OPTIONS = {
  // inactivityTimeout: 0
};

const VJS_MARKERS_OPTIONS = {
  markerStyle: {
    width: "2px",
    height: "5px",
    "background-color": "#8bc34a",
    "border-radius": "0"
  },
  markerTip: {
    display: false
  },
  markers: [],
  onMarkerClick: () => false // disable feature of seeking to start of marker time on marker click
};

// globals
let videoPlayer;
let currentMarker;
let vidUrls_annotInfos;
let currentSavedAnnotations = [];
let framesPerArrowkeyClick = 5;

$(document).ready(() => {
  videoPlayer = videojs("videoPlayer", VJS_OPTIONS);
  videoPlayer.markers(VJS_MARKERS_OPTIONS);
  videoPlayer.on("timeupdate", handleTimeUpdate);
  $(document).keyup(handleKeyUp);

  const $videoList = $("#videoList");
  $videoList.select2();
  $videoList.on("select2:selecting", handleVideoSelecting);
  $videoList.on("select2:select", handleVideoSelected);
  initVideoListView();
});

const handleTimeUpdate = () => {
  if(currentMarker) {
    const markerWasUpdated = syncCurrentMarkerWithProgress();
    if(markerWasUpdated) {
      videoPlayer.markers.updateTime();
      updateCurrentMarkerView();
    }
  }
  updateActiveMarkers();
};

const handleKeyUp = ({ key, keyCode }) => {
  // 77 is "m"
  if(keyCode === 77) {
    addOrCompleteMarker();
    updateMarkersView();
  }
  // 39 is "ArrowRight", 37 is "ArrowLeft"
  if(keyCode === 39 || keyCode === 37) {
    seekFrames(keyCode === 39 ?
      framesPerArrowkeyClick :
     -framesPerArrowkeyClick);
  }
  // 48 is "0", 57 is "9"
  if (keyCode >= 48 && keyCode <= 57) {
    // framesPerArrowkeyClick can be [1..10]
    // use 48/"0" as 10, 49-57/"1"-"9" as 1-9
    const desiredSetting = keyCode === 48 ? 10 : keyCode - 48;
    $("#fpacSlider").val(desiredSetting);
    onSliderDragged(desiredSetting);
  }
};

const handleVideoSelecting = e => {
  const currentAnnotations = markersToAnnotations(videoPlayer.markers.getMarkers());
  if (!_.isEqual(currentSavedAnnotations, currentAnnotations)) {
    const s = "Are you sure you want to switch videos? Unsaved markers may be lost";
    const acceptSelection = confirm(s);
    if(!acceptSelection) {
      e.preventDefault();
    }
  }
};

const handleVideoSelected = () => {
  const selectedVideoPath = $("#videoList").val();
  videoPlayer.off("loadedmetadata");
  videoPlayer.src({
    src: "http://data.northernlights.vision/" + selectedVideoPath,
    type: "video/mp4"
  });
  videoPlayer.on("loadedmetadata", loadAnnotationsIfPresent);
};

const handleSaveButtonClicked = async () => {
  const videoPath = $("#videoList").val();
  if(!videoPath) {
    return alert("No video has been selected");
  }
  const annotationAuthor = prompt("What is your name?");
  if(annotationAuthor) {
    const annotationsToSave = markersToAnnotations(videoPlayer.markers.getMarkers());
    const {annotationUrl} = await addVideoAnnotation(
      videoPath,
      annotationsToSave,
      annotationAuthor
    );

    // update option in select menu
    const selectedVideoIndex = $("#videoList").prop("selectedIndex");
    vidUrls_annotInfos[selectedVideoIndex].annotationInfo = {annotationUrl, annotationAuthor}
    updateVideoListView(selectedVideoIndex);

    // update currentSavedAnnotations
    currentSavedAnnotations = markersToAnnotations(videoPlayer.markers.getMarkers());
  } else {
    alert("Annotations were not saved as you did not enter your name");
  }
};

const handleDeleteButtonClicked = async () => {
  const videoPath = $("#videoList").val();
  if(!videoPath) {
    return alert("No video has been selected");
  }

  const selectedVideoIndex = $("#videoList").prop("selectedIndex");
  const {videoUrl, annotationInfo} = vidUrls_annotInfos[selectedVideoIndex];
  if (!annotationInfo) {
    return alert("No saved markers to delete")
  }

  if(!confirm("Are you sure?")) {
    return;
  }

  await deleteVideoAnnotation(annotationInfo.annotationUrl);

  // update option in select menu
  vidUrls_annotInfos[selectedVideoIndex] = {videoUrl};
  updateVideoListView(selectedVideoIndex);

  // update markers
  videoPlayer.markers.removeAll();
  updateMarkersView();

  // update currentSavedAnnotations
  currentSavedAnnotations = markersToAnnotations(videoPlayer.markers.getMarkers());
}

const loadAnnotationsIfPresent = async () => {
  videoPlayer.markers.removeAll();
  const selectedVideoIndex = $("#videoList").prop("selectedIndex");
  const annotationInfo = vidUrls_annotInfos[selectedVideoIndex].annotationInfo;
  if(annotationInfo) {
    const {annotationUrl} = annotationInfo;
    const annotations = await getAnnotationObject(annotationUrl);
    currentSavedAnnotations = annotations;
    videoPlayer.markers.add(annotationsToMarkers(annotations));
  } else {
    currentSavedAnnotations = [];
  }
  updateMarkersView();
};

const syncCurrentMarkerWithProgress = () => {
  const currentTime = videoPlayer.currentTime();
  if(currentTime > currentMarker.time) {
    currentMarker.duration = currentTime - currentMarker.time;
    return true;
  } else if (currentMarker.duration) {
    /*
      In this case, when the current video playback
      time is less than the current marker start time,
      should we delete the current marker ?
    */
    currentMarker.duration = undefined;
    return true;
  }
};

const addOrCompleteMarker = () => {
  const currentTime = videoPlayer.currentTime();
  if(!currentMarker) {
    videoPlayer.markers.add([{ time: currentTime }]);
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

const updateMarker = _.debounce((index, newStartTime, newEndTime) => {
  const marker = videoPlayer.markers.getMarkers()[index];
  if(newStartTime) {
    newStartTime = videoTimeFromString(newStartTime);
    if(newStartTime < marker.time + marker.duration) {
      oldStartTime = marker.time;
      marker.time = newStartTime;
      marker.duration += oldStartTime - newStartTime;
    }
  }
  if(newEndTime) {
    newEndTime = videoTimeFromString(newEndTime);
    if(newEndTime > marker.time) {
      marker.duration = newEndTime - marker.time;
    }
  }
  videoPlayer.markers.updateTime();
  updateMarkersView();
}, 750);

const deleteMarker = (index, isCurrentMarker) => {
  if(isCurrentMarker) {
    currentMarker = undefined;
  }
  videoPlayer.markers.remove([index]);
  updateMarkersView();
};

const initVideoListView = async () => {
  vidUrls_annotInfos = await getVideoList();
  updateVideoListView();
  $('#videoList').prop("disabled", false);
};

const updateVideoListView = (selectedVideoIndex) => {
  const defaultSelected = selectedVideoIndex === undefined? 'selected': '';
  const selectionSelected = (i) => i === selectedVideoIndex? 'selected': '';
  $('#videoList').html(`
    ${vidUrls_annotInfos.map(({videoUrl, annotationInfo}, i) => `
      <option value="${videoUrl}" ${selectionSelected(i)}>
        ${videoUrl} ${annotationInfo ? `(annotated by ${annotationInfo.annotationAuthor})` : ""}
      </option>
    `).join("")}
    <option ${defaultSelected} disabled hidden data-default="default">Select a video</option>
  `);
};

const updateMarkersView = () => {
  const markers = videoPlayer.markers.getMarkers();
  const currentMarkerKey = currentMarker && currentMarker.key;
  const currentTime = videoPlayer.currentTime();
  if(markers.length === 0) {
    return $("#markers").html(`
      <li class="collection-header center"><h4>No Markers</h4></li>
    `);
  }
  $("#markers").html(`
    ${markers.map(({ time, duration, key }, i) => {
      const isCurrentMarker = key === currentMarkerKey;
      const markerInRange = currentTime > time && currentTime < time + duration;
      return (`
        <li class="collection-item row ${(markerInRange || isCurrentMarker) ? "green accent-1" : ""}">
          <div class="timeView col s10">
            <div class="input-field inline">
              <input id="fromMarker${i}"
                     type="text"
                     value="${videoTimeToString(time)}"
                     oninput="updateMarker(${i}, this.value)"/>
              <span class="helper-text">From</span>
            </div>
            <div class="input-field inline">
              <input id="toMarker${i}"
                     type="text"
                     value="${videoTimeToString(time + duration)}"
                     oninput="updateMarker(${i}, undefined, this.value)"
                     ${isCurrentMarker ? "disabled" : ""}/>
              <span class="helper-text">To</span>
            </div>
          </div>
          <a class="col s2 waves-effect waves-light-green btn-flat" onclick="deleteMarker(${i}, ${isCurrentMarker})"><i class="material-icons center">delete</i></a>
        </li>
      `);
      }).join("")}
  `);
  scrollToLatestActiveMarker();
};

const updateCurrentMarkerView = () => {
  const { time, duration } = currentMarker;
  const currentMarkerIndex = videoPlayer.markers.getMarkers().indexOf(currentMarker);
  const $currentMarkerElement = $(`#markers > li:nth-of-type(${currentMarkerIndex + 1}) .timeView .input-field:nth-of-type(2) > input`);
  $currentMarkerElement.val(videoTimeToString(time + duration));
};

const updateActiveMarkers = () => {
  const markers = videoPlayer.markers.getMarkers();
  if(markers.length === 0) {
    return;
  }
  const currentTime = videoPlayer.currentTime();
  $("#markers li").each((i, li) => {
    const $li = $(li);
    const isActive = $li.hasClass("green");
    const { time, duration } = markers[i];
    if((currentTime > time && currentTime < time + duration) || markers[i] === currentMarker) {
      !isActive && $li.addClass("green accent-1");
    } else {
      isActive && $li.removeClass("green accent-1");
    }
  });
  scrollToLatestActiveMarker();
};

const scrollToLatestActiveMarker = () => {
  const currentMarkerKey = currentMarker && currentMarker.key;
  const currentTime = videoPlayer.currentTime();
  const latestActiveMarkerIndex = videoPlayer.markers.getMarkers()
    .reduce((acc, { time, duration, key }, i) => (
      ((currentTime > time && currentTime < time + duration) || currentMarkerKey === key) ? i : acc
    ), -1);
  if(latestActiveMarkerIndex >= 0) {
    scrollToMarker(latestActiveMarkerIndex);
  }
};

const scrollToMarker = markerIndex => {
  const $markers = $("#markers").first();
  // nth-child index starts at 1
  const $markerDiv = $(`#markers > li:nth-child(${ markerIndex + 1 })`);

  const markerDivTopPosition = $markerDiv.position().top;
  const currentScrollPosition = $markers.scrollTop();
  const markerDivHeight = $markerDiv.outerHeight();
  const markersContainerHeight = $markers.height();

  $markers.scrollTop(markerDivTopPosition + currentScrollPosition + markerDivHeight - markersContainerHeight);
};

const seekFrames = frameCount => {
  videoPlayer.currentTime(videoPlayer.currentTime() + (frameCount * (1 / VIDEO_FRAME_RATE)));
};

/*
  convert format of marker array items
  to be ready to send to server
*/
const markersToAnnotations = markers => (
  markers.map(({ time, duration }) => ({
    from: time,
    to: time + duration
  }))
);

const annotationsToMarkers = (annotations) => (
  annotations.map(({ from, to }) => ({
    time: from,
    duration: to - from
  }))
);

const videoTimeToString = (time) => {
  const minutes = numeral(Math.floor(time / 60)).format("00");
  time -= minutes * 60;
  // round to the nearest millisecond
  const seconds = numeral(Math.round(time * 1000) / 1000).format("00.000");
  return `${minutes}:${seconds}`;
};

const videoTimeFromString = (time) => {
  const [ minutes, seconds ] = time.split(":");
  return parseInt(minutes) * 60 + parseFloat(seconds);
};

// warn user to not leave the page
window.addEventListener("beforeunload", e => {
  const currentAnnotations = markersToAnnotations(videoPlayer.markers.getMarkers());
  if (!_.isEqual(currentSavedAnnotations, currentAnnotations)) {
    e.preventDefault();
    e.returnValue = "";
    return "";
  }
});

const handleHelpButtonClicked = () => {
  const helpText = [
    "'Save' button:     saves markers for selected video",
    "'Delete' button: delete saved markers for selected video",
    "",
    "Key Mappings:",
    "- m:             start/stop marker",
    "- left:           scroll back video a small amount",
    "- right:         scroll forward video a small amount",
    "- 1,2,...,9,0: set framesPerArrowkeyClick to 1-10"
  ].join("\n");
  alert(helpText);
}

const printAuthorCountMap = () => {
  console.log(
    vidUrls_annotInfos
      .filter(item=>!!item.annotationInfo)
      .reduce((acc, item) => {
        const { annotationAuthor: author } = item.annotationInfo;
        if(!acc[author]) acc[author] = 0;
        acc[author]++;
        return acc;
      },
    {})
  );
};

const onSliderDragged = (value) => {
  document.querySelector('#framesperclick').value = value;
  framesPerArrowkeyClick = value;
}
