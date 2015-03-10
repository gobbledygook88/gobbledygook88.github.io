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
    height: 0.5
  };

  // Configuration
  var config = {
    pm: {
      min: svg.height * -0.45,
      max: svg.height *  0.45
    },
    x: {
      min: 0,
      max: baseline.width,
    },
    y: {
      min: baseline.y,
      max: baseline.y,
    }
  };

  // initial line
  var line = [];

  // return a random float in [-1, 1)
  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function midpoint(x1, y1, x2, y2) {
    var x = (x1 + x2) * 0.5;
    var y = (y1 + y2) * 0.5;
    return [x, y];
  }

  function draw() {
    s.clear();

    var newLine = [line[0], line[1]];
    var maxIndex= line.length - 2;

    for(var i = 0; i < maxIndex; i+=2) {
      var mid = midpoint(line[i], line[i+1], line[i+2], line[i+3]);
      mid[1] += random(config.pm.min, config.pm.max);
      newLine.push(mid[0], mid[1], line[i+2], line[i+3]);
    }

    line = newLine;

    // Draw the line
    var lineEl = s.polyline(line);
    lineEl.attr({
      fill: '#fff',
      stroke: '#000',
      strokeWidth: baseline.height
    });

    // Reduce randomness range
    config.pm.min *= 0.5;
    config.pm.max *= 0.5;
  }

  function init() {
    line = [config.x.min, config.y.min, config.x.max, config.y.max];
    config.pm.min = svg.height * -0.45;
    config.pm.max = svg.height *  0.45;

    for(var i = 0; i < 10; i++) {
      draw();
    }
  }

  // add event listener for click on body
  d.onclick = init;
  d.ontouchstart = init;

  d.addEventListener('touchmove', function(e) {
    e.preventDefault();
  });

  init();
})(document, new Snap('#boxes'));
