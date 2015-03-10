/* global _ */
/* global Snap */

(function(d, s) {
  // SVG element aspect-ratio
  var svg = {
    width: 1000,
    height: 100
  };

  // Base line constraints
  var baseline = {
    x: 0,
    y: svg.height * 0.5,
    width: svg.width,
    height: 1
  };

  // Configuration
  var config = {
    numIntervals: 100,
    x: {
      min: 0,
      max: baseline.width,
      pm: 5 // centred on interval point
    },
    y: {
      min: baseline.y,
      max: baseline.y,
      pm: 10 // centred on baseline.y
    }
  };

  function randompmone() {
    // return a random float in [-1, 1)
    return Math.random() * 2 - 1;
  }

  function draw() {
    // Clear svg
    s.clear();

    // Calculate constrained random interval points
    var intervalWidth = baseline.width / config.numIntervals;
    var intervals = [config.x.min, config.y.min];

    for(var i = 0; i < config.numIntervals; i++) {
      // centre points
      var x = intervalWidth * i;
      var y = baseline.y;

      // add randomness within tolerances
      x += config.x.pm * randompmone();
      y += config.y.pm * randompmone(); 

      intervals.push(x, y);
    }

    intervals.push(config.x.max, config.y.max);

    // Draw the line
    var line = s.polyline(intervals);
    line.attr({
      fill: '#fff',
      stroke: '#000',
      strokeWidth: baseline.height
    });
  }

  // add event listener for click on body
  d.onclick = draw;
  d.ontouchstart = draw;

  d.addEventListener('touchmove', function(e) {
    e.preventDefault();
  });

  draw();
})(document, new Snap('#boxes'));
