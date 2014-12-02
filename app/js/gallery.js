/** 
 * gallery.js
 *
 * Simple JavaScript image gallery.
 * 
 * Tested on all modern browsers and IE6+ (getElementByTagName)
 *
 * Basic usage:
 *   <script type="text/javascript" src="gallery.js"></script>
 *   <script type="text/javascript">
 *     gallery.init();
 *   </script>
 *
 * Options:
 *   className  string    optional  Class name of gallery (default: gallery)
 *   titles     string[]  optional  Array of gallery titles, one for each gallery
 *
 * Resources:
 * [1] : http://codereview.stackexchange.com/questions/21105/pattern-for-creating-a-javascript-plugin
 * [2] : http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/
 * [3] : http://www.dustindiaz.com/getelementsbyclass/
 * [4] : http://html5doctor.com/html5-custom-data-attributes/
 */

// Declare a namespace, or extend existing [1]
(function(galleryns) {

  // Always use ECMAScript 5 strict mode [2]
  'use strict';

  // Global variables
  var galleryClassName, gallery, len, titles;

  // ==================
  // Internal functions
  // ==================
  // Retrieve elements by class name [3]
  function getElementsByClassName(classname,node,tag) {
    if(node == null) node = document;
    if(tag  == null) tag  = '*';

    if(node.getElementsByClassName) {
      return node.getElementsByClassName(classname);
    } else {
      return (function(searchClass,node,tag) {
        var classElements = [],
            els           = node.getElementsByTagName(tag),
            elsLen        = els.length,
            pattern       = new RegExp('(^|\\s)'+searchClass+'(\\s|$)'), i, j;

        for (i = 0, j = 0; i < elsLen; i++) {
          if(pattern.test(els[i].className)) {
            classElements[j] = els[i];
            j++;
          }
        }

        return classElements;
      })(classname,node,tag);
    }
  }

  // Attach event listeners
  function addEvent(obj,type,fn) {
    if(obj.addEventListener) {
      obj.addEventListener(type,fn,false);
    } else if(obj.attachEvent) {
      obj.attachEvent('on' + type, function() { return fn.apply(obj, [window.event]);});
    } else {
      obj['on'+type] = fn;
    }
  }

  // Loop over an array of elements and restyle
  function restyle(els,key,value) {
    var len = els.length, i;
    for(i = 0; i < len; i++) {
      els[i].style[key] = value;
    }
  }

  // Main setup function: adds navigation
  function setup() {
    // Local variables
    var container, numlis, imgs, imgdims, i;

    // Loop through each .gallery list (in case there
    // is more than one on a single page
    for(i = 0; i < len; i++) {
      // Current gallery reference, and statistics
      container = gallery[i];
      numlis = container.getElementsByTagName('li').length;

      // Add identification class to gallery container
      // container.className = container.className+' gallery-'+i;

      // Hide all images
      imgs = container.getElementsByTagName('img');
      restyle(imgs,'display','none');

      // Show first image
      imgs[0].style.display = 'inline';

      // Add navigational elements
      addNav(container,numlis,(titles[i] === null) ? '&nbsp;' : titles[i]);
      
      // Append gallery status (current image) [4]
      container.setAttribute('data-current','1');

      // Bind click events to nav buttons
      configureEventHandlers(container,numlis);
    }
  }

  // Add navigational elements to given gallery container
  function addNav(container,numlis,title) {
    // Create document fragment
    var fragment = document.createDocumentFragment(),
        nav_div, nav_page, nav_title;

    // Create navigation container (sits on top of images)
    nav_div             = document.createElement('div');
    nav_div.className   = 'gallery-nav';
    nav_div.innerHTML   = '<a class="gallery-nav-left" href="#">&lt;</a>&nbsp;' +
                          '<a class="gallery-nav-right" href="#">&gt;</a>';

    // Image page status
    nav_page            = document.createElement('div');
    nav_page.className  = 'gallery-nav-status';
    nav_page.innerHTML  = '<span class="gallery-current-image">1</span>/'+numlis;

    // Gallery title
    // TODO Add string validation and sanitization
    nav_title           = document.createElement('span');
    nav_title.className = 'gallery-title';
    nav_title.innerHTML = title;

    // Append children to containers
    fragment.appendChild(nav_page);
    fragment.appendChild(nav_div);
    fragment.appendChild(nav_title);

    // Append navigation elements after unordered list
    container.appendChild(fragment.cloneNode(true));
  }

  // Add click events to navigation elements and browser window resize 
  function configureEventHandlers(container,numlis) {
    // Previous image button
    addEvent(container.getElementsByClassName('gallery-nav-left')[0],'click',function(e) {
      var current, next;

      // Get current image number
      current = parseInt(container.getAttribute('data-current'));

      // Determine previous image number
      next = (current === 1) ? numlis : current - 1;

      // Update current image number (everywhere)
      container.setAttribute('data-current',''+next);
      container.getElementsByClassName('gallery-current-image')[0].innerHTML = next;

      // Hide all images
      restyle(container.getElementsByTagName('img'),'display','none');

      // Reveal previous image (instant/slide/fade in)
      container.getElementsByTagName('img')[next-1].style.display = 'inline';

      e.returnValue = false;
      if(e.preventValue) e.preventValue();
      return false;
    });

    // Next image button
    addEvent(container.getElementsByClassName('gallery-nav-right')[0],'click',function(e) {
      var current, next;

      // Get current image number
      current = parseInt(container.getAttribute('data-current'));

      // Determine previous image number
      next = (current === numlis) ? 1 : current + 1;

      // Update current image number (everywhere)
      container.setAttribute('data-current',''+next);
      container.getElementsByClassName('gallery-current-image')[0].innerHTML = next;

      // Hide all images
      restyle(container.getElementsByTagName('img'),'display','none');

      // Reveal previous image (instant/slide/fade in)
      // TODO Add effects
      container.getElementsByTagName('img')[next-1].style.display = 'inline';

      e.returnValue = false;
      if(e.preventValue) e.preventValue();
      return false;
    });
  }

  // =================
  // Exposed functions
  // =================
  // Update defaults with encapsulation
  galleryns.init = function(settings) {
    // Store class name
    galleryClassName = (settings != null && settings.className) ? settings.className : 'gallery';

    // Update default settings
    gallery = getElementsByClassName(galleryClassName);
    len     = gallery.length;

    // Store title
    titles  = (settings != null && settings.titles) ? settings.titles : [];

    // Run gallery setup
    setup();
  };

})(this.gallery = this.gallery || {});
