(function () {

  const mapEl = document.getElementById("map");
  if (!mapEl) { return; }

  const attributions = {
    "OpenStreetMap contributers": "http://www.openstreetmap.org/copyright",
    "OpenMapTiles": "http://openmaptiles.org/",
    "CARTO": "https://carto.com/attributions",
  }

  const marker = L.icon({
    iconUrl: '/img/svg/location-dot-solid.svg',
    iconSize: [12, 16],
    iconAnchor: [6, 16],
  });

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

  let currentMarker;
  function placeMarker(el) {
    if (currentMarker) {
      currentMarker.remove();
    }
    currentMarker = L.marker([el.target.dataset.waypointLatitude, el.target.dataset.waypointLongitude], { icon: marker }).addTo(map);
  }

  const waypoints = document.getElementsByClassName('waypoint');

  for (let el of waypoints) {
    el.addEventListener('mouseenter', placeMarker, false);
    el.addEventListener('pointerenter', placeMarker, false);
  }

})();
