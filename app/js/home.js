/* global _ */
/* global Snap */

(function(s) {
  function Point(x, y) {
    this.x = x;
    this.y = y;
  }

  Point.prototype.clone = function() {
    return new Point(this.x, this.y);
  };

  Point.prototype.translate = function(dx, dy) {
    this.x += dx;
    this.y += dy;

    return this;
  };

  Point.prototype.toArray = function() {
    return [this.x, this.y];
  };

  Point.prototype.transform = function(m) {
    var x = this.x;
    var y = this.y;

    this.x = m.x(x, y);
    this.y = m.y(x, y);

    return this;
  };

  function Face(a, b, c, d) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;

    this.line = s.polyline(
      _.flatten(
        _.map([this.a, this.b, this.c, this.d, this.a], function(p) {
          return p.toArray();
        })
      )
    ).attr({
      fill: '#fff',
      stroke: '#ccc',
      strokeWidth: 1
    });
  }

  Face.prototype.transform = function(m) {
    // Transform points
    _.each([this.a, this.b, this.c, this.d], function(p) {
      p.transform(m);
    });

    // Transform line
    this.line.transform(m.toTransformString());

    return this;
  };

  var isoTransform = new Snap.Matrix();
  isoTransform.translate(500, 50);
  isoTransform.scale(1, 0.5);
  isoTransform.rotate(45);

  function Obelisk(x, y, w, h) {
    var a, b, c, d;
    this.faces = {};

    { // Top face
      a = new Point(x, y);
      b = a.clone().translate(w, 0);
      c = a.clone().translate(w, w);
      d = a.clone().translate(0, w);

      this.faces.top = new Face(a, b, c, d).transform(isoTransform);
    }

    { // Left face
      a = this.faces.top.d.clone();
      b = this.faces.top.c.clone();
      c = b.clone().translate(0, h);
      d = a.clone().translate(0, h);

      this.faces.left = new Face(a, b, c, d);
    }

    { // Right face
      a = this.faces.top.c.clone();
      b = this.faces.top.b.clone();
      c = b.clone().translate(0, h);
      d = a.clone().translate(0, h);

      this.faces.right = new Face(a, b, c, d);
    }
  }

  Obelisk.prototype.height = function(h) {
    var current = this.faces.left.c.y - this.faces.left.b.y;

    if(h === undefined) {
      return current;
    }

    var delta = h - current;

    this.faces.left.c.y += delta;
    this.faces.left.d.y += delta;
    this.faces.right.c.y += delta;
    this.faces.right.d.y += delta;

    return this;
  };

  var d = 20;
  var xQty = 20;
  var yQty = 20;
  var xMin = 0;
  var yMin = 0;

  //var g = s.g();

  for(var i = xMin; i < xMin + (d * xQty); i += d) {
    for(var j = yMin; j < yMin + (d * yQty); j += d) {
      var ob = new Obelisk(i, j, d, 20);
      //g.add(s.rect(i, j, d, d));
    }
  }

  //g.transform(isoTransform.toTransformString());

  // Mask
  /*
  s.rect(0, 0, 1000, 500).attr({
    fill: "url(#linear_gradient_mask)"
  });
  */
})(new Snap('#boxes'));
