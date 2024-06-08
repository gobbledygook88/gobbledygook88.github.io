(function () {

  var attributions = {
    "OpenStreetMap contributers": "http://www.openstreetmap.org/copyright",
    "OpenMapTiles": "http://openmaptiles.org/",
    "CARTO": "https://carto.com/attributions",
  }

  const mapEl = document.getElementById("map");

  if (mapEl) {
    var map = L.map('map').setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
      maxZoom: 19,
      attribution: Object.entries(attributions)
        .map(([text, url]) => `&copy; <a href="${url}">${text}</a>`)
        .join(' | ')
    }).addTo(map);

    fetch(mapEl.dataset.mapData)
      .then(response => response.json())
      .then(json => {
        var geojsonLayer = L.geoJSON(json, {
          "color": "#ff7800",
          "weight": 3,
          "opacity": 0.65
        }).addTo(map);
        map.fitBounds(geojsonLayer.getBounds());
      });
  }

  function isScrolledIntoView(el) {
    var rect = el.getBoundingClientRect();
    var elemTop = rect.top;
    var elemBottom = rect.bottom;

    // Only completely visible elements return true:
    var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);
    // Partially visible elements return true:
    //isVisible = elemTop < window.innerHeight && elemBottom >= 0;
    return isVisible;
  }

  const waypoints = document.getElementsByClassName('waypoint');
  let currentMarker;

  for (let el of waypoints) {
    el.addEventListener('mouseenter', (event) => {
      if (currentMarker) {
        currentMarker.remove();
      }
      currentMarker = L.marker([el.dataset.waypointLatitude, el.dataset.waypointLongitude]).addTo(map);
    })
  }

})();
