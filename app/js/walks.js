(function () {
    var map = L.map('map').setView([51.505, -0.09], 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributers</a> | &copy; <a href="http://openmaptiles.org/">OpenMapTiles</a> | &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

})();