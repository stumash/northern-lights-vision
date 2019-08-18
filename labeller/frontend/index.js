const VJS_OPTIONS = {
  // inactivityTimeout: 0
};

const VJS_MARKERS_OPTIONS = {
  markerStyle: {
    width: "2px",
    "background-color": "#558b2f",
    "border-radius": "0"
  },
  markerTip: {
    display: false
  },
  markers: [],
  onMarkerClick: () => false // disable feature of seeking to start of marker time on marker click
};

// globals
let videoPlayer, currentMarker, videoList;

$(document).ready(() => {
  videoPlayer = videojs("videoPlayer", VJS_OPTIONS); 
  videoPlayer.markers(VJS_MARKERS_OPTIONS);
  videoPlayer.on("timeupdate", handleTimeUpdate);
  $(document).keyup(handleKeyUp);
  $("#videoList").select2();
  $("#videoList").on("select2:selecting", handleVideoSelecting);
  $("#videoList").on("select2:select", handleVideoSelected);
  updateVideoListView();
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

const handleKeyUp = ({ keyCode }) => {
  // "m" key
  if(keyCode === 77) {
    addOrCompleteMarker();
    updateMarkersView();
  }
};

const handleVideoSelecting = e => {
  if(userChangedMarkers()) {
    const acceptSelection = confirm("Are you sure you want to switch videos? Unsaved markers may be lost");
    if(!acceptSelection) {
      e.preventDefault();
    }
  }
};

const handleVideoSelected = () => {
  const selectedVideoPath = $("#videoList").val();
  const { path, type } = videoList.find(({ path }) => path===selectedVideoPath);
  videoPlayer.off("loadedmetadata");
  videoPlayer.src({
    src: path,
    type: type
  });
  videoPlayer.on("loadedmetadata", loadAnnotationsIfPresent);
};

const handleSaveButtonClicked = () => {
  if(!userChangedMarkers()) {
    return alert("No changes to save");
  }
  const videoPath = $("#videoList").val();
  const userName = prompt("What is your name?");
  if(userName) {
    addVideoAnnotation(
      videoPath,
      markersToAnnotations(videoPlayer.markers.getMarkers()),
      userName
    );
  } else {
    alert("Annotations were not saved as you did not enter your name");
  }
};

const loadAnnotationsIfPresent = () => {
  const selectedVideoPath = $("#videoList").val();
  const { annotations } = videoList.find(({ path }) => path===selectedVideoPath);
  videoPlayer.markers.removeAll();
  if(annotations) {
    videoPlayer.markers.add(annotationsToMarkers(annotations));
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

const updateVideoListView = async () => {
  videoList = await getVideoList();
  $("#videoList").html(`
    <option selected disabled hidden>Select a video</option>
    ${videoList.map(({ path, annotations, annotatedBy }) => `
      <option value="${path}">
        ${(annotations && annotations.length > 0) ? 
          `${path} - annotated by ${annotatedBy} ✔️` : 
          path
        }
      </option>
    `).join("")}
  `); 
};

/*
   TODO: instead of highlighting the currentMarker,
   highlight the marker(s) for which the current
   video time falls within
*/
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
      return (`
        <li class="collection-item row ${isCurrentMarker ? "green accent-1" : ""}">
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
};

const userChangedMarkers = () => {
  const selectedVideoPath = $("#videoList").val();
  const selectedVideo = videoList.find(({ path }) => path===selectedVideoPath);
  const serverAnnotations = selectedVideo ? (selectedVideo.annotations || []) : [];
  const userAnnotations = markersToAnnotations(videoPlayer.markers.getMarkers());
  if(serverAnnotations.length !== userAnnotations.length) {
    return true;
  }
  serverAnnotations.forEach((annotation, i) => {
    if(!annotationsAreEqual(annotation, userAnnotations[i])) {
      return true;
    }
  });
  return false;
};

const annotationsAreEqual = (a, b) => {
  return floatsAreEqual(a.from, b.from) && floatsAreEqual(a.to, b.to);
};

const floatsAreEqual = (a, b) => {
  const accuracy = 100000;
  return Math.round(a * accuracy) === Math.round(b * accuracy);
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
  if(videoPlayer && videoPlayer.markers.getMarkers().length > 0) {
    e.preventDefault();
    e.returnValue = "";
    return "";
  }
});