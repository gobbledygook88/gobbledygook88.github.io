(function () {

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

  const mapIds = ["map-countries", "map-cardinal-places", "map-usa-states", "map-london-boroughs"];

  mapIds.forEach(mapId => {
    const mapEl = document.getElementById(mapId);
    if (!mapEl) { return; }

    var map = L.map(mapId).setView([51.505, -0.09], 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
      maxZoom: 19,
      attribution: Object.entries(attributions)
        .map(([text, url]) => `&copy; <a href="${url}">${text}</a>`)
        .join(' | ')
    }).addTo(map);

    fetch(mapEl.dataset.mapData)
      .then(response => response.json())
      .then(json => {
        const geojsonLayer = L.geoJSON(json, {
          "color": "#ff7800",
          "weight": 1,
          "opacity": 0.65,
          "pointToLayer": function (feature, latlng) {
            return L.marker(latlng, { icon: marker });
          },
          "onEachFeature": function (feature, layer) {
            if (feature.properties && feature.properties.name) {
              layer.bindPopup(feature.properties.name);
            }
          }
        }).addTo(map);

        if (mapEl.dataset.mapInitialLatitude) {
          map.setView([mapEl.dataset.mapInitialLatitude, mapEl.dataset.mapInitialLongitude], mapEl.dataset.mapInitialZoom);
        } else {
          map.fitBounds(geojsonLayer.getBounds());
        }
      });
  });

})();
